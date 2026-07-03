from typing import List
from racun.schemas.result import ValidatedEvidence
from racun.schemas.evidence import EvidenceSource


class ConsistencyEvaluator:

    @staticmethod
    def evaluate(validated: List[ValidatedEvidence]) -> float:
        if len(validated) <= 1:
            return 0.60 if validated else 0.0

        source_types = {v.evidence.source for v in validated}
        n_sources = len(source_types)

        base = min(0.50 + (n_sources - 1) * 0.15, 1.0)

        has_assessment_contradiction = any(
            "assessment_contradiction" in v.flags for v in validated
        )
        has_uncorroborated_only = all(
            "uncorroborated_skill" in v.flags for v in validated
            if v.evidence.source == EvidenceSource.SKILL
        )

        if has_assessment_contradiction:
            base *= 0.60
        if has_uncorroborated_only and n_sources == 1:
            base *= 0.70

        return min(max(base, 0.0), 1.0)
