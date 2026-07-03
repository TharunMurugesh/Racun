from typing import List
from racun.schemas.requirement import JDRequirement
from racun.schemas.evidence import EvidenceObject


class EvidenceCollector:

    @staticmethod
    def collect(
        requirement: JDRequirement,
        evidence_objects: List[EvidenceObject],
    ) -> List[EvidenceObject]:
        relevant = []
        search_terms = set(requirement.keywords + requirement.synonyms)
        search_terms_lower = {t.lower() for t in search_terms}

        for ev in evidence_objects:
            ev_terms = set(ev.normalized_concepts)
            ev_text_lower = ev.raw_content.lower()

            concept_match = bool(search_terms & ev_terms)

            keyword_match = False
            if not concept_match:
                for kw in search_terms_lower:
                    if kw in ev_text_lower:
                        keyword_match = True
                        break

            if concept_match or keyword_match:
                relevant.append(ev)

        return relevant
