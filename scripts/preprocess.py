import os
import sys
import argparse
import logging

sys.path.insert(0, os.path.abspath("."))

from racun.pipeline.preprocess import Preprocessor


def main():
    parser = argparse.ArgumentParser(description="RACUN V2 Preprocessing Phase")
    parser.add_argument("--data", required=True, help="Path to candidates.jsonl.gz")
    parser.add_argument("--jd", default="data/raw/job_description.md", help="Path to job_description.md")
    parser.add_argument("--cache-dir", default="data/cache/", help="Directory to save precomputed artifacts")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    
    preprocessor = Preprocessor()
    preprocessor.run(
        jd_path=args.jd,
        candidates_path=args.data,
        cache_dir=args.cache_dir
    )

if __name__ == "__main__":
    main()
