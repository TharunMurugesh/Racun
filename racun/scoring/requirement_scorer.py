from typing import List
from racun.schemas.result import CorrelationResult, RequirementResult
from racun.schemas.requirement import JDRequirement
from racun.knowledge.rubrics import ScoringRubrics


class RequirementScorer:

    @staticmethod
    def score(
        correlation: CorrelationResult,
        requirement: JDRequirement,
        rubrics: ScoringRubrics,
    ) -> RequirementResult:
        satisfaction_base = rubrics.satisfaction_score(correlation.satisfaction)
        requirement_score = satisfaction_base * requirement.weight

        return RequirementResult(
            req_id=requirement.req_id,
            satisfaction=correlation.satisfaction,
            requirement_score=requirement_score,
            best_evidence_text=correlation.best_evidence_text,
        )

    @staticmethod
    def score_all(
        correlations: List[CorrelationResult],
        requirements: List[JDRequirement],
        rubrics: ScoringRubrics,
    ) -> List[RequirementResult]:
        req_map = {r.req_id: r for r in requirements}
        results = []
        for corr in correlations:
            req = req_map.get(corr.req_id)
            if req:
                results.append(RequirementScorer.score(corr, req, rubrics))
        return results
