from typing import List
from racun.schemas.evidence import EvidenceObject
from racun.knowledge.ontology import ConceptOntology


class EvidenceNormalizer:

    def __init__(self, ontology: ConceptOntology):
        self._ontology = ontology

    def normalize(self, evidence: EvidenceObject) -> EvidenceObject:
        concepts = self._ontology.extract_concepts(evidence.raw_content)
        evidence.normalized_concepts = concepts
        return evidence

    def normalize_all(self, evidence_list: List[EvidenceObject]) -> List[EvidenceObject]:
        for ev in evidence_list:
            self.normalize(ev)
        return evidence_list
