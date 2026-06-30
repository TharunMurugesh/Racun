from typing import Dict, List, Optional


class ConceptOntology:

    def __init__(self, ontology_data: dict):
        self._canonical_to_synonyms: Dict[str, List[str]] = {}
        self._synonym_to_canonical: Dict[str, str] = {}

        for concept, synonyms in ontology_data.items():
            canonical = concept.lower().strip()
            self._canonical_to_synonyms[canonical] = []

            self._synonym_to_canonical[canonical] = canonical

            if synonyms:
                for syn in synonyms:
                    normalized_syn = syn.lower().strip()
                    self._synonym_to_canonical[normalized_syn] = canonical
                    self._canonical_to_synonyms[canonical].append(normalized_syn)

    def normalize(self, term: str) -> Optional[str]:
        term_lower = term.lower().strip()
        return self._synonym_to_canonical.get(term_lower)

    def synonyms_for(self, concept: str) -> List[str]:
        canonical = concept.lower().strip()
        return self._canonical_to_synonyms.get(canonical, [])

    def all_concepts(self) -> List[str]:
        return list(self._canonical_to_synonyms.keys())

    def all_terms(self) -> List[str]:
        return list(self._synonym_to_canonical.keys())

    def extract_concepts(self, text: str) -> List[str]:
        text_lower = text.lower()
        found = set()

        sorted_terms = sorted(self._synonym_to_canonical.keys(), key=len, reverse=True)
        for term in sorted_terms:
            if term in text_lower:
                canonical = self._synonym_to_canonical[term]
                found.add(canonical)

        return list(found)
