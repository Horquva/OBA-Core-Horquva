# ADR-001: AI-Native Technology Intelligence Architecture
**Status:** Accepted | **Date:** 2026-08-12 | **Owner:** Aurangzeb Malik

## Context
The Antares initiative requires a continuous intelligence pipeline that ingests raw technology signals, structures them, and exposes them to downstream platforms (Organizational Futures, Trust & Governance).

## Decision
We adopted an AI-Native approach using Google Gemini (Interactions API) for entity extraction and `gemini-embedding-001` for semantic deduplication and relationship mapping. 
Instead of a traditional relational database for the MVP, we implemented a JSON-backed persistent registry (`intelligence_registry.py`) to ensure rapid iteration and zero-infrastructure deployment for the 10-day roadmap.

## Consequences
- FastAPI endpoints (`/v1/ingest`, `/v1/intelligence`) are secured via `X-API-Key`.
- Maturity is calculated dynamically via `EvolutionEvent` weights rather than static counters.
- Semantic matching threshold is strictly set to 0.92 to prevent concept over-merging.
