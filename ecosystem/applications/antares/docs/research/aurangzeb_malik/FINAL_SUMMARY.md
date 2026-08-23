# Technology Intelligence Platform — Final Summary
**Aurangzeb Malik — 10-day build mapped against Part-1 → Part-8**

## What this is
A live AI-native engine: real technology signal → LLM extraction → evidence +
provenance → deterministic entity → event-driven maturity → semantic relationship
graph → technology radar → secured structured API → Antares consumers.

## Day-by-day table
| Day | Part | Built | Proof |
|---|---|---|---|
| 1 | 1 | Folders, branch, ownership map | tree / git |
| 2 | 2 | models.py, ingestion.py, run_test.py, .gitignore | real source ingested & retrieved |
| 3 | 3 | discovery_pipeline v1 (normalization, MD5 ids) | article → records |
| 4 | 3 | intelligence_registry (dedup/merge) + adversarial | 2 sources → 1 profile |
| 5 | 4 | maturity_engine v1 + radar | radar from live data |
| 6 | 5 | relationship_engine v1 + retrieval_api | downstream query demo |
| 7 | 6 | api_server v1 (live HTTP) | real POST/GET 200s |
| 8 | 7 | test_suite v1 (5 tests) | 5 passed |
| 9 | 3-5,7 | Gemini LLM + embeddings, semantic dedup 0.92, event-driven maturity, semantic graph, JSON persistence | connectivity + semantic-merge proofs |
| 10 | 6-8 | /v1 auth + correlation IDs, 7 mocked tests, README, ADR-001, schemas, Gitleaks scrub, review fixes | 7/7 passed + live Swagger demo |

## The full pipeline, one sentence per stage
1. Ingest — POST /v1/ingest accepts raw text + source URL (X-API-Key required).
2. Extract — Gemini Interactions API extracts technology entities as JSON.
3. Resolve — gemini-embedding-001 vectors; cosine ≥ 0.92 merges synonyms; MD5 ids.
4. Evidence — exact source sentence stored with ConfidenceMetadata.
5. Evolve — EMERGENCE / ADOPTION_SIGNAL events with evidence_refs + interpretation.
6. Mature — weighted event scoring → Emerging…Established; radar categories.
7. Connect — co-occurrence + semantic (≥ 0.80) relationship edges.
8. Persist — registry_state.json survives restarts.
9. Deliver — GET /v1/intelligence/{tech} serves any Antares platform.

## How to run
cd ecosystem/applications/antares/services/research-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
Edit .env: GEMINI_API_KEY, GEMINI_MODEL=gemini-3.1-flash-lite, ANTARES_API_KEY
uvicorn api_server:app --port 8000  →  Swagger at http://127.0.0.1:8000/docs
PYTHONPATH=. pytest -v test_suite.py  →  7 passed, deterministic

## Real bugs caught & fixed
Gitleaks secret in history (BFG scrub); N+1 embedding calls (batch fix); ingestion
confidence_score vs ConfidenceMetadata mismatch; over-merging 0.80→0.92; .title()
acronym bug; mock side_effect leakage; test state leakage; pytest collection crash
from old top-level scripts (moved to manual_scripts/).

## Ownership boundary
I own Technology Intelligence only.

## Left for later (on purpose)
DB-backed persistence (ADR-001); evaluation datasets with precision/recall/
hallucination metrics; within-source synonym dedup; real cross-team integration
tests; pagination/performance work.
