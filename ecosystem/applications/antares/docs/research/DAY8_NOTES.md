# Day 8 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Part-7: System Testing, Evaluation & Working Integration**

## What I set out to do today

Days 4-7 each tested their own engine in isolation (impact analysis,
pattern detection, model building, capability generation). Part-7 asks
for something different: prove the whole thing actually works
*together*, and prove it fails safely on bad input instead of just
working on the happy path.

No new engine today — this was entirely a testing/evaluation day.

## What I built

**`test_day8_integration.py`**, two sections:

**A. Full pipeline integration test** — one test that walks the
*entire* lifecycle on realistic data: ingest 2 signals → attach
evidence → analyze (Day 4) → detect pattern (Day 5) → build model
(Day 6) → build candidate capability (Day 7) → pull the whole trail
back via `/intelligence/trace` (Day 7). This is the test that actually
proves the days connect correctly, not just that each one works alone.
Also checks the evidence-state discipline held the whole way through
(`inferred` on impacts, `hypothesized` on the model, `candidate` on
the capability — nothing quietly claiming more certainty than it has).

**B. Failure/edge-case tests** — malformed signal (missing required
field → 422), evidence against a signal that doesn't exist, analyzing
a signal that matches zero keywords (should return an empty list, not
error), pattern detection on an empty database, building a model from
an empty pattern list, and reconfirming Day 2's duplicate detection
still works after everything added on top of it in Days 4-7.

## Bugs found (both from wrong assumptions about the API, not the engines)

1. **`POST /evidence`** — I guessed field names `source`/`content`
   when writing the test. The real schema (from Day 2) uses
   `description`/`source_reference`. Fixed by actually reading
   `schemas.EvidenceCreate` instead of guessing.

2. Same root issue in the 404-check test for evidence against a
   missing signal — same wrong field names, same fix.

Both were caught immediately because the test suite was actually run,
not just written and assumed correct.

## Test results

```
test_day8_integration.py: 11 passed
Full suite (Day 2 + 4 + 5 + 6 + 7 + 8): 51 passed
```

## How to run it

```bash
pytest test_day2.py test_day4.py test_day5.py test_day6.py test_day7.py test_day8_integration.py -v
```

## What this proves, going into Part-8

- Signal ingestion → evidence → impact → pattern → model → capability
  all genuinely connect through real relationship rows, not just
  independently-passing unit tests.
- The platform doesn't crash on missing resources, malformed input,
  or signals that don't match anything - it degrades gracefully
  (empty lists, 404s, 422s) instead.
- Confidence/evidence-state discipline (observed → ... → validated)
  holds end to end, which was one of the roadmap's explicit
  requirements from Part-1/Part-2 onward.

Left for Part-8: none of this is wired into a UI yet, and there's no
performance/load testing (Part-7 also lists this, but with the current
signal volumes involved it wasn't the priority for today).
