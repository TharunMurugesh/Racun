from typing import List
from racun.schemas.result import CandidateResult


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

        for i, result in enumerate(top_results):
            result.rank = i + 1

        return top_results
