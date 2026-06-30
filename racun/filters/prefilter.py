from abc import ABC, abstractmethod
from typing import List, Set

from racun.schemas.candidate import CandidateProfile
from racun.schemas.requirement import JDRequirement


class PreFilterInterface(ABC):

    @abstractmethod
    def build_index(self, candidates: List[CandidateProfile]) -> None:
        """Called during preprocessing to build any index structure."""
        pass

    @abstractmethod
    def filter(
        self,
        candidates: List[CandidateProfile],
        requirements: List[JDRequirement],
        keep_top_k: int,
        exclude_ids: Set[str],
    ) -> List[CandidateProfile]:
        """Returns at most keep_top_k candidates."""
        pass


class PassThroughFilter(PreFilterInterface):
    """Default: no filtering, all candidates pass except those excluded."""

    def build_index(self, candidates: List[CandidateProfile]) -> None:
        pass

    def filter(
        self,
        candidates: List[CandidateProfile],
        requirements: List[JDRequirement],
        keep_top_k: int,
        exclude_ids: Set[str],
    ) -> List[CandidateProfile]:
        return [c for c in candidates if c.candidate_id not in exclude_ids]
