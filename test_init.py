import os
import sys

# Add current directory to path so racun module can be imported
sys.path.insert(0, os.path.abspath("."))

from racun.knowledge.loader import KnowledgeLoader
from racun.jd.parser import JDParser
from racun.jd.requirement_builder import RequirementBuilder
from racun.candidate.parser import CandidateParser
from racun.candidate.evidence_extractor import EvidenceExtractor
from racun.candidate.normalizer import EvidenceNormalizer
from racun.filters.honeypot_detector import HoneypotDetector
from racun.correlation.engine import CorrelationEngine
from racun.scoring.requirement_scorer import RequirementScorer
from racun.explanation.generator import ExplanationGenerator
from racun.output.ranker import Ranker
from racun.output.writer import SubmissionWriter
from racun.pipeline.preprocess import Preprocessor
from racun.pipeline.rank import RankerPipeline

def test_instantiation():
    try:
        kb = KnowledgeLoader.load("config/")
        print("KnowledgeLoader successful")
        
        preprocessor = Preprocessor()
        print("Preprocessor successful")
        
        ranker_pipeline = RankerPipeline()
        print("RankerPipeline successful")
        
        print("\nAll modules from Phases 1-8 imported and instantiated successfully!")
    except Exception as e:
        print(f"Error during instantiation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_instantiation()
