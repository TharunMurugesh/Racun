from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict


@dataclass(frozen=True)
class CareerEntry:
    company: str
    role: str
    industry: str
    company_size: str
    duration_months: int
    start_date: Optional[str]
    end_date: Optional[str]
    description: str
    is_current: bool


@dataclass(frozen=True)
class Skill:
    name: str
    normalized: str
    years: Optional[float]
    proficiency: Optional[str]


@dataclass(frozen=True)
class Assessment:
    skill: str
    score: float


@dataclass(frozen=True)
class Education:
    degree: str
    field: str
    institution: str
    year: Optional[int]


@dataclass
class BehavioralSignals:
    raw: Dict[str, Any]


@dataclass
class CandidateProfile:
    candidate_id: str
    name: str
    summary: str
    years_experience: float
    career_history: List[CareerEntry]
    skills: List[Skill]
    education: List[Education]
    certifications: List[str]
    assessments: List[Assessment]
    behavioral: BehavioralSignals
    languages: List[str]
