from dataclasses import dataclass, field
from typing import List, Dict, Optional, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from racun.schemas.evidence import EvidenceObject


class SatisfactionLevel(Enum):
    SATISFIED = "satisfied"
    PARTIALLY_SATISFIED = "partially_satisfied"
    WEAKLY_SATISFIED = "weakly_satisfied"
    NOT_SATISFIED = "not_satisfied"

    def __lt__(self, other):
        order = [
            SatisfactionLevel.NOT_SATISFIED,
            SatisfactionLevel.WEAKLY_SATISFIED,
            SatisfactionLevel.PARTIALLY_SATISFIED,
            SatisfactionLevel.SATISFIED,
        ]
        return order.index(self) < order.index(other)

    def __le__(self, other):
        return self == other or self < other

    def __gt__(self, other):
        return other < self

    def __ge__(self, other):
        return self == other or self > other


@dataclass
class ValidatedEvidence:
    evidence: "EvidenceObject"
    trust_score: float
    depth_level: int
    flags: List[str]


@dataclass
class CorrelationResult:
    req_id: str
    collected: List["EvidenceObject"]
    validated: List[ValidatedEvidence]
    strength_score: float
    consistency_score: float
    max_depth: int
    satisfaction: SatisfactionLevel
    best_evidence_text: str


@dataclass
class RequirementResult:
    req_id: str
    satisfaction: SatisfactionLevel
    requirement_score: float
    best_evidence_text: str


@dataclass
class ClusterResult:
    cluster_id: str
    cluster_score: float
    req_results: List[RequirementResult]


@dataclass
class CandidateResult:
    candidate_id: str
    final_score: float
    core_score: float
    gate_modifier: float
    integrity_modifier: float
    behavior_modifier: float
    cluster_results: List[ClusterResult]
    honeypot_flags: List[str]
    reason: str
    rank: Optional[int] = None


@dataclass
class SubmissionRow:
    rank: int
    candidate_id: str
    score: float
    reason: str
