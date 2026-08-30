# Independent Verification Addendum — Zeeshan Farooq Submission

Kamil independently re-ran everything in this submission from scratch (fresh venv,
fresh SQLite state) rather than trusting the docx reports at face value.

## Confirmed accurate (reproduced independently)
- Din 1: all 6 demo scripts (main.py, demo_day3/5/6/7/10) run clean, exit code 0.
- Din 1: 25 original domain/engine tests pass.
- Din 3: `app/api.py` is a real FastAPI service — started it as a live process,
  confirmed `/health`, live org create + read (write-then-read over real HTTP),
  and the full 8-step org→unit→capability→workflow→task→agent→grant→run chain.
- Din 4: governance approval gate holds under live HTTP — a resume attempt before
  approval correctly returned 409, and succeeded only after real approval.
- Din 6: the rejected-decision re-approval bug fix in `decision_service.py` is
  real and correctly guards both `"rejected"` and `"approved"` terminal states.
- Din 6: no-authentication gap is real and accurately, plainly disclosed (not
  hidden) — confirmed no `Depends`/`OAuth`/`APIKey` anywhere in `app/api.py`.
- Full suite: 36/36 tests pass (25 original + 11 red-team).

## One real bug found and fixed
`requirements.txt` only listed `SQLAlchemy` and `pytest` — it was missing
`fastapi`, `uvicorn`, and `httpx`, even though `app/api.py` and
`tests/test_api_redteam.py` both require them. Following the submission's own
"How to run it yourself" instructions exactly (`pip install -r requirements.txt`)
in a clean venv broke test collection entirely (`ModuleNotFoundError: No module
named 'fastapi'` — 0 of 36 tests could even be collected) and the API could not
be started at all. This contradicted the submission's own reproducibility claims.

**Fix applied:** added `fastapi>=0.110`, `uvicorn>=0.29`, `httpx>=0.27` to
`requirements.txt`. Re-verified in a brand-new venv, following the README's
exact instructions with no shortcuts: 36/36 tests pass, `uvicorn app.api:app`
starts cleanly, `/health` responds live.

## Minor cosmetic fix
`README_SUBMISSION_SUMMARY.md` said "the new real HTTP API" without a count;
`Din3_4_Live_Wiring_Evidence.docx` says "16 endpoints" — an actual count of
`app/api.py` gives 18 (11 write + 6 read + `/health`), or 17 excluding health.
Off by one or two, not worth reopening the docx for — noted here for the record,
left as-is in the docx.

## Verdict
Zeeshan's own work is genuinely strong: honest gap disclosure (no auth, no
Din 5 shared frontend, Din 7 blocked on decisions) throughout, real live HTTP
verification (not TestClient screenshots dressed up as "live"), and a real
self-found-and-fixed bug already in Din 6. The only thing actually broken was
the packaging (`requirements.txt`), now fixed. **ACCEPT**, with the two open
decisions (auth approach, Din 5 shared frontend) still requiring Kamil/Team
Lead input as Zeeshan correctly flagged rather than invented himself.
