# Day 4 — Intelligence Registry & Duplicate Handling (Part-3)
## What the roadmap asked
Duplicate detection, multi-source evidence merging, deterministic identifiers,
adversarial behavior, auditability.
## What I built
- intelligence_registry.py: upsert_technology() merging evidence/sources by
  deterministic ids; get_all().
- test_adversarial.py: two sources mentioning RAG + Vector Database + LangChain.
## How I tested
Same technology from 2 sources → exactly 1 profile carrying 2 evidences and 2 source
ids; overlapping/contradictory content did not crash or duplicate entities.
## Honest notes
In-memory dict first; JSON persistence (registry_state.json) added on Day 9 so state
survives restarts (Part-2 "no static-only repository").
