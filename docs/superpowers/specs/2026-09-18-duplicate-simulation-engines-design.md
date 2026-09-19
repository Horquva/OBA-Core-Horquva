# Duplicate Simulation Engines Consolidation — Design Spec

**Status:** approved, ready for implementation plan
**Date:** 2026-09-18
**Scope:** sub-project A of 4 from the 2026-09-17 diagnostic's §10 point 5 ("merging remaining duplicate engines"). B (duplicate `DecisionSupportQueue`), C (executive vs. voice Q&A), and D (status-band scale unification) are separate sub-projects, each to be brainstormed and specced on its own.

## Problem

The diagnostic flagged four things as parallel "what happens if X" engines, alongside the canonical one in `backend/domain/simulations.js` (real graph cascade + severity + healthDelta, already hardened earlier in this remediation pass — `agentFails()`/`platformDown()`/`workflowDisruption()`/`employeeLeaves()`):

1. `GET /api/tool-impact/:name/impact` (`backend/routes/toolImpact.js`)
2. `GET /api/knowledge/impact/:employee` (`backend/routes/knowledge/impact.js`)
3. `GET /api/intelligence/simulation-universe` (`resilienceScenarios()` in `backend/domain/analyses.js`)
4. Client-side `simulateOutage()` (`frontend/lib/aiToolIntelligence.ts`) and `unrecoverableIfLeaves` (`frontend/lib/knowledgeRisk.ts`)

## Investigation findings

Tracing actual consumers (grep across the whole frontend, checked against `docs/superpowers/specs/w-h-endpoint-census-raw.md`'s independent prior census) showed this is not one problem but two different ones:

**Items 1–3 are dead code.** Each is mounted, documented, and pinged by the admin `EndpointHealthGrid` health check — but nothing in the product actually calls them for a real answer. `frontend/lib/api.ts` defines a `simulationUniverse()` wrapper for item 3 that is itself never called from any component. There is no UI surface depending on their specific output shape.

**Item 4 is two live, user-facing panels, but they're not the same kind of duplicate:**

- **`OutageImpactPanel`** (`/ai-tools`, via `simulateOutage()`) is a genuine duplicate that undercounts: it only follows *direct* tool→workflow/agent links, where `platformDown()` follows the real transitive cascade. Same question, canonical engine answers it more completely.
- **`DepartureSim`** (`/knowledge`, via `unrecoverableIfLeaves`) answers a *different* question than `employeeLeaves()` does, not a shallower version of the same one: "what personal knowledge does this person hold that's undocumented and unbacked" (ownership + documentation) vs. "what else breaks because it transitively depends on what they own" (cascade + severity). Forcing DepartureSim onto cascade data would be a semantic downgrade, not a fix — the actual gap is that DepartureSim never shows the cascade/severity/healthDelta question at all, alongside the knowledge-loss question it already answers correctly.

**Bulk-read hazard:** neither live panel can be swapped to call the existing per-entity simulation routes (`/api/simulations/platform-down/:name`, `/api/simulations/employee-leaves/:name`) once per row on page load — `domain.simulations.loadRoots()` is uncached, so N tools/employees would mean N full uncached table reads in parallel, reintroducing the exact stampede problem `computeAllCachedStampede.unit.test.js` already fixed for a different code path (`computeAllCached`). `backend/routes/simulations/rank.js` already establishes the right pattern: one `loadRoots()` call, computed for every candidate.

## Decisions (confirmed with the owner)

1. **Delete items 1–3 outright** — routes, the dead `analyses.js` function, the dead `api.ts` wrapper, and their `EndpointHealthGrid` entries. Nothing depends on their specific output.
2. **`OutageImpactPanel`**: swap to the canonical engine (fixes the undercounting). No backend payload changes needed beyond a new bulk route — the panel already has fully-loaded, normalized `Agent[]`/`Workflow[]` data on the page; it only needs the canonical engine to tell it *which* ids are impacted (cascade-correct), then keeps looking up display fields (criticality, department) from data it already has.
3. **`DepartureSim`**: additive, not a replacement. Keep the existing ownership/documentation-based "Assets Lost Forever" list exactly as-is (it's correct for its question). Add a new section showing `employeeLeaves()`'s cascade impact + severity + healthDelta for the selected person, so the panel answers both questions.
4. **New backend plumbing**: extend the existing bare index routes `GET /api/simulations/platform-down` and `GET /api/simulations/employee-leaves` (currently just return `{scenario, hint, available}`, used by nothing but the admin ping) to compute the canonical engine for *every* platform / *every* employee from one shared `loadRoots()` call — mirroring `rank.js`'s existing "load once, compute many" pattern. Return every platform/employee, not just high/critical ones (unlike `rank.js`, which deliberately filters to high/critical for the ranked list) — `OutageImpactPanel` renders a card per tool regardless of tier, and `DepartureSim`'s candidate list is built from every profile up front.

## Detailed changes

### Backend — deletions

- Delete `backend/routes/toolImpact.js`; remove its mount in `backend/index.js`.
- Delete `backend/routes/knowledge/impact.js`; remove its mount in `backend/index.js`.
- Remove `resilienceScenarios()` from `backend/domain/analyses.js` (keep `assetsOf()` — used by 3 other functions in the same file) and its export; remove the `/simulation-universe` route in `backend/routes/intelligence/constitutional.js`.
- Remove the dead `simulationUniverse()` wrapper from `frontend/lib/api.ts`.
- Remove the corresponding 3 rows from `frontend/components/admin/EndpointHealthGrid.tsx`.
- Update `backend/API_REFERENCE.md` and `README.md` references for all three (docs cleanup, not behavior).

### Backend — new bulk routes

`backend/routes/simulations/platformDown.js`, bare `GET /` handler: replace the `{scenario, hint, available}` stub with one `loadRoots()` call, then `domain.simulations.platformDown(id, roots)` for every `roots.ai_platforms` row, shaped the same as the existing per-platform response (`scenario, impactedAgents, impactedWorkflows, impactedPeople, healthBefore, healthAfter, riskLevel, healthDelta, baselineHealthScore, simulatedHealthScore`) plus `platformId`/`platformName` so the frontend can match by id, not fragile case-insensitive name matching.

`backend/routes/simulations/employeeLeaves.js`, bare `GET /` handler: same treatment over every `roots.employees` row, plus `employeeId`/`employeeName`.

### Frontend — `OutageImpactPanel` path

- `frontend/app/ai-tools/page.tsx`: replace `tools.map(t => simulateOutage(t, workflows, agents))` with a fetch to the new bulk `/api/simulations/platform-down` route.
- Replace `simulateOutage()` in `frontend/lib/aiToolIntelligence.ts` with a function that, per `AITool`, finds its bulk-route entry by `platformId`, then builds the existing `OutageImpact` shape:
  - `brokenWorkflows`/`brokenAgents`: cross-reference the bulk entry's `impactedWorkflows`/`impactedAgents` ids against the already-loaded, normalized `Workflow[]`/`Agent[]` (for display fields — criticality, name).
  - `departmentsHit`: derived the same way as today, from the cross-referenced entities' departments.
  - `usersAffected`: unchanged — `tool.users.length` is tool metadata, unrelated to cascade.
- `OutageImpactPanel.tsx` itself should need no changes (same `OutageImpact` interface) — confirm during implementation.

### Frontend — `DepartureSim` path (additive)

- Wherever `DepartureSim`'s data is assembled (`frontend/app/knowledge/page.tsx`): fetch the new bulk `/api/simulations/employee-leaves` route alongside the existing knowledge-risk data.
- `frontend/components/knowledge/DepartureSim.tsx`: add a new section (e.g. "Downstream Disruption") for the selected person, showing `impactedAgents`/`impactedWorkflows` counts, `severity`, and `healthDelta` from the matching bulk-route entry (matched by `employeeId`).
- `frontend/lib/knowledgeRisk.ts`'s `computeKnowledgeRisk()`/`unrecoverableIfLeaves`: unchanged.

## Error handling

- New bulk routes follow the same try/catch → 500 pattern already used by every route in `backend/routes/simulations/`.
- Both panels degrade softly if the bulk fetch fails: `OutageImpactPanel` and `DepartureSim`'s new section should omit/show "unavailable" rather than blocking the page, consistent with the existing soft-fallback pattern already used on `/simulation` (`predictiveRiskUnavailable`, F-11/F-12).
- Bulk route responses are keyed by numeric id (`platformId`/`employeeId`), not name matching — more robust than the existing single-entity routes' `ilike` name lookup, and avoids introducing a new name-matching failure mode.

## Testing

- Backend: new unit test coverage for both bulk route handlers — every platform/employee gets exactly one entry, and a given entry matches what the single-entity route returns for the same id (same `simulationRoutes.test.js` file, new `describe`-equivalent blocks).
- Backend: confirm (already checked) no existing test references `toolImpact`, `knowledge/impact`, or `resilienceScenarios` — the deletions have zero test fallout.
- Frontend: no existing frontend test suite to extend; verify via the browser preview per this session's established pattern — load `/ai-tools` and `/knowledge`, confirm the network tab shows one bulk call each (not N per-row calls), console is clean, and the rendered numbers reflect cascade (`OutageImpactPanel`) / show the new cascade section (`DepartureSim`).

## Out of scope

- B. Duplicate `DecisionSupportQueue` component
- C. Executive vs. Voice as two independent Q&A engines
- D. Unifying the ~8 scattered status-band scales

Each gets its own brainstorm → spec → plan cycle.

## Risk / rollout

Internal refactor plus 2 route rewrites and 3 deletions — no schema change, no data migration. User-visible effect: `OutageImpactPanel`'s numbers may increase (cascade now included, previously undercounted) and `DepartureSim` gains a new section. No existing correct behavior is removed. Verify live in the browser before considering done, matching every other item in this remediation pass.
