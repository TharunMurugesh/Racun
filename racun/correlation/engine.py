from typing import List

from racun.schemas.candidate import CandidateProfile
from racun.schemas.evidence import EvidenceObject
from racun.schemas.requirement import JDRequirement
from racun.schemas.result import CorrelationResult
from racun.knowledge.loader import KnowledgeBase

from racun.correlation.collector import EvidenceCollector
from racun.correlation.validator import EvidenceValidator
from racun.correlation.strength_evaluator import StrengthEvaluator
from racun.correlation.consistency_evaluator import ConsistencyEvaluator
from racun.correlation.satisfaction_determiner import SatisfactionDeterminer


class CorrelationEngine:

    def run(
        self,
        requirement: JDRequirement,
        candidate: CandidateProfile,
        evidence_objects: List[EvidenceObject],
        kb: KnowledgeBase,
    ) -> CorrelationResult:
        collected = EvidenceCollector.collect(requirement, evidence_objects)
        
        validated = [
            EvidenceValidator.validate(candidate, ev, kb.evidence_rules, kb.concept_ontology)
            for ev in collected
        ]
        
        strength_score, max_depth = StrengthEvaluator.evaluate(
            validated, kb.scoring_rubrics.hierarchy_weights
        )
        
        consistency_score = ConsistencyEvaluator.evaluate(validated)
        
        satisfaction = SatisfactionDeterminer.determine(
            strength_score,
            consistency_score,
            max_depth,
            kb.scoring_rubrics.satisfaction_thresholds,
        )
        
        best_evidence_text = ""
        if validated:
            best_evidence = max(validated, key=lambda v: (v.depth_level, v.trust_score))
            best_evidence_text = best_evidence.evidence.raw_content
            
        return CorrelationResult(
            req_id=requirement.req_id,
            collected=collected,
            validated=validated,
            strength_score=strength_score,
            consistency_score=consistency_score,
            max_depth=max_depth,
            satisfaction=satisfaction,
            best_evidence_text=best_evidence_text,
        )
