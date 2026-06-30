import re
from datetime import datetime
from typing import List, Optional, Tuple

from racun.schemas.candidate import CandidateProfile, CareerEntry
from racun.knowledge.evidence_rules import EvidenceRules


class HoneypotDetector:

    def __init__(self, rules: EvidenceRules, settings: dict):
        self._rules = rules
        self._flag_threshold: int = settings.get("flag_threshold", 2)
        self._skill_overflow_ratio: float = settings.get("skill_overflow_ratio", 1.5)
        self._expert_assessment_floor: float = settings.get("expert_assessment_floor", 0.40)
        self._min_unsupported_experts: int = settings.get("min_unsupported_experts", 5)

    def detect(self, profile: CandidateProfile) -> Tuple[bool, List[str]]:
        flags = []

        timeline_flags = self._check_timeline_overlap(profile.career_history)
        flags.extend(timeline_flags)

        overflow_flag = self._check_skill_duration_overflow(profile)
        if overflow_flag:
            flags.append(overflow_flag)

        assessment_flags = self._check_assessment_contradiction(profile)
        flags.extend(assessment_flags)

        inflation_flag = self._check_experience_inflation(profile)
        if inflation_flag:
            flags.append(inflation_flag)

        unsupported_flag = self._check_unsupported_expert_cluster(profile)
        if unsupported_flag:
            flags.append(unsupported_flag)

        regression_flag = self._check_phantom_regression(profile.career_history)
        if regression_flag:
            flags.append(regression_flag)

        is_honeypot = len(flags) >= self._flag_threshold
        return is_honeypot, flags

    def _check_timeline_overlap(self, career_history: List[CareerEntry]) -> List[str]:
        flags = []
        parsed = []

        for entry in career_history:
            if entry.is_current:
                continue
            start = self._parse_date(entry.start_date)
            end = self._parse_date(entry.end_date)
            if start and end:
                parsed.append((start, end))

        for i in range(len(parsed)):
            for j in range(i + 1, len(parsed)):
                s1, e1 = parsed[i]
                s2, e2 = parsed[j]
                overlap = self._months_overlap(s1, e1, s2, e2)
                if overlap > self._rules.max_overlap_months:
                    flags.append("impossible_timeline")
                    return flags

        return flags

    def _check_skill_duration_overflow(self, profile: CandidateProfile) -> Optional[str]:
        if profile.years_experience <= 0:
            return None
        total_skill_years = sum(s.years for s in profile.skills if s.years)
        if total_skill_years > profile.years_experience * self._skill_overflow_ratio:
            return "skill_duration_overflow"
        return None

    def _check_assessment_contradiction(self, profile: CandidateProfile) -> List[str]:
        flags = []
        proficiency_map = {s.name.lower(): s.proficiency for s in profile.skills if s.proficiency}

        for assessment in profile.assessments:
            skill_lower = assessment.skill.lower()
            proficiency = proficiency_map.get(skill_lower)
            if proficiency and proficiency.lower() == "expert":
                if assessment.score < self._expert_assessment_floor:
                    flags.append("assessment_contradiction")
                    break

        return flags

    def _check_experience_inflation(self, profile: CandidateProfile) -> Optional[str]:
        if not profile.career_history:
            return None

        derivable_months = sum(
            e.duration_months for e in profile.career_history if e.duration_months > 0
        )
        derivable_years = derivable_months / 12.0

        if profile.years_experience > derivable_years + 2:
            return "experience_inflation"
        return None

    def _check_unsupported_expert_cluster(self, profile: CandidateProfile) -> Optional[str]:
        expert_skills = [s.name.lower() for s in profile.skills if s.proficiency and s.proficiency.lower() == "expert"]

        if len(expert_skills) < self._min_unsupported_experts:
            return None

        career_text = " ".join(
            e.description.lower() for e in profile.career_history if e.description
        )

        supported_count = sum(1 for skill in expert_skills if skill in career_text)
        if supported_count == 0 and len(expert_skills) >= self._min_unsupported_experts:
            return "unsupported_expert_cluster"
        return None

    def _check_phantom_regression(self, career_history: List[CareerEntry]) -> Optional[str]:
        senior_titles = {"cto", "vp", "director", "head", "chief", "principal", "staff", "lead"}
        junior_titles = {"junior", "associate", "entry", "trainee", "intern"}

        chronological = sorted(career_history, key=lambda e: e.start_date or "", reverse=True)

        found_senior = False
        for entry in chronological:
            role_lower = entry.role.lower()
            is_senior = any(t in role_lower for t in senior_titles)
            is_junior = any(t in role_lower for t in junior_titles)

            if is_senior:
                found_senior = True
            elif is_junior and found_senior:
                return "phantom_regression"

        return None

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
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

    def _months_overlap(
        self,
        s1: datetime,
        e1: datetime,
        s2: datetime,
        e2: datetime,
    ) -> int:
        latest_start = max(s1, s2)
        earliest_end = min(e1, e2)
        if latest_start >= earliest_end:
            return 0
        delta = earliest_end - latest_start
        return int(delta.days / 30)
