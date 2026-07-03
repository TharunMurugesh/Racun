from datetime import datetime
from typing import List
from racun.schemas.candidate import CandidateProfile, CareerEntry
from racun.knowledge.evidence_rules import EvidenceRules


class IntegrityChecker:

    @staticmethod
    def compute(
        candidate: CandidateProfile,
        rules: EvidenceRules,
        settings: dict,
    ) -> float:
        flags = []

        for assessment in candidate.assessments:
            claimed = IntegrityChecker._get_claimed_proficiency(candidate, assessment.skill)
            if claimed and claimed.lower() == "expert" and assessment.score < 0.55:
                flags.append(f"soft_assessment_mismatch:{assessment.skill}")

        if IntegrityChecker._has_unexplained_gap(candidate.career_history, min_months=12):
            flags.append("unexplained_career_gap")

        total_skill_years = sum(s.years for s in candidate.skills if s.years is not None)
        if total_skill_years > candidate.years_experience:
            flags.append("skill_years_inconsistency")

        penalty = float(settings.get("penalty_per_flag", 0.10))
        floor = float(settings.get("floor", 0.60))
        
        modifier = 1.0 - (len(flags) * penalty)
        return max(modifier, floor)

    @staticmethod
    def _get_claimed_proficiency(candidate: CandidateProfile, skill_name: str) -> str:
        skill_lower = skill_name.lower()
        for skill in candidate.skills:
            if skill.name.lower() == skill_lower:
                return skill.proficiency or ""
        return ""

    @staticmethod
    def _has_unexplained_gap(career_history: List[CareerEntry], min_months: int) -> bool:
        if not career_history:
            return False

        parsed = []
        for entry in career_history:
            if entry.is_current:
                continue
            start = IntegrityChecker._parse_date(entry.start_date)
            end = IntegrityChecker._parse_date(entry.end_date)
            if start and end:
                parsed.append((start, end))

        if not parsed:
            return False

        parsed.sort(key=lambda x: x[0])

        for i in range(len(parsed) - 1):
            e1 = parsed[i][1]
            s2 = parsed[i + 1][0]
            if s2 > e1:
                delta = s2 - e1
                gap_months = delta.days / 30.0
                if gap_months >= min_months:
                    return True

        return False

    @staticmethod
    def _parse_date(date_str: str) -> datetime:
        import re
        if not date_str:
            return None
        try:
            patterns = [r"(\d{4})-(\d{1,2})", r"(\d{4})/(\d{1,2})", r"(\d{4})"]
            for pattern in patterns:
                m = re.search(pattern, date_str)
                if m:
                    year = int(m.group(1))
                    month = int(m.group(2)) if m.lastindex >= 2 else 1
                    return datetime(year, month, 1)
        except Exception:
            pass
        return None
