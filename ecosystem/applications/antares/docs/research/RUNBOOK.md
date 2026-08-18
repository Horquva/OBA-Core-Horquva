# Engineering Runbook — Future-Signal Intelligence

Part-8 task 4 deliverable. Written for the engineer who inherits this without
having met you.

---

## Deploy / run

```bash
python3 run_demo.py                          # rebuilds fsi.db from seed
python3 -m unittest discover -s tests        # must be green before any merge
pip install -r requirements.txt
FSI_DB=/var/lib/fsi/fsi.db uvicorn fsi.api:app --host 0.0.0.0 --port 8000 --app-dir src
```

Environment: `FSI_DB` — path to the SQLite file. Defaults to `./fsi.db`.

Health check: `GET /health` → `{"status":"ok"}`.

---

## Daily operation

```bash
# 1. ingest signals + evidence via POST /signals and POST /signals/{id}/evidence
# 2. analyze impact
curl -X POST localhost:8000/signals/{id}/impact -d '{"overrides":[]}' -H 'Content-Type: application/json'
# 3. run the intelligence cycle (idempotent — safe to re-run)
curl -X POST localhost:8000/intelligence/cycle
# 4. review candidates
curl localhost:8000/patterns
# 5. human gate
curl -X POST localhost:8000/patterns/{id}/confirm  -d '{"reviewer":"name","note":"..."}' -H 'Content-Type: application/json'
curl -X POST localhost:8000/patterns/{id}/validate -d '{"reviewer":"name","note":"..."}' -H 'Content-Type: application/json'
```

The cycle is idempotent by design. Re-running it must never change a score for
unchanged inputs — there is a regression test for this. If scores drift between
runs on the same data, that is a bug, not a model update.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `422 validation_error` on signal create | title < 8 or description < 30 chars | lengthen; short titles break deduplication |
| `422 taxonomy_error` | term outside the controlled vocabulary | use a known term or extend `taxonomy.py` deliberately |
| "Refusing to analyze impact" | no evidence attached | attach evidence first — this is intended behaviour |
| Cycle returns 0 pattern candidates | fewer than 2 signals per theme, or fewer than 2 distinct sources | add corroboration, not more of the same source |
| Validation refused after confirm | unresolved HIGH-severity contradiction | resolve the disputed/retracted evidence, then re-run |
| Dashboard shows the empty state | `dashboard/data.js` missing | run `python3 run_demo.py` |
| Duplicate-looking signals | different titles normalizing differently | the merge key is the normalized title; align titles |

---

## Tuning points (and who should approve a change)

All of these are deliberately in one place each, and all of them are opinions
the team is allowed to overrule:

| Knob | File | Current |
|---|---|---|
| Source reliability | `domain/models.py` → `SOURCE_RELIABILITY` | peer-reviewed 1.00 … social 0.25 |
| Scoring weights | `engines/patterns.py` → `SCORING_WEIGHTS` | 0.25 / 0.20 / 0.20 / 0.15 / 0.20 |
| Pattern thresholds | `engines/patterns.py` | ≥2 signals, ≥2 sources |
| Evidence freshness window | `engines/contradictions.py` | 730 days |
| Contradiction penalties | `engines/contradictions.py` → `penalty()` | 0.20 / 0.10 / 0.04, capped 0.90 |
| Impact priors | `engines/impact.py` → `THEME_IMPACT_PRIORS` | per theme × dimension |

Changing any of these changes every historical score. Re-run the demo and
diff before and after, and record the reason in the PR description.

---

## Extending safely

**Adding a taxonomy theme** — add to `FUTURE_THEMES` with keywords and default
dimensions, add matching priors in `THEME_IMPACT_PRIORS`, add a classification
test. Do not add a theme with no impact priors; it will produce signals that
cannot be impact-analyzed.

**Swapping storage** — implement the same method set as `Repository`. The
engines depend only on that surface, not on SQLite.

**Adding an AI-assisted step** — the locked principle is
*AI discovers → AI proposes → deterministic systems process → human reviews →
evidence validates.* Model output may populate a suggestion field. It must not
write a stored classification, score or lifecycle state directly. If you cannot
reproduce a value by re-running deterministic code, it does not belong in the
database.

---

## Handoff checklist

- [ ] Source code, schemas, APIs, tests — in repo
- [ ] `docs/PART1_platform_specification.md` — the contract
- [ ] `docs/RUNBOOK.md` — this file
- [ ] `run_demo.py` — reproducible end-to-end proof
- [ ] `out/intelligence_artifact.json` — a real generated artifact with full provenance
- [ ] Endpoint names reconciled against locked Antares conventions — **open**
- [ ] Cross-platform interfaces agreed with Organizational Futures and Capability Validation — **open**
- [ ] Integration events / message bus specified — **open**
