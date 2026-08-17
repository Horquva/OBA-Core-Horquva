# Day 5 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Antares Platform Engineer / AI Engineer Intern**
**Part-4: Organizational Evolution Pattern Engine (v1)**

## What I set out to do today

Day 4 gave the platform the ability to look at one signal and figure
out which organizational dimensions it affects. Part-4 asks for the
next step: stop treating every signal as a one-off observation, and
start noticing when *multiple* signals are actually pointing at the
same underlying pattern.

```
Multiple Observations -> Semantic/Structural Comparison
-> Common Characteristics -> Pattern Candidate
-> Evidence Aggregation -> Pattern Confidence
-> Reusable Evolution Pattern
```

v1 goal: something real that looks across every signal currently in
the database, groups the ones that affect the same combination of
dimensions, and turns each group into an actual `Pattern` row — not
just documentation describing what a pattern *would* look like.

## What I actually built

**1. Two small additions Day 2 was missing**

Day 2 built the `Pattern` table and `GET /patterns`, but there was no
way to actually *create* one yet - only read. Added:
- `schemas.PatternCreate` in `app/schemas.py`
- `crud.create_pattern()` and `crud.get_pattern_by_name()` in
  `app/crud.py`

**2. `app/pattern_engine.py`**

- `group_signals_by_dimensions(signal_dimension_map, min_group_size=2)`
  — pure function, no database access. Takes a
  `{signal_id: set_of_dimension_names}` mapping and returns groups of
  signal_ids that share the *exact same* non-empty dimension set, only
  keeping groups that reach `min_group_size`. Kept this separate from
  anything database-related so the actual grouping logic is trivially
  unit-testable.

- `detect_patterns(db, min_group_size=2)` — the real engine. Pulls
  every signal in the database, looks up the dimension set Day 4's
  impact engine assigned to each one, groups them, and for every group
  that qualifies:
  - generates a deterministic name like
    `"Pattern: decision_making + workforce"` (sorted, so the same
    dimension combo always produces the same name)
  - reuses an existing Pattern row with that name if one already
    exists, otherwise creates a new one with
    `status=created, confidence=hypothesized`
  - links every signal in the group to the pattern via a
    `Relationship` row (`signal -> pattern`, type `"supports"`),
    skipping any signal that's already linked so re-running detection
    doesn't create duplicate edges

**3. New endpoint in `app/main.py`**

```
POST /patterns/detect?min_group_size=2
```

Runs pattern detection across the whole database and returns the
patterns involved (new ones and ones that just got new signals linked
to them).

## Why v1 is structural, not semantic

This version only groups signals whose dimension sets are *exactly*
identical. Part-4 eventually wants real semantic/embedding-based
similarity (two signals worded completely differently but describing
the same underlying shift), but that needs an embeddings/AI service
that isn't wired into the platform yet. Exact dimension-set matching
was the simplest thing I could build that (a) actually works end to
end today, and (b) still reflects something real about the signals,
since the dimension sets themselves came from Day 4's real
classification, not from anything hand-picked for the demo.

I was careful to keep `group_signals_by_dimensions` as a separate,
pure function specifically so that when the matching logic upgrades to
something semantic later, it's a drop-in replacement - the rest of the
engine (pattern creation, relationship linking, idempotency) shouldn't
need to change.

## How I tested it

`test_day5.py`:

- pure grouping logic: won't group below `min_group_size`, correctly
  groups signals with matching dimension sets, ignores signals with
  empty/unanalyzed dimension sets
- `/patterns/detect` actually creates a `Pattern` row from two signals
  with overlapping wording, and the pattern starts at
  `confidence=hypothesized`, `status=created`
- running detection twice with no new signals returns the *same*
  pattern names both times, and there's still only one row per pattern
  name in the database (not creating a duplicate pattern every re-run)
- detection actually creates the `signal -> pattern` relationships,
  checked from both signals' side
- a single signal with no matching partner doesn't produce a pattern

```
======================== 7 passed, 70 warnings in 2.16s ========================
```

Reran `test_day2.py` and `test_day4.py` alongside it to confirm
nothing from earlier days broke:

```
======================= 24 passed, 132 warnings in 1.16s =======================
```

## How to run it

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

In `http://127.0.0.1:8000/docs`:
1. Create two or three signals with similar wording (e.g. all
   mentioning management layers + decision authority)
2. Run `POST /signals/{id}/analyze` on each one (Day 4)
3. Run `POST /patterns/detect`
4. `GET /patterns` to see the pattern that got created
5. `GET /relationships?source_id={signal_id}` to see it linked back to
   the signals that support it

Tests:
```bash
pytest test_day2.py test_day4.py test_day5.py -v
```

## What I'm leaving for later (on purpose)

- Matching is exact dimension-set overlap only - no partial-overlap
  scoring, no semantic similarity. That's the natural next iteration
  once an embeddings service exists.
- Patterns don't yet carry pattern **versioning** (created / revised /
  strengthened / weakened / deprecated from the `PatternStatus` enum
  Day 2 already defined) - right now everything just stays at
  `created`. Updating pattern status as more supporting signals arrive
  or contradict it feels like the right next slice, but I wanted
  detection working first before building status transitions on top of
  it.
- No pattern-confidence upgrade path yet (e.g. a pattern automatically
  moving from `hypothesized` toward `supported` as more signals join
  it). Noting this as a good candidate for Part-4's continued AI
  engineering work.
