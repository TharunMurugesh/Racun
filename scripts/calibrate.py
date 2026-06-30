import os
import sys
import json
import logging
import argparse
import tempfile
from pathlib import Path
import numpy as np

sys.path.insert(0, os.path.abspath("."))

from racun.pipeline.preprocess import Preprocessor
from racun.pipeline.rank import RankerPipeline


def main():
    parser = argparse.ArgumentParser(description="RACUN V2 Score Calibration")
    parser.add_argument("--input", default="data/raw/sample_candidates.json", help="Path to sample candidates JSON")
    parser.add_argument("--jd", default="data/raw/job_description.md", help="Path to JD")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
    logger = logging.getLogger(__name__)

    if not os.path.exists(args.input):
        logger.error(f"Input file {args.input} not found.")
        sys.exit(1)

    with tempfile.TemporaryDirectory() as tmpdir:
        logger.info(f"Running preprocessing to {tmpdir}...")
        
        preprocessor = Preprocessor()
        
        with open(args.input, "r", encoding="utf-8") as f:
            records = json.load(f)
            
        jsonl_path = os.path.join(tmpdir, "temp.jsonl")
        with open(jsonl_path, "w", encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record) + "\n")
                
        preprocessor.run(
            jd_path=args.jd,
            candidates_path=jsonl_path,
            cache_dir=tmpdir
        )
        
        logger.info("Running scoring pipeline...")
        pipeline = RankerPipeline()
        pipeline.submission_settings["output_path"] = os.path.join(tmpdir, "submission.csv")
        pipeline.submission_settings["top_k"] = len(records) 
        pipeline.run(cache_dir=tmpdir)
        
        # Read results back to analyze
        import csv
        scores = []
        with open(os.path.join(tmpdir, "submission.csv"), "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                scores.append(float(row["score"]))
                
        scores = np.array(scores)
        
        logger.info("======================================")
        logger.info("       CALIBRATION RESULTS            ")
        logger.info("======================================")
        logger.info(f"Sample size:   {len(scores)}")
        logger.info(f"Mean score:    {np.mean(scores):.4f}")
        logger.info(f"Std dev:       {np.std(scores):.4f}")
        logger.info(f"Max score:     {np.max(scores):.4f}")
        logger.info(f"Min score:     {np.min(scores):.4f}")
        logger.info(f"Median score:  {np.median(scores):.4f}")
        logger.info(f"Scores > 0.80: {np.sum(scores > 0.80)} ({(np.sum(scores > 0.80) / len(scores)) * 100:.1f}%)")
        logger.info("======================================")
        
        if np.mean(scores) > 0.60:
            logger.warning("Mean > 0.60: Satisfaction thresholds may be too lenient.")
        if np.std(scores) < 0.10:
            logger.warning("Std dev < 0.10: Scoring is not discriminating. Review hierarchy weights.")
            
if __name__ == "__main__":
    main()
