from typing import Dict, List, Optional
from racun.schemas.requirement import RequirementCluster


class ClusterRegistry:

    def __init__(self, clusters_data: dict):
        self._clusters: Dict[str, RequirementCluster] = {}

        for entry in clusters_data.get("clusters", []):
            cluster = RequirementCluster(
                cluster_id=entry["cluster_id"],
                name=entry["name"],
                weight=float(entry["weight"]),
                req_ids=list(entry.get("req_ids", [])),
            )
            self._clusters[cluster.cluster_id] = cluster

    def get(self, cluster_id: str) -> Optional[RequirementCluster]:
        return self._clusters.get(cluster_id)

    def __getitem__(self, cluster_id: str) -> RequirementCluster:
        return self._clusters[cluster_id]

    def all(self) -> List[RequirementCluster]:
        return list(self._clusters.values())

    def all_ids(self) -> List[str]:
        return list(self._clusters.keys())

    def cluster_for_requirement(self, req_id: str) -> Optional[str]:
        for cluster in self._clusters.values():
            if req_id in cluster.req_ids:
                return cluster.cluster_id
        return None

    def __contains__(self, cluster_id: str) -> bool:
        return cluster_id in self._clusters
