import os
import sys
import logging
import argparse

sys.path.insert(0, os.path.abspath("."))

from racun.pipeline.rank import RankerPipeline


def main():
    parser = argparse.ArgumentParser(description="RACUN V2 Ranking Phase (Timed)")
    parser.add_argument("--cache-dir", default="data/cache/", help="Directory containing precomputed artifacts")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    
    pipeline = RankerPipeline()
    pipeline.run(cache_dir=args.cache_dir)

if __name__ == "__main__":
    main()
