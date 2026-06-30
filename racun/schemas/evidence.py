from dataclasses import dataclass
from typing import Optional, List
from enum import Enum


class EvidenceSource(Enum):
    CAREER = "career"
    SUMMARY = "summary"
    SKILL = "skill"
    ASSESSMENT = "assessment"
    EDUCATION = "education"
    CERTIFICATION = "certification"


@dataclass
class TemporalData:
    start_date: Optional[str]
    end_date: Optional[str]
    duration_months: Optional[int]
    is_current: bool
    recency_score: float


@dataclass
class EvidenceObject:
    candidate_id: str
    source: EvidenceSource
    raw_content: str
    normalized_concepts: List[str]
    temporal: Optional[TemporalData]
    proficiency_context: Optional[str]
