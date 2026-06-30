from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import yaml

from racun.knowledge.registry import RequirementRegistry
from racun.knowledge.ontology import ConceptOntology
from racun.knowledge.rubrics import ScoringRubrics
from racun.knowledge.evidence_rules import EvidenceRules
from racun.knowledge.cluster_registry import ClusterRegistry


@dataclass(frozen=True)
class KnowledgeBase:
    requirement_registry: RequirementRegistry
    concept_ontology: ConceptOntology
    scoring_rubrics: ScoringRubrics
    evidence_rules: EvidenceRules
    cluster_registry: ClusterRegistry


class KnowledgeLoader:

    @staticmethod
    def load(config_dir: str) -> KnowledgeBase:
        config_path = Path(config_dir)

        settings = KnowledgeLoader._load_yaml(config_path / "settings.yaml")
        ontology_data = KnowledgeLoader._load_yaml(config_path / "ontology.yaml")
        clusters_data = KnowledgeLoader._load_yaml(config_path / "clusters.yaml")
        rubrics_data = KnowledgeLoader._load_yaml(config_path / "rubrics.yaml")
        rules_data = KnowledgeLoader._load_yaml(config_path / "evidence_rules.yaml")

        cluster_registry = ClusterRegistry(clusters_data)
        requirement_registry = RequirementRegistry()
        concept_ontology = ConceptOntology(ontology_data)
        scoring_rubrics = ScoringRubrics(settings)
        evidence_rules = EvidenceRules(rules_data)

        KnowledgeLoader._validate(cluster_registry, requirement_registry, concept_ontology, scoring_rubrics)

        return KnowledgeBase(
            requirement_registry=requirement_registry,
            concept_ontology=concept_ontology,
            scoring_rubrics=scoring_rubrics,
            evidence_rules=evidence_rules,
            cluster_registry=cluster_registry,
        )

    @staticmethod
    def _load_yaml(path: Path) -> dict:
        if not path.exists():
            raise FileNotFoundError(f"Required config file not found: {path}")
        with open(path, "r") as f:
            data = yaml.safe_load(f)
        if data is None:
            raise ValueError(f"Config file is empty: {path}")
        return data

    @staticmethod
    def _validate(
        cluster_registry: ClusterRegistry,
        requirement_registry: RequirementRegistry,
        concept_ontology: ConceptOntology,
        scoring_rubrics: ScoringRubrics,
    ) -> None:
        total_weight = sum(c.weight for c in cluster_registry.all())
        if abs(total_weight - 1.0) > 0.001:
            raise ValueError(
                f"Cluster weights must sum to 1.0, got {total_weight:.4f}"
            )

        if scoring_rubrics.depth_weights.get("L0", -1) != 0.0:
            raise ValueError("Depth weight L0 must be exactly 0.0")

        for concept in concept_ontology.all_concepts():
            if concept != concept.lower():
                raise ValueError(f"Ontology concept must be lowercase: '{concept}'")
