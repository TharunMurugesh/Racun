# RACUN V2 — Final Implementation Specification
**Requirement-Aware Candidate Understanding and Ranking**
Team Antigravity | Redrob Hackathon
Deadline: July 02, 2026 23:59 IST | Submissions Remaining: 3

---

> This document is the frozen implementation blueprint for RACUN.
> Do not modify the architecture without a written justification and impact assessment.
> Every decision in this document was validated across multiple architecture reviews.

---

## MANDATORY PRE-IMPLEMENTATION CHECKLIST

Before Phase 0 begins, the following must be completed in order:

- [ ] Read `job_description.md` in full, including the hackathon-specific section at the end
- [ ] Read `submission_spec.md` in full, especially Stages 3–5 and evaluation criteria
- [ ] Read `redrob_signals_doc.md` in full — all 23 signals and signal envelope definitions
- [ ] Read `candidate_schema.json` and cross-check against sample_candidates.json
- [ ] Manually inspect 10 records from `sample_candidates.json` to understand real data quality
- [ ] Update `config/evidence_rules.yaml` and `config/ontology.yaml` based on the JD
- [ ] Update `racun/scoring/behavioral_scorer.py` based on the signals doc

**Nothing else starts until this checklist is complete.**

---

## PART 1 — ARCHITECTURE OVERVIEW

### 1.1 System Philosophy

RACUN does not score attributes. RACUN does not match keywords. RACUN does not use pretrained neural models by default.

RACUN reasons about evidence.

For every requirement in the Job Description, RACUN asks one question:

> "What evidence exists that this candidate genuinely satisfies this requirement — and can that evidence be trusted?"

This is the recruiter's reasoning model. A recruiter does not award points for listing "Kubernetes" in a skills section. They ask whether the candidate's career history demonstrates it, whether the timeline makes sense, whether other signals corroborate it. RACUN implements this reasoning deterministically.

### 1.2 Inputs and Outputs

```
Inputs:
  job_description.md       — One fixed Job Description
  candidates.jsonl.gz      — 100,000 candidate profiles (JSONL, gzipped)

Outputs:
  submission.csv           — Top 100 candidates, ranked, with 1–2 sentence reasons
```

### 1.3 Phase Separation

RACUN operates in two completely separated phases.

```
┌─────────────────────────────────────────────────────────────────┐
│                  PREPROCESSING PHASE                            │
│         (No time constraint — executes locally, no network)     │
│                                                                 │
│  All expensive computation runs here, entirely on local disk.   │
│  Outputs are serialized artifacts stored in data/cache/         │
│  No internet connectivity is used or required.                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                RANKING PHASE (Runtime Phase)                    │
│         (Hard limit: 5 minutes / 300 seconds — local only)      │
│                                                                 │
│  Loads precomputed artifacts from local disk.                   │
│  Runs the correlation and scoring pipeline (CPU-only).          │
│  Produces submission.csv.                                       │
│  No internet connectivity is used or required.                  │
└─────────────────────────────────────────────────────────────────┘
```

The 5-minute limit applies exclusively to the ranking phase. No preprocessing work should occur inside `scripts/rank.py`.

> **Execution Environment (Critical):** Both phases execute completely locally on
> the evaluation machine. Neither phase requires or uses internet connectivity.
> The preprocessing phase generates serialized artifacts in `data/cache/` on local
> disk. The ranking phase loads those artifacts from local disk and produces
> `submission.csv` within the 5-minute runtime limit. No network requests, model
> downloads, or external API calls occur in either phase.

### 1.4 Timing Budget (Ranking Phase)

| Stage | Operation | Budget |
|---|---|---|
| 1 | Load all cache artifacts from disk | 15s |
| 2 | (Optional) Pre-filter if configured | 20s |
| 3 | Correlation + Scoring + Explanation for candidates | 230s |
| 4 | Sort + CSV write | 5s |
| **Total** | | **270s** |
| **Safety margin** | | **30s** |

Per-candidate budget at 100k (no pre-filter): **2.3ms** — tight but achievable if preprocessing caches normalized evidence.
Per-candidate budget at 5k (with pre-filter): **46ms** — comfortable for the full reasoning pipeline.

### 1.5 System Architecture Diagram

```
                      PREPROCESSING PHASE
═══════════════════════════════════════════════════════════════

  job_description.md                candidates.jsonl.gz
          │                                  │
          ▼                                  ▼
    ┌───────────┐                    ┌───────────────┐
    │ JD Parser │                    │ Candidate     │
    └─────┬─────┘                    │ Parser        │
          │                          └──────┬────────┘
          ▼                                 │
  ┌──────────────────┐                      ▼
  │ Requirement      │             ┌─────────────────────┐
  │ Builder          │             │ Evidence Extractor  │
  └────────┬─────────┘             └──────────┬──────────┘
           │                                  │
           │          ┌────────────┐          │
           │          │  KNOWLEDGE │          │
           └─────────►│   LAYER   │◄─────────┘
                      │            │
                      │ Registry   │◄──── config/
                      │ Ontology   │      settings.yaml
                      │ Rubrics    │      ontology.yaml
                      │ Rules      │      clusters.yaml
                      │ Clusters   │      rubrics.yaml
                      └─────┬──────┘      evidence_rules.yaml
                            │
                            ▼
                    ┌──────────────────┐
                    │ Concept          │
                    │ Normalizer       │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ Honeypot         │
                    │ Detector         │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  ARTIFACT CACHE  │
                    │  data/cache/     │
                    │  ─────────────  │
                    │  requirements.   │
                    │  pkl             │
                    │  candidates.pkl  │
                    │  evidence.pkl    │
                    │  honeypot_ids.   │
                    │  pkl             │
                    └──────────────────┘

═══════════════════════════════════════════════════════════════
                         RANKING PHASE
═══════════════════════════════════════════════════════════════

                    ┌──────────────────┐
                    │  Load Artifacts  │
                    └──────┬───────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │ (Optional)       │
                    │ Pre-Filter       │
                    │ Interface        │
                    └──────┬───────────┘
                           │
           ┌───────────────────────────────┐
           │  FOR EACH CANDIDATE           │
           │  (skipping honeypots)         │
           └───────────────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │   CORRELATION ENGINE          │
           │   ──────────────────          │
           │   For each requirement:       │
           │                               │
           │   1. Collect Evidence         │
           │   2. Validate Evidence        │
           │   3. Measure Strength         │
           │   4. Measure Consistency      │
           │   5. Determine Satisfaction   │
           │   6. Requirement Score        │
           └──────────────┬────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Cluster Score │
                  │ Aggregation   │
                  └──────┬────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Gate          │
                  │ Evaluator     │
                  └──────┬────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Integrity     │
                  │ Checker       │
                  └──────┬────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Behavioral    │
                  │ Scorer        │
                  └──────┬────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Final Score   │
                  │ Computation   │
                  └──────┬────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Explanation   │
                  │ Generator     │
                  └──────┬────────┘
                         │
           └───────────────────────────────┘
                         │
                         ▼
                  ┌───────────────┐
                  │ Sort → Top100 │
                  │ submission.csv│
                  └───────────────┘
```

---

## PART 2 — DIRECTORY STRUCTURE

```
racun/
│
├── config/
│   ├── settings.yaml             # All tunable thresholds and weights
│   ├── ontology.yaml             # Concept normalization map (hand-built from JD)
│   ├── clusters.yaml             # Requirement cluster definitions and weights
│   ├── rubrics.yaml              # Depth level definitions and scoring rubrics
│   └── evidence_rules.yaml       # Validation rules for evidence trustworthiness
│
├── data/
│   ├── raw/
│   │   ├── candidates.jsonl.gz   # Competition dataset (do not modify)
│   │   ├── sample_candidates.json # First 50 for development
│   │   └── job_description.md    # Competition JD (do not modify)
│   └── cache/                    # Generated by scripts/preprocess.py
│       ├── requirements.pkl      # List[JDRequirement]
│       ├── candidates.pkl        # List[CandidateProfile]
│       ├── evidence.pkl          # Dict[candidate_id, List[EvidenceObject]]
│       └── honeypot_ids.pkl      # Set[str] of flagged candidate IDs
│
├── racun/
│   ├── __init__.py
│   │
│   ├── knowledge/                # Single source of truth for all domain knowledge
│   │   ├── __init__.py
│   │   ├── loader.py             # Loads config files, validates, exposes KnowledgeBase
│   │   ├── registry.py           # RequirementRegistry — all JD requirements
│   │   ├── ontology.py           # ConceptOntology — normalization and synonyms
│   │   ├── rubrics.py            # ScoringRubrics — depth weights, satisfaction thresholds
│   │   ├── evidence_rules.py     # EvidenceRules — validation rule definitions
│   │   └── cluster_registry.py  # ClusterRegistry — cluster definitions and weights
│   │
│   ├── schemas/                  # Canonical internal representations
│   │   ├── __init__.py
│   │   ├── candidate.py          # CandidateProfile and sub-objects
│   │   ├── evidence.py           # EvidenceObject, EvidenceSource, TemporalData
│   │   ├── requirement.py        # JDRequirement, RequirementCluster
│   │   └── result.py             # CorrelationResult, RequirementResult,
│   │                             #   CandidateResult, SubmissionRow
│   │
│   ├── jd/
│   │   ├── __init__.py
│   │   ├── parser.py             # job_description.md → raw requirement text
│   │   └── requirement_builder.py# raw text + KnowledgeBase → JDRequirement objects
│   │
│   ├── candidate/
│   │   ├── __init__.py
│   │   ├── parser.py             # Raw JSON record → CandidateProfile
│   │   ├── evidence_extractor.py # CandidateProfile → List[EvidenceObject]
│   │   └── normalizer.py         # Applies ontology to evidence concepts
│   │
│   ├── filters/
│   │   ├── __init__.py
│   │   ├── honeypot_detector.py  # Rule-based impossibility detection
│   │   └── prefilter.py          # Optional pre-filter interface + default impl
│   │
│   ├── correlation/
│   │   ├── __init__.py
│   │   ├── engine.py             # Orchestrates all 6 steps per requirement
│   │   ├── collector.py          # Step 1: Collect relevant evidence
│   │   ├── validator.py          # Step 2: Validate evidence trustworthiness
│   │   ├── strength_evaluator.py # Step 3: Measure evidence strength
│   │   ├── consistency_evaluator.py # Step 4: Measure cross-source consistency
│   │   └── satisfaction_determiner.py # Step 5: Determine satisfaction level
│   │
│   ├── scoring/
│   │   ├── __init__.py
│   │   ├── requirement_scorer.py # RequirementResult from CorrelationResult
│   │   ├── cluster_scorer.py     # ClusterResult from List[RequirementResult]
│   │   ├── gate_evaluator.py     # GateModifier from mandatory requirements
│   │   ├── integrity_checker.py  # IntegrityModifier from consistency flags
│   │   └── behavioral_scorer.py  # BehaviorModifier from 23 signals (TBD)
│   │
│   ├── explanation/
│   │   ├── __init__.py
│   │   └── generator.py          # CandidateResult → 1-2 sentence reason string
│   │
│   ├── output/
│   │   ├── __init__.py
│   │   ├── ranker.py             # Sort CandidateResults, assign rank 1-100
│   │   └── writer.py             # Write submission.csv
│   │
│   └── pipeline/
│       ├── __init__.py
│       ├── preprocess.py         # Orchestrates entire preprocessing phase
│       └── rank.py               # Orchestrates entire ranking phase (timed)
│
├── scripts/
│   ├── preprocess.py             # CLI entry point for preprocessing phase
│   ├── rank.py                   # CLI entry point for ranking phase
│   └── calibrate.py              # Score distribution analysis and diagnostics
│
├── tests/
│   ├── conftest.py               # Shared fixtures
│   ├── unit/
│   │   ├── test_knowledge_layer.py
│   │   ├── test_candidate_parser.py
│   │   ├── test_evidence_extractor.py
│   │   ├── test_normalizer.py
│   │   ├── test_honeypot_detector.py
│   │   ├── test_collector.py
│   │   ├── test_validator.py
│   │   ├── test_strength_evaluator.py
│   │   ├── test_consistency_evaluator.py
│   │   ├── test_satisfaction_determiner.py
│   │   ├── test_requirement_scorer.py
│   │   ├── test_cluster_scorer.py
│   │   ├── test_gate_evaluator.py
│   │   └── test_explanation_generator.py
│   ├── integration/
│   │   ├── test_correlation_engine.py
│   │   ├── test_scoring_pipeline.py
│   │   └── test_full_pipeline_sample.py
│   ├── synthetic/
│   │   ├── candidate_factory.py  # Creates known-property test candidates
│   │   └── test_synthetic_cases.py
│   └── performance/
│       ├── test_timing_sample.py # Timing on 50-candidate sample
│       └── test_timing_full.py   # Timing on full 100k dataset
│
├── validate_submission.py        # Competition-provided validator (do not modify)
├── requirements.txt
├── Makefile
└── README.md
```

---

## PART 3 — MODULE BREAKDOWN

### 3.1 Knowledge Layer

---

#### `knowledge/loader.py` — KnowledgeLoader

**Purpose:** Load all configuration files, validate them for completeness and consistency, and construct the KnowledgeBase object that all modules receive.

**Inputs:** Config directory path

**Outputs:** `KnowledgeBase` object

**Responsibilities:**
- Load and parse all YAML config files
- Validate required keys exist
- Detect configuration errors before execution begins
- Construct and return a single immutable `KnowledgeBase`

**Dependencies:** PyYAML, all config files

**Time Complexity:** O(C) where C = total config file size — runs once at startup

**Space Complexity:** O(R + S + K) where R = requirements, S = synonyms, K = rules

---

#### `knowledge/registry.py` — RequirementRegistry

**Purpose:** Store all JD requirements with their metadata. Single authoritative source of requirement definitions.

**Inputs:** Parsed requirement data from config

**Outputs:** `Dict[req_id, JDRequirement]`

**Responsibilities:**
- Provide lookup by requirement ID
- Expose mandatory requirements as a distinct list
- Expose requirements grouped by cluster
- Provide all requirement keywords and synonyms for matching

---

#### `knowledge/ontology.py` — ConceptOntology

**Purpose:** Map domain terminology to canonical concepts. Resolve synonyms, aliases, and abbreviations.

**Inputs:** `config/ontology.yaml`

**Outputs:** `normalize(term: str) -> str`, `synonyms_for(concept: str) -> List[str]`

**Responsibilities:**
- Normalize raw text terms to canonical forms
- Provide synonym expansion for matching
- Handle case insensitivity and common abbreviations

**Example:**
```
normalize("Milvus")           → "vector_database"
normalize("LoRA")             → "llm_fine_tuning"
normalize("pgvector")         → "vector_database"
synonyms_for("vector_database") → ["milvus", "pinecone", "qdrant", ...]
```

---

#### `knowledge/rubrics.py` — ScoringRubrics

**Purpose:** Define what constitutes each depth level and satisfaction level. Single source for all scoring thresholds.

**Inputs:** `config/rubrics.yaml`

**Outputs:** Depth weights, satisfaction base scores, satisfaction determination thresholds

**Responsibilities:**
- Expose depth weight table `{L0: 0.0, L1: 0.25, L2: 0.60, L3: 1.0}`
- Expose satisfaction base scores
- Expose thresholds for satisfaction determination
- Expose maximum satisfaction achievable at each depth level

---

#### `knowledge/evidence_rules.py` — EvidenceRules

**Purpose:** Define rules for validating evidence trustworthiness.

**Inputs:** `config/evidence_rules.yaml`

**Outputs:** Validation rule objects consumed by `correlation/validator.py`

**Responsibilities:**
- Assessment contradiction threshold (e.g., claims expert, scores < 0.40)
- Skill duration plausibility threshold (skill years > experience years × factor)
- Timeline overlap tolerance
- Recency decay function parameters

---

#### `knowledge/cluster_registry.py` — ClusterRegistry

**Purpose:** Define requirement clusters and their weights in the final score.

**Inputs:** `config/clusters.yaml`

**Outputs:** `Dict[cluster_id, RequirementCluster]`

**Responsibilities:**
- Store cluster names, weights, and member requirement IDs
- Validate that cluster weights sum to 1.0
- Provide cluster lookup by ID and by requirement ID

---

### 3.2 Schemas

---

#### `schemas/candidate.py`

```python
from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict
from enum import Enum

@dataclass(frozen=True)
class CareerEntry:
    company:          str
    role:             str
    industry:         str
    company_size:     str
    duration_months:  int
    start_date:       Optional[str]
    end_date:         Optional[str]
    description:      str
    is_current:       bool

@dataclass(frozen=True)
class Skill:
    name:         str
    normalized:   str        # set by normalizer after parsing
    years:        Optional[float]
    proficiency:  Optional[str]  # "beginner" | "intermediate" | "expert"

@dataclass(frozen=True)
class Assessment:
    skill:       str
    score:       float       # normalized [0.0, 1.0]

@dataclass(frozen=True)
class Education:
    degree:      str
    field:       str
    institution: str
    year:        Optional[int]

@dataclass
class BehavioralSignals:
    """
    Populated from the 23 redrob_signals fields.
    Specific attribute names are determined after reading redrob_signals_doc.md.
    This class must be updated before behavioral_scorer.py is implemented.
    """
    raw: Dict[str, Any]

@dataclass
class CandidateProfile:
    candidate_id:      str
    name:              str
    summary:           str
    years_experience:  float
    career_history:    List[CareerEntry]
    skills:            List[Skill]
    education:         List[Education]
    certifications:    List[str]
    assessments:       List[Assessment]
    behavioral:        BehavioralSignals
    languages:         List[str]
```

---

#### `schemas/evidence.py`

```python
from dataclasses import dataclass
from typing import Optional, List
from enum import Enum

class EvidenceSource(Enum):
    CAREER      = "career"
    SUMMARY     = "summary"
    SKILL       = "skill"
    ASSESSMENT  = "assessment"
    EDUCATION   = "education"
    CERTIFICATION = "certification"

# Hierarchy weights are defined in KnowledgeBase, not here.
# EvidenceSource is just an identifier.

@dataclass
class TemporalData:
    start_date:       Optional[str]
    end_date:         Optional[str]
    duration_months:  Optional[int]
    is_current:       bool
    recency_score:    float   # 1.0 = current role, decays with age, floor 0.4

@dataclass
class EvidenceObject:
    candidate_id:         str
    source:               EvidenceSource
    raw_content:          str           # original text, unmodified
    normalized_concepts:  List[str]     # concepts after ontology normalization
    temporal:             Optional[TemporalData]
    proficiency_context:  Optional[str] # claimed proficiency if applicable
```

---

#### `schemas/requirement.py`

```python
from dataclasses import dataclass, field
from typing import List

@dataclass(frozen=True)
class JDRequirement:
    req_id:        str
    text:          str           # original requirement text
    cluster:       str           # cluster_id this requirement belongs to
    weight:        float         # importance within cluster [0.0, 1.0]
    is_mandatory:  bool
    keywords:      List[str]     # primary terms from ontology
    synonyms:      List[str]     # synonym expansion from ontology

@dataclass(frozen=True)
class RequirementCluster:
    cluster_id:    str
    name:          str
    weight:        float          # importance in CoreScore [0.0, 1.0]
    req_ids:       List[str]
```

---

#### `schemas/result.py`

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum

class SatisfactionLevel(Enum):
    SATISFIED           = "satisfied"
    PARTIALLY_SATISFIED = "partially_satisfied"
    WEAKLY_SATISFIED    = "weakly_satisfied"
    NOT_SATISFIED       = "not_satisfied"

@dataclass
class ValidatedEvidence:
    evidence:       EvidenceObject
    trust_score:    float   # [0.0, 1.0] — how much to trust this evidence
    depth_level:    int     # 0, 1, 2, or 3
    flags:          List[str]  # any validation flags raised

@dataclass
class CorrelationResult:
    req_id:              str
    collected:           List[EvidenceObject]    # all evidence considered
    validated:           List[ValidatedEvidence] # trust-scored subset
    strength_score:      float                   # [0.0, 1.0]
    consistency_score:   float                   # [0.0, 1.0]
    max_depth:           int                     # highest depth level found
    satisfaction:        SatisfactionLevel
    best_evidence_text:  str                     # for explanation

@dataclass
class RequirementResult:
    req_id:              str
    satisfaction:        SatisfactionLevel
    requirement_score:   float
    best_evidence_text:  str

@dataclass
class ClusterResult:
    cluster_id:    str
    cluster_score: float
    req_results:   List[RequirementResult]

@dataclass
class CandidateResult:
    candidate_id:        str
    final_score:         float
    core_score:          float
    gate_modifier:       float
    integrity_modifier:  float
    behavior_modifier:   float
    cluster_results:     List[ClusterResult]
    honeypot_flags:      List[str]
    reason:              str
    rank:                Optional[int] = None

@dataclass
class SubmissionRow:
    rank:          int
    candidate_id:  str
    score:         float
    reason:        str
```

---

### 3.3 JD Processing

---

#### `jd/parser.py` — JDParser

**Purpose:** Extract raw requirement text from job_description.md.

**Inputs:** Path to job_description.md

**Outputs:** `List[Dict]` of raw requirement sections

**Responsibilities:**
- Parse markdown structure
- Identify must-have vs nice-to-have requirements (read JD first to determine structure)
- Extract requirement text for each item
- Do NOT interpret or score — that is `requirement_builder.py`'s job

**Time Complexity:** O(L) where L = JD length. Runs once in preprocessing.

---

#### `jd/requirement_builder.py` — RequirementBuilder

**Purpose:** Convert raw requirement text into structured `JDRequirement` objects using the Knowledge Layer.

**Inputs:** `List[Dict]` raw requirements, `KnowledgeBase`

**Outputs:** `List[JDRequirement]`

**Responsibilities:**
- Assign req_id to each requirement
- Determine cluster membership (from `cluster_registry`)
- Compute requirement weight from cluster config
- Set `is_mandatory` flag
- Expand keywords and synonyms via ontology

**Time Complexity:** O(R × S) where R = requirements, S = synonyms per requirement

---

### 3.4 Candidate Processing

---

#### `candidate/parser.py` — CandidateParser

**Purpose:** Convert raw JSON record to a `CandidateProfile` object.

**Inputs:** `Dict` (single JSON record from JSONL)

**Outputs:** `CandidateProfile`

**Responsibilities:**
- Map JSON fields to canonical schema fields
- Handle missing or null fields gracefully with defaults
- Parse dates, durations, and numeric fields
- Validate field types — log warnings, do not crash
- Do NOT interpret content — that is `evidence_extractor.py`'s job

**Dependencies:** schemas/candidate.py

**Time Complexity:** O(F) where F = fields per candidate. For 100k candidates: O(100k × F).

**Space Complexity:** O(100k) candidate objects in memory or O(batch_size) if streamed.

---

#### `candidate/evidence_extractor.py` — EvidenceExtractor

**Purpose:** Extract structured `EvidenceObject` instances from a `CandidateProfile`.

**Inputs:** `CandidateProfile`, `KnowledgeBase`

**Outputs:** `List[EvidenceObject]`

**Responsibilities:**
- Create one `EvidenceObject` per career entry (source = CAREER)
- Create one `EvidenceObject` per summary (source = SUMMARY)
- Create one `EvidenceObject` per skill group (source = SKILL)
- Create one `EvidenceObject` per assessment (source = ASSESSMENT)
- Create one `EvidenceObject` per education entry (source = EDUCATION)
- Compute `TemporalData` for time-bearing evidence (career entries)
- Do NOT normalize — that is `normalizer.py`'s job

**Time Complexity:** O(E) where E = evidence objects per candidate

---

#### `candidate/normalizer.py` — EvidenceNormalizer

**Purpose:** Apply the Knowledge Layer ontology to normalize concept terms inside `EvidenceObject` instances.

**Inputs:** `List[EvidenceObject]`, `ConceptOntology`

**Outputs:** `List[EvidenceObject]` with `normalized_concepts` populated

**Responsibilities:**
- Tokenize evidence content
- For each token, query ontology for canonical concept
- Populate `normalized_concepts` list
- Handle multi-word phrases (e.g., "vector database" → "vector_database")

**Time Complexity:** O(E × T) where T = tokens per evidence object

---

### 3.5 Filters

---

#### `filters/honeypot_detector.py` — HoneypotDetector

**Purpose:** Detect candidates with internally impossible or fraudulent profiles. Runs in preprocessing. Flagged candidates are blocklisted before ranking.

**Inputs:** `CandidateProfile`, `EvidenceRules`

**Outputs:** `Tuple[bool, List[str]]` — (is_honeypot, flags)

**Flag Definitions:**

| Flag | Condition |
|---|---|
| `impossible_timeline` | Career entries overlap by > 3 months (two simultaneous full-time roles) |
| `skill_duration_overflow` | Sum of all skill years > total_experience × 1.5 |
| `assessment_contradiction` | Claims "expert" proficiency, assessment score < threshold |
| `experience_inflation` | years_experience > derivable_career_span + 2 |
| `unsupported_expert_cluster` | Claims expert in > N skills with zero career evidence for any of them |
| `phantom_regression` | Career role level decreases implausibly (e.g., CTO → Junior Developer) |

**Disqualification:** `len(flags) >= HONEYPOT_FLAG_THRESHOLD` (default: 2, configurable)

**Important:** After reading `redrob_signals_doc.md`, the signal envelopes may provide additional honeypot indicators. Update this module accordingly.

**Time Complexity:** O(E + S) where E = career entries, S = skills

---

#### `filters/prefilter.py` — PreFilterInterface

**Purpose:** Optional first-pass reduction of candidate pool before the full correlation pipeline.

**Design:** Abstract interface with a default pass-through implementation.

```python
from abc import ABC, abstractmethod
from typing import List, Set

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
        exclude_ids: Set[str]
    ) -> List[CandidateProfile]:
        """Returns at most keep_top_k candidates."""
        pass

class PassThroughFilter(PreFilterInterface):
    """Default: no filtering, all candidates pass."""
    def build_index(self, candidates): pass
    def filter(self, candidates, requirements, keep_top_k, exclude_ids):
        return [c for c in candidates if c.candidate_id not in exclude_ids]
```

**When to activate a real pre-filter:** Only if timing tests on the full 100k dataset demonstrate that the ranking phase exceeds 5 minutes with the pass-through filter. Do not activate preemptively.

**If a real pre-filter is needed:** Implement `KeywordPreFilter` using sklearn's `TfidfVectorizer` + cosine similarity on precomputed matrices. Use ontology terms as the query vocabulary. This is deterministic, uses your own vocabulary, and requires no external retrieval library.

---

### 3.6 Correlation Engine

*(Full design in Part 6)*

---

#### `correlation/engine.py` — CorrelationEngine

**Purpose:** For a single candidate and all JD requirements, run the 6-step reasoning pipeline and return a `CorrelationResult` per requirement.

**Inputs:** `CandidateProfile`, `List[EvidenceObject]`, `List[JDRequirement]`, `KnowledgeBase`

**Outputs:** `List[CorrelationResult]`

**Responsibilities:** Orchestrate steps 1–5 by delegating to sub-modules, then compute the `CorrelationResult`.

**Time Complexity:** O(R × E) where R = requirements, E = evidence objects per candidate

---

#### `correlation/collector.py` — EvidenceCollector

**Purpose:** Step 1. Find all evidence objects relevant to a given requirement.

**Time Complexity:** O(E × K) where K = keywords per requirement

---

#### `correlation/validator.py` — EvidenceValidator

**Purpose:** Step 2. Assign a trust score to each evidence object.

**Time Complexity:** O(E) per requirement

---

#### `correlation/strength_evaluator.py` — StrengthEvaluator

**Purpose:** Step 3. Measure the strength of validated evidence.

**Time Complexity:** O(V) where V = validated evidence count

---

#### `correlation/consistency_evaluator.py` — ConsistencyEvaluator

**Purpose:** Step 4. Measure cross-source agreement.

**Time Complexity:** O(V²) — acceptable since V is typically 2–8

---

#### `correlation/satisfaction_determiner.py` — SatisfactionDeterminer

**Purpose:** Step 5. Determine satisfaction level from strength and consistency.

**Time Complexity:** O(1)

---

### 3.7 Scoring

---

#### `scoring/requirement_scorer.py` — RequirementScorer

**Purpose:** Convert a `CorrelationResult` into a `RequirementResult` with a numeric score.

**Inputs:** `CorrelationResult`, `KnowledgeBase`

**Outputs:** `RequirementResult`

---

#### `scoring/cluster_scorer.py` — ClusterScorer

**Purpose:** Aggregate requirement scores within a cluster into a `ClusterResult`.

**Inputs:** `List[RequirementResult]`, `ClusterRegistry`

**Outputs:** `List[ClusterResult]`

---

#### `scoring/gate_evaluator.py` — GateEvaluator

**Purpose:** Compute gate modifier based on mandatory requirement satisfaction.

**Inputs:** `List[RequirementResult]`, `RequirementRegistry`

**Outputs:** `float` (GateModifier)

---

#### `scoring/integrity_checker.py` — IntegrityChecker

**Purpose:** Compute integrity modifier from internal consistency violations.

**Inputs:** `CandidateProfile`, `EvidenceRules`

**Outputs:** `float` (IntegrityModifier)

---

#### `scoring/behavioral_scorer.py` — BehavioralScorer

**Purpose:** Compute behavior modifier from the 23 redrob_signals.

**Inputs:** `BehavioralSignals`, `KnowledgeBase`

**Outputs:** `float` (BehaviorModifier)

**Status:** STUB — implement only after reading `redrob_signals_doc.md`. Return 1.0 until then.

```python
def compute_behavior_modifier(signals: BehavioralSignals, kb: KnowledgeBase) -> float:
    # TODO: Implement after reading redrob_signals_doc.md
    # IMPORTANT: Do not implement behavioral scoring with guesses.
    # The signal envelopes are designed to trap naive integrations.
    return 1.0
```

---

### 3.8 Explanation and Output

---

#### `explanation/generator.py` — ExplanationGenerator

**Purpose:** Generate a 1–2 sentence human-readable reason for each top-100 candidate.

**Inputs:** `CandidateProfile`, `CandidateResult`, `KnowledgeBase`

**Outputs:** `str` (reason text, 10–60 words)

---

#### `output/ranker.py` — Ranker

**Purpose:** Sort all `CandidateResult` objects by `final_score`, select top 100, assign ranks.

**Inputs:** `List[CandidateResult]`

**Outputs:** `List[CandidateResult]` (top 100, ranked)

---

#### `output/writer.py` — SubmissionWriter

**Purpose:** Write top 100 results to `submission.csv` in the competition format.

**Inputs:** `List[CandidateResult]`, output path

**Outputs:** submission.csv

---

## PART 4 — COMPLETE DATA FLOW

```
PREPROCESSING PHASE
(All operations run locally — no network connectivity)

job_description.md
    │
    │  JDParser
    ▼
List[raw requirement dicts]
    │
    │  RequirementBuilder (uses KnowledgeBase)
    ▼
List[JDRequirement]
    │
    └─────────────────────────► requirements.pkl


candidates.jsonl.gz
    │
    │  (stream line by line)
    │  CandidateParser
    ▼
CandidateProfile                     (per candidate, batched)
    │
    │  EvidenceExtractor
    ▼
List[EvidenceObject]  (raw)
    │
    │  EvidenceNormalizer (uses ConceptOntology)
    ▼
List[EvidenceObject]  (normalized)
    │
    ├──────────────────────────────► evidence.pkl
    │
    │  HoneypotDetector (uses EvidenceRules)
    ▼
(is_honeypot: bool, flags: List[str])
    │
    └──────────────────────────────► honeypot_ids.pkl

All CandidateProfile objects ──────► candidates.pkl

(Optional) PreFilterInterface.build_index()


RANKING PHASE (timed — 5 minute hard limit, local execution, no network)

Load: requirements.pkl, candidates.pkl, evidence.pkl, honeypot_ids.pkl

For each candidate:
    if candidate.candidate_id in honeypot_ids: continue
    
    evidence_objects = evidence[candidate.candidate_id]
    
    correlation_results = []
    for requirement in requirements:
        
        # Step 1
        collected = EvidenceCollector.collect(requirement, evidence_objects)
        
        # Step 2
        validated = EvidenceValidator.validate(requirement, collected)
        
        # Step 3
        strength = StrengthEvaluator.evaluate(validated, rubrics)
        
        # Step 4
        consistency = ConsistencyEvaluator.evaluate(validated)
        
        # Step 5
        satisfaction = SatisfactionDeterminer.determine(strength, consistency, max_depth)
        
        correlation_results.append(CorrelationResult(...))
    
    # Scoring
    req_results    = RequirementScorer.score_all(correlation_results)
    cluster_results = ClusterScorer.score_all(req_results)
    core_score     = sum(cr.cluster_score × cluster_weight for cr in cluster_results)
    gate_mod       = GateEvaluator.compute(req_results, mandatory_reqs)
    integrity_mod  = IntegrityChecker.compute(candidate_profile)
    behavior_mod   = BehavioralScorer.compute(candidate.behavioral)
    final_score    = core_score × gate_mod × integrity_mod × behavior_mod
    
    # Explanation
    reason = ExplanationGenerator.generate(candidate, result, cluster_results)
    
    results.append(CandidateResult(...))

# Output
top_100 = Ranker.rank(results)
SubmissionWriter.write(top_100, "submission.csv")
```

---

## PART 5 — KNOWLEDGE LAYER DESIGN

### 5.1 Architecture

The Knowledge Layer is initialized once at startup and injected into every module that requires domain knowledge. No module hardcodes a weight, threshold, or rule. Everything is configurable.

```python
@dataclass(frozen=True)
class KnowledgeBase:
    requirement_registry:  RequirementRegistry
    concept_ontology:      ConceptOntology
    scoring_rubrics:       ScoringRubrics
    evidence_rules:        EvidenceRules
    cluster_registry:      ClusterRegistry
```

### 5.2 Initialization

```python
# Called once at the start of both preprocess.py and rank.py
kb = KnowledgeLoader.load("config/")
```

### 5.3 Configuration Files

#### `config/settings.yaml`

```yaml
# Depth weights (non-cardinal)
depth_weights:
  L0: 0.00
  L1: 0.25
  L2: 0.60
  L3: 1.00

# Evidence hierarchy weights
hierarchy_weights:
  CAREER:       1.00
  SUMMARY:      0.50
  SKILL:        0.25
  ASSESSMENT:   0.40
  EDUCATION:    0.15
  CERTIFICATION: 0.20

# Satisfaction base scores
satisfaction_scores:
  SATISFIED:           1.00
  PARTIALLY_SATISFIED: 0.60
  WEAKLY_SATISFIED:    0.25
  NOT_SATISFIED:       0.00

# Satisfaction determination thresholds
satisfaction_thresholds:
  satisfied:
    min_depth:       3
    min_strength:    0.65
    min_consistency: 0.65
  partially_satisfied:
    min_depth:       2
    min_strength:    0.45
    min_consistency: 0.45
  weakly_satisfied:
    min_depth:       1
    min_strength:    0.20

# Gate modifiers
gate_modifiers:
  all_mandatory_met:      1.00
  partially_met:          0.75
  weakly_met:             0.55
  mandatory_not_met:      0.40

# Integrity checker
integrity:
  penalty_per_flag:       0.10
  floor:                  0.60

# Behavioral modifier bounds (calibrate after reading signals doc)
behavior:
  max_upside:             1.10
  max_downside:           0.85

# Honeypot detection
honeypot:
  flag_threshold:         2
  skill_overflow_ratio:   1.5
  expert_assessment_floor: 0.40
  min_unsupported_experts: 5

# Recency decay
recency:
  current_role_score:     1.00
  decay_per_year:         0.08
  floor:                  0.40

# Pre-filter (optional)
prefilter:
  enabled:                false
  keep_top_k:             5000

# Output
submission:
  top_k:                  100
  output_path:            "submission.csv"
```

#### `config/ontology.yaml`

```yaml
# Hand-built from JD analysis. Spend 3-4 hours on this.
# Format: canonical_concept: [synonyms, abbreviations, aliases]
# THIS FILE IS THE MOST IMPORTANT CALIBRATION LEVER IN RACUN.

vector_database:
  - "vector db"
  - "milvus"
  - "pinecone"
  - "chroma"
  - "chromadb"
  - "qdrant"
  - "weaviate"
  - "faiss"
  - "pgvector"
  - "annoy"
  - "scann"

retrieval_augmented_generation:
  - "rag"
  - "r.a.g."
  - "semantic search"
  - "knowledge retrieval"
  - "document retrieval"
  - "enterprise search"
  - "grounded generation"

llm_fine_tuning:
  - "fine-tuning"
  - "finetuning"
  - "fine tuning"
  - "lora"
  - "qlora"
  - "peft"
  - "parameter efficient"
  - "adapter tuning"
  - "instruction tuning"
  - "sft"
  - "supervised fine-tuning"

# Add entries specific to your JD after reading it.
# Every key term in the JD that has synonyms must appear here.
```

#### `config/clusters.yaml`

```yaml
# To be defined after reading job_description.md
# Structure example:
clusters:
  - cluster_id: "core_technical"
    name: "Core Technical Skills"
    weight: 0.50
    req_ids: ["req_001", "req_002", "req_003"]

  - cluster_id: "applied_ai"
    name: "Applied AI/ML Experience"
    weight: 0.30
    req_ids: ["req_004", "req_005"]

  - cluster_id: "engineering_practices"
    name: "Engineering Practices"
    weight: 0.20
    req_ids: ["req_006", "req_007"]

# Cluster weights must sum to 1.0
# Actual clusters must be derived from the JD
```

#### `config/rubrics.yaml`

```yaml
# Depth level definitions — what qualifies as each level
depth_definitions:
  L0:
    description: "No evidence found for this requirement"
    examples: ["No mention in any field"]

  L1:
    description: "Skill listing only, no supporting context"
    examples:
      - "Listed as a skill with no career or project context"
      - "Mentioned in summary without corroboration"

  L2:
    description: "Project or summary evidence present"
    examples:
      - "Personal project description mentions requirement"
      - "Summary describes relevant capability"
      - "Non-production context"

  L3:
    description: "Professional production career evidence"
    examples:
      - "Career history role description directly mentions requirement"
      - "Multiple career entries demonstrate ongoing use"
      - "Professional context, sustained duration"
```

#### `config/evidence_rules.yaml`

```yaml
# Rules for evidence validation
# These are interpreted by EvidenceValidator

assessment_rules:
  # If claimed proficiency is expert but assessment score is below this threshold → contradiction flag
  expert_contradiction_threshold: 0.40
  intermediate_contradiction_threshold: 0.20

timeline_rules:
  # Maximum allowed overlap between two full-time career entries (months)
  max_overlap_months: 3

skill_duration_rules:
  # If sum_of_skill_years > years_experience × ratio → overflow flag
  overflow_ratio: 1.5

trust_adjustments:
  # Base trust adjustments by evidence source (before temporal adjustment)
  skill_without_career_corroboration: 0.40
  skill_with_career_corroboration:    0.90
  career_with_assessment_support:     0.95
  career_without_assessment:          0.80
  summary_uncorroborated:             0.50
  assessment_alone:                   0.70
```

### 5.4 Validation

`KnowledgeLoader.load()` must validate:
- All cluster weights sum to 1.0 ±0.001
- All requirement IDs referenced in clusters exist in registry
- All mandatory requirements have at least one associated cluster
- All ontology entries are lowercase
- Depth weight L0 = 0.0 exactly

---

## PART 6 — CORRELATION ENGINE DESIGN

This is the most important section. The correlation engine implements the recruiter reasoning model.

### 6.1 Overview

For every `(JDRequirement, CandidateProfile)` pair, the engine runs 5 sequential steps that produce a `CorrelationResult`. Each step has a single responsibility and a clear interface.

### 6.2 Step 1 — Evidence Collection

**Module:** `correlation/collector.py`

**Question asked:** "Which of this candidate's evidence objects could possibly support this requirement?"

**Logic:**

```python
def collect(
    requirement: JDRequirement,
    evidence_objects: List[EvidenceObject]
) -> List[EvidenceObject]:

    relevant = []
    search_terms = set(requirement.keywords + requirement.synonyms)

    for ev in evidence_objects:
        ev_terms = set(ev.normalized_concepts)
        ev_text_lower = ev.raw_content.lower()

        # Match 1: normalized concept overlap
        concept_match = bool(search_terms & ev_terms)

        # Match 2: keyword substring in raw content
        keyword_match = any(kw.lower() in ev_text_lower for kw in search_terms)

        if concept_match or keyword_match:
            relevant.append(ev)

    return relevant
```

If `relevant` is empty, the requirement cannot be satisfied. The engine short-circuits to `SatisfactionLevel.NOT_SATISFIED`.

### 6.3 Step 2 — Evidence Validation

**Module:** `correlation/validator.py`

**Question asked:** "Can we trust this evidence? How much?"

**Logic:**

Each evidence object receives a `trust_score` based on the rules in `EvidenceRules`.

```python
def validate(
    candidate: CandidateProfile,
    evidence: EvidenceObject,
    rules: EvidenceRules
) -> ValidatedEvidence:

    trust = 1.0
    flags = []

    if evidence.source == EvidenceSource.SKILL:
        # Check if this skill appears in career history
        corroborated = _is_skill_corroborated_by_career(
            evidence, candidate.career_history, candidate.kb.ontology
        )
        trust = (rules.skill_with_career_corroboration if corroborated
                 else rules.skill_without_career_corroboration)
        if not corroborated:
            flags.append("uncorroborated_skill")

    elif evidence.source == EvidenceSource.ASSESSMENT:
        # Check if assessment score aligns with any claimed proficiency
        proficiency = evidence.proficiency_context
        score = _get_assessment_score(candidate, evidence)
        if proficiency == "expert" and score < rules.expert_contradiction_threshold:
            trust *= 0.30
            flags.append("assessment_contradiction")
        else:
            trust = rules.assessment_alone

    elif evidence.source == EvidenceSource.CAREER:
        # Career evidence is highest base trust
        assessment_support = _has_assessment_support(candidate, evidence)
        trust = (rules.career_with_assessment_support if assessment_support
                 else rules.career_without_assessment)

    elif evidence.source == EvidenceSource.SUMMARY:
        trust = rules.summary_uncorroborated
        # Trust increases if summary claim is corroborated by career
        if _is_corroborated_by_career(evidence, candidate.career_history):
            trust = min(trust + 0.30, 0.85)

    # Apply temporal decay
    if evidence.temporal:
        trust *= evidence.temporal.recency_score

    depth = _determine_depth(evidence.source)

    return ValidatedEvidence(
        evidence=evidence,
        trust_score=max(trust, 0.0),
        depth_level=depth,
        flags=flags
    )
```

**Depth Assignment by Source:**

```python
DEPTH_BY_SOURCE = {
    EvidenceSource.CAREER:        3,
    EvidenceSource.SUMMARY:       2,
    EvidenceSource.ASSESSMENT:    2,
    EvidenceSource.SKILL:         1,
    EvidenceSource.EDUCATION:     1,
    EvidenceSource.CERTIFICATION: 1,
}
```

### 6.4 Step 3 — Strength Evaluation

**Module:** `correlation/strength_evaluator.py`

**Question asked:** "How strong is the best available validated evidence?"

```python
def evaluate(
    validated: List[ValidatedEvidence],
    hierarchy_weights: Dict[EvidenceSource, float]
) -> Tuple[float, int]:  # (strength_score, max_depth)

    if not validated:
        return 0.0, 0

    scored = []
    for v in validated:
        hier_w = hierarchy_weights[v.evidence.source]
        strength = v.trust_score * hier_w
        scored.append((strength, v.depth_level))

    scored.sort(reverse=True, key=lambda x: x[0])
    max_depth = max(v.depth_level for v in validated)

    # Best evidence dominates; secondary adds diminishing signal
    weights = [1.0, 0.30, 0.10]
    strength_score = min(
        sum(s * w for (s, _), w in zip(scored, weights)),
        1.0
    )

    return strength_score, max_depth
```

### 6.5 Step 4 — Consistency Evaluation

**Module:** `correlation/consistency_evaluator.py`

**Question asked:** "Do multiple sources of evidence agree about this requirement?"

```python
def evaluate(validated: List[ValidatedEvidence]) -> float:

    if len(validated) <= 1:
        # Single source: moderate consistency, not high, not low
        return 0.60 if validated else 0.0

    source_types = {v.evidence.source for v in validated}
    n_sources = len(source_types)

    # Multiple distinct sources corroborate each other
    base = min(0.50 + (n_sources - 1) * 0.15, 1.0)

    # Check for conflicting signals
    has_assessment_contradiction = any(
        "assessment_contradiction" in v.flags for v in validated
    )
    has_uncorroborated_only = all(
        "uncorroborated_skill" in v.flags for v in validated
        if v.evidence.source == EvidenceSource.SKILL
    )

    if has_assessment_contradiction:
        base *= 0.60
    if has_uncorroborated_only and n_sources == 1:
        base *= 0.70

    return min(max(base, 0.0), 1.0)
```

### 6.6 Step 5 — Satisfaction Determination

**Module:** `correlation/satisfaction_determiner.py`

**Question asked:** "Given all evidence, is this requirement satisfied?"

This is the decision function. Depth sets the ceiling on achievable satisfaction. Strength and consistency determine where within that ceiling the candidate lands.

```python
def determine(
    strength_score:    float,
    consistency_score: float,
    max_depth:         int,
    thresholds:        SatisfactionThresholds
) -> SatisfactionLevel:

    # Depth is the ceiling — no amount of consistency can overcome weak evidence
    if max_depth == 0:
        return SatisfactionLevel.NOT_SATISFIED

    if max_depth >= 3:
        if (strength_score    >= thresholds.satisfied.min_strength and
            consistency_score >= thresholds.satisfied.min_consistency):
            return SatisfactionLevel.SATISFIED
        elif (strength_score    >= thresholds.partially_satisfied.min_strength and
              consistency_score >= thresholds.partially_satisfied.min_consistency):
            return SatisfactionLevel.PARTIALLY_SATISFIED
        else:
            return SatisfactionLevel.WEAKLY_SATISFIED

    elif max_depth == 2:
        if (strength_score    >= thresholds.partially_satisfied.min_strength and
            consistency_score >= thresholds.partially_satisfied.min_consistency):
            return SatisfactionLevel.PARTIALLY_SATISFIED
        else:
            return SatisfactionLevel.WEAKLY_SATISFIED

    else:  # max_depth == 1
        return SatisfactionLevel.WEAKLY_SATISFIED
```

**Depth ceiling summary:**

| Max Depth | Maximum Achievable Satisfaction |
|---|---|
| L0 | NOT_SATISFIED |
| L1 | WEAKLY_SATISFIED |
| L2 | PARTIALLY_SATISFIED |
| L3 | SATISFIED |

---

## PART 7 — SCORING ENGINE

### 7.1 Requirement Score

```python
def score(
    correlation: CorrelationResult,
    requirement: JDRequirement,
    rubrics:     ScoringRubrics
) -> RequirementResult:

    satisfaction_base = rubrics.satisfaction_scores[correlation.satisfaction]

    # satisfaction_base already accounts for depth ceiling.
    # requirement.weight is the importance of this requirement within its cluster.
    requirement_score = satisfaction_base * requirement.weight

    return RequirementResult(
        req_id=requirement.req_id,
        satisfaction=correlation.satisfaction,
        requirement_score=requirement_score,
        best_evidence_text=correlation.best_evidence_text
    )
```

### 7.2 Cluster Score

```python
def score_cluster(
    cluster:     RequirementCluster,
    req_results: List[RequirementResult]
) -> ClusterResult:

    cluster_req_ids = set(cluster.req_ids)
    relevant = [r for r in req_results if r.req_id in cluster_req_ids]

    if not relevant:
        return ClusterResult(cluster.cluster_id, 0.0, [])

    # Weighted average (not sum) — prevents clusters with many requirements
    # from automatically outscoring clusters with few
    total_weight = sum(
        kb.requirement_registry[r.req_id].weight for r in relevant
    )
    weighted_sum = sum(
        r.requirement_score for r in relevant
    )

    cluster_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    return ClusterResult(cluster.cluster_id, cluster_score, relevant)
```

### 7.3 Core Score

```python
core_score = sum(
    cr.cluster_score * kb.cluster_registry[cr.cluster_id].weight
    for cr in cluster_results
)
# Cluster weights sum to 1.0, so core_score ∈ [0.0, 1.0]
```

### 7.4 Gate Modifier

```python
def compute_gate_modifier(
    req_results: List[RequirementResult],
    mandatory_reqs: List[JDRequirement],
    settings: GateSettings
) -> float:

    if not mandatory_reqs:
        return 1.0

    results_by_id = {r.req_id: r for r in req_results}
    worst = SatisfactionLevel.SATISFIED

    for req in mandatory_reqs:
        result = results_by_id.get(req.req_id)
        if result is None:
            return settings.mandatory_not_met  # immediate minimum
        if result.satisfaction.value < worst.value:
            worst = result.satisfaction

    mapping = {
        SatisfactionLevel.SATISFIED:           settings.all_mandatory_met,
        SatisfactionLevel.PARTIALLY_SATISFIED: settings.partially_met,
        SatisfactionLevel.WEAKLY_SATISFIED:    settings.weakly_met,
        SatisfactionLevel.NOT_SATISFIED:       settings.mandatory_not_met,
    }
    return mapping[worst]
```

### 7.5 Integrity Modifier

```python
def compute_integrity_modifier(
    candidate: CandidateProfile,
    rules:     EvidenceRules,
    settings:  IntegritySettings
) -> float:

    flags = []

    # Soft contradiction: claimed expert, assessment below softer threshold
    for assessment in candidate.assessments:
        claimed = _get_claimed_proficiency(candidate, assessment.skill)
        if claimed == "expert" and assessment.score < 0.55:
            flags.append(f"soft_assessment_mismatch:{assessment.skill}")

    # Career gap without explanation (> 12 months)
    if _has_unexplained_gap(candidate.career_history, min_months=12):
        flags.append("unexplained_career_gap")

    # Skill years exceeding experience
    total_skill_years = sum(s.years for s in candidate.skills if s.years)
    if total_skill_years > candidate.years_experience:
        flags.append("skill_years_inconsistency")

    modifier = 1.0 - len(flags) * settings.penalty_per_flag
    return max(modifier, settings.floor)
```

### 7.6 Behavioral Modifier

```python
def compute_behavior_modifier(
    signals:  BehavioralSignals,
    settings: BehaviorSettings,
    rules:    BehaviorRules  # defined after reading signals doc
) -> float:
    # STUB — implement after reading redrob_signals_doc.md
    # Do not guess at signal semantics.
    # The signal envelopes are designed to trap naive implementations.
    return 1.0
```

### 7.7 Final Score

```python
final_score = core_score * gate_modifier * integrity_modifier * behavior_modifier
```

All components are multiplicative. There are no additive adjustments after the base score.

`final_score ∈ [0.0, 1.0]` in normal cases. BehaviorModifier upside cap (1.10) can push it marginally above 1.0 for exceptional behavioral signals.

> **Compliance Note — Score Clamping:** `submission.csv` must contain scores
> that pass the competition validator. Clamp `final_score` to `[0.0, 1.0]` in
> `output/writer.py` before writing to CSV. Apply clamping **after** ranking, not
> before — the internal ranking must use the unclamped score so that high-performing
> behavioral signals still produce correct ordering. Only the value written to CSV
> is clamped. This is not a redesign of the scoring model; it is an output
> formatting requirement.

---

## PART 8 — EXPLANATION ENGINE

### 8.1 Design Principle

Explanations are generated from the reasoning trace, not from free-text generation. Every explanation is directly derivable from the `CandidateResult`.

### 8.2 Algorithm

```python
def generate(
    candidate: CandidateProfile,
    result:    CandidateResult,
    kb:        KnowledgeBase
) -> str:

    # Find the two highest-scoring clusters
    top_clusters = sorted(
        result.cluster_results,
        key=lambda cr: cr.cluster_score,
        reverse=True
    )[:2]

    parts = []
    for cluster_result in top_clusters:
        if cluster_result.cluster_score < 0.20:
            continue

        # Find the highest-scoring requirement in this cluster
        best_req = max(
            cluster_result.req_results,
            key=lambda r: r.requirement_score,
            default=None
        )

        if best_req and best_req.best_evidence_text:
            cluster_name = kb.cluster_registry[cluster_result.cluster_id].name
            parts.append(f"{cluster_name}: {best_req.best_evidence_text}")

    # Append career context
    top_career = _get_most_relevant_career_entry(candidate, result)

    if parts and top_career:
        evidence_str = "; ".join(parts)
        return (
            f"{top_career.duration_months}mo as {top_career.role} at "
            f"{top_career.company}. Strongest evidence: {evidence_str}."
        )
    elif parts:
        return f"Key evidence: {'; '.join(parts)}."
    elif top_career:
        return (
            f"{candidate.years_experience:.0f} years experience; most recent role: "
            f"{top_career.role} at {top_career.company}."
        )
    else:
        return "Partial requirement coverage based on available profile data."
```

### 8.3 Format Constraints

- Minimum: 10 words
- Maximum: 60 words
- Must reference at least one specific piece of evidence
- Must not be generic ("Strong candidate with relevant experience")
- Must be traceable to `CandidateResult.cluster_results`

---

## PART 9 — DEVELOPMENT ROADMAP

Order determined by module dependencies. Each phase must be complete and tested before the next begins.

---

### Phase 0 — Documentation and Environment
**Duration:** Day 1, first 4 hours

**Goal:** Eliminate all knowledge gaps. Establish development environment.

**Actions (strict order):**
1. Read `job_description.md` (including hackathon-specific section)
2. Read `submission_spec.md` Stages 3–5
3. Read `redrob_signals_doc.md` — all 23 signals + envelope definitions
4. Read `candidate_schema.json`
5. Manually inspect 10 records from `sample_candidates.json`
6. Set up Python environment and install dependencies
7. Unpack dataset: `gunzip -k candidates.jsonl.gz && wc -l candidates.jsonl`

**Deliverable:** Updated notes on `config/evidence_rules.yaml`, `config/ontology.yaml`, and behavioral_scorer requirements. Decision on whether signal envelopes change the honeypot strategy.

```bash
python -m venv venv && source venv/bin/activate
pip install pyyaml rapidfuzz scipy scikit-learn tqdm pytest numpy
```

---

### Phase 1 — Knowledge Layer and Schemas
**Duration:** Day 1 (afternoon) – Day 2

**Goal:** Foundation. Everything downstream depends on this.

**Modules:**
- `config/` — all five YAML files (initial versions)
- `racun/schemas/` — all four schema files
- `racun/knowledge/` — all six files

**Deliverables:**
- `KnowledgeLoader.load("config/")` returns a valid `KnowledgeBase` without errors
- All five YAML files exist and pass validation
- All schema dataclasses instantiatable with sample data

**Tests:**
```python
def test_knowledge_base_loads():
    kb = KnowledgeLoader.load("config/")
    assert kb is not None
    assert abs(sum(c.weight for c in kb.cluster_registry.all()) - 1.0) < 0.001

def test_ontology_normalizes():
    kb = KnowledgeLoader.load("config/")
    assert kb.concept_ontology.normalize("LoRA") == "llm_fine_tuning"
    assert kb.concept_ontology.normalize("Milvus") == "vector_database"
```

---

### Phase 2 — JD Processing
**Duration:** Day 2

**Goal:** Convert job_description.md into structured, machine-readable JDRequirement objects.

**Modules:**
- `racun/jd/parser.py`
- `racun/jd/requirement_builder.py`

**Deliverables:**
- `RequirementBuilder` produces `List[JDRequirement]` from the JD
- All requirements have cluster assignments, weights, mandatory flags, keywords
- Manually verify output looks correct against the JD

**Tests:**
```python
def test_requirements_extracted():
    reqs = build_requirements("data/raw/job_description.md", kb)
    assert len(reqs) > 0
    assert any(r.is_mandatory for r in reqs)
    assert all(r.cluster for r in reqs)
    assert all(r.keywords for r in reqs)

def test_requirement_weights_sum_to_one_per_cluster():
    for cluster_id in kb.cluster_registry.all_ids():
        cluster_reqs = [r for r in reqs if r.cluster == cluster_id]
        total = sum(r.weight for r in cluster_reqs)
        assert abs(total - 1.0) < 0.001
```

---

### Phase 3 — Candidate Parsing and Evidence Extraction
**Duration:** Day 2–3

**Goal:** Convert raw JSON records into normalized evidence objects ready for the correlation engine.

**Modules:**
- `racun/candidate/parser.py`
- `racun/candidate/evidence_extractor.py`
- `racun/candidate/normalizer.py`

**Deliverables:**
- Parse all 50 sample candidates without errors
- Each candidate has non-empty evidence objects
- Normalized concepts populated correctly

**Tests:**
```python
def test_parse_sample_candidates():
    with open("data/raw/sample_candidates.json") as f:
        records = json.load(f)
    profiles = [CandidateParser().parse(r) for r in records]
    assert len(profiles) == 50
    assert all(p.candidate_id for p in profiles)
    assert all(p.years_experience >= 0 for p in profiles)

def test_evidence_extraction_non_empty():
    profiles = load_sample_candidates()
    for p in profiles:
        evidence = EvidenceExtractor().extract(p)
        assert len(evidence) > 0

def test_normalization_applies_ontology():
    ev = make_evidence_with_text("Used Milvus for vector storage")
    normalized = EvidenceNormalizer(kb).normalize(ev)
    assert "vector_database" in normalized.normalized_concepts
```

---

### Phase 4 — Honeypot Detector
**Duration:** Day 3

**Goal:** Detect and blocklist honeypot candidates before ranking.

**Modules:**
- `racun/filters/honeypot_detector.py`

**Deliverables:**
- Detector correctly flags known-invalid profiles
- Detector does not flag valid profiles
- honeypot_ids.pkl generated from full dataset

**Synthetic Test Cases (required):**
```python
# tests/synthetic/candidate_factory.py
def make_skill_overflow_candidate():
    """Total skill years = 60, experience = 5 — should be flagged"""

def make_assessment_contradiction_candidate():
    """Claims expert Python, assessment score 0.15 — should be flagged"""

def make_timeline_overlap_candidate():
    """Two full-time jobs overlapping for 8 months — should be flagged"""

def make_valid_senior_candidate():
    """8 years experience, consistent timeline — should NOT be flagged"""
```

---

### Phase 5 — Correlation Engine
**Duration:** Day 3–5

**Goal:** The core of RACUN. Build each sub-module in order, testing each before moving to the next.

**Build order within Phase 5:**
1. `correlation/collector.py` — test in isolation
2. `correlation/validator.py` — test in isolation
3. `correlation/strength_evaluator.py` — test in isolation
4. `correlation/consistency_evaluator.py` — test in isolation
5. `correlation/satisfaction_determiner.py` — test in isolation
6. `correlation/engine.py` — integration test

**Critical Sanity Tests (must pass before moving to Phase 6):**

```python
# These are ground-truth cases derived from the JD
# Define BEFORE implementing the engine, not after.

KNOWN_SATISFIED = {
    "requirement": "experience with vector databases",
    "career_desc": "Led migration of search infrastructure to Milvus, "
                   "processing 50M vectors for real-time similarity search",
    "expected": SatisfactionLevel.SATISFIED
}

KNOWN_NOT_SATISFIED = {
    "requirement": "experience with vector databases",
    "career_desc": "Managed sales team of 12 representatives across Europe",
    "expected": SatisfactionLevel.NOT_SATISFIED
}

KNOWN_WEAKLY_SATISFIED = {
    "requirement": "experience with vector databases",
    "skills_only": "pgvector",  # no career evidence
    "expected": SatisfactionLevel.WEAKLY_SATISFIED
}

VOCABULARY_MISMATCH = {
    "requirement": "retrieval augmented generation",
    "career_desc": "built enterprise document Q&A using semantic search and LLM grounding",
    "expected_min": SatisfactionLevel.WEAKLY_SATISFIED
    # May be PARTIALLY_SATISFIED if ontology maps terms correctly
    # This tests whether your ontology covers this case
}
```

---

### Phase 6 — Scoring Pipeline
**Duration:** Day 5

**Goal:** Convert correlation results to final scores.

**Modules:**
- `racun/scoring/requirement_scorer.py`
- `racun/scoring/cluster_scorer.py`
- `racun/scoring/gate_evaluator.py`
- `racun/scoring/integrity_checker.py`
- `racun/scoring/behavioral_scorer.py` (stub returning 1.0)

**Calibration Requirement (mandatory before Phase 7):**

Run the full scoring pipeline on `sample_candidates.json` and examine:

```bash
python scripts/calibrate.py --input data/raw/sample_candidates.json
```

Expected distribution:
- Mean score: 0.25–0.45 (not 0.80+)
- Standard deviation: > 0.15 (scores should discriminate)
- Top score: ≤ 0.95
- Candidates scoring above 0.80: < 15% of sample

If mean > 0.60: your satisfaction thresholds are too lenient. Raise them.
If std < 0.10: your scoring is not discriminating. Review evidence hierarchy weights.

---

### Phase 7 — Explanation Generator and Output Layer
**Duration:** Day 5–6

**Modules:**
- `racun/explanation/generator.py`
- `racun/output/ranker.py`
- `racun/output/writer.py`

**Tests:**
```python
def test_explanation_word_count():
    reason = ExplanationGenerator().generate(candidate, result, kb)
    words = reason.split()
    assert 10 <= len(words) <= 60

def test_explanation_not_generic():
    reason = ExplanationGenerator().generate(candidate, result, kb)
    generic_phrases = ["strong candidate", "relevant experience", "good fit"]
    assert not any(p in reason.lower() for p in generic_phrases)

def test_submission_csv_passes_validator():
    # Run competition validator on generated submission
    result = subprocess.run(
        ["python", "validate_submission.py", "submission.csv"],
        capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr
```

---

### Phase 8 — End-to-End and Timing Tests
**Duration:** Day 6

**Goal:** Verify the full pipeline works on the real dataset and the ranking phase finishes under 5 minutes.
Both phases run entirely on local disk with no network connectivity.

```bash
# Step 1: Preprocess (no time limit)
python scripts/preprocess.py --data data/raw/candidates.jsonl.gz
# Expected: < 30 minutes

# Step 2: Full ranking (timed — this is the submission constraint)
time python scripts/rank.py
# MUST complete in < 300 seconds

# Step 3: Validate
python validate_submission.py submission.csv

# Step 4: Manual review
# Open submission.csv. Read top 20 candidates.
# Ask: "Would a human recruiter agree with this ordering?"
# If obvious mistakes: debug correlation engine first.
```

**If ranking phase timing fails (> 300 seconds):**
1. Profile: `python -m cProfile scripts/rank.py`
2. Find the bottleneck — almost certainly in the per-candidate loop
3. Enable the pre-filter: set `prefilter.enabled: true` in settings.yaml
4. Re-run timing test
5. Do not move any preprocessing logic into rank.py to fix timing — this
   violates the phase boundary and risks violating the 5-minute constraint.

---

### Phase 9 — Behavioral Scorer + Final Calibration
**Duration:** Day 6–7

**Goal:** Implement behavioral scoring (after signals doc is read) and recalibrate.

**Important:** Do not implement this phase based on guesses. The signal envelopes are a competitive differentiator and a potential trap. Your implementation must be grounded in the actual signals doc definitions.

After implementing behavioral_scorer.py:
- Re-run calibration on sample candidates
- Verify BehaviorModifier ∈ [0.85, 1.10] for all sample candidates
- Verify top-100 ordering makes sense with behavioral adjustment applied

---

### Phase 10 — Submission Package
**Duration:** Day 7–8

**Checklist:**
```
[ ] submission.csv validated with validate_submission.py
[ ] GitHub repo: clean, README.md, requirements.txt, clear run instructions
[ ] submission_metadata_template.yaml filled completely
[ ] Sandbox deployed (HuggingFace Spaces or Streamlit Cloud)
      Note: Sandbox is a demo interface — it does NOT need to run the full
      100k ranking in real time. It should demonstrate the reasoning pipeline
      on sample_candidates.json (50 records) and display scores + explanations.
      The sandbox executes locally within the deployed environment — no external
      API calls or model downloads.
[ ] PDF deck (approach + architecture + why it works)
[ ] AI tools declared honestly in metadata
[ ] Three-submission strategy decided:
      Submission 1: Baseline (after Phase 8, behavioral stub)
      Submission 2: With behavioral scoring (after Phase 9)
      Submission 3: Final calibrated (reserve until confident)
```

---

## PART 10 — TESTING STRATEGY

### Unit Tests

Each sub-module tested independently with synthetic inputs.

**Rule:** Write test cases BEFORE implementing the module. The test cases define what "correct" means.

**Minimum coverage per module:**
- Happy path (input produces expected output)
- Empty input (no evidence, no requirements)
- Edge case (maximum depth, minimum depth, all satisfied, none satisfied)
- Invalid input (missing fields, null values)

### Integration Tests

```python
# tests/integration/test_correlation_engine.py

def test_known_satisfied_candidate():
    """A candidate with strong, consistent career evidence should be SATISFIED"""
    candidate = make_candidate_with(
        career_description="Led deployment of RAG pipeline processing 10M queries/day"
    )
    result = CorrelationEngine().run(rag_requirement, candidate, kb)
    assert result.satisfaction == SatisfactionLevel.SATISFIED

def test_known_not_satisfied_candidate():
    """A candidate with no relevant evidence should be NOT_SATISFIED"""
    candidate = make_candidate_with(
        career_description="Sales manager for enterprise software accounts"
    )
    result = CorrelationEngine().run(rag_requirement, candidate, kb)
    assert result.satisfaction == SatisfactionLevel.NOT_SATISFIED

def test_skill_only_candidate():
    """A candidate with only skill listing should be WEAKLY_SATISFIED at best"""
    candidate = make_candidate_with(
        skills=["vector databases"], career_description="General software engineering"
    )
    result = CorrelationEngine().run(vector_db_requirement, candidate, kb)
    assert result.satisfaction == SatisfactionLevel.WEAKLY_SATISFIED
```

### Synthetic Candidate Tests

```python
# tests/synthetic/candidate_factory.py

def make_perfect_candidate(requirements) -> CandidateProfile:
    """Career history directly addresses every requirement"""

def make_keyword_stuffer() -> CandidateProfile:
    """Skills section lists every JD keyword; career history is unrelated"""
    # Should rank low despite keyword density

def make_plain_language_expert() -> CandidateProfile:
    """Real expertise but described in non-technical plain language"""
    # Should rank appropriately if ontology covers vocabulary

def make_honeypot_timeline() -> CandidateProfile:
    """Two simultaneous full-time roles at different companies"""

def make_honeypot_assessment() -> CandidateProfile:
    """Claims expert in 10 skills; all assessment scores below 0.30"""

def make_recent_vs_stale():
    """Relevant experience 8 years ago, irrelevant recent work"""
    # Should rank lower than candidate with recent relevant experience
```

**These cases must be manually reviewed, not just asserted.** Read the actual scores and ask whether they match your intuition.

### Performance Tests

```python
# tests/performance/test_timing_full.py

import time

def test_ranking_phase_under_5_minutes():
    """The most important test in the entire suite.
    Validates the hard 5-minute ranking phase runtime constraint.
    Both preprocessing and ranking execute locally with no network calls.
    """
    start = time.time()
    subprocess.run(["python", "scripts/rank.py"], check=True)
    elapsed = time.time() - start
    assert elapsed < 300, f"Ranking phase took {elapsed:.1f}s, must be under 300s (5-minute limit)"
```

### Honeypot Tests

```python
def test_honeypot_rate_in_top_100():
    """No more than 10 honeypots in top 100 (competition disqualification threshold)"""
    top_100 = load_submission("submission.csv")
    known_honeypots = load_honeypot_ids()  # from preprocessing
    honeypot_count = sum(1 for row in top_100 if row.candidate_id in known_honeypots)
    assert honeypot_count <= 10, f"Honeypot rate {honeypot_count}/100 exceeds limit"
```

---

## PART 11 — PERFORMANCE STRATEGY

### Complexity Estimates

**Preprocessing Phase (local, no time constraint, no network):**

| Operation | Complexity | Estimate |
|---|---|---|
| Parse 100k candidates | O(100k × F) | ~5–10 min |
| Evidence extraction | O(100k × E) | ~5 min |
| Normalization | O(100k × E × T) | ~5–10 min |
| Honeypot detection | O(100k × (E + S)) | ~2–3 min |
| Total preprocessing | | ~20–30 min |

**Ranking Phase (local, hard 5-minute limit, no network):**

| Operation | Complexity | Estimate |
|---|---|---|
| Load artifacts from local disk | O(100k) | ~15s |
| Pre-filter (if enabled) | O(100k × K) | ~20s |
| Correlation (100k candidates) | O(100k × R × E) | ~180–240s |
| Scoring + Explanation | O(N × R) | ~20s |
| Sort + Write (clamp scores to [0.0, 1.0]) | O(N log N) | ~5s |

Where R = requirements (~15), E = evidence per candidate (~8), K = keywords.

### Optimization Rules

**Rule 1: Do not optimize prematurely.** Build correctly first. Measure second. Optimize only where measurement shows a problem.

**Rule 2: The loop boundary is the critical path.** The per-candidate loop runs N times. Any operation inside it runs N times. Any operation that can be moved outside the loop must be moved outside the loop.

**Rule 3: Profile before modifying.** If timing tests fail:
1. `python -m cProfile -o profile.out scripts/rank.py`
2. `python -m pstats profile.out` — find the top 5 functions by cumulative time
3. Optimize only what the profiler identifies

**Rule 4: Pre-filter is a last resort, not a first resort.** Activate only if timing tests fail after profiling and optimization.


---

### Resource Constraint Compliance Budgets

These estimates must be verified against actual measurements after preprocessing runs.
Both phases operate on the local filesystem with no network I/O.

**RAM Budget (Ranking Phase — competition limit: ≤ 16 GB):**

| Artifact | Estimated Memory Footprint |
|---|---|
| `candidates.pkl` (100k CandidateProfile objects) | 100–300 MB |
| `evidence.pkl` (100k × ~8 EvidenceObjects) | 300–600 MB |
| `requirements.pkl` (~15 JDRequirement objects) | < 1 MB |
| `honeypot_ids.pkl` (Set[str]) | < 5 MB |
| Python runtime + numpy + scipy overhead | ~150–250 MB |
| **Estimated peak total** | **~550 MB – 1.2 GB** |
| **Competition limit** | **≤ 16 GB** |
| **Status** | **✅ Well within constraint** |

If `evidence.pkl` grows larger than expected (e.g., long career descriptions stored
verbatim), consider storing only `normalized_concepts` (frozenset) and `temporal`
data in the cached artifact rather than `raw_content`. This optimization is
available without any architectural change.

**Disk Budget (Intermediate Files — competition limit: ≤ 5 GB):**

| File | Estimated Disk Size |
|---|---|
| `data/cache/requirements.pkl` | < 1 MB |
| `data/cache/candidates.pkl` | 50–100 MB |
| `data/cache/evidence.pkl` | 200–400 MB |
| `data/cache/honeypot_ids.pkl` | < 5 MB |
| `data/raw/candidates.jsonl` (if decompressed) | ~500 MB – 2 GB* |
| **Cache artifacts only** | **~250–510 MB** |
| **Competition limit** | **≤ 5 GB** |
| **Status** | **✅ Within constraint (see note below)** |

> **Critical:** `scripts/preprocess.py` must stream directly from `candidates.jsonl.gz`
> using Python's `gzip.open()` — do NOT decompress to disk as a preprocessing step.
> The Phase 0 manual inspection step (`gunzip -k candidates.jsonl.gz`) is for developer
> use only. The uncompressed `.jsonl` must not persist as an intermediate file during
> evaluated runs; it counts toward the 5 GB limit. Remove it before submitting or
> stream exclusively from `.gz`.


**Known bottleneck candidates (in order of likelihood):**
1. String operations in `collector.py` (`keyword in text_lower` repeated 100k × R × E times)
2. Redundant object attribute access in the hot loop (use local variables)
3. Loading a large evidence.pkl without streaming

**Mitigation for bottleneck 1:** Precompute a normalized token set per evidence object during preprocessing. Store as `frozenset[str]` instead of raw text. Set intersection is faster than substring search.

---

## PART 12 — CONFIGURATION STRATEGY

### What belongs in config files:

| Item | Location |
|---|---|
| Depth weights | `settings.yaml` |
| Satisfaction base scores | `settings.yaml` |
| Satisfaction determination thresholds | `settings.yaml` |
| Gate modifier values | `settings.yaml` |
| Integrity penalty and floor | `settings.yaml` |
| Behavior modifier bounds | `settings.yaml` |
| Honeypot flag threshold | `settings.yaml` |
| Pre-filter settings | `settings.yaml` |
| All synonym/alias mappings | `ontology.yaml` |
| Cluster definitions and weights | `clusters.yaml` |
| Depth level definitions | `rubrics.yaml` |
| Evidence validation rules | `evidence_rules.yaml` |

### What belongs in source code:

| Item | Location |
|---|---|
| Algorithm logic | implementation files |
| Data structure definitions | schemas/ |
| Module orchestration | engine.py, pipeline/ |
| Test cases | tests/ |

### What must never appear in source code:

- Magic numbers (thresholds, weights)
- Hardcoded requirement IDs or cluster names
- Hardcoded ontology terms

**Calibration principle:** Any tuning decision that changes the ordering of candidates must be achievable by editing a config file, not a source file.

---

## PART 13 — FINAL ARCHITECTURE REVIEW

Before freezing this document, the following review was conducted.

### Modules Merged

`strength_evaluator.py` and `hierarchy.py` from V1 were merged into `strength_evaluator.py`. Hierarchy weights belong in `settings.yaml` (consumed by `KnowledgeBase`) and the evaluation logic belongs in the strength evaluator. No standalone hierarchy module is needed.

### Modules Removed

`bm25_filter.py` (from V1) removed. Replaced by the optional `PreFilterInterface` which defaults to pass-through. BM25 is not assumed — it may be implemented later if needed.

`semantic_matcher.py` (as a required module) removed. Replaced by an optional pluggable interface. Default implementation does not use pretrained models.

### Architecture Compliance Check

| Requirement | Status |
|---|---|
| Fully local execution (no network) | ✅ No network calls in either phase; both phases run on local disk |
| CPU-only execution | ✅ No GPU dependencies |
| Deterministic results | ✅ All operations are deterministic |
| Explainable ranking | ✅ Every score traceable to evidence |
| Honeypot detection | ✅ Preprocessing blocklist |
| No internet during ranking | ✅ All artifacts precomputed |
| Scalable to 100k candidates | ✅ Preprocessing handles expensive ops |
| Modular, testable | ✅ Each module has single responsibility |
| No hardcoded weights | ✅ All thresholds in config files |
| Knowledge Layer as single source of truth | ✅ All modules consume KnowledgeBase |
| ≤ 16 GB RAM during ranking | ✅ Estimated 550 MB – 1.2 GB peak (see Resource Budget, Part 11) |
| ≤ 5 GB intermediate disk | ✅ Estimated 250–510 MB cache; requires streaming from .gz (see Resource Budget, Part 11) |
| Scores in submission.csv ≤ 1.0 | ✅ Final scores clamped to [0.0, 1.0] in output/writer.py after ranking |

### Outstanding Decisions (Blocked on Docs)

| Decision | Blocked By | Resolve In |
|---|---|---|
| BehavioralScorer implementation | redrob_signals_doc.md | Phase 9 |
| Signal envelope honeypot rules | redrob_signals_doc.md | Phase 4 |
| Exact cluster definitions | job_description.md | Phase 1 |
| Mandatory requirement identification | job_description.md | Phase 2 |
| Ontology completeness | JD + sample data analysis | Phase 1 |
| Submission format details | submission_spec.md | Phase 0 |

---

## APPENDIX — MAKEFILE

```makefile
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
```

---

## APPENDIX — REQUIREMENTS.TXT

```
# Core
numpy==1.26.4
scipy==1.13.0
scikit-learn==1.4.2
rapidfuzz==3.6.1
pyyaml==6.0.1
tqdm==4.66.2

# Testing
pytest==8.2.0
pytest-cov==5.0.0

# Optional (activate only if pre-filter or embeddings are needed)
# rank-bm25==0.2.2
# sentence-transformers==2.7.0
```

---

*RACUN V2 Implementation Specification*
*Team Antigravity | Frozen for implementation*
*Architecture reviews: complete | Implementation phases: 10*
*Next action: Phase 0 — Read documentation*
