# W-C — Call Site Classification

Produced by Task 9 of the [W-C plan](../plans/2026-08-24-w-c-canonical-definitions.md), against
`grep -rnE "\['critical', ?'high'\]|criticality ?=== ?'|dependency_type ?=== ?'|\.in\('(criticality|dependency_type|severity)'" backend --include=*.js`, run 2026-08-25 after Tasks 1-8 landed.

## Threshold — retype to `atOrAbove(x, 'high')`, no behavior change

All read `domain/dataset.js`'s view model, which populates `.criticality` correctly
(`criticality: e.metadata.risk` / `.assetCriticality` / `.criticality`, no `|| 'low'` fabrication).

| Site | Expression |
|---|---|
| `domain/analyses.js:48` | `['critical','high'].includes((a.criticality \|\| '').toLowerCase())` |
| `domain/analyses.js:50` | `['critical','high'].includes(k.criticality)` |
| `domain/analyses.js:128` | same as :48 |
| `domain/analyses.js:129` | `['critical','high'].includes(k.criticality)` |
| `domain/analyses.js:183` | same as :48 |
| `routes/continuity/continuity.js:132` | `a.criticality === 'critical' \|\| a.criticality === 'high'` |
| `routes/governance/governance.js:189` | same shape as continuity.js:132 |
| `routes/memory/memory.js:12` | same shape |
| `routes/voice/voice.js:91` | `['critical','high'].includes(a.criticality)`, over `[...d.agents, ...d.workflows]` from `dataset.js` |

## Already correct — deliberate per-level differentiation, no action

These compare `'critical'` and `'high'` **separately** to apply different treatment (different
penalty, different counter), not to test a merged set. Retyping would not simplify them and risks
collapsing an intentional distinction.

| Site | Why it's fine |
|---|---|
| `routes/decisionIntelligence.js:81-82,165,237-238` | `isCritical`/`isHigh` drive different penalty constants; fixed for fabrication in Task 8, no further change |
| `routes/dependencies.js:24-25` | separate `critical`/`high` counts for a breakdown |
| `routes/knowledge/intelligence.js:37-38` | separate `criticalAssets`/`highAssets` counters |
| `routes/dashboard.js:34` | exact `'critical'` count only, deliberate |
| `routes/knowledge/impact.js:56` | exact `'critical'` check only, deliberate |
| `routes/simulations/agentFails.js:59` | exact `'critical'` check on `dependency_type`, deliberate |

## Severity — different vocabulary, deferred (not part of W-C)

Incident/violation `severity` is a separate concept from entity/edge criticality (D-03's scope was
explicitly the four criticality fields, not severity). Left untouched.

| Site |
|---|
| `routes/context/context.js:145` |
| `routes/executiveMemory/executiveMemory.js:57,202` |

## Server-side Supabase filters — correct, left as DB queries

Rewriting these into JS filters would change the query shape and row count returned by Supabase, not
just the comparison — out of scope for a pure-function migration. Consistency between DB-side and
JS-side filtering is a **W-D** concern once `derived.js` owns all reads.

| Site | Note |
|---|---|
| `routes/dataQuality.js:54` | `.in('criticality', ['critical','high'])` — correct threshold, expressed as a query |
| `routes/risks.js:41` | `.in('dependency_type', ['critical','high'])` — edge-level, already correct per the decision log |

## Arbitrary-pick — same defect class as F-K, fixed in Task 9

| Site | Defect |
|---|---|
| `tools/export-company.js:369` | `if (k.criticality === 'critical') a.criticality = 'critical'` only escalates for `'critical'`, never for `'high'`, and otherwise keeps whichever row initialized the group first (line above: `criticality: k.criticality` on first encounter). A tool script, not a live route — lower stakes, same bug shape as F-K. |

## Out of scope — a third, unrelated vocabulary

| Site | Why |
|---|---|
| `tests/graph.unit.test.js:54-55` | Tests the brain's **relationship registry** default (`'medium'`), not an entity or edge field. A third vocabulary belonging to the graph layer, outside the four fields D-03 scoped. Left untouched; flag for a future workstream if the graph's `low/medium/high/critical`-style labels should ever align with the canonical scale's `low/normal/high/critical`. |

## Summary

- 9 Threshold sites retyped, behavior-preserving (verified by unchanged test counts).
- 6 sites confirmed already correct, no action.
- 3 sites deferred (Severity, 2× server-side `.in()`).
- 1 additional Arbitrary-pick bug fixed (`export-company.js`).
- 1 site flagged out of scope for a future workstream (graph relationship vocabulary).
