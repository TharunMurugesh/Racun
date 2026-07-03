import re
from datetime import datetime
from typing import List, Optional

from racun.schemas.candidate import CandidateProfile, CareerEntry
from racun.schemas.evidence import EvidenceObject, EvidenceSource, TemporalData
from racun.knowledge.loader import KnowledgeBase


class EvidenceExtractor:

    def __init__(self, kb: KnowledgeBase):
        self._recency = kb.scoring_rubrics.recency

    def extract(self, profile: CandidateProfile) -> List[EvidenceObject]:
        evidence = []

        for entry in profile.career_history:
            ev = self._from_career(profile.candidate_id, entry)
            if ev:
                evidence.append(ev)

        if profile.summary:
            evidence.append(self._from_summary(profile.candidate_id, profile.summary))

        if profile.skills:
            skill_names = [s.name for s in profile.skills]
            proficiency_map = {s.name: s.proficiency for s in profile.skills}
            skill_text = ", ".join(skill_names)
            evidence.append(EvidenceObject(
                candidate_id=profile.candidate_id,
                source=EvidenceSource.SKILL,
                raw_content=skill_text,
                normalized_concepts=[],
                temporal=None,
                proficiency_context=None,
            ))

        for assessment in profile.assessments:
            evidence.append(EvidenceObject(
                candidate_id=profile.candidate_id,
                source=EvidenceSource.ASSESSMENT,
                raw_content=f"{assessment.skill} assessment score: {assessment.score:.2f}",
                normalized_concepts=[],
                temporal=None,
                proficiency_context=self._get_proficiency_for_skill(
                    profile, assessment.skill
                ),
            ))

        for edu in profile.education:
            parts = [edu.degree, edu.field, edu.institution]
            edu_text = " ".join(p for p in parts if p)
            if edu_text:
                evidence.append(EvidenceObject(
                    candidate_id=profile.candidate_id,
                    source=EvidenceSource.EDUCATION,
                    raw_content=edu_text,
                    normalized_concepts=[],
                    temporal=None,
                    proficiency_context=None,
                ))

        for cert in profile.certifications:
            if cert:
                evidence.append(EvidenceObject(
                    candidate_id=profile.candidate_id,
                    source=EvidenceSource.CERTIFICATION,
                    raw_content=cert,
                    normalized_concepts=[],
                    temporal=None,
                    proficiency_context=None,
                ))

        return evidence

    def _from_career(self, candidate_id: str, entry: CareerEntry) -> Optional[EvidenceObject]:
        parts = [entry.role, entry.company, entry.description]
        text = " | ".join(p for p in parts if p)
        if not text.strip():
            return None

        temporal = TemporalData(
            start_date=entry.start_date,
            end_date=entry.end_date,
            duration_months=entry.duration_months,
            is_current=entry.is_current,
            recency_score=self._compute_recency(entry),
        )

        return EvidenceObject(
            candidate_id=candidate_id,
            source=EvidenceSource.CAREER,
            raw_content=text,
            normalized_concepts=[],
            temporal=temporal,
            proficiency_context=None,
        )

    def _from_summary(self, candidate_id: str, summary: str) -> EvidenceObject:
        return EvidenceObject(
            candidate_id=candidate_id,
            source=EvidenceSource.SUMMARY,
            raw_content=summary,
            normalized_concepts=[],
            temporal=None,
            proficiency_context=None,
        )

    def _compute_recency(self, entry: CareerEntry) -> float:
        current_score = self._recency.get("current_role_score", 1.0)
        decay_per_year = self._recency.get("decay_per_year", 0.08)
        floor = self._recency.get("floor", 0.40)

        if entry.is_current:
            return current_score

        end_date_str = entry.end_date
        if not end_date_str:
            return floor

        years_ago = self._years_since(end_date_str)
        if years_ago is None:
            return floor

        score = current_score - (years_ago * decay_per_year)
        return max(score, floor)

    def _years_since(self, date_str: str) -> Optional[float]:
        try:
            patterns = [
                r"(\d{4})-(\d{2})",
                r"(\d{4})/(\d{2})",
                r"(\d{4})",
            ]
            now = datetime.now()
            for pattern in patterns:
                m = re.search(pattern, date_str)
                if m:
                    year = int(m.group(1))
                    month = int(m.group(2)) if m.lastindex >= 2 else 6
                    years = (now.year - year) + (now.month - month) / 12.0
                    return max(0.0, years)
        except Exception:
            pass
        return None

    def _get_proficiency_for_skill(self, profile: CandidateProfile, skill_name: str) -> Optional[str]:
        skill_lower = skill_name.lower()
        for skill in profile.skills:
            if skill.name.lower() == skill_lower:
                return skill.proficiency
        return None
