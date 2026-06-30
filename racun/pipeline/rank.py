import pickle
import logging
from pathlib import Path
from tqdm import tqdm

from racun.knowledge.loader import KnowledgeLoader
from racun.correlation.engine import CorrelationEngine
from racun.scoring.requirement_scorer import RequirementScorer
from racun.scoring.cluster_scorer import ClusterScorer
from racun.scoring.gate_evaluator import GateEvaluator
from racun.scoring.integrity_checker import IntegrityChecker
from racun.scoring.behavioral_scorer import BehavioralScorer
from racun.explanation.generator import ExplanationGenerator
from racun.output.ranker import Ranker
from racun.output.writer import SubmissionWriter
from racun.schemas.result import CandidateResult
from racun.filters.prefilter import PassThroughFilter


class RankerPipeline:

    def __init__(self, config_dir: str = "config/"):
        self.logger = logging.getLogger(__name__)
        self.kb = KnowledgeLoader.load(config_dir)
        self.corr_engine = CorrelationEngine()
        
        settings = KnowledgeLoader._load_yaml(Path(config_dir) / "settings.yaml")
        self.gate_settings = settings.get("gate_modifiers", {})
        self.integrity_settings = settings.get("integrity", {})
        self.submission_settings = settings.get("submission", {})
        self.prefilter_settings = settings.get("prefilter", {})
        
        self.prefilter = PassThroughFilter()

    def run(self, cache_dir: str) -> None:
        cache_path = Path(cache_dir)
        
        self.logger.info("Loading artifacts from cache...")
        with open(cache_path / "requirements.pkl", "rb") as f:
            requirements = pickle.load(f)
            
        with open(cache_path / "candidates.pkl", "rb") as f:
            candidates = pickle.load(f)
            
        with open(cache_path / "evidence.pkl", "rb") as f:
            evidence_dict = pickle.load(f)
            
        with open(cache_path / "honeypot_ids.pkl", "rb") as f:
            honeypot_ids = pickle.load(f)

        keep_top_k = self.prefilter_settings.get("keep_top_k", 5000)
        filtered_candidates = self.prefilter.filter(
            candidates, requirements, keep_top_k, honeypot_ids
        )

        self.logger.info("Running correlation and scoring...")
        results = []
        mandatory_reqs = self.kb.requirement_registry.mandatory()
        clusters = self.kb.cluster_registry.all()

        for candidate in tqdm(filtered_candidates, desc="Ranking"):
            candidate_evidence = evidence_dict.get(candidate.candidate_id, [])
            
            correlation_results = []
            for req in requirements:
                corr = self.corr_engine.run(req, candidate, candidate_evidence, self.kb)
                correlation_results.append(corr)

            req_results = RequirementScorer.score_all(
                correlation_results, requirements, self.kb.scoring_rubrics
            )
            
            cluster_results = ClusterScorer.score_all(
                clusters, req_results, self.kb.requirement_registry
            )
            
            core_score = sum(
                cr.cluster_score * self.kb.cluster_registry.get(cr.cluster_id).weight
                for cr in cluster_results if self.kb.cluster_registry.get(cr.cluster_id)
            )
            
            gate_mod = GateEvaluator.compute(req_results, mandatory_reqs, self.gate_settings)
            integrity_mod = IntegrityChecker.compute(candidate, self.kb.evidence_rules, self.integrity_settings)
            behavior_mod = BehavioralScorer.compute(candidate.behavioral, self.kb)
            
            final_score = core_score * gate_mod * integrity_mod * behavior_mod
            
            result = CandidateResult(
                candidate_id=candidate.candidate_id,
                final_score=final_score,
                core_score=core_score,
                gate_modifier=gate_mod,
                integrity_modifier=integrity_mod,
                behavior_modifier=behavior_mod,
                cluster_results=cluster_results,
                honeypot_flags=[],
                reason="",
            )
            
            result.reason = ExplanationGenerator.generate(candidate, result, self.kb)
            results.append(result)

        self.logger.info("Ranking top candidates...")
        top_k = self.submission_settings.get("top_k", 100)
        output_path = self.submission_settings.get("output_path", "submission.csv")
        
        top_results = Ranker.rank(results, top_k=top_k)
        
        self.logger.info(f"Writing results to {output_path}...")
        SubmissionWriter.write(top_results, output_path)
        
        self.logger.info("Ranking pipeline complete.")
