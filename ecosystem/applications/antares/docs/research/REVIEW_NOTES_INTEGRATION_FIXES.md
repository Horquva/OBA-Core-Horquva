# Integration Review — Fixes Applied

Reviewed by running the actual project (fresh venv, `pytest`, live
`uvicorn` server, and `demo_full_pipeline.py`) rather than reading
code only. All 53 existing tests still pass after every fix below;
the full pipeline was re-run end to end after each change.

## 1. Test DB isolation bug (real bug, most important)
Every `test_day*.py` file set `os.environ.setdefault("TESTING", "1")`
with a comment claiming tests use "a separate throwaway db" — but
`app/database.py` never actually read that env var. All 53 tests were
silently hitting the exact same `organizational_futures.db` as the
dev server and `demo_full_pipeline.py`, with no real isolation.
**Fixed**: `database.py` now routes to `test_organizational_futures.db`
when `TESTING=1`, matching what the tests already claimed.

## 2. Dashboard showed raw hex IDs instead of dimension names
`ImpactOut` only exposed `dimension_id` (a bare hex string), never the
actual dimension name (e.g. "governance", "workforce"). The Day 9
dashboard rendered tags like `dim:0b347622` — unreadable, and directly
against Part-8's own requirement to "make the intelligence
understandable immediately." **Fixed**: added a `dimension_name`
property on the `Impact` model, exposed it on `ImpactOut`, and updated
the dashboard JS to show it.

## 3. Deprecated FastAPI startup hook
`@app.on_event("startup")` is deprecated and may be removed in a
future FastAPI release. **Fixed**: converted to a `lifespan` context
manager; `seed_dimensions()` still runs on startup, same behavior.

## 4. Pydantic protected-namespace warning
`CapabilityBuildRequest.model_id` triggered a `UserWarning` on every
request (pydantic reserves the `model_` prefix). **Fixed**: added
`model_config = {"protected_namespaces": ()}`.

## 5. Housekeeping
- Removed a duplicated `# ---------- Candidate Capabilities ----------`
  comment in `crud.py`.
- Added `.gitignore` (`*.db`, `__pycache__/`, `.pytest_cache/`) so
  local SQLite files and caches don't get committed to the Antares
  repo by accident.

## Not changed (already correct / intentional, confirmed by running it)
- Keyword-based dimension classification (v1, documented as a known
  limitation — semantic/embeddings is explicitly a later iteration).
- `total_supporting_signals` in `model_engine.py` counts signal
  references per pattern, not deduplicated across patterns — this
  is a reference count by design, not a bug.
- No auth — flagged in `FINAL_SUMMARY.md` as expected before a real
  Part-8 delivery, not an oversight.

## Verified working end to end after all fixes
```
53 passed, 357 warnings in ~2.5s   (all warnings are third-party deprecation notices, not from this code)
demo_full_pipeline.py: Signal -> Impact -> Pattern -> Model -> Candidate Capability -> Trace, all 200 OK
GET /dashboard: 200, dimension names now readable
GET /docs, /openapi.json: 200
```
