from typing import Dict
from racun.schemas.result import SatisfactionLevel


class SatisfactionThresholds:
    def __init__(self, data: dict):
        satisfied = data["satisfied"]
        self.satisfied_min_depth = satisfied["min_depth"]
        self.satisfied_min_strength = satisfied["min_strength"]
        self.satisfied_min_consistency = satisfied["min_consistency"]

        partial = data["partially_satisfied"]
        self.partial_min_depth = partial["min_depth"]
        self.partial_min_strength = partial["min_strength"]
        self.partial_min_consistency = partial["min_consistency"]

        weak = data["weakly_satisfied"]
        self.weak_min_depth = weak["min_depth"]
        self.weak_min_strength = weak["min_strength"]


class ScoringRubrics:

    def __init__(self, settings: dict):
        self.depth_weights: Dict[str, float] = settings["depth_weights"]
        self.hierarchy_weights: Dict[str, float] = settings["hierarchy_weights"]
        self.satisfaction_scores: Dict[SatisfactionLevel, float] = {
            SatisfactionLevel.SATISFIED: settings["satisfaction_scores"]["SATISFIED"],
            SatisfactionLevel.PARTIALLY_SATISFIED: settings["satisfaction_scores"]["PARTIALLY_SATISFIED"],
            SatisfactionLevel.WEAKLY_SATISFIED: settings["satisfaction_scores"]["WEAKLY_SATISFIED"],
            SatisfactionLevel.NOT_SATISFIED: settings["satisfaction_scores"]["NOT_SATISFIED"],
        }
        self.satisfaction_thresholds = SatisfactionThresholds(
            settings["satisfaction_thresholds"]
        )
        self.gate_modifiers: dict = settings["gate_modifiers"]
        self.integrity: dict = settings["integrity"]
        self.recency: dict = settings["recency"]

    def depth_weight(self, level: int) -> float:
        key = f"L{level}"
        return self.depth_weights.get(key, 0.0)

    def hierarchy_weight(self, source_name: str) -> float:
        return self.hierarchy_weights.get(source_name, 0.0)

    def satisfaction_score(self, level: SatisfactionLevel) -> float:
        return self.satisfaction_scores.get(level, 0.0)
