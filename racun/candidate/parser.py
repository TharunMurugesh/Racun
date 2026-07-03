import logging
from typing import Any, Dict, List, Optional

from racun.schemas.candidate import (
    Assessment,
    BehavioralSignals,
    CandidateProfile,
    CareerEntry,
    Education,
    Skill,
)

logger = logging.getLogger(__name__)


class CandidateParser:

    def parse(self, record: Dict[str, Any]) -> CandidateProfile:
        profile = record.get("profile") or {}
        candidate_id = self._str(record.get("candidate_id") or record.get("id"), "unknown")
        name = self._str(record.get("name") or profile.get("anonymized_name") or profile.get("name"), "")
        summary = self._str(record.get("summary") or profile.get("summary") or record.get("bio") or record.get("about"), "")
        years_experience = self._float(record.get("years_experience") or profile.get("years_of_experience") or record.get("total_experience"), 0.0)

        career_history = self._parse_career(record)
        skills = self._parse_skills(record)
        education = self._parse_education(record)
        certifications = self._parse_certifications(record)
        assessments = self._parse_assessments(record)
        behavioral = BehavioralSignals(raw=self._extract_behavioral_raw(record))
        languages = self._parse_languages(record)

        return CandidateProfile(
            candidate_id=candidate_id,
            name=name,
            summary=summary,
            years_experience=years_experience,
            career_history=career_history,
            skills=skills,
            education=education,
            certifications=certifications,
            assessments=assessments,
            behavioral=behavioral,
            languages=languages,
        )

    def _parse_career(self, record: dict) -> List[CareerEntry]:
        entries = []
        raw_career = record.get("work_experience") or record.get("career_history") or record.get("experience") or []

        if not isinstance(raw_career, list):
            return entries

        for item in raw_career:
            if not isinstance(item, dict):
                continue
            try:
                duration_months = self._int(
                    item.get("duration_months") or item.get("duration"), 0
                )
                if duration_months == 0:
                    start = item.get("start_date") or item.get("start")
                    end = item.get("end_date") or item.get("end")
                    duration_months = self._estimate_duration(start, end)

                entry = CareerEntry(
                    company=self._str(item.get("company") or item.get("employer"), ""),
                    role=self._str(item.get("role") or item.get("title") or item.get("position"), ""),
                    industry=self._str(item.get("industry") or item.get("sector"), ""),
                    company_size=self._str(item.get("company_size") or item.get("size"), ""),
                    duration_months=duration_months,
                    start_date=self._str(item.get("start_date") or item.get("start"), None),
                    end_date=self._str(item.get("end_date") or item.get("end"), None),
                    description=self._str(item.get("description") or item.get("responsibilities") or item.get("summary"), ""),
                    is_current=bool(item.get("is_current") or item.get("current", False)),
                )
                entries.append(entry)
            except Exception as e:
                logger.warning(f"Failed to parse career entry: {e}")
        return entries

    def _parse_skills(self, record: dict) -> List[Skill]:
        skills = []
        raw_skills = record.get("skills") or []

        if not isinstance(raw_skills, list):
            return skills

        for item in raw_skills:
            try:
                if isinstance(item, str):
                    skills.append(Skill(name=item, normalized="", years=None, proficiency=None))
                elif isinstance(item, dict):
                    name = self._str(item.get("name") or item.get("skill"), "")
                    if not name:
                        continue
                    years_val = self._float(item.get("years") or item.get("experience_years"), None)
                    if years_val is None and item.get("duration_months") is not None:
                        years_val = self._float(item.get("duration_months"), 0) / 12.0
                    skills.append(Skill(
                        name=name,
                        normalized="",
                        years=years_val,
                        proficiency=self._str(item.get("proficiency") or item.get("level"), None),
                    ))
            except Exception as e:
                logger.warning(f"Failed to parse skill: {e}")
        return skills

    def _parse_education(self, record: dict) -> List[Education]:
        education = []
        raw_edu = record.get("education") or []

        if not isinstance(raw_edu, list):
            return education

        for item in raw_edu:
            if not isinstance(item, dict):
                continue
            try:
                education.append(Education(
                    degree=self._str(item.get("degree") or item.get("qualification"), ""),
                    field=self._str(item.get("field") or item.get("field_of_study") or item.get("major") or item.get("subject"), ""),
                    institution=self._str(item.get("institution") or item.get("university") or item.get("school"), ""),
                    year=self._int(item.get("year") or item.get("end_year") or item.get("graduation_year") or item.get("start_year"), None),
                ))
            except Exception as e:
                logger.warning(f"Failed to parse education: {e}")
        return education

    def _parse_certifications(self, record: dict) -> List[str]:
        raw = record.get("certifications") or record.get("certificates") or []
        if isinstance(raw, list):
            return [self._str(c.get("name") if isinstance(c, dict) else c, "") for c in raw if c]
        return []

    def _parse_assessments(self, record: dict) -> List[Assessment]:
        assessments = []
        raw = record.get("assessments") or record.get("test_scores") or []

        if isinstance(raw, list) and raw:
            for item in raw:
                if not isinstance(item, dict):
                    continue
                try:
                    skill = self._str(item.get("skill") or item.get("name") or item.get("subject"), "")
                    score = self._float(item.get("score") or item.get("result"), None)
                    if skill and score is not None:
                        score = max(0.0, min(1.0, score if score <= 1.0 else score / 100.0))
                        assessments.append(Assessment(skill=skill, score=score))
                except Exception as e:
                    logger.warning(f"Failed to parse assessment: {e}")

        # Fallback to redrob_signals.skill_assessment_scores
        signals = self._extract_behavioral_raw(record)
        scores = signals.get("skill_assessment_scores")
        if isinstance(scores, dict):
            for skill_name, score_val in scores.items():
                val = self._float(score_val, None)
                if val is not None:
                    val = max(0.0, min(1.0, val if val <= 1.0 else val / 100.0))
                    assessments.append(Assessment(skill=skill_name, score=val))

        return assessments

    def _parse_languages(self, record: dict) -> List[str]:
        raw = record.get("languages") or []
        if isinstance(raw, list):
            result = []
            for lang in raw:
                if isinstance(lang, str):
                    result.append(lang)
                elif isinstance(lang, dict):
                    name = lang.get("language") or lang.get("name")
                    if name:
                        result.append(str(name))
            return result
        return []

    def _extract_behavioral_raw(self, record: dict) -> dict:
        behavioral_keys = [
            "redrob_signals", "signals", "behavioral_signals",
            "platform_signals", "engagement", "behavioral",
        ]
        for key in behavioral_keys:
            if key in record and isinstance(record[key], dict):
                return record[key]
        return {}

    def _estimate_duration(self, start: Any, end: Any) -> int:
        if not start:
            return 0
        try:
            import re
            start_str = str(start)
            end_str = str(end) if end else None

            year_month_pattern = r"(\d{4})[-/](\d{1,2})"

            start_match = re.search(year_month_pattern, start_str)
            if not start_match:
                return 0
            start_year = int(start_match.group(1))
            start_month = int(start_match.group(2))

            if end_str and not any(term in end_str.lower() for term in ["present", "current", "now"]):
                end_match = re.search(year_month_pattern, end_str)
                if end_match:
                    end_year = int(end_match.group(1))
                    end_month = int(end_match.group(2))
                    return max(0, (end_year - start_year) * 12 + (end_month - start_month))

            from datetime import datetime
            now = datetime.now()
            return max(0, (now.year - start_year) * 12 + (now.month - start_month))
        except Exception:
            return 0

    @staticmethod
    def _str(value: Any, default: Optional[str]) -> Optional[str]:
        if value is None:
            return default
        return str(value).strip() if str(value).strip() else default

    @staticmethod
    def _float(value: Any, default: Optional[float]) -> Optional[float]:
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _int(value: Any, default: Optional[int]) -> Optional[int]:
        if value is None:
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default
