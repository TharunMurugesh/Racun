from typing import List
from racun.schemas.result import RequirementResult, SatisfactionLevel
from racun.schemas.requirement import JDRequirement


class GateEvaluator:

    @staticmethod
    def compute(
        req_results: List[RequirementResult],
        mandatory_reqs: List[JDRequirement],
        gate_settings: dict,
    ) -> float:
        if not mandatory_reqs:
            return 1.0

        results_by_id = {r.req_id: r for r in req_results}
        worst = SatisfactionLevel.SATISFIED

        for req in mandatory_reqs:
            result = results_by_id.get(req.req_id)
            if result is None:
                return float(gate_settings.get("mandatory_not_met", 0.40))
            
            if result.satisfaction < worst:
                worst = result.satisfaction

        mapping = {
            SatisfactionLevel.SATISFIED: gate_settings.get("all_mandatory_met", 1.0),
            SatisfactionLevel.PARTIALLY_SATISFIED: gate_settings.get("partially_met", 0.75),
            SatisfactionLevel.WEAKLY_SATISFIED: gate_settings.get("weakly_met", 0.55),
            SatisfactionLevel.NOT_SATISFIED: gate_settings.get("mandatory_not_met", 0.40),
        }
        
        return float(mapping[worst])
