from typing import List, Dict
from racun.schemas.candidate import CandidateProfile, CareerEntry
from racun.schemas.evidence import EvidenceObject, EvidenceSource
from racun.schemas.result import ValidatedEvidence
from racun.knowledge.evidence_rules import EvidenceRules
from racun.knowledge.ontology import ConceptOntology


class EvidenceValidator:

    DEPTH_BY_SOURCE = {
        EvidenceSource.CAREER: 3,
        EvidenceSource.SUMMARY: 2,
        EvidenceSource.ASSESSMENT: 2,
        EvidenceSource.SKILL: 1,
        EvidenceSource.EDUCATION: 1,
        EvidenceSource.CERTIFICATION: 1,
    }

    @staticmethod
    def validate(
        candidate: CandidateProfile,
        evidence: EvidenceObject,
        rules: EvidenceRules,
        ontology: ConceptOntology,
    ) -> ValidatedEvidence:
        trust = 1.0
        flags = []

        if evidence.source == EvidenceSource.SKILL:
            corroborated = EvidenceValidator._is_skill_corroborated_by_career(
                evidence, candidate.career_history, ontology
            )
            trust = (rules.skill_with_career_corroboration if corroborated
                     else rules.skill_without_career_corroboration)
            if not corroborated:
                flags.append("uncorroborated_skill")

        elif evidence.source == EvidenceSource.ASSESSMENT:
            proficiency = evidence.proficiency_context
            score = EvidenceValidator._get_assessment_score(candidate, evidence.raw_content)
            
            if proficiency and proficiency.lower() == "expert" and score < rules.expert_contradiction_threshold:
                trust *= 0.30
                flags.append("assessment_contradiction")
            elif proficiency and proficiency.lower() == "intermediate" and score < rules.intermediate_contradiction_threshold:
                trust *= 0.50
                flags.append("assessment_contradiction")
            else:
                trust = rules.assessment_alone

        elif evidence.source == EvidenceSource.CAREER:
            assessment_support = EvidenceValidator._has_assessment_support(candidate, evidence, ontology)
            trust = (rules.career_with_assessment_support if assessment_support
                     else rules.career_without_assessment)

        elif evidence.source == EvidenceSource.SUMMARY:
            trust = rules.summary_uncorroborated
            if EvidenceValidator._is_corroborated_by_career(evidence, candidate.career_history, ontology):
                trust = min(trust + 0.30, 0.85)

        if evidence.temporal:
            trust *= evidence.temporal.recency_score

        depth = EvidenceValidator._determine_depth(evidence.source)

        return ValidatedEvidence(
            evidence=evidence,
            trust_score=max(trust, 0.0),
            depth_level=depth,
            flags=flags
        )

    @staticmethod
    def _is_skill_corroborated_by_career(
        evidence: EvidenceObject,
        career_history: List[CareerEntry],
        ontology: ConceptOntology,
    ) -> bool:
        skill_names = evidence.raw_content.split(", ")
        skill_concepts = set()
        for name in skill_names:
            skill_concepts.update(ontology.extract_concepts(name))
            
        for entry in career_history:
            entry_text_lower = entry.description.lower()
            for name in skill_names:
                if name.lower() in entry_text_lower:
                    return True
            for concept in skill_concepts:
                syns = ontology.synonyms_for(concept)
                if any(syn in entry_text_lower for syn in syns):
                    return True
        return False

    @staticmethod
    def _get_assessment_score(candidate: CandidateProfile, raw_content: str) -> float:
        import re
        m = re.search(r"score:\s*([\d\.]+)", raw_content)
        if m:
            return float(m.group(1))
        return 0.0

    @staticmethod
    def _has_assessment_support(
        candidate: CandidateProfile,
        evidence: EvidenceObject,
        ontology: ConceptOntology
    ) -> bool:
        if not candidate.assessments:
            return False
            
        career_text_lower = evidence.raw_content.lower()
        for assessment in candidate.assessments:
            skill_lower = assessment.skill.lower()
            if skill_lower in career_text_lower:
                return True
            
            concepts = ontology.extract_concepts(skill_lower)
            for concept in concepts:
                if any(syn in career_text_lower for syn in ontology.synonyms_for(concept)):
                    return True
        return False

    @staticmethod
    def _is_corroborated_by_career(
        evidence: EvidenceObject,
        career_history: List[CareerEntry],
        ontology: ConceptOntology
    ) -> bool:
        summary_concepts = ontology.extract_concepts(evidence.raw_content)
        if not summary_concepts:
            return False
            
        for entry in career_history:
            entry_text_lower = entry.description.lower()
            for concept in summary_concepts:
                if any(syn in entry_text_lower for syn in ontology.synonyms_for(concept)):
                    return True
        return False

    @staticmethod
    def _determine_depth(source: EvidenceSource) -> int:
        return EvidenceValidator.DEPTH_BY_SOURCE.get(source, 1)
