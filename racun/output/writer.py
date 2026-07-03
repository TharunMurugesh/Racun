import csv
from typing import List
from racun.schemas.result import CandidateResult, SubmissionRow


class SubmissionWriter:

    @staticmethod
    def write(
        results: List[CandidateResult],
        output_path: str,
    ) -> None:
        submission_rows = []
        for r in results:
            clamped_score = max(0.0, min(1.0, r.final_score))
            
            row = SubmissionRow(
                rank=r.rank or 0,
                candidate_id=r.candidate_id,
                score=clamped_score,
                reason=r.reason,
            )
            submission_rows.append(row)

        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            for row in submission_rows:
                writer.writerow([
                    row.candidate_id,
                    row.rank,
                    f"{row.score:.4f}",
                    row.reason,
                ])
