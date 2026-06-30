from typing import List
from racun.schemas.requirement import RequirementCluster
from racun.schemas.result import RequirementResult, ClusterResult
from racun.knowledge.registry import RequirementRegistry


class ClusterScorer:

    @staticmethod
    def score_cluster(
        cluster: RequirementCluster,
        req_results: List[RequirementResult],
        registry: RequirementRegistry,
    ) -> ClusterResult:
        cluster_req_ids = set(cluster.req_ids)
        relevant = [r for r in req_results if r.req_id in cluster_req_ids]

        if not relevant:
            return ClusterResult(cluster.cluster_id, 0.0, [])

        total_weight = sum(
            registry.get(r.req_id).weight for r in relevant if registry.get(r.req_id)
        )
        weighted_sum = sum(
            r.requirement_score for r in relevant
        )

        cluster_score = weighted_sum / total_weight if total_weight > 0 else 0.0

        return ClusterResult(cluster.cluster_id, cluster_score, relevant)

    @staticmethod
    def score_all(
        clusters: List[RequirementCluster],
        req_results: List[RequirementResult],
        registry: RequirementRegistry,
    ) -> List[ClusterResult]:
        return [
            ClusterScorer.score_cluster(cluster, req_results, registry)
            for cluster in clusters
        ]
