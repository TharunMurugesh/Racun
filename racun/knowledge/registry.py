from typing import Dict, List, Optional
from racun.schemas.requirement import JDRequirement


class RequirementRegistry:

    def __init__(self):
        self._requirements: Dict[str, JDRequirement] = {}

    def register(self, requirement: JDRequirement) -> None:
        self._requirements[requirement.req_id] = requirement

    def get(self, req_id: str) -> Optional[JDRequirement]:
        return self._requirements.get(req_id)

    def __getitem__(self, req_id: str) -> JDRequirement:
        return self._requirements[req_id]

    def all(self) -> List[JDRequirement]:
        return list(self._requirements.values())

    def mandatory(self) -> List[JDRequirement]:
        return [r for r in self._requirements.values() if r.is_mandatory]

    def by_cluster(self, cluster_id: str) -> List[JDRequirement]:
        return [r for r in self._requirements.values() if r.cluster == cluster_id]

    def all_ids(self) -> List[str]:
        return list(self._requirements.keys())

    def __contains__(self, req_id: str) -> bool:
        return req_id in self._requirements
