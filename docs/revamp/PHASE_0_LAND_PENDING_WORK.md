# PHASE 0 — Land the Pending Risk-Engine Rework

> **Objective**: Get the substantial uncommitted risk-engine rework reviewed and merged before any new work stacks on top of it.
> **Exit criteria**: PR open against `main`; backend `npm test` green; Python parity suite green; `package-lock.json` situation resolved.

## 1. Why first
The working tree carries the entire two-engine rework (13 modified files, 2 new directories, 3 new test suites, plus a deleted root `package-lock.json`). Building Phases 1–4 on top of uncommitted work would entangle two reviewable units and make any regression unattributable. This follows the repo's own convention (feature branches → PR → merge, e.g. #195, #196).

## 2. Steps
1. **Test the current tree as-is**
   - `cd backend && npm test` — expect 51+ suites green (incl. `riskEngine.unit.test.js`, `simulationsReassign.unit.test.js`, `derived.unit.test.js`).
   - `python backend/risk_engine/test_risk_engines.py` — pgmpy/scipy axioms + convergence + JS-parity ground truth.
   - Fix anything red before committing (do not commit a red tree).
2. **Resolve `package-lock.json` deletion** (git status shows `D package-lock.json` at repo root). Its deletion looks accidental (frontend deps unchanged except none at root). Restore it (`git checkout -- package-lock.json`) unless investigation shows the root package no longer has dependencies.
3. **Commit as a coherent unit** on a feature branch, e.g. `feat/risk-engine-two-engine-pipeline`:
   - Engine A/B (`backend/domain/riskEngine/`), Python reference (`backend/risk_engine/`), `derived.js` predictiveRisk rewrite, `simulations.js` D-70 successor core, brain module fixes, frontend risk wiring, tests, and the research docs under `docs/risk_engine_research/`.
4. **Open PR → `main`** with the summary from `docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md` (what replaced RISK_FACTORS, why counterfactual attribution does not sum to predictedScore, honesty note on authored CPT values).
5. **Merge, rebase `ocos/develop`**, then start Phase 1 on a fresh branch.

## 3. Integration notes (graphify-informed)
- The rework already respects the reception-desk contract: `routes/dependencies.js` and the frontend read Engine A/B outputs through `domain/derived.js` — no route constructs its own topology.
- `metricGlossary.js` entries were updated with the rework; Phase 1.5 extends (not rewrites) this pattern when `humanDependencyRisk` moves to Engine B.

## 4. Tests / verification
- All existing suites green (this is also the baseline for every later phase).
- No new code in this phase — verification only.

## 5. Risks
- The deleted `package-lock.json` may reflect an intentional root-package slim-down; if so, document that in the PR instead of restoring.
- Live-Supabase test (`graphLoader.live.test.js`) times out offline — expected failure without credentials, noted in the prior audit; run with credentials if available, otherwise record the known skip.
