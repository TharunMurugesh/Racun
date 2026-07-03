class EvidenceRules:

    def __init__(self, rules_data: dict):
        assessment = rules_data["assessment_rules"]
        self.expert_contradiction_threshold: float = assessment["expert_contradiction_threshold"]
        self.intermediate_contradiction_threshold: float = assessment["intermediate_contradiction_threshold"]

        timeline = rules_data["timeline_rules"]
        self.max_overlap_months: int = timeline["max_overlap_months"]

        skill_duration = rules_data["skill_duration_rules"]
        self.overflow_ratio: float = skill_duration["overflow_ratio"]

        trust = rules_data["trust_adjustments"]
        self.skill_without_career_corroboration: float = trust["skill_without_career_corroboration"]
        self.skill_with_career_corroboration: float = trust["skill_with_career_corroboration"]
        self.career_with_assessment_support: float = trust["career_with_assessment_support"]
        self.career_without_assessment: float = trust["career_without_assessment"]
        self.summary_uncorroborated: float = trust["summary_uncorroborated"]
        self.assessment_alone: float = trust["assessment_alone"]
