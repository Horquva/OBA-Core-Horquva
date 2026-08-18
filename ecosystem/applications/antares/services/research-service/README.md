# Antares Technology Intelligence Service
**Owner:** Aurangzeb Malik (Technology Intelligence Platform Owner)
**Initiative:** Antares (Horquva)

## Overview
This service is the core Technology Intelligence Engine for the Antares initiative. It ingests raw technology signals, extracts entities, normalizes them deterministically, tracks maturity and relationships, and exposes structured intelligence via a live FastAPI REST API for downstream Antares platforms (Organizational Futures, Trust & Governance, Capability Validation, etc.).

## Architecture Components
- Discovery Pipeline: Ingests raw text, detects technologies via taxonomy, and extracts exact evidence.
- Intelligence Registry: Manages state, handles duplicate detection (MD5 hashing), and merges multi-source evidence.
- Maturity Engine: Evaluates technology maturity (Emerging -> Established) based on evidence weight and source count.
- Relationship Engine: Builds a knowledge graph based on technology co-occurrence in sources.
- FastAPI Server: Exposes live HTTP endpoints for downstream consumers.

## API Endpoints
- POST /ingest - Ingest a new raw technology signal (JSON payload).
- GET /intelligence/{tech_name} - Retrieve structured intelligence, maturity, and relationships for a specific technology.

## How to Run Locally
1. Create and activate virtual environment:
   python3 -m venv venv
   source venv/bin/activate

2. Install dependencies:
   pip install -r requirements.txt

3. Start the live server:
   uvicorn api_server:app --reload --port 8000

## Testing (Enterprise Grade)
Run the automated test suite (covers Adversarial, Integration, and API tests):
   PYTHONPATH= pytest -v test_suite.py
