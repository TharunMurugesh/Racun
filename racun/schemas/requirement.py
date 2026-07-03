from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class JDRequirement:
    req_id: str
    text: str
    cluster: str
    weight: float
    is_mandatory: bool
    keywords: List[str]
    synonyms: List[str]


@dataclass(frozen=True)
class RequirementCluster:
    cluster_id: str
    name: str
    weight: float
    req_ids: List[str]
