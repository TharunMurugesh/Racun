from racun.schemas.candidate import BehavioralSignals
from racun.knowledge.loader import KnowledgeBase


class BehavioralScorer:

    @staticmethod
    def compute(
        signals: BehavioralSignals,
        kb: KnowledgeBase,
    ) -> float:
        return 1.0
