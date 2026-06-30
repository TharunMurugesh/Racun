from racun.schemas.candidate import CandidateProfile
from racun.schemas.result import CandidateResult
from racun.knowledge.loader import KnowledgeBase


class ExplanationGenerator:

    @staticmethod
    def generate(
        candidate: CandidateProfile,
        result: CandidateResult,
        kb: KnowledgeBase,
    ) -> str:
        top_clusters = sorted(
            result.cluster_results,
            key=lambda cr: cr.cluster_score,
            reverse=True
        )[:2]

        parts = []
        for cluster_result in top_clusters:
            if cluster_result.cluster_score < 0.20:
                continue

            best_req = max(
                cluster_result.req_results,
                key=lambda r: r.requirement_score,
                default=None
            )

            if best_req and best_req.best_evidence_text:
                cluster_name = kb.cluster_registry.get(cluster_result.cluster_id).name
                parts.append(f"{cluster_name}: {best_req.best_evidence_text}")

        top_career = ExplanationGenerator._get_most_relevant_career_entry(candidate, result)

        if parts and top_career:
            evidence_str = "; ".join(parts)
            return (
                f"{top_career.duration_months}mo as {top_career.role} at "
                f"{top_career.company}. Strongest evidence: {evidence_str}."
            )
        elif parts:
            return f"Key evidence: {'; '.join(parts)}."
        elif top_career:
            return (
                f"{candidate.years_experience:.0f} years experience; most recent role: "
                f"{top_career.role} at {top_career.company}."
            )
        else:
            return "Partial requirement coverage based on available profile data."

    @staticmethod
    def _get_most_relevant_career_entry(candidate: CandidateProfile, result: CandidateResult):
        if not candidate.career_history:
            return None
        
        current_roles = [e for e in candidate.career_history if e.is_current]
        if current_roles:
            return current_roles[0]
            
        sorted_roles = sorted(
            candidate.career_history, 
            key=lambda e: e.start_date or "", 
            reverse=True
        )
        return sorted_roles[0]
