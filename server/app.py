import os
import sys
import pickle
import yaml
import json
import traceback
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path so racun module can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from racun.pipeline.pickle_helper import (
    count_pickle_stream,
    find_pickle_stream_list_item,
    get_pickle_stream_dict_value,
    iter_pickle_stream_list,
    load_pickle_stream,
)

# Helper to count candidate lines (supports .gz)
def _count_candidates(path: str) -> int:
    """Return number of non‑empty lines in the candidate file (supports .gz)."""
    p = Path(path)
    if not p.exists():
        return 0
    if str(p).endswith('.gz'):
        import gzip
        with gzip.open(p, "rt", encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())
    else:
        with open(p, "r", encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())

from racun.knowledge.loader import KnowledgeLoader, KnowledgeBase
from racun.pipeline.preprocess import Preprocessor
from racun.pipeline.rank import RankerPipeline
from racun.correlation.engine import CorrelationEngine
from racun.scoring.requirement_scorer import RequirementScorer
from racun.scoring.cluster_scorer import ClusterScorer
from racun.scoring.gate_evaluator import GateEvaluator
from racun.scoring.integrity_checker import IntegrityChecker
from racun.scoring.behavioral_scorer import BehavioralScorer
from racun.explanation.generator import ExplanationGenerator
from racun.output.ranker import Ranker
from racun.filters.honeypot_detector import HoneypotDetector
from racun.schemas.result import CandidateResult
from server.mock_generator import generate_mock_data

app = FastAPI(title="RACUN V2 API Server")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve paths relative to the project root (two levels up from this file)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = str(PROJECT_ROOT / "config")
CACHE_DIR = str(PROJECT_ROOT / "data" / "cache")
JD_PATH = str(PROJECT_ROOT / "data" / "raw" / "job_description.md")
CANDIDATES_PATH = str(PROJECT_ROOT / "data" / "raw" / "candidates.jsonl.gz")

# Global state for tracking preprocessing progress
preprocessing_status = {
    "is_running": False,
    "processed_count": 0,
    "total_count": 0,
    "error": None
}

# Global state for tracking ranking progress
ranking_status = {
    "is_running": False,
    "processed_count": 0,
    "total_count": 0,
    "error": None
}

# Global cache for pipeline stats to prevent loading large pickles in status endpoint
_pipeline_stats_cache = {
    "requirements_count": 0,
    "candidates_count": 0,
    "honeypots_count": 0,
    "last_mtimes": {}  # file path -> last modified time to detect changes
}

_honeypot_details_cache = {
    "mtime": None,
    "items": []
}

def update_stats_cache_if_needed():
    global _pipeline_stats_cache
    cache_req = Path(CACHE_DIR) / "requirements.pkl"
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"
    cache_hp = Path(CACHE_DIR) / "honeypot_ids.pkl"
    
    paths = {
        "req": cache_req,
        "cand": cache_cand,
        "hp": cache_hp
    }
    
    changed = False
    mtimes = {}
    for name, p in paths.items():
        if p.exists():
            mtime = p.stat().st_mtime
            mtimes[name] = mtime
            if _pipeline_stats_cache["last_mtimes"].get(name) != mtime:
                changed = True
        else:
            mtimes[name] = None
            if _pipeline_stats_cache["last_mtimes"].get(name) is not None:
                changed = True
                
    if changed:
        _pipeline_stats_cache["last_mtimes"] = mtimes
        
        # Load requirements count
        if cache_req.exists():
            try:
                with open(cache_req, "rb") as f:
                    reqs = pickle.load(f)
                    _pipeline_stats_cache["requirements_count"] = len(reqs)
            except Exception as e:
                print(f"Error loading reqs count: {e}")
        else:
            _pipeline_stats_cache["requirements_count"] = 0
            
        # Load candidates count without materializing the 100k profile cache.
        if cache_cand.exists():
            try:
                _pipeline_stats_cache["candidates_count"] = count_pickle_stream(cache_cand)
            except Exception as e:
                print(f"Error loading cands count: {e}")
        else:
            _pipeline_stats_cache["candidates_count"] = 0
            
        # Load honeypots count
        if cache_hp.exists():
            try:
                with open(cache_hp, "rb") as f:
                    honeypots = pickle.load(f)
                    _pipeline_stats_cache["honeypots_count"] = len(honeypots)
            except Exception as e:
                print(f"Error loading honeypots count: {e}")
        else:
            _pipeline_stats_cache["honeypots_count"] = 0


def run_preprocess_task():
    global preprocessing_status
    try:
        preprocessing_status["is_running"] = True
        preprocessing_status["processed_count"] = 0
        preprocessing_status["error"] = None
        
        # Only call generate_mock_data if the raw candidates file or job description is missing
        # (To protect existing datasets like the 100k candidates)
        if not Path(JD_PATH).exists() or not Path(CANDIDATES_PATH).exists():
            print("Required raw data files missing. Generating automatically...")
            generate_mock_data()
            
        # Compute total candidate count up‑front
        total = _count_candidates(CANDIDATES_PATH)
        preprocessing_status["total_count"] = total
        
        def progress_cb(current: int):
            preprocessing_status["processed_count"] = current
            if current % 100 == 0:
                import time
                time.sleep(0.001)
            
        prep = Preprocessor(CONFIG_DIR)
        prep.run(JD_PATH, CANDIDATES_PATH, CACHE_DIR, progress_callback=progress_cb)
        
        preprocessing_status["is_running"] = False
    except Exception as e:
        traceback.print_exc()
        preprocessing_status["is_running"] = False
        preprocessing_status["error"] = str(e)

def run_ranking_task():
    global ranking_status
    try:
        ranking_status["is_running"] = True
        ranking_status["processed_count"] = 0
        ranking_status["error"] = None
        
        # Count the actual number of candidates the ranker will process. When
        # prefiltering is enabled, RankerPipeline only scores keep_top_k items.
        cache_path = Path(CACHE_DIR)
        with open(cache_path / "honeypot_ids.pkl", "rb") as f:
            honeypot_ids = pickle.load(f)
        candidate_count = count_pickle_stream(cache_path / "candidates.pkl")
        non_honeypot_count = max(0, candidate_count - len(honeypot_ids))
        settings = KnowledgeLoader._load_yaml(Path(CONFIG_DIR) / "settings.yaml")
        prefilter_settings = settings.get("prefilter", {})
        if prefilter_settings.get("enabled", False):
            total = min(non_honeypot_count, prefilter_settings.get("keep_top_k", non_honeypot_count))
        else:
            total = non_honeypot_count
        ranking_status["total_count"] = total
        
        def ranking_progress_cb(current: int):
            ranking_status["processed_count"] = current
            if current % 100 == 0:
                import time
                time.sleep(0.001)
        
        pipeline = RankerPipeline(CONFIG_DIR)
        pipeline.run(CACHE_DIR, progress_callback=ranking_progress_cb)
        
        ranking_status["is_running"] = False
    except Exception as e:
        traceback.print_exc()
        ranking_status["is_running"] = False
        ranking_status["error"] = str(e)

def ensure_mock_data_exists():
    jd_file = Path(JD_PATH)
    gz_file = Path(CANDIDATES_PATH)
    cache_req = Path(CACHE_DIR) / "requirements.pkl"
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"

    if not jd_file.exists() or not gz_file.exists():
        print("Mock data files missing. Generating automatically...")
        generate_mock_data()

    # Only run preprocessing if cache doesn't exist yet
    if not cache_req.exists() or not cache_cand.exists():
        print("Running initial preprocessing pipeline...")
        prep = Preprocessor(CONFIG_DIR)
        prep.run(JD_PATH, CANDIDATES_PATH, CACHE_DIR)
        print("Initial preprocessing complete.")

ensure_mock_data_exists()


@app.get("/api/status")
def get_status():
    jd_file = Path(JD_PATH)
    cand_file = Path(CANDIDATES_PATH)
    cache_req = Path(CACHE_DIR) / "requirements.pkl"
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"
    
    status = {
        "jd_exists": jd_file.exists(),
        "candidates_exists": cand_file.exists(),
        "cache_exists": cache_req.exists() and cache_cand.exists(),
        "requirements_count": 0,
        "candidates_count": 0,
        "honeypots_count": 0,
        "preprocessing": preprocessing_status,
        "ranking": ranking_status
    }
    
    if status["cache_exists"]:
        try:
            update_stats_cache_if_needed()
            status["requirements_count"] = _pipeline_stats_cache["requirements_count"]
            status["candidates_count"] = _pipeline_stats_cache["candidates_count"]
            status["honeypots_count"] = _pipeline_stats_cache["honeypots_count"]
        except Exception:
            pass
            
    return status

@app.post("/api/initialize")
def initialize_pipeline(background_tasks: BackgroundTasks, reset: bool = False):
    global preprocessing_status
    if preprocessing_status["is_running"]:
        return {"status": "processing", "message": "Preprocessing is already running."}
        
    background_tasks.add_task(run_preprocess_task)
    return {"status": "processing", "message": "Preprocessing started in background."}

@app.get("/api/job-description")
def get_job_description():
    jd_path = Path(JD_PATH)
    if not jd_path.exists():
        raise HTTPException(status_code=404, detail="Job description file not found.")
    return {"content": jd_path.read_text(encoding="utf-8")}

@app.post("/api/job-description")
def update_job_description(background_tasks: BackgroundTasks, payload: Dict[str, str] = Body(...)):
    content = payload.get("content", "")
    if not content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty.")
    try:
        Path(JD_PATH).write_text(content, encoding="utf-8")
        
        # Trigger background preprocessing
        global preprocessing_status
        if not preprocessing_status["is_running"]:
            background_tasks.add_task(run_preprocess_task)
            
        return {"status": "success", "message": "Job description updated. Cache rebuild scheduled in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/{file_name}")
def get_config_file(file_name: str):
    file_path = Path(CONFIG_DIR) / f"{file_name}.yaml"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Config file {file_name}.yaml not found.")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return {"file_name": file_name, "content": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/{file_name}")
def update_config_file(file_name: str, background_tasks: BackgroundTasks, data: Dict[str, Any] = Body(...)):
    file_path = Path(CONFIG_DIR) / f"{file_name}.yaml"
    try:
        # Validate that YAML can be dumped
        yaml_str = yaml.safe_dump(data)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(yaml_str)
            
        # Trigger background preprocessing to pick up changes in config
        global preprocessing_status
        if not preprocessing_status["is_running"]:
            background_tasks.add_task(run_preprocess_task)
            
        return {"status": "success", "message": f"Config {file_name}.yaml updated. Cache rebuild scheduled in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidates")
def get_candidates():
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"
    if not cache_cand.exists():
        raise HTTPException(status_code=404, detail="Candidates cache not found. Please run preprocessing first.")
    try:
        candidates = load_pickle_stream(cache_cand)
            
        # Extract metadata
        result = []
        for c in candidates:
            result.append({
                "id": c.candidate_id,
                "name": c.name,
                "summary": c.summary,
                "years_experience": c.years_experience,
                "skills_count": len(c.skills),
                "career_roles": [role.role for role in c.career_history],
                "skills": [s.name for s in c.skills]
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rank")
def start_ranking(background_tasks: BackgroundTasks):
    global ranking_status
    if ranking_status["is_running"]:
        return {"status": "processing", "message": "Ranking is already running."}
    
    # Ensure cache exists
    cache_req = Path(CACHE_DIR) / "requirements.pkl"
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"
    if not cache_req.exists() or not cache_cand.exists():
        raise HTTPException(status_code=400, detail="Cache not found. Run preprocessing first.")
    
    background_tasks.add_task(run_ranking_task)
    return {"status": "processing", "message": "Ranking started in background."}

@app.get("/api/rank/results")
def get_ranking_results():
    """Return the pre-computed ranking results from results.pkl."""
    results_path = Path(CACHE_DIR) / "results.pkl"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="No ranking results found. Run ranking first.")
    try:
        with open(results_path, "rb") as f:
            results_data = pickle.load(f)
        return results_data
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidate/{cid}")
def get_candidate_details(cid: str):
    cache_cand = Path(CACHE_DIR) / "candidates.pkl"
    if not cache_cand.exists():
        raise HTTPException(status_code=404, detail="Candidates cache not found.")
    try:
        c = find_pickle_stream_list_item(cache_cand, lambda cand: cand.candidate_id == cid)
        if not c:
            raise HTTPException(status_code=404, detail="Candidate not found.")
        return {
            "candidate_id": c.candidate_id,
            "name": c.name,
            "summary": c.summary,
            "years_experience": c.years_experience,
            "career_history": [
                {
                    "company": ch.company,
                    "role": ch.role,
                    "industry": ch.industry,
                    "company_size": ch.company_size,
                    "duration_months": ch.duration_months,
                    "start_date": ch.start_date,
                    "end_date": ch.end_date,
                    "description": ch.description,
                    "is_current": ch.is_current
                }
                for ch in c.career_history
            ],
            "skills": [
                {
                    "name": s.name,
                    "normalized": s.normalized,
                    "years": s.years,
                    "proficiency": s.proficiency
                }
                for s in c.skills
            ],
            "education": [
                {
                    "degree": ed.degree,
                    "field": ed.field,
                    "institution": ed.institution,
                    "year": ed.year
                }
                for ed in c.education
            ],
            "certifications": c.certifications,
            "assessments": [
                {
                    "skill": asm.skill,
                    "score": asm.score
                }
                for asm in c.assessments
            ],
            "languages": c.languages,
            "behavioral": c.behavioral.raw
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/candidate/{cid}/reasoning")
def get_candidate_reasoning(cid: str):
    try:
        kb = KnowledgeLoader.load(CONFIG_DIR)
        
        # Load only the requested candidate from the large stream-pickled cache.
        cand = find_pickle_stream_list_item(
            Path(CACHE_DIR) / "candidates.pkl",
            lambda c: c.candidate_id == cid
        )
        if not cand:
            raise HTTPException(status_code=404, detail="Candidate not found.")
            
        with open(Path(CACHE_DIR) / "requirements.pkl", "rb") as f:
            requirements = pickle.load(f)
        # Populate registry so ClusterScorer/GateEvaluator can look up weights
        for req in requirements:
            kb.requirement_registry.register(req)
        evidence = get_pickle_stream_dict_value(Path(CACHE_DIR) / "evidence.pkl", cid, [])
        with open(Path(CACHE_DIR) / "honeypot_ids.pkl", "rb") as f:
            honeypot_ids = pickle.load(f)
            
        settings = KnowledgeLoader._load_yaml(Path(CONFIG_DIR) / "settings.yaml")
        gate_settings = settings.get("gate_modifiers", {})
        integrity_settings = settings.get("integrity", {})
        
        # Check honeypot flags
        from racun.filters.honeypot_detector import HoneypotDetector
        honeypot_rules = kb.evidence_rules
        honeypot_config = settings.get("honeypot", {})
        detector = HoneypotDetector(honeypot_rules, honeypot_config)
        is_honeypot, honeypot_flags = detector.detect(cand)
        
        # Execute correlation engine
        corr_engine = CorrelationEngine()
        corr_results = []
        for req in requirements:
            corr = corr_engine.run(req, cand, evidence, kb)
            corr_results.append(corr)
            
        req_results = RequirementScorer.score_all(corr_results, requirements, kb.scoring_rubrics)
        
        # Map raw correlation details
        req_breakdown = []
        for idx, (corr, req_res) in enumerate(zip(corr_results, req_results)):
            req_def = requirements[idx]
            
            # Collected evidence
            collected_evidence = []
            for ev in corr.collected:
                collected_evidence.append({
                    "source": ev.source.value,
                    "raw_content": ev.raw_content,
                    "normalized_concepts": ev.normalized_concepts,
                    "recency_score": ev.temporal.recency_score if ev.temporal else 1.0,
                    "duration_months": ev.temporal.duration_months if ev.temporal else None
                })
                
            # Validated evidence
            validated_evidence = []
            for val in corr.validated:
                validated_evidence.append({
                    "source": val.evidence.source.value,
                    "trust_score": round(val.trust_score, 4),
                    "depth_level": val.depth_level,
                    "flags": val.flags
                })
                
            req_breakdown.append({
                "req_id": corr.req_id,
                "text": req_def.text,
                "cluster_id": req_def.cluster,
                "weight": req_def.weight,
                "is_mandatory": req_def.is_mandatory,
                "satisfaction": corr.satisfaction.value,
                "score": round(req_res.requirement_score, 4),
                "strength_score": round(corr.strength_score, 4),
                "consistency_score": round(corr.consistency_score, 4),
                "max_depth": corr.max_depth,
                "best_evidence_text": corr.best_evidence_text,
                "collected": collected_evidence,
                "validated": validated_evidence
            })
            
        # Scoring pipeline stats
        clusters = kb.cluster_registry.all()
        cluster_results = ClusterScorer.score_all(clusters, req_results, kb.requirement_registry)
        
        cluster_breakdown = []
        for cr in cluster_results:
            cluster_breakdown.append({
                "cluster_id": cr.cluster_id,
                "name": kb.cluster_registry.get(cr.cluster_id).name,
                "score": round(cr.cluster_score, 4),
                "weight": kb.cluster_registry.get(cr.cluster_id).weight
            })
            
        core_score = sum(cr.cluster_score * kb.cluster_registry.get(cr.cluster_id).weight for cr in cluster_results if kb.cluster_registry.get(cr.cluster_id))
        
        mandatory_reqs = kb.requirement_registry.mandatory()
        gate_mod = GateEvaluator.compute(req_results, mandatory_reqs, gate_settings)
        integrity_mod = IntegrityChecker.compute(cand, kb.evidence_rules, integrity_settings)
        behavior_mod = BehavioralScorer.compute(cand.behavioral, kb)
        
        final_score = core_score * gate_mod * integrity_mod * behavior_mod
        
        reason = ExplanationGenerator.generate(cand, CandidateResult(
            candidate_id=cid,
            final_score=final_score,
            core_score=core_score,
            gate_modifier=gate_mod,
            integrity_modifier=integrity_mod,
            behavior_modifier=behavior_mod,
            cluster_results=cluster_results,
            honeypot_flags=honeypot_flags,
            reason=""
        ), kb)
        
        return {
            "candidate_id": cid,
            "name": cand.name,
            "final_score": round(final_score, 4),
            "core_score": round(core_score, 4),
            "gate_modifier": round(gate_mod, 4),
            "integrity_modifier": round(integrity_mod, 4),
            "behavior_modifier": round(behavior_mod, 4),
            "is_honeypot": is_honeypot,
            "honeypot_flags": honeypot_flags,
            "explanation": reason,
            "requirements": req_breakdown,
            "clusters": cluster_breakdown
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/honeypots")
def get_honeypots():
    try:
        global _honeypot_details_cache
        cache_cand = Path(CACHE_DIR) / "candidates.pkl"
        cache_hp = Path(CACHE_DIR) / "honeypot_ids.pkl"
        mtime = max(cache_cand.stat().st_mtime, cache_hp.stat().st_mtime)
        if _honeypot_details_cache["mtime"] == mtime:
            return _honeypot_details_cache["items"]

        kb = KnowledgeLoader.load(CONFIG_DIR)
        settings = KnowledgeLoader._load_yaml(Path(CONFIG_DIR) / "settings.yaml")
        detector = HoneypotDetector(kb.evidence_rules, settings.get("honeypot", {}))
        with open(cache_hp, "rb") as f:
            honeypot_ids = pickle.load(f)
        
        flagged = []
        remaining = set(honeypot_ids)
        for c in iter_pickle_stream_list(cache_cand):
            if c.candidate_id in remaining:
                _, flags = detector.detect(c)
                flagged.append({
                    "id": c.candidate_id,
                    "name": c.name,
                    "summary": c.summary,
                    "years_experience": c.years_experience,
                    "flags": flags
                })
                remaining.remove(c.candidate_id)
                if not remaining:
                    break
        _honeypot_details_cache = {"mtime": mtime, "items": flagged}
        return flagged
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/honeypot-ids")
def get_honeypot_ids():
    try:
        with open(Path(CACHE_DIR) / "honeypot_ids.pkl", "rb") as f:
            honeypot_ids = pickle.load(f)
        return {"ids": sorted(honeypot_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics")
def get_metrics():
    try:
        # Use cheap cached counts instead of loading the 391 MB candidate cache.
        update_stats_cache_if_needed()
        total_candidates = _pipeline_stats_cache["candidates_count"]
        with open(Path(CACHE_DIR) / "honeypot_ids.pkl", "rb") as f:
            honeypots = pickle.load(f)
            
        # Read scores if submission.csv exists
        scores = []
        sub_path = Path("submission.csv")
        if sub_path.exists():
            import csv
            with open(sub_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    scores.append(float(row["score"]))
        else:
            # Generate default values
            scores = [0.0]
            
        # Create bins for histogram (0.0 to 1.0)
        hist, bin_edges = np.histogram(scores, bins=10, range=(0.0, 1.0))
        distribution = [
            {"bin_start": float(bin_edges[i]), "bin_end": float(bin_edges[i+1]), "count": int(hist[i])}
            for i in range(len(hist))
        ]
        
        return {
            "total_candidates": total_candidates,
            "honeypots_flagged": len(honeypots),
            "mean_score": round(float(np.mean(scores)), 4) if scores else 0.0,
            "std_deviation": round(float(np.std(scores)), 4) if len(scores) > 1 else 0.0,
            "score_distribution": distribution,
            "ranking_completed": sub_path.exists()
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
