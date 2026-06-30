from typing import List, Dict, Any
from racun.schemas.requirement import JDRequirement
from racun.knowledge.loader import KnowledgeBase


class RequirementBuilder:

    def __init__(self, kb: KnowledgeBase):
        self._kb = kb

    def build(self, raw_requirements: List[Dict[str, Any]]) -> List[JDRequirement]:
        requirements = []

        cluster_req_counts: Dict[str, int] = {}
        for cluster in self._kb.cluster_registry.all():
            cluster_req_counts[cluster.cluster_id] = len(cluster.req_ids)

        cluster_req_index: Dict[str, List[str]] = {}
        for cluster in self._kb.cluster_registry.all():
            cluster_req_index[cluster.cluster_id] = list(cluster.req_ids)

        assigned_req_ids = set()
        for cluster in self._kb.cluster_registry.all():
            for req_id in cluster.req_ids:
                assigned_req_ids.add(req_id)

        for idx, raw in enumerate(raw_requirements):
            req_id = f"req_{idx + 1:03d}"
            text = raw["text"]
            is_mandatory = raw.get("is_mandatory", True)

            cluster_id = self._determine_cluster(req_id, raw)
            weight = self._compute_weight(req_id, cluster_id)
            keywords, synonyms = self._extract_terms(text)

            req = JDRequirement(
                req_id=req_id,
                text=text,
                cluster=cluster_id,
                weight=weight,
                is_mandatory=is_mandatory,
                keywords=keywords,
                synonyms=synonyms,
            )
            requirements.append(req)
            self._kb.requirement_registry.register(req)

        return requirements

    def _determine_cluster(self, req_id: str, raw: dict) -> str:
        for cluster in self._kb.cluster_registry.all():
            if req_id in cluster.req_ids:
                return cluster.cluster_id

        section = raw.get("section", "").lower()
        text = raw.get("text", "").lower()
        combined = section + " " + text

        cluster_keyword_map = {
            "core_ai_ml": ["machine learning", "deep learning", "neural", "pytorch", "tensorflow", "ml", "model training", "python"],
            "applied_llm": ["llm", "large language model", "rag", "retrieval", "vector", "fine-tuning", "prompt", "generative", "embedding", "gpt"],
            "engineering_practices": ["deploy", "mlops", "kubernetes", "docker", "ci/cd", "cloud", "api", "infrastructure", "production"],
            "domain_experience": ["domain", "industry", "business", "enterprise", "customer", "product"],
        }

        best_cluster = "core_ai_ml"
        best_count = 0
        for cluster_id, keywords in cluster_keyword_map.items():
            count = sum(1 for kw in keywords if kw in combined)
            if count > best_count:
                best_count = count
                best_cluster = cluster_id

        return best_cluster

    def _compute_weight(self, req_id: str, cluster_id: str) -> float:
        cluster = self._kb.cluster_registry.get(cluster_id)
        if cluster is None:
            return 1.0

        req_ids_in_cluster = cluster.req_ids
        if req_id in req_ids_in_cluster:
            n = len(req_ids_in_cluster)
            return round(1.0 / n, 4) if n > 0 else 1.0

        return 0.5

    def _extract_terms(self, text: str):
        concepts = self._kb.concept_ontology.extract_concepts(text)
        keywords = list(concepts)

        synonyms = []
        for concept in concepts:
            for syn in self._kb.concept_ontology.synonyms_for(concept):
                if syn not in synonyms:
                    synonyms.append(syn)

        if not keywords:
            keywords = self._simple_keyword_extract(text)

        return keywords, synonyms

    def _simple_keyword_extract(self, text: str) -> List[str]:
        import re
        tokens = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+#\-\.]{2,}\b", text.lower())
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "have",
            "will", "are", "our", "you", "your", "their", "has", "can",
            "not", "but", "all", "they", "been", "more", "was", "its",
        }
        return [t for t in tokens if t not in stopwords][:10]
