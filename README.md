# RACUN V2

RACUN V2, or Requirement-Aware Candidate Understanding and Ranking, is a Python-based candidate ranking system for evaluating candidate profiles against a job description. It parses job requirements, extracts and normalizes candidate evidence, detects suspicious profile patterns, scores each candidate against weighted requirements, and produces a ranked submission file.

The project can be used from the command line or through the included FastAPI web interface. A separate React/Vite frontend is also available for frontend development.

## Key Features

- Parses a job description into structured requirements.
- Loads configurable knowledge files for clusters, ontology, scoring rubrics, evidence rules, and runtime settings.
- Reads candidate records from JSONL or compressed JSONL files.
- Extracts evidence from candidate summaries, skills, career history, education, certifications, assessments, languages, and behavioral signals.
- Normalizes evidence using the configured ontology.
- Detects honeypot or unreliable profiles using configurable integrity rules.
- Optionally prefilters large candidate sets before deeper scoring.
- Scores candidates through requirement satisfaction, cluster weighting, mandatory requirement gates, integrity modifiers, and behavioral modifiers.
- Generates human-readable ranking explanations.
- Writes the top ranked candidates to `submission.csv`.
- Provides a local web interface for starting the pipeline, monitoring progress, clearing cache, viewing top candidates, inspecting candidate reasoning, and downloading CSV output.

## Project Structure

```text
.
|-- config/                 # YAML configuration for ontology, clusters, scoring, evidence, and settings
|-- data/
|   |-- raw/                # Input job description and candidate datasets
|   `-- cache/              # Generated preprocessing and ranking artifacts
|-- frontend/               # Optional React/Vite frontend
|-- racun/                  # Core ranking engine
|   |-- candidate/          # Candidate parsing, evidence extraction, and normalization
|   |-- correlation/        # Requirement-to-candidate evidence correlation
|   |-- filters/            # Honeypot detection and prefiltering
|   |-- jd/                 # Job description parsing and requirement building
|   |-- knowledge/          # Configuration loaders and registries
|   |-- output/             # Ranking and CSV writing
|   |-- pipeline/           # Preprocess and ranking pipelines
|   |-- schemas/            # Data models
|   `-- scoring/            # Requirement, cluster, gate, integrity, and behavioral scoring
|-- scripts/                # Command-line entry points
|-- server/                 # FastAPI application and local web interface
|-- requirements.txt        # Python dependencies
|-- run_local.py            # Starts the FastAPI server and opens the local site
|-- run.ps1                 # Windows launcher
`-- run.sh                  # Linux/macOS launcher
```

## Workflow

RACUN runs in two main phases.

### 1. Preprocessing

The preprocessing phase reads the job description and candidate dataset, then creates reusable cache files under `data/cache/`.

During this phase the system:

1. Parses `data/raw/job_description.md`.
2. Builds structured requirements using `config/clusters.yaml`, `config/ontology.yaml`, and related configuration files.
3. Reads candidates from `data/raw/candidates.jsonl` or `data/raw/candidates.jsonl.gz`.
4. Converts raw candidate records into internal candidate profiles.
5. Detects honeypot candidates and records their IDs.
6. Extracts and normalizes evidence for non-honeypot candidates.
7. Saves requirements, candidates, evidence, and honeypot IDs into cache files.

### 2. Ranking

The ranking phase loads the cached artifacts and computes final candidate scores.

During this phase the system:

1. Loads requirements, candidates, evidence, and honeypot IDs from `data/cache/`.
2. Applies the optional keyword prefilter configured in `config/settings.yaml`.
3. Correlates each candidate's evidence against each requirement.
4. Scores requirement satisfaction using the configured rubrics.
5. Aggregates scores by requirement cluster.
6. Applies mandatory requirement gates, integrity modifiers, and behavioral modifiers.
7. Ranks candidates by final score.
8. Writes the top candidates to `submission.csv`.
9. Saves detailed ranking results to `data/cache/results.pkl` for the API and UI.

## Requirements

- Python 3.10 or newer is recommended.
- `pip` for installing Python dependencies.
- PowerShell on Windows, or Bash on Linux/macOS.
- Node.js and npm are only required if you want to run the separate React frontend in `frontend/`.

## Setup on Windows

Open PowerShell from the project root.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks script execution, run this command in the same terminal and then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Setup on Linux or macOS

Open a terminal from the project root.

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
chmod +x run.sh
```

## Running the Web Application

The simplest way to use the project is through the included FastAPI web interface.

### Windows

```powershell
.\run.ps1
```

### Linux or macOS

```bash
./run.sh
```

You can also start the server directly on any platform:

```bash
python run_local.py
```

The server runs at:

```text
http://127.0.0.1:8000
```

The local site lets you start the full pipeline, monitor progress, clear cached artifacts, inspect the top 100 candidates, open candidate details, view reasoning, and download the generated CSV.

## Running from the Command Line

Use the command-line workflow when you want explicit control over preprocessing and ranking.

### Windows

```powershell
.\venv\Scripts\Activate.ps1
python scripts\preprocess.py --data data\raw\candidates.jsonl.gz --jd data\raw\job_description.md --cache-dir data\cache
python scripts\rank.py --cache-dir data\cache
```

### Linux or macOS

```bash
source venv/bin/activate
python scripts/preprocess.py --data data/raw/candidates.jsonl.gz --jd data/raw/job_description.md --cache-dir data/cache
python scripts/rank.py --cache-dir data/cache
```

After ranking completes, the output file is written to:

```text
submission.csv
```

The output path can be changed in `config/settings.yaml` under `submission.output_path`.

## Optional React Frontend

The `frontend/` directory contains a separate React/Vite frontend. It expects the FastAPI backend to be running on port `8000`; Vite proxies `/api` requests to that backend.

From one terminal, start the backend:

```bash
python run_local.py
```

From another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server normally runs at:

```text
http://localhost:5173
```

## Data Files

The main input files are:

- `data/raw/job_description.md`: the job description used to build ranking requirements.
- `data/raw/candidates.jsonl`: raw candidate records in JSON Lines format.
- `data/raw/candidates.jsonl.gz`: compressed candidate records, useful for command-line preprocessing.
- `data/raw/sample_candidates.json`: sample candidate data used by calibration.

If the FastAPI server starts and required raw data files are missing, it can generate sample data automatically through `server/mock_generator.py`.

Generated artifacts include:

- `data/cache/requirements.pkl`: structured requirements produced from the job description.
- `data/cache/candidates.pkl`: parsed candidate profiles.
- `data/cache/evidence.pkl`: normalized evidence keyed by candidate ID.
- `data/cache/honeypot_ids.pkl`: IDs of candidates flagged by honeypot detection.
- `data/cache/results.pkl`: detailed top ranking results for the API.
- `submission.csv`: final ranked output.

## Configuration

Runtime behavior is controlled through YAML files in `config/`.

- `settings.yaml`: scoring thresholds, depth weights, recency settings, gate modifiers, integrity penalties, prefilter options, and output path.
- `clusters.yaml`: requirement clusters and cluster weights.
- `ontology.yaml`: normalized concepts and aliases used during evidence normalization.
- `evidence_rules.yaml`: evidence trust and honeypot-related rules.
- `rubrics.yaml`: scoring rubrics for requirement satisfaction.

The most commonly adjusted values are:

- `prefilter.enabled`: enables or disables prefiltering before full scoring.
- `prefilter.keep_top_k`: limits how many non-honeypot candidates proceed to full scoring.
- `submission.output_path`: controls where the ranking CSV is written.
- `gate_modifiers`: controls how mandatory requirement satisfaction affects final scores.
- `integrity.penalty_per_flag` and `integrity.floor`: control penalties for questionable evidence.

## API Endpoints

The FastAPI server exposes endpoints used by the local UI and optional frontend.

Important endpoints include:

- `GET /api/status`: returns pipeline state and cache counts.
- `POST /api/pipeline/start`: starts preprocessing and ranking in the background.
- `POST /api/initialize`: starts preprocessing only.
- `POST /api/rank`: starts ranking only.
- `GET /api/rank/results`: returns detailed ranking results.
- `GET /api/rank/csv`: downloads the generated CSV.
- `POST /api/cache/clear`: clears cached pipeline artifacts and output CSV.
- `GET /api/candidate/{cid}`: returns candidate profile details.
- `GET /api/candidate/{cid}/reasoning`: returns score breakdown and explanation for a candidate.
- `GET /api/honeypots`: returns honeypot candidate details.
- `GET /api/metrics`: returns ranking metrics and score distribution.

FastAPI also provides interactive API documentation while the server is running:

```text
http://127.0.0.1:8000/docs
```

## Testing and Validation

A basic import and instantiation check is available:

```bash
python test_init.py
```

If a test suite is present, run:

```bash
pytest
```

The Makefile includes test targets, but some targets reference directories that may not exist in this checkout. Use direct `pytest` commands when in doubt.

## Calibration

The calibration script runs the pipeline on sample candidates and reports score distribution statistics.

```bash
python scripts/calibrate.py --input data/raw/sample_candidates.json --jd data/raw/job_description.md
```

Use this when adjusting scoring weights, thresholds, or rubrics.

## Troubleshooting

### `ModuleNotFoundError` when running scripts

Run commands from the project root and make sure the virtual environment is active.

### `Cache not found. Run preprocessing first.`

Run preprocessing before ranking, or use the web application's Start button to run the full pipeline.

### Port `8000` is already in use

Stop the existing process using port `8000`, or start Uvicorn manually with a different port:

```bash
python -m uvicorn server.app:app --host 127.0.0.1 --port 8001
```

### PowerShell cannot run `run.ps1`

Temporarily allow scripts for the current PowerShell process:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then run:

```powershell
.\run.ps1
```

### The React frontend cannot reach the API

Start the FastAPI backend first. The Vite server proxies `/api` to `http://localhost:8000`.

## Development Notes

- Keep input datasets in `data/raw/`.
- Treat files in `data/cache/` as generated artifacts.
- Update configuration through `config/*.yaml` instead of hard-coding scoring behavior.
- Re-run preprocessing after changing the job description, ontology, evidence rules, clusters, or scoring settings.
- Re-run ranking after changing ranking settings or candidate data.
