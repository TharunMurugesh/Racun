.PHONY: preprocess rank validate test calibrate profile clean install

install:
	pip install -r requirements.txt

preprocess:
	python scripts/preprocess.py --data data/raw/candidates.jsonl.gz

rank:
	time python scripts/rank.py

validate:
	python validate_submission.py submission.csv

test:
	pytest tests/ -v --tb=short

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

test-synthetic:
	pytest tests/synthetic/ -v

test-timing:
	pytest tests/performance/test_timing_full.py -v -s

calibrate:
	python scripts/calibrate.py --input data/raw/sample_candidates.json

profile:
	python -m cProfile -o profile.out scripts/rank.py
	python -m pstats profile.out

clean:
	rm -rf data/cache/ submission.csv profile.out
