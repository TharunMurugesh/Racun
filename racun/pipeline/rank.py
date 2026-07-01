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
        
        if self.prefilter_settings.get("enabled", False):
            from racun.filters.prefilter import KeywordPreFilter
            self.prefilter = KeywordPreFilter()
        else:
            self.prefilter = PassThroughFilter()

    def run(self, cache_dir: str, progress_callback=None) -> None:
        cache_path = Path(cache_dir)
        
        self.logger.info("Loading artifacts from cache...")
        with open(cache_path / "requirements.pkl", "rb") as f:
            requirements = pickle.load(f)

        # Populate the requirement registry from cached requirements so that
        # ClusterScorer and GateEvaluator can look up requirement metadata.
        for req in requirements:
            self.kb.requirement_registry.register(req)

        from racun.pipeline.pickle_helper import load_pickle_stream
        
        candidates = load_pickle_stream(cache_path / "candidates.pkl")
            
        evidence_dict = load_pickle_stream(cache_path / "evidence.pkl")
            
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

        processed_count = 0
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

            processed_count += 1
            if progress_callback:
                progress_callback(processed_count)

        self.logger.info("Ranking top candidates...")
        top_k = self.submission_settings.get("top_k", 100)
        output_path = self.submission_settings.get("output_path", "submission.csv")
        
        top_results = Ranker.rank(results, top_k=top_k)
        
        self.logger.info(f"Writing results to {output_path}...")
        SubmissionWriter.write(top_results, output_path)

        # Save detailed results for the API to read without re-computing
        results_path = cache_path / "results.pkl"
        results_data = []
        cands_map = {c.candidate_id: c for c in candidates}
        for r in top_results:
            cand = cands_map.get(r.candidate_id)
            results_data.append({
                "rank": r.rank,
                "candidate_id": r.candidate_id,
                "name": cand.name if cand else "",
                "score": round(r.final_score, 4),
                "core_score": round(r.core_score, 4),
                "gate_modifier": round(r.gate_modifier, 4),
                "integrity_modifier": round(r.integrity_modifier, 4),
                "behavior_modifier": round(r.behavior_modifier, 4),
                "reason": r.reason,
            })
        with open(results_path, "wb") as f:
            pickle.dump(results_data, f)
        
        self.logger.info("Ranking pipeline complete.")
