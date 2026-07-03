from typing import List
from racun.schemas.result import CandidateResult


def _assign_unique_scores(results: List[CandidateResult]) -> None:
    for idx, result in enumerate(results):
        result.final_score = max(0.0, 1.0 - idx * 1e-4)


class Ranker:

    @staticmethod
    def rank(
        results: List[CandidateResult],
        top_k: int = 100,
    ) -> List[CandidateResult]:
        sorted_results = sorted(
            results,
            key=lambda r: r.final_score,
            reverse=True
        )

        top_results = sorted_results[:top_k]
        _assign_unique_scores(top_results)

        for i, result in enumerate(top_results):
            result.rank = i + 1

        return top_results
