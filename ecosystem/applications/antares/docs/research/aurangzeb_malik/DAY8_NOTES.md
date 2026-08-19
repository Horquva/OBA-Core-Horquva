# Day 8 — Automated Test Suite v1 (Part-7)
## What the roadmap asked
Unit + integration + adversarial testing; deterministic processing; reliability.
## What I built
test_suite.py v1 (5 tests): deterministic entity resolution; adversarial malformed /
empty input; maturity & relationship co-occurrence; API ingest + retrieve via
TestClient; API 404 handling.
## How I tested
5 passed. The adversarial test exposed a real edge case (plural
'Large Language Models' vs singular normalization) which I fixed in the pipeline.
## Honest notes
These tests initially exercised the live pipeline; on Day 10 they were converted to
fully mocked deterministic tests (unittest.mock) so CI never depends on network or
API keys, and old top-level manual test scripts were moved to manual_scripts/ after
they crashed pytest collection.
