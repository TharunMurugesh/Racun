from typing import List, Tuple, Dict
from racun.schemas.result import ValidatedEvidence


class StrengthEvaluator:

    @staticmethod
    def evaluate(
        validated: List[ValidatedEvidence],
        hierarchy_weights: Dict[str, float]
    ) -> Tuple[float, int]:
        if not validated:
            return 0.0, 0

        scored = []
        for v in validated:
            hier_w = hierarchy_weights.get(v.evidence.source.value.upper(), 0.0)
            strength = v.trust_score * hier_w
            scored.append((strength, v.depth_level))

        scored.sort(reverse=True, key=lambda x: x[0])
        max_depth = max(v.depth_level for v in validated)

        weights = [1.0, 0.30, 0.10]
        strength_score = min(
            sum(s * w for (s, _), w in zip(scored, weights)),
            1.0
        )

        return strength_score, max_depth
