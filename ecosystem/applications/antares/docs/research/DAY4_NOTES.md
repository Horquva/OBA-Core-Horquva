# Day 4 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Antares Platform Engineer / AI Engineer Intern**
**Part-3: Live Organizational Signal & Impact Engine (v1)**

## What I set out to do today

Day 2 built the foundation — the canonical data model, persistence
layer, and initial APIs. But `POST /analysis` still needed a human to
manually decide which dimension a signal affects and write the impact
by hand. Part-3 of the roadmap asks for something that can actually
take a signal and produce structured analysis on its own:

```
Input -> Normalization -> Entity/Concept Extraction
-> Organizational Dimension Classification -> Impact Analysis
-> Evidence Association -> Confidence Assessment
-> Structured Organizational Intelligence
```

My goal for today was v1 of that pipeline — specifically the
classification + impact-analysis steps. Not the full thing (that's an
AI/LLM job for a later iteration of Part-3), but something real that
takes a signal already in the database and writes actual Impact rows
against it, end to end.

## What I actually built

**1. `app/impact_engine.py`**

Two pieces:

- `classify_dimensions(text)` — a pure function, no database access.
  Scans a signal's combined title+description against a keyword map
  for each of the 10 organizational dimensions and returns which ones
  matched. Kept this separate from anything database-related so it's
  trivially unit-testable on its own.

- `analyze_signal(db, signal_id, force=False)` — the actual engine.
  Loads a signal from the database (it has to already exist — this
  only works on signals that came through the real `POST /signals`
  ingestion, not raw text handed in directly), classifies it, and for
  every matched dimension writes:
  - a real `Impact` row via `crud.create_impact()`, confidence always
    set to `inferred` (a keyword match is not an observed fact, and I
    didn't want this to quietly look more certain than it is)
  - a `Relationship` row (`signal -> impact`, type `"produced"`) via
    `crud.create_relationship()`, since the roadmap's Relationship
    Engine idea (Signal -> Impact -> Pattern -> Model) needs these
    edges to exist from the start, not bolted on later

**2. New endpoint in `app/main.py`**

```
POST /signals/{signal_id}/analyze
```

Runs the engine against a signal that's already in the DB and returns
the Impact rows it created. Returns 404 if the signal doesn't exist.

**3. Idempotency by default**

If a signal already has Impact rows, calling `/analyze` again just
returns the existing ones instead of creating duplicates — I didn't
want every accidental re-click in the Swagger UI to double up the
data. Pass `?force=true` if you actually want to re-run analysis and
add a fresh batch on top (useful once the classification logic itself
changes and old signals need to be re-scored).

## How I tested it

`test_day4.py`, same `pytest` + `TestClient` pattern as Day 2:

- `classify_dimensions` matches the right dimensions on sample text,
  and returns an empty list when nothing matches (no forced guessing)
- `/analyze` actually creates Impact rows, and every one is marked
  `inferred`
- calling `/analyze` twice without `force` doesn't create duplicates
- calling `/analyze?force=true` creates a genuinely new batch of rows
  on top of the old ones (total impacts for the signal roughly
  doubles)
- `/analyze` on a signal that doesn't exist returns 404
- `/analyze` actually creates the `signal -> impact` relationships,
  not just the impacts themselves

```
======================== 7 passed, 50 warnings in 0.71s ========================
```

Also reran `test_day2.py` afterward to make sure nothing from Day 2
broke — all 10 of those still pass.

## Bugs I hit while testing (and what they taught me)

Worth writing down because they weren't in the engine logic itself —
they were in how I was testing it, and both would've cost real
debugging time later if I hadn't caught them today:

1. **Dimensions came back empty inside the engine.** First test run,
   every impact was silently skipped. Turned out I'd written
   `client = TestClient(app)` at the top of the file instead of using
   it as a context manager (`with TestClient(app) as c:`). FastAPI's
   startup event — which seeds the 10 dimensions — only fires inside
   the `with` block. Fixed by copying the fixture pattern from
   `test_day2.py`, which already did this correctly.

2. **New test signals kept getting flagged as duplicates.** Day 2's
   duplicate-detection (from `find_possible_duplicate_signals`) was
   comparing my test signals against each other and returning 409,
   because I was reusing near-identical description text across
   several tests. Not a bug in the duplicate detector — it was doing
   exactly what it's supposed to. Fixed by creating test signals with
   `?check_duplicates=false`, since these tests are about the impact
   engine, not re-testing duplicate detection (that's already covered
   in `test_day2.py`).

Both of these were useful reminders that Day 2's features (startup
seeding, duplicate detection) are real and active — anything I build
on top has to work with them, not around them.

## How to run it

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then in `http://127.0.0.1:8000/docs`:
1. `POST /signals` — create a signal
2. `POST /signals/{id}/analyze` — run the engine, see the Impact rows
   come back
3. `GET /signals/{id}/analysis` — confirm they're actually stored
4. `GET /relationships?source_id={signal_id}` — confirm the
   signal→impact edges exist

Tests:
```bash
pytest test_day4.py -v
pytest test_day2.py -v   # confirm Day 2 still works
```

## What I'm leaving for later (on purpose)

- Classification is still keyword-based, not semantic/LLM-based. The
  roadmap is explicit that Part-3's AI engineering work (LLM-based
  classification, structured extraction, confidence estimation) comes
  as an iteration on top of this, not a replacement for having a
  working pipeline first.
- No entity/concept extraction step yet — right now the engine only
  answers "which dimensions does this touch," not "what specifically
  is changing." That's a natural next slice of Part-3.
- `force=true` re-runs always add a new batch rather than replacing
  the old one. That's intentional for now (keeps a history of
  analysis runs), but it means the impacts table will need a way to
  mark old batches as superseded once real re-scoring becomes a
  regular thing — noting this as a Part-4/Part-7 consideration.
