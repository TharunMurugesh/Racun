import gzip
import json
import pickle
import logging
from pathlib import Path
from tqdm import tqdm

from racun.knowledge.loader import KnowledgeLoader
from racun.jd.parser import JDParser
from racun.jd.requirement_builder import RequirementBuilder
from racun.candidate.parser import CandidateParser
from racun.candidate.evidence_extractor import EvidenceExtractor
from racun.candidate.normalizer import EvidenceNormalizer
from racun.filters.honeypot_detector import HoneypotDetector


class Preprocessor:

    def __init__(self, config_dir: str = "config/"):
        self.logger = logging.getLogger(__name__)
        self.kb = KnowledgeLoader.load(config_dir)
        self.jd_parser = JDParser()
        self.req_builder = RequirementBuilder(self.kb)
        self.cand_parser = CandidateParser()
        self.ev_extractor = EvidenceExtractor(self.kb)
        self.normalizer = EvidenceNormalizer(self.kb.concept_ontology)
        
        settings = KnowledgeLoader._load_yaml(Path(config_dir) / "settings.yaml")
        self.honeypot_detector = HoneypotDetector(self.kb.evidence_rules, settings.get("honeypot", {}))

    def run(
        self,
        jd_path: str,
        candidates_path: str,
        cache_dir: str,
        progress_callback = None,
    ) -> None:
        cache_path = Path(cache_dir)
        cache_path.mkdir(parents=True, exist_ok=True)

        self.logger.info("Parsing Job Description...")
        raw_reqs = self.jd_parser.parse(jd_path)
        requirements = self.req_builder.build(raw_reqs)
        
        with open(cache_path / "requirements.pkl", "wb") as f:
            pickle.dump(requirements, f)

        self.logger.info(f"Processing candidates from {candidates_path}...")
        candidates = []
        evidence_dict = {}
        honeypot_ids = set()

        if candidates_path.endswith(".gz"):
            opener = gzip.open(candidates_path, "rt", encoding="utf-8")
        else:
            opener = open(candidates_path, "rt", encoding="utf-8")

        with opener as f:
            processed_count = 0
            for line in tqdm(f, desc="Preprocessing"):
                if not line.strip():
                    continue
                    
                record = json.loads(line)
                profile = self.cand_parser.parse(record)
                
                candidates.append(profile)
                
                is_honeypot, flags = self.honeypot_detector.detect(profile)
                if is_honeypot:
                    honeypot_ids.add(profile.candidate_id)
                else:
                    evidence = self.ev_extractor.extract(profile)
                    normalized_evidence = self.normalizer.normalize_all(evidence)
                    evidence_dict[profile.candidate_id] = normalized_evidence
                
                processed_count += 1
                if progress_callback:
                    progress_callback(processed_count)

        self.logger.info("Saving artifacts to cache...")
        
        from racun.pipeline.pickle_helper import save_pickle_stream
        
        save_pickle_stream(candidates, cache_path / "candidates.pkl")
            
        save_pickle_stream(evidence_dict, cache_path / "evidence.pkl")
            
        with open(cache_path / "honeypot_ids.pkl", "wb") as f:
            pickle.dump(honeypot_ids, f)

        self.logger.info("Preprocessing complete.")

