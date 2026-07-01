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


class KeywordPreFilter(PreFilterInterface):
    """Prefilter that selects the top_k candidates based on keyword matching
    using sklearn's TfidfVectorizer and cosine similarity.
    """

    def build_index(self, candidates: List[CandidateProfile]) -> None:
        pass

    def filter(
        self,
        candidates: List[CandidateProfile],
        requirements: List[JDRequirement],
        keep_top_k: int,
        exclude_ids: Set[str],
    ) -> List[CandidateProfile]:
        # Filter out excluded/honeypot candidates first
        candidates_to_score = [c for c in candidates if c.candidate_id not in exclude_ids]
        if len(candidates_to_score) <= keep_top_k:
            return candidates_to_score

        # Prepare corpus
        corpus = []
        for c in candidates_to_score:
            parts = []
            if c.summary:
                parts.append(c.summary)
            for role in c.career_history:
                if role.role:
                    parts.append(role.role)
                if role.description:
                    parts.append(role.description)
            for s in c.skills:
                if s.name:
                    parts.append(s.name)
            for e in c.education:
                if e.field:
                    parts.append(e.field)
            if c.certifications:
                parts.extend(c.certifications)
            corpus.append(" ".join(parts).lower())

        # Prepare query (all requirements, giving heavier weight to mandatory ones)
        query_parts = []
        for req in requirements:
            multiplier = 2 if req.is_mandatory else 1
            req_words = []
            if req.text:
                req_words.append(req.text)
            if req.keywords:
                req_words.extend(req.keywords)
            if req.synonyms:
                req_words.extend(req.synonyms)
            
            req_str = " ".join(req_words)
            query_parts.append((req_str.lower() + " ") * multiplier)
        query = " ".join(query_parts)

        # Calculate TF-IDF & cosine similarity
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np

        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(corpus)
        query_vec = vectorizer.transform([query])
        
        # Compute cosine similarity
        similarities = (tfidf_matrix * query_vec.T).toarray().flatten()

        # Get top-K indices
        top_indices = np.argsort(similarities)[::-1][:keep_top_k]
        
        # Return top-K candidates
        return [candidates_to_score[idx] for idx in top_indices]

