# Aurangzeb Malik — Technology Intelligence Platform Deliverables
**Branch:** antares/aurangzeb-future-signals
**Timeline:** Day 1 to Day 10 
**Status:** QA-Audited, Production-Ready, 7/7 Tests Passing

## Folder Ownership (4 Assigned Folders)
1. `services/research-service/` → Core AI Engine (95% of work)
2. `docs/research/` → Architecture Decision Records (ADR-001)
3. `registry/signal-registry/` → Signal Contract Schema
4. `registry/source-registry/` → Source Contract Schema

## Core Components Implemented
- **models.py** — Pydantic models (TechnologyProfile, EvolutionEvent, ConfidenceMetadata with variance)
- **llm_client.py** — Gemini Interactions API client (gemini-3.1-flash-lite + gemini-embedding-001)
- **discovery_pipeline.py** — LLM extraction + Semantic deduplication (0.92 threshold)
- **intelligence_registry.py** — JSON-backed persistent registry
- **maturity_engine.py** — Event-driven maturity scoring (weighted EventType)
- **relationship_engine.py** — Semantic graph via cosine similarity
- **api_server.py** — FastAPI with X-API-Key auth + X-Correlation-ID
- **retrieval_api.py** — Intelligence retrieval layer
- **test_suite.py** — 7 deterministic pytest tests (mocked, CI/CD ready)

## Contracts & Documentation
- **ADR-001** — Architecture Decision Record
- **signal_schema.json** — Technology signal contract
- **source_schema.json** — Source provenance contract

## Verification Status
- Gitleaks: CLEAN (secret removed via BFG, replaced with mocked-test-key-for-ci)
- Pytest: 7/7 passed in 4.41s (deterministic)
- Live API: POST /v1/ingest & GET /v1/intelligence working on localhost:8000/docs

## How to Run Demo
1. cd ecosystem/applications/antares/services/research-service
2. python3 -m venv venv && source venv/bin/activate
3. pip install -r requirements.txt
4. Edit .env → paste your Gemini API key from https://aistudio.google.com/app/apikey
5. uvicorn api_server:app --port 8000
6. Open http://127.0.0.1:8000/docs to test live endpoints
