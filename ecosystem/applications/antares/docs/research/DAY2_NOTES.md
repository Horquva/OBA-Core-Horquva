# Day 2 — Organizational Futures Engineering Platform
**Muhammad Muzammel Aslam — Antares Platform Engineer / AI Engineer Intern**
**Part-2: Organizational Futures Engineering Foundation**

## What I set out to do today

Day 1 was mostly about understanding the system — reading through the locked
architecture, mapping how the Organizational Futures Platform fits into
Antares, and writing down the lifecycle (Signal → Impact → Pattern → Future
Model → Candidate Capability → Validation). Day 2 is where I actually start
building, so my goal was to stop treating this as a research/documentation
exercise and get a real, working foundation in place: data model,
persistence, and a first set of APIs that I can actually hit and get data
back from.

I decided to use Python with FastAPI and SQLAlchemy, backed by SQLite for
now. I picked SQLite specifically because it needs no setup at all, and
since I built everything through SQLAlchemy, switching to Postgres later
should mostly just mean changing one connection string — the model and
API code shouldn't have to change much.

## What I actually built

**1. Canonical data model** (`app/models.py`)
I implemented the domain objects that were listed in Part-1/Part-2 of the
roadmap as real tables, not just documentation categories:

- `Signal` — a raw organizational observation coming into the system
- `Evidence` — supporting material for a signal
- `OrganizationalDimension` — the 10 fixed dimensions (leadership,
  governance, decision-making, workforce, collaboration, accountability,
  trust, organizational memory, operational execution, organizational
  intelligence)
- `Impact` — the structured analysis linking a signal to a dimension
- `Pattern` — placeholder table for Part-4, so later work has somewhere to
  write to
- `OrganizationModel` — placeholder for Part-5 future models
- `CandidateCapability` — placeholder for capability candidates
- `Relationship` — a generic "edge" table (source type/id → target
  type/id + relationship type) so I don't have to keep adding new join
  tables every time a new kind of relationship shows up (Signal→Impact,
  Impact→Pattern, Pattern→Model, Model→Capability, Pattern→Pattern, etc.)

**2. Evidence model**
Every `Signal`, `Evidence` row, and `Impact` carries an `evidence_state`
field that can be one of:

```
observed → supported → inferred → hypothesized → candidate → validated
```

This was one of the more important requirements from the roadmap — the
platform isn't supposed to let AI-generated guesses sit in the system
looking the same as something that was actually observed. Having this as
an enum on every important row means the API always has to be honest
about how solid a piece of information is.

**3. Persistence layer** (`app/database.py`, `app/crud.py`)
- `database.py` sets up the SQLAlchemy engine/session and a `get_db()`
  dependency for FastAPI.
- `crud.py` is the actual repository layer — functions for creating and
  reading signals, evidence, impacts, patterns, models, candidate
  capabilities, and relationships. I kept this as plain functions instead
  of a class-based repository pattern, since that felt like more
  structure than Day 2 actually needs. Can refactor into classes later if
  the platform needs pluggable storage backends.
- Added a very basic versioning mechanism (`bump_signal_version`) so
  signals don't just get silently overwritten. It's not full history
  tracking yet — that would need a separate audit/history table — but
  it's a start, and I noted this as a TODO for a later part.

**4. Initial APIs** (`app/main.py`)
Everything the Part-2 checklist asked for:

| Endpoint | What it does |
|---|---|
| `POST /signals` | create an organizational signal |
| `GET /signals/{id}` | retrieve a signal |
| `GET /signals` | list signals |
| `POST /evidence` | attach evidence to a signal |
| `GET /signals/{id}/evidence` | retrieve evidence for a signal |
| `GET /dimensions` | query the 10 organizational dimensions |
| `POST /analysis` | store an organizational analysis (Impact) |
| `GET /signals/{id}/analysis` | retrieve analysis for a signal |
| `GET /models`, `GET /models/{id}` | retrieve organizational models |
| `GET /patterns` | access candidate patterns |
| `GET /candidate-capabilities` | access candidate capabilities |
| `PATCH /signals/{id}` | update a signal (auto-records prior version to history) |
| `GET /signals/{id}/history` | retrieve a signal's version history |
| `POST /relationships`, `GET /relationships` | create/retrieve relationships |

`POST /signals` also runs a naive duplicate check by default (see "Closing
the gaps" below) - it can be disabled per-call with `?check_duplicates=false`.

The 10 dimensions get seeded into the database automatically on startup
so I don't have to manually POST them in every time I reset the DB.

## How I tested it

I wrote `test_day2.py` using FastAPI's `TestClient` + `pytest`. It checks:
- the app starts and the dimensions get seeded correctly (all 10, names
  match)
- a signal can be created and read back, and a missing signal returns a
  proper 404 instead of an empty/broken response
- evidence can't be attached to a signal that doesn't exist (basic
  referential integrity check)
- an analysis (Impact) can be created against a signal + dimension and
  read back
- a relationship can be created and retrieved by `source_id`

All 6 tests pass locally:

```
======================== 6 passed, 19 warnings in 0.85s ========================
```

(The warnings are just SQLAlchemy telling me `datetime.utcnow()` is
getting deprecated in a future version, and FastAPI nudging me toward
`lifespan` handlers instead of `@app.on_event("startup")` — neither
breaks anything right now, just noted them as cleanup items for later.)

I also manually walked through the whole flow in order — create a
signal, attach evidence, look up the governance dimension, store an
analysis against it, link a relationship, then read all of it back — to
make sure the pieces actually connect to each other and not just pass
their individual tests in isolation.

## How to run it

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then go to `http://127.0.0.1:8000/docs` — FastAPI generates an
interactive Swagger page automatically, which made it a lot easier to
click through and test endpoints by hand instead of writing curl
commands for every single one.

To run the tests:
```bash
pytest test_day2.py -v
```

## Closing the gaps (later same day)

After I got the first version working I went back and reread the Part-2
checklist more carefully, and noticed a few things I'd only half-done:

- **"Updating analyses" and "maintaining provenance"** — my first pass
  only bumped a version counter on update, which tells you SOMETHING
  changed but not what it used to say. I added a `SignalHistory` table
  and `PATCH /signals/{id}`, which snapshots the signal's previous state
  into history *before* applying the update, and only bumps the version
  if something actually changed (a no-op patch doesn't inflate the
  version number). There's also `GET /signals/{id}/history` to pull the
  version trail back out. This felt closer to what "provenance" is
  actually supposed to mean.

- **Duplicate detection** — Part-2 lists this under AI Engineering. I
  don't have an AI/embeddings service wired up yet (that's Part-3+), so
  I added a naive stand-in using Python's `difflib` to compare a new
  signal's title+description against existing ones. If something looks
  too similar, `POST /signals` returns a `409` with the likely matches
  instead of silently creating a duplicate row, but it doesn't hard-block
  — you can pass `?check_duplicates=false` to force it through if it's a
  genuinely separate observation that just reads similarly. I was
  explicit in the code comments that this is a placeholder for real
  semantic duplicate detection later, not the real thing.

- **Demo data** — added `seed_demo_data.py`, which pushes three
  realistic-sounding organizational signals (with evidence + analysis)
  through the real API rather than writing to the DB directly. Mostly so
  I have something other than an empty database to point at when I walk
  through this, but it also worked as one more end-to-end check that
  ingestion → evidence → analysis all hang together correctly.

- **Tests** — went from 6 to 10 passing tests, covering: update +
  history creation, no-op updates not inflating the version, updating a
  signal that doesn't exist (404), and the duplicate-detection flow
  (flag it, then allow override).

```
======================= 10 passed, 30 warnings in 2.53s ========================
```

## What I'm leaving for later parts (on purpose)

- `Pattern`, `OrganizationModel`, and `CandidateCapability` are real
  tables with working GET endpoints, but nothing populates them yet —
  that's Part-4 and Part-5's job (the Pattern Engine and Future
  Modeling Engine). Today was about making sure they have a place to
  land.
- No AI/LLM calls yet. Part-2 was explicitly about the foundation —
  schemas, persistence, first APIs — not the processing engine. That
  starts in Part-3.
- Versioning is basic right now (a version counter that increments).
  Full history/audit trail is something I want to revisit once there's
  more real data flowing through the system.
- Authentication/access control isn't in place yet since this is still
  local/dev only. Will need to check what the locked Antares
  architecture expects here before Part-8.

## Quick note on why some tables are still "empty shells"

I went back and forth on whether to even build `Pattern`,
`OrganizationModel`, and `CandidateCapability` this early, since nothing
writes to them yet. Decided to build them anyway because the
`Relationship` table needs real tables on both ends to actually mean
anything, and because Part-2 specifically calls out designing schemas
for the full domain, not just the parts that are active this week. Felt
better to have the shape agreed on now than to bolt it on later and risk
breaking the relationship links.
