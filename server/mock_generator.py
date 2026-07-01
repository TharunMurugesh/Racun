import os
import json
import gzip
from pathlib import Path

def generate_mock_data():
    raw_dir = Path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate job_description.md with exactly 10 requirements matching clusters.yaml
    jd_content = """# Lead AI/ML Engineer - Job Description

## About the Role
We are looking for a Lead AI/ML Engineer to design and implement requirement-aware reasoning engines.

## Must-Have Requirements
- Experience building machine learning models and deep learning architectures in PyTorch or TensorFlow.
- Strong Python programming skills with experience writing clean, maintainable, and testable code.
- Experience training and evaluating deep neural networks for computer vision or natural language processing.
- Experience with model optimization, quantization, and evaluation metrics.
- Experience with Retrieval-Augmented Generation (RAG) and semantic search architectures.
- Experience fine-tuning Large Language Models (LLMs) using LoRA or QLoRA.
- Experience with vector databases like Milvus, Pinecone, or Qdrant.

## Preferred Qualifications
- Experience deploying machine learning models in production using Docker and Kubernetes.
- Experience setting up CI/CD pipelines and MLOps infrastructure.
- Domain experience in enterprise SaaS, finance, or search industries.
"""
    with open(raw_dir / "job_description.md", "w", encoding="utf-8") as f:
        f.write(jd_content)
    print("Generated job_description.md")

    # 2. Helper functions to generate candidates
    candidates = []

    # Candidate 01: Perfect candidate (Strong career evidence for all requirements)
    candidates.append({
        "id": "cand_001",
        "name": "Sarah Connor",
        "summary": "Senior ML Engineer with 8+ years experience. Expert in LLMs, RAG pipelines, fine-tuning, and scalable vector search databases.",
        "years_experience": 8.0,
        "work_experience": [
            {
                "company": "Cyberdyne Systems",
                "role": "Lead AI Engineer",
                "industry": "Enterprise SaaS",
                "company_size": "Large",
                "duration_months": 36,
                "start_date": "2023-07",
                "end_date": "present",
                "description": "Led deployment of RAG pipeline processing 10M queries/day using Milvus vector database and LLM fine-tuning via QLoRA. Built microservices in Python.",
                "is_current": True
            },
            {
                "company": "Skynet Tech",
                "role": "Senior ML Engineer",
                "industry": "Search",
                "company_size": "Medium",
                "duration_months": 60,
                "start_date": "2018-07",
                "end_date": "2023-07",
                "description": "Built and trained deep neural networks using PyTorch for NLP tasks. Implemented model optimization and model deployment with Docker and Kubernetes.",
                "is_current": False
            }
        ],
        "skills": [
            {"name": "Python", "years": 8.0, "proficiency": "expert"},
            {"name": "PyTorch", "years": 6.0, "proficiency": "expert"},
            {"name": "Milvus", "years": 3.0, "proficiency": "expert"},
            {"name": "RAG", "years": 3.0, "proficiency": "expert"},
            {"name": "Docker", "years": 5.0, "proficiency": "expert"},
            {"name": "Kubernetes", "years": 4.0, "proficiency": "expert"}
        ],
        "education": [
            {"degree": "MS", "field": "Computer Science", "institution": "Stanford University", "year": 2018}
        ],
        "certifications": ["AWS Certified Machine Learning", "TensorFlow Developer"],
        "assessments": [
            {"skill": "Python", "score": 0.95},
            {"skill": "PyTorch", "score": 0.92}
        ],
        "languages": ["English"],
        "behavioral_signals": {
            "platform_contributions": 120,
            "profile_completeness": 1.0
        }
    })

    # Candidate 02: Average candidate (Satisfies some, partially satisfies others)
    candidates.append({
        "id": "cand_002",
        "name": "John Connor",
        "summary": "ML Engineer specialized in PyTorch modeling. Expanding skills in LLMs and MLOps.",
        "years_experience": 4.0,
        "work_experience": [
            {
                "company": "Resistance Corp",
                "role": "Machine Learning Engineer",
                "industry": "Defense",
                "company_size": "Medium",
                "duration_months": 48,
                "start_date": "2022-07",
                "end_date": "present",
                "description": "Trained and evaluated deep learning architectures in PyTorch. Worked on model optimization and basic Python backend systems.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "Python", "years": 4.0, "proficiency": "intermediate"},
            {"name": "PyTorch", "years": 3.0, "proficiency": "intermediate"},
            {"name": "Docker", "years": 2.0, "proficiency": "intermediate"}
        ],
        "education": [
            {"degree": "BS", "field": "Data Science", "institution": "MIT", "year": 2022}
        ],
        "certifications": [],
        "assessments": [
            {"skill": "Python", "score": 0.65}
        ],
        "languages": ["English"],
        "behavioral_signals": {}
    })

    # Candidate 03: Weak candidate (Skills listed, but career history is weak/unrelated)
    candidates.append({
        "id": "cand_003",
        "name": "Marcus Wright",
        "summary": "Software Developer interested in transitioning to AI/ML.",
        "years_experience": 3.0,
        "work_experience": [
            {
                "company": "Project Angel",
                "role": "Full Stack Developer",
                "industry": "Healthcare",
                "company_size": "Small",
                "duration_months": 36,
                "start_date": "2023-07",
                "end_date": "present",
                "description": "Developed web applications in JavaScript and Python. Maintained SQL databases.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "Python", "years": 1.5, "proficiency": "beginner"},
            {"name": "PyTorch", "years": 0.5, "proficiency": "beginner"},
            {"name": "Milvus", "years": 0.2, "proficiency": "beginner"},
            {"name": "RAG", "years": 0.2, "proficiency": "beginner"}
        ],
        "education": [],
        "certifications": [],
        "assessments": [],
        "languages": [],
        "behavioral_signals": {}
    })

    # Candidate 04: Honeypot - Impossible career timeline (simultaneous full-time roles overlap by 8 months)
    candidates.append({
        "id": "cand_004_honeypot_timeline",
        "name": "Honeypot Chronos",
        "summary": "Senior ML Engineer working two full-time roles simultaneously.",
        "years_experience": 5.0,
        "work_experience": [
            {
                "company": "Parallel Corp",
                "role": "Lead Researcher",
                "industry": "AI Research",
                "company_size": "Medium",
                "duration_months": 24,
                "start_date": "2024-01",
                "end_date": "2025-12",
                "description": "Deep neural network training and LoRA fine-tuning.",
                "is_current": False
            },
            {
                "company": "Overlap Systems",
                "role": "Senior Engineer",
                "industry": "Finance",
                "company_size": "Medium",
                "duration_months": 24,
                "start_date": "2024-06",
                "end_date": "present",
                "description": "Milvus vector database deployment and RAG pipeline engineering.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "Python", "years": 5.0, "proficiency": "expert"}
        ],
        "education": [],
        "certifications": [],
        "assessments": [],
        "languages": [],
        "behavioral_signals": {}
    })

    # Candidate 05: Honeypot - Skill duration overflow (Total skill years = 60, exp = 3)
    candidates.append({
        "id": "cand_005_honeypot_overflow",
        "name": "Honeypot Overflow",
        "summary": "Junior engineer claiming decades of experience across skills.",
        "years_experience": 3.0,
        "work_experience": [
            {
                "company": "Brief Inc",
                "role": "Developer",
                "industry": "SaaS",
                "company_size": "Small",
                "duration_months": 36,
                "start_date": "2023-07",
                "end_date": "present",
                "description": "General programming tasks.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "Python", "years": 15.0, "proficiency": "expert"},
            {"name": "PyTorch", "years": 15.0, "proficiency": "expert"},
            {"name": "Milvus", "years": 15.0, "proficiency": "expert"},
            {"name": "Kubernetes", "years": 15.0, "proficiency": "expert"}
        ],
        "education": [],
        "certifications": [],
        "assessments": [],
        "languages": [],
        "behavioral_signals": {}
    })

    # Candidate 06: Honeypot - Assessment contradiction (Claims expert, score 0.15)
    candidates.append({
        "id": "cand_006_honeypot_contradict",
        "name": "Honeypot Contradict",
        "summary": "Expert PyTorch engineer.",
        "years_experience": 5.0,
        "work_experience": [
            {
                "company": "AI Labs",
                "role": "PyTorch Developer",
                "industry": "SaaS",
                "company_size": "Small",
                "duration_months": 60,
                "start_date": "2021-07",
                "end_date": "present",
                "description": "Used PyTorch extensively to train neural network architectures.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "PyTorch", "years": 5.0, "proficiency": "expert"}
        ],
        "education": [],
        "certifications": [],
        "assessments": [
            {"skill": "PyTorch", "score": 0.15}
        ],
        "languages": [],
        "behavioral_signals": {}
    })

    # Candidate 07: Unsuited Candidate (Sales Manager)
    candidates.append({
        "id": "cand_007_unsuited",
        "name": "Kate Brewster",
        "summary": "Experienced Sales Manager with track record of driving revenue growth in enterprise software sales.",
        "years_experience": 6.0,
        "work_experience": [
            {
                "company": "Orion Sales",
                "role": "Sales Manager",
                "industry": "Enterprise Software",
                "company_size": "Large",
                "duration_months": 72,
                "start_date": "2020-07",
                "end_date": "present",
                "description": "Led sales teams, closed deals, managed enterprise accounts.",
                "is_current": True
            }
        ],
        "skills": [
            {"name": "Sales", "years": 6.0, "proficiency": "expert"},
            {"name": "Account Management", "years": 5.0, "proficiency": "expert"}
        ],
        "education": [
            {"degree": "BA", "field": "Business", "institution": "UCLA", "year": 2020}
        ],
        "certifications": [],
        "assessments": [],
        "languages": [],
        "behavioral_signals": {}
    })

    # Add 43 more mock candidates to reach 50 records in total, varying in quality
    names = ["Alex", "Blake", "Charlie", "Dani", "Eli", "Frankie", "Gaby", "Hal", "Jordan", "Kim", "Lee", "Morgan", "Taylor", "Sam", "Robin", "Pat", "Terry", "Kelly", "Chris", "Jamie"]
    roles = ["Senior ML Engineer", "Data Scientist", "Software Engineer", "Cloud Engineer", "Product Manager", "Python Backend Developer"]
    companies = ["Google", "Meta", "Amazon", "OpenAI", "Anthropic", "Netflix", "HuggingFace", "Cohere", "Pinecone", "Qdrant"]
    
    for idx in range(8, 51):
        name = names[idx % len(names)] + f"_{idx}"
        role = roles[idx % len(roles)]
        company = companies[idx % len(companies)]
        years_exp = float((idx % 8) + 2)
        
        # Decide if candidate has some relevant experience
        is_relevant = idx % 3 != 0
        desc = ""
        skills_list = []
        
        if is_relevant:
            desc = f"Worked on {role} tasks. Developed models in Python. Used PyTorch. Built APIs using FastAPI."
            skills_list = [
                {"name": "Python", "years": years_exp, "proficiency": "intermediate"},
                {"name": "PyTorch", "years": max(1.0, years_exp - 1.0), "proficiency": "intermediate"}
            ]
            if idx % 2 == 0:
                desc += " Also implemented RAG with Milvus vector search."
                skills_list.append({"name": "Milvus", "years": 1.5, "proficiency": "beginner"})
        else:
            desc = f"Worked as {role}. Primarily focused on frontend JavaScript engineering and project management."
            skills_list = [
                {"name": "JavaScript", "years": years_exp, "proficiency": "expert"},
                {"name": "HTML/CSS", "years": years_exp, "proficiency": "expert"}
            ]
            
        candidates.append({
            "id": f"cand_{idx:03d}",
            "name": name,
            "summary": f"Professional working as {role}.",
            "years_experience": years_exp,
            "work_experience": [
                {
                    "company": company,
                    "role": role,
                    "industry": "Technology",
                    "company_size": "Medium",
                    "duration_months": int(years_exp * 12),
                    "start_date": "2022-01",
                    "end_date": "present",
                    "description": desc,
                    "is_current": True
                }
            ],
            "skills": skills_list,
            "education": [],
            "certifications": [],
            "assessments": [],
            "languages": [],
            "behavioral_signals": {}
        })

    # Write to sample_candidates.json
    with open(raw_dir / "sample_candidates.json", "w", encoding="utf-8") as f:
        json.dump(candidates, f, indent=2)
    print("Generated sample_candidates.json")

    # Write to candidates.jsonl.gz
    gz_path = raw_dir / "candidates.jsonl.gz"
    with gzip.open(gz_path, "wt", encoding="utf-8") as f:
        for c in candidates:
            f.write(json.dumps(c) + "\n")
    print("Generated candidates.jsonl.gz")

if __name__ == "__main__":
    generate_mock_data()
