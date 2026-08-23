# Day 10 — Finalization, Security & QA Compliance (Parts 6, 7, 8)
## What the roadmap asked
Authentication, versioning, correlation IDs, observability; deterministic CI tests;
documentation; security boundaries; final working platform.
## What I built
- api_server.py final: /v1/ endpoints, X-API-Key auth (401), X-Correlation-ID,
  structured logging.
- test_suite.py final: 7 deterministic mocked tests incl. unauthorized access (401)
  and confidence calibration; patched api_server.pipeline.llm (fixed mock leakage).
- README.md rewritten with /v1/ endpoints + auth; requirements.txt completed
  (google-genai, python-dotenv, numpy).
- docs/research/ADR-001; registry/signal-registry/signal_schema.json;
  registry/source-registry/source_schema.json.
- Security: Gitleaks CI blocker (hardcoded test credential flagged, blocking an
  unrelated Castor PR) → replaced with dummy variable + BFG history scrub; remote
  branch deleted and re-pushed per team-lead policy.
- Review fixes (Kamil): ingestion.py ConfidenceMetadata fix; discovery N+1 embedding
  bug → registry batch-embedded once per source.
## How I tested
7/7 passed. Live Swagger demo: POST /v1/ingest discovered 4 technologies;
GET /v1/intelligence/Milvus returned maturity, related technologies and evidence.
## Honest notes
Persistence stays JSON-file backed (MVP decision, see ADR-001); DB migration is
future work. manual_scripts/ = legacy Day 2-7 demos, not part of CI.
