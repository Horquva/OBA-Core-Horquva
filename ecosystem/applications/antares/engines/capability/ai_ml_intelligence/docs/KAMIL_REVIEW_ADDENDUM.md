# Independent Review Addendum — Kamil, 2026-08-30

This addendum documents an independent re-verification of Hasnain's
AI/ML Intelligence Layer submission (Din 1-2 deliverables: Part 1 reality
baseline + Part 2 draft integration contract). Re-run in a fresh venv
rather than trusting the docs at face value. Real bugs were found and
fixed; the fixed files are included in this package.

## What was re-verified

- Ran `pip install -r requirements.txt` in a brand-new venv, exactly as the
  README's Setup section instructs.
- Ran `python -m pytest tests/ -v` — originally 18/18 passed. After the
  fixes below, 20/20 pass (2 new tests added for `replan()`).
- Ran `demo_end_to_end.py` end to end.
- Ran `test_real_wiring.py` (the structural integration test against
  Zeeshan's real `run_agent_task()`).

## Real bugs found and fixed

1. **`.env` was never actually loaded — `python-dotenv` was a listed
   dependency but unused.** `requirements.txt` lists `python-dotenv`, and
   the README's Setup section says "Add your Gemini key to `.env`", but no
   file anywhere called `load_dotenv()`. `ModelAdapter` read
   `os.environ.get("GEMINI_API_KEY", "")` directly. Confirmed by running
   `demo_end_to_end.py` in a clean shell with `GEMINI_API_KEY` **not**
   exported but present in `.env`: the adapter's `api_key` was `''`. Anyone
   following the README exactly — not just Hasnain, who presumably had the
   variable exported in his own shell already — would silently get no key
   and every call would fail with an auth error, not a "no key found"
   message either, since `demo_end_to_end.py`'s own `has_key` check reads
   `os.environ` the same way.
   **Fix:** added `from dotenv import load_dotenv; load_dotenv()` to the
   top of `intelligence/model_adapter.py`. Re-verified: `GEMINI_API_KEY` is
   now populated from `.env` with no manual export needed.

2. **`replan()` was documented as implemented but did not exist in the
   code.** Both `README.md` ("Planning loop: plan() -> evaluate_plan() ->
   replan()") and `docs/PART1_REALITY_BASELINE.md` (table row: "IMPLEMENTED,
   RUNNABLE, UNTESTED") claimed a `replan()` method existed. It did not —
   `intelligence/reasoning_engine.py` only defined `plan()` and
   `evaluate_plan()`. This is exactly the kind of doc/code mismatch Part 1's
   own stated standard ("nothing is claimed that hasn't been executed and
   observed") is supposed to catch.
   **Fix:** implemented `ReasoningEngine.replan(plan, failure_reason)` for
   real — takes a rejected plan and the reason `evaluate_plan()` gave,
   asks the model for a corrected plan, returns a new `Plan`. Added 2 real
   unit tests (`test_replan_produces_new_plan_from_stubbed_model`,
   `test_replan_handles_model_error`) covering the success and
   model-error paths. `docs/PART1_REALITY_BASELINE.md` updated to reflect
   the corrected, now-true status.

3. **`test_real_wiring.py` hardcoded two absolute local paths** —
   `/home/claude/zeeshan_review/final_submission/future_org_engine_code`
   and `/home/claude/antares_ai_ml_connector_full`. These only existed on
   Hasnain's own machine, so anyone else running this file — Zeeshan, a
   grader, CI — would hit `ModuleNotFoundError` immediately.
   **Fix:** both paths are now read from `ZEESHAN_ENGINE_PATH` /
   `AI_ML_ROOT` environment variables with sensible relative defaults, and
   a missing path now exits with a clear instruction instead of a raw
   traceback. **Could not re-run this specific test live** — the review
   sandbox has no access to `zeeshanfarooq1034/HORQUVA-future-organization-Engineering`
   (private repo, no credentials in this sandbox) — so the wiring itself
   is unverified by this addendum. This should be re-run by Hasnain or
   Zeeshan directly, now that the file is portable.

## Not independently verifiable in this sandbox (not bugs — an environment limit)

- **Live Gemini calls.** This review sandbox's network egress does not
  allow `generativelanguage.googleapis.com`. Running `demo_end_to_end.py`
  here fails with `HTTP 403: Host not in allowlist`, not a code problem —
  the same call returned a clean, non-crashing `{"error": ...}` dict
  exactly as `model_adapter.py` is written to do, which is itself a
  correct behavior confirmation for the failure path. The specific
  numbers in Part 1 (6-step plan, confidence 0.95, avg_score 1.0) could
  not be reproduced here and are taken on Hasnain's word — they should be
  reproduced by Zeeshan or Kamil on a machine with real network access
  before being treated as independently confirmed.

## Security fix applied

- **The submitted `.env` file contained a live-looking `GEMINI_API_KEY`.**
  `.gitignore` correctly excludes `.env` from git, so it wasn't pushed to
  the repo — but it was still bundled directly into this submission zip,
  which is a separate leak path from git. **Fixed:** replaced the real key
  in `.env` with a placeholder in this delivered package. Hasnain should
  still rotate that key at aistudio.google.com/apikey as a precaution
  (it was exposed in a zip that passed through chat), and avoid bundling
  `.env` in future submission zips — share keys over a private channel
  instead, or leave `.env` out entirely and let the reviewer supply their
  own.

## Verdict

Din 1-2 engineering is honest and mostly real: 18 original unit tests
(now 20) genuinely pass, `evaluate_case`/`aggregate_summary` math is
correct, the capability registry's promote/reject threshold logic is
correct, and the failure-path design (structured error dict, no crash) is
sound. Three real bugs fixed above (dead `.env` loading, an undocumented
missing method, and a non-portable integration test). No Din 3-7 evidence
is included in this submission — Part 2's own contract is explicitly
marked DRAFT / not frozen pending Zeeshan's confirmation, which is
consistent with what's actually in this zip.
