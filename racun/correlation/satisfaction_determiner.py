from racun.schemas.result import SatisfactionLevel
from racun.knowledge.rubrics import SatisfactionThresholds


class SatisfactionDeterminer:

    @staticmethod
    def determine(
        strength_score: float,
        consistency_score: float,
        max_depth: int,
        thresholds: SatisfactionThresholds,
    ) -> SatisfactionLevel:
        if max_depth == 0:
            return SatisfactionLevel.NOT_SATISFIED

        if max_depth >= 3:
            if (strength_score >= thresholds.satisfied_min_strength and
                consistency_score >= thresholds.satisfied_min_consistency):
                return SatisfactionLevel.SATISFIED
            elif (strength_score >= thresholds.partial_min_strength and
                  consistency_score >= thresholds.partial_min_consistency):
                return SatisfactionLevel.PARTIALLY_SATISFIED
            else:
                return SatisfactionLevel.WEAKLY_SATISFIED

        elif max_depth == 2:
            if (strength_score >= thresholds.partial_min_strength and
                consistency_score >= thresholds.partial_min_consistency):
                return SatisfactionLevel.PARTIALLY_SATISFIED
            else:
                return SatisfactionLevel.WEAKLY_SATISFIED

        else:
            return SatisfactionLevel.WEAKLY_SATISFIED
