# Day 7 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Part-6: Organizational Futures Intelligence Engine (v1)**

## What I built

**1. `app/capability_engine.py`**
- `build_candidate_capability(db, model_id, name=None)` — turns an existing future model (Day 6) into a `CandidateCapability` row. Always `status="candidate"` — the roadmap's guardrails are explicit that this platform proposes, it never approves. Links `model -> capability` (`"suggests"`).
- `trace_signal(db, signal_id)` — Part-6's "Intelligence Retrieval" idea: walks the relationship graph outward from one signal (Signal → Impact → Pattern → Model → Capability) and returns the whole trail in one call, instead of five separate lookups.

**2. New endpoints:** `POST /capabilities/build`, `GET /candidate-capabilities/{id}`, `GET /intelligence/trace/{signal_id}`.

## Two real bugs found while testing (both from the same root cause)

Both `test_intelligence_trace_returns_full_chain` failures came from one thing: **patterns and models can be shared/reused across different signals with the same dimension combination**, since Day 5's pattern matching is exact-set-based, not per-test-isolated.

1. My test helper (`_full_chain`) grabbed `patterns[0]` from `/patterns/detect` — fine when it's the only pattern in the database, wrong once earlier tests had already created other patterns. Fixed by looking up the *actual* pattern this signal got linked to via `GET /relationships?source_id=...`, instead of guessing by list position.

2. Even after that fix, a signal can legitimately end up traced to **more than one model**, because model-building (`/models/build`) isn't deduplicated the way pattern-creation is — two different tests building a model from the same shared pattern create two separate `OrganizationModel` rows. My test assumed `trace["models"][0]` would be "the" model; fixed the assertion to check membership instead of position, and noted the lack of model-deduplication as a real design point for later (see below).

Both were caught by running the **full test suite together**, not just the new file in isolation — a good reminder that day-by-day tests passing alone doesn't guarantee they hold up once real accumulated data is in the picture.

## Test results
```
test_day7.py: 7 passed
Full suite (Day 2+4+5+6+7): 40 passed
```

## Left for later
- Model-building isn't idempotent per pattern the way pattern-detection is per dimension-set — worth revisiting once there's a real reason multiple models from the same pattern needs de-duplicating (e.g. Part-5's scenario comparison, where multiple models *should* legitimately exist side by side).
- `capability_engine` only picks one `supporting_pattern_id` even when a model was built from multiple patterns — a known limitation of the current single-FK schema, not hidden anywhere.
