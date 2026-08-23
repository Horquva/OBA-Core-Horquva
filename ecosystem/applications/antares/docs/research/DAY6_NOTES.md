# Day 6 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Antares Platform Engineer / AI Engineer Intern**
**Part-5: Future Organization Modeling Engine (v1)**

## What I set out to do today

Day 5 gave the platform the ability to notice when multiple signals
form a pattern. Part-5 is the actual differentiator the roadmap talks
about — moving from "we noticed a repeating pattern" to "here's what
an organization built around this pattern could actually look like":

```
Organizational Signals + Impact Analyses + Evolution Patterns
+ Evidence + Organizational Dimensions
-> Structured Future Organizational Models
```

Goal for today: take one or more existing patterns (from Day 5) and
combine them into a real `OrganizationModel` row — not a hand-written
description, but something assembled from the actual signal/impact/
pattern data already sitting in the database.

## What I actually built

**1. Small reuse fix in `app/pattern_engine.py`**

Day 5's dimension-lookup helper was named `_dimension_set_for_signal`
(leading underscore = "private, not meant to be imported elsewhere").
Today's engine needed the exact same lookup, so instead of copy-pasting
it into a second file, I renamed it to `dimension_set_for_signal` (public)
and imported it into `model_engine.py`. Small thing, but duplicating
logic across engines is exactly the kind of thing that causes two
subtly different definitions of "what dimensions does this signal
touch" a few weeks from now.

**2. Missing `create` for models (same gap as Day 5 had for patterns)**

Day 2 built the `OrganizationModel` table and read endpoints, but no
way to create one. Added `schemas.OrganizationModelCreate` and
`crud.create_organization_model()`.

**3. `app/model_engine.py`**

- `_signals_supporting_pattern(db, pattern_id)` — looks up which
  signals are linked to a pattern via Day 5's `signal -supports->
  pattern` relationships.
- `_dimensions_for_pattern(db, pattern_id)` — unions the dimension
  sets of every signal supporting a pattern. Computed fresh from the
  relationship graph rather than parsed out of the pattern's
  auto-generated name, so this stays correct even if pattern naming
  changes later.
- `build_future_model(db, pattern_ids, name=None)` — the real engine.
  Takes a list of pattern_ids (the caller decides which patterns to
  combine — the roadmap frames this as building "scenarios" from
  pattern combinations, and deciding which combination is meaningful
  still felt like a judgment call the engine shouldn't make on its
  own). For every valid pattern:
  - unions their dimensions and counts total supporting signals
  - writes a real `OrganizationModel` row with an auto-generated name
    (or a custom one if given), `structure_notes` summarizing which
    patterns/dimensions/signal counts it's built from, and
    `confidence=hypothesized`
  - links `pattern -> model` relationships (type `"informs"`) so the
    evidence trail (Signal → Impact → Pattern → Model) the roadmap
    keeps describing is actually queryable afterward, not just implied

**4. New endpoints in `app/main.py`**

```
POST /models/build        body: { pattern_ids: [...], name?: str }
GET  /models/{id}/support  -> which patterns back this model
```

`/models/build` skips any pattern_id that doesn't exist rather than
failing the whole request — but if *none* of them are valid, it
returns 404 instead of silently building an empty model.

## Why confidence always starts at "hypothesized"

A model here is only ever built from patterns that were themselves
`hypothesized` (Day 5's keyword-based, non-semantic matching). Letting
a model claim higher confidence than the patterns it's assembled from
would be exactly the kind of "presenting speculation as validated
knowledge" the roadmap explicitly warns against in Part-6's guardrails
section. Moving a model toward `supported`/`validated` is Capability
Validation's job later in the pipeline, not this engine's.

## A real bug I hit (and what caused it)

While editing `schemas.py` to add `ModelBuildRequest`, my edit tool
matched a bigger chunk of the file than I intended and `ModelBuildRequest`
ended up with a stray `created_at: datetime` field left over from a
neighboring class block. FastAPI happily generated a schema for it,
and every call to `/models/build` failed with a `422` demanding a
`created_at` field the test was never sending.

Found it by checking `app.openapi()` for the actual schema FastAPI
had built for that endpoint rather than guessing from the error
message alone — the OpenAPI schema showed the phantom field clearly,
which pointed straight at the file instead of the test. Worth
remembering: when a Pydantic validation error mentions a field you
never put in the model *on purpose*, it's worth re-reading the model's
actual source before assuming the bug is somewhere else.

## How I tested it

`test_day6.py`, 9 tests:

- building a model from a single pattern works, and `confidence` is
  always `hypothesized`
- a custom `name` is respected when given
- combining two different patterns produces a model whose
  `structure_notes` reflects both
- an invalid pattern_id mixed with a valid one still builds the model
  from the valid one
- if every given pattern_id is invalid, the endpoint returns 404
- `GET /models/{id}` and `GET /models/{id}/support` both work, and
  both 404 correctly on a missing model
- `/support` correctly lists back the pattern(s) that fed into a model

```
======================= 9 passed, 150 warnings in 1.18s ========================
```

Reran the full test suite (Day 2 + Day 4 + Day 5 + Day 6) afterward:

```
======================= 33 passed, 262 warnings in 1.71s =======================
```

## How to run it

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In `http://127.0.0.1:8000/docs`:
1. Create + analyze 2 similarly-worded signals (Day 4)
2. `POST /patterns/detect` (Day 5)
3. `POST /models/build` with that pattern's id
4. `GET /models/{id}` and `GET /models/{id}/support` to see it all
   connect back

Tests:
```bash
pytest test_day2.py test_day4.py test_day5.py test_day6.py -v
```

## What I'm leaving for later (on purpose)

- No scenario comparison yet (Part-5 mentions "Scenario A / B / C" —
  multiple competing future models built from different pattern
  combinations, compared side by side). Today only builds one model
  at a time; comparing several is a natural next step once there are
  enough real patterns to make comparison meaningful.
- `purpose` is currently a fixed sentence, not generated per-model.
  Once an AI/LLM service exists in the platform (Part-3+'s planned
  direction), this is exactly where scenario-generation and
  comparative reasoning are supposed to plug in.
- No candidate-capability generation yet — that's the very next piece
  of Part-5/Part-6 (`Model -> Candidate Capability`), and now that
  models exist as real rows with a real evidence trail behind them,
  it should be a fairly small addition on top of this.
