# OBA Core Remediation — Decision Log

Date opened: 2026-08-24
Status: decisions D-01…D-16 approved by owner 2026-08-24; D-17…D-21/F-L decided and closed during
W-D's brainstorming phase 2026-08-25; D-22…D-27 decided and closed during W-E's brainstorming phase
2026-08-25; D-28…D-32 decided and closed during W-G's brainstorming phase 2026-08-25; D-33…D-36
decided and closed during W-F's brainstorming phase 2026-08-25. W-A, W-B, W-C, W-D, W-E, W-G, W-F
landed. W-H is next and last.

**W-G ran unattended** (2026-08-25) under explicit owner delegation to choose the best option and
proceed without waiting for live approval — the owner was offline and asked for the work to
continue through the normal process regardless. Every decision below still carries its own
Reason/Affected/Consequence, same bar as every prior workstream; nothing was rubber-stamped to move
faster.

**W-F ran with the owner present** (2026-08-25), unlike W-G — D-01's org-consolidation migration is
explicitly owner-gated ("show the rows to the owner before touching them"), so this one couldn't run
unattended by design. Two calls were put to the owner directly rather than decided on their behalf:
how to consolidate the 4 org values (rewrite, not delete), and whether a boot-time violation is a
hard `process.exit(1)` or a soft 503 (hard exit, matching D-01's literal wording). Both live-database
writes in this workstream (the consolidation itself, and creating/removing a verification account
via the new provisioning tool) were run only after an explicit go-ahead at the moment each one
executed, separate from the general plan approval.

This file is the source of truth for the remediation. Session memory is a pointer to it, not a
substitute. If memory and this file disagree, **this file wins**.

---

## How to resume this work

1. Read this file top to bottom.
2. Read the workstream map (§3) to see what is done and what is next.
3. Read the design doc for the workstream you are starting.
4. Do not re-litigate D-01…D-16. They were decided by the owner in an interrogation phase on
   2026-08-24. Reopen one only if the code contradicts it — and say so explicitly rather than
   quietly reconciling.

---

## 1. Ground truth about the codebase

Verified against the repository, not the teardown.

- ~50 route modules, **176 endpoints**, mounted in `backend/index.js`.
- `requireAuth` is applied globally at `backend/index.js:71`.
- **Two intelligence engines run as peers:** `backend/brain/` (boot-loaded knowledge graph +
  51 analyses) and `backend/domain/derived.js` (1105 lines, reads 18 ROOT_TABLES per request,
  stamps provenance).
- `derived.js` is the strongest code in the repo and is the model for the target architecture.
  It already labels its own metrics `definitionsAreAuthored: true`.

### Confirmed defects

| # | Defect | Evidence |
|---|--------|----------|
| F-A | RBAC is decorative | `requireRole` defined at `backend/middleware/auth.js:60`, referenced in **zero** route files |
| F-B | Brain misreads criticality | `backend/brain/modules/implementations.js:72,86` treat `criticality === 'high'` as *the* critical set |
| F-C | Three competing OIS | `derived.js` `pillars.orgScore` (GI/MI/DI) vs `backend/routes/voice/voice.js:112` (`0.5·documented + 0.5·backed`, called "Organizational Intelligence Score" at line 265) vs `orchestrator.js` stored column |
| F-D | ~16 independent SPOF implementations | SPOF logic appears across 17 files with no shared module |
| F-E | No write loop | Of 176 endpoints only 4 non-auth writes exist (`avatar/check`, `selfHealing/run`, `voice/ask`, `voice/command`); **none** mutate root organizational data |
| F-F | Tenancy asserted, not enforced | `backend/lib/orgGuard.js` — no business table has an org column; 4 org values in `app_users` |
| ~~F-G~~ | **WITHDRAWN — claim was wrong.** Originally recorded as "phantom criticality reads". | The scoring functions read `.criticality` on view-model objects, and the loaders populate it correctly: `decisionIntelligence.js:45` maps `criticality: w.risk \|\| 'low'`, `:326` maps `criticality: a.risk \|\| 'low'`, and `tools.js:117` derives it from `knowledge_assets`. The original finding checked the symptom against the database schema without reading the loader. **No phantom reads exist.** Replaced by F-G′ and F-K below. |
| F-G′ | **Fabricated criticality defaults (NEW)** | `backend/routes/decisionIntelligence.js:45,326,334` coerce absent criticality to `'low'` via `\|\| 'low'`. An unmeasured asset is presented as the *safest-looking* value, so `PENALTY_CRITICAL_NO_FALLBACK` never fires for a tool with no knowledge-asset coverage. This is a direct D-07 violation and the exact failure mode the `unknown` sentinel exists to prevent. |
| F-K | **Platform criticality is last-row-wins (NEW)** | `backend/routes/tools.js:63` assigns `byPlatform[k.asset_id] = {...}` inside a loop, so a platform with several `knowledge_assets` rows takes whichever row the database happened to return last. Arbitrary and order-dependent. |
| F-H | Graph never refreshes | `loadGraph()` called once at `backend/index.js:128`. No reload path, no `loadedAt` exposed. |
| F-I | Duplicate edge representation | `dependencies` carries both `source_id/target_id` and `agent_source/agent_target` |
| F-J | Two aggregate tables already orphaned | `collaboration_scores` and `predictive_risk_scores` have **zero** consumers after W-B |

### The criticality vocabulary is four fields, not one

Verified against `backend/sql/01_schema_migration.sql`:

| Table | Field carrying the signal |
|---|---|
| `agents` | `risk` |
| `workflows` | `risk` |
| `knowledge_assets` | `criticality` |
| `dependencies` | `dependency_type` (edge-level, **not** entity-level) |
| `ai_platforms` | **none** — no criticality signal exists at all |

`derived.js` reads these correctly (`['critical','high'].includes(a.risk)` at lines 312, 514, 658).

Route files mostly resolve them correctly too, via loader functions that normalize each table's
column into a uniform `criticality` property on a view model. The problem is not *which column* they
read — it is that they **fabricate a value when the column is empty** (F-G′) and **pick arbitrarily
when several values exist** (F-K). Both are D-07 violations dressed as convenience.

The lesson, recorded because it cost a wrong finding: when a route reads `row.criticality` and the
table has no such column, **read the loader before concluding it is a bug**. The view model is
frequently not the table.

Entity criticality ("how critical is this thing") and edge `dependency_type` ("how critical is this
link") are **different concepts sharing a vocabulary**. `backend/routes/risks.js:41` filtering
`dependency_type` is correct, not a bug.

---

## 2. Decisions

### D-01 · Single-tenant; consolidate `app_users` onto one org

- **Reason:** one customer. Isolation that is not implemented must not be implied.
- **Affected:** `backend/lib/orgGuard.js`, `backend/middleware/auth.js` (`orgContext`),
  `backend/routes/auth/auth.js`, `app_users` rows.
- **Migration:** consolidate 4 org values into 1. Destructive — show the rows to the owner before
  touching them.
- **Consequence:** `orgGuard` becomes a **hard boot failure**, not a warning. Once single-tenant is
  a decision rather than a circumstance, a second org is a defect.
- Phase 4 of the original plan collapses from the largest workstream to a cleanup.

### D-02 · `pillars.orgScore` (GI/MI/DI) is the one OIS

- **Reason:** live-computed from roots, deliberately weighted, already carries provenance.
- **Affected:** `derived.js:781`, `routes/voice/voice.js:112,265`,
  `routes/intelligence/orchestrator.js`, `routes/executive/executive.js:201`.
- **Consequence:** the voice assistant's headline number **will change**. `voice.js` stops computing
  its own. The `orchestrator` stored value becomes explicitly historical or is dropped.

### D-03 · Four distinct criticality levels: critical > high > normal > low

- **Reason:** `critical` and `high` mean different things.
- **Affected:** ~20 files plus the brain.
- **Nuance (see D-06):** sites expressing *"at or above high"* are **correct**, merely untyped.
  Sites *conflating the two labels as one meaning* are wrong. Classify each of the 20 individually;
  do not mass-rewrite.
- **Consequence:** published numbers move. Accepted under D-16.

### D-04 · Write loop OUT OF SCOPE this pass

- **Reason:** truth before action.
- **Consequence, deliberately not reconciled away:** the original plan's acceptance criteria §20
  ("approved organizational actions can modify underlying state"; "changes can be verified and
  reflected in subsequent analysis") are **unreachable this pass**. They are marked DEFERRED in the
  final audit, not quietly dropped.
- **Also dormant:** `recommendations.status`, `verification_actions`, Phase 10 recommendation
  lifecycle.
- **Upside:** graph lifecycle (Phase 8) gets much cheaper — see D-14.

### D-05 · Delete `requireRole`; all authenticated users see everything

- **Reason:** single-org executive tool; role separation on a read-only surface is theatre.
- **Consequence:** deleted, not left dormant. A security primitive that protects nothing is worse
  than none, because it reads as protection. `app_users.role` survives as **UI personalization
  only** (`components/layout/Sidebar.tsx`, `app/account/page.tsx`, `lib/search.ts`) and must be
  documented as cosmetic.
- **Accepted trade-off:** any authenticated user can read named-individual judgements — per-person
  risk ratings, hero dependencies, accountability gaps by name. The owner decided this. Do not
  re-raise it.
- `/admin` is a read-only endpoint-health grid, so removing gates costs nothing there.

### D-06 · SPOF = sole owner AND no backup AND criticality ≥ high

- Dependents are **not** required. A zero-dependency critical asset **is** a SPOF.
- **Affected:** the ~16 SPOF sites, notably `brain/modules/implementations.js:86` and
  `routes/workflows/spof.js`.
- **Consequence:** SPOF counts move in both directions — up from low-dependency critical assets,
  down from well-owned high-traffic ones.
- **Interaction with D-03:** "≥ high" means `{critical, high}`. This is precisely why the
  `['critical','high']` filters scattered through the codebase are not uniformly wrong.

### D-07 · Insufficient evidence; never a fabricated number

- **Reason:** original plan §14, taken literally.
- **Consequence:** the largest **frontend** change in the programme. Every score tile, verdict
  banner, pillar card and voice response needs an evidence-absent rendering path.
- **Critical detail:** `band()` at `derived.js:79` must stop mapping absent input to `CRITICAL`.
  An unmeasured organization is not a failing one, and today's banding cannot tell those apart.

### D-08 · superseded by D-09

### D-09 · Keep genuine time-series; drop derivable aggregates

- **DROP:** `governance_assessments`, `continuity_assessments`, `dept_health_scores`,
  `collaboration_scores`, `predictive_risk_scores`.
- **KEEP**, with explicit `historical` provenance: `org_health_snapshots`, `documentation_trend`,
  `learning_snapshots`, `organizational_forecasts`.
- **Reason:** dropping everything would delete the only time-series in the system, and with no write
  loop (D-04) nothing would regenerate it. Real consumers exist: `routes/forecast/forecast.js`,
  `routes/learning/learning.js`, `routes/briefing/briefing.js`, `routes/context/context.js`,
  `routes/health/health.js`.
- **Sequencing (owner-agreed):** derive live → migrate consumers → verify equivalence → *then* drop.
  This honors original plan §10 and §17.

### D-10 · Coverage gate at 50%

- Each score declares its required inputs. Below **50%** coverage it returns
  `status: 'insufficient_evidence'` with the actual coverage figure instead of a number.
- 50% is an assumed default the owner may override.

### D-11 · OIS weights unchanged (GI 0.35 / MI 0.35 / DI 0.30), labelled authored

- `definitionsAreAuthored: true` already tells the truth about them. No change.

### D-12 · `derived.js` is the truth layer; `brain/` becomes a library beneath it

- **Consequence:** the Org Science page's cards currently run brain modules directly via
  `routes/intelligence/prediction.js`. Those become `derived.js` calls — **this is not a
  backend-only refactor**; that page is materially affected.
- The brain **keeps** the knowledge graph, entity and relationship registries, graph validation and
  the atomic swap. It **stops** being an independent publisher of product numbers.

### D-13 · Closed registration; admin provisions accounts

- Remove the public signup route and `frontend/app/signup/page.tsx`.
- **Default chosen, owner may override:** provisioning is a CLI script in `backend/tools/`, matching
  the existing `export-company.js` pattern — not a new admin screen.

### D-14 · Manual graph reload endpoint + expose `loadedAt`

- Cheapest honest option given there are no in-app writes (D-04).
- **Note:** it cannot be admin-gated, because D-05 removes role gating. A reload is idempotent and
  non-destructive, so any authenticated user triggering it is acceptable.
- Every graph-derived response carries `loadedAt`, so staleness is visible rather than silent.

### D-15 · Classify all 176 endpoints; delete only proven-dead

- Apply ACTIVE / ADMIN / INTERNAL / DISCOVERY / DEPRECATED / DEAD.
- Check the frontend, the tests **and** `backend/tools/` before removing anything.
- Deletion happens last, after the truth layer is stable.

### D-16 · "Just fix it" — no before/after accounting for moved numbers

- The owner accepted that changed figures will not get a reconciliation table.
- **Mitigation applied anyway:** each commit message names the decision (D-nn) responsible, so the
  trail exists in git even without a table.

### D-17…D-21, F-L — decided during W-D's brainstorming phase (2026-08-25)

D-02/D-09a/D-11/D-12 above did not fully resolve W-D's scope; these five close the gaps found
while tracing every route each of the four originals named. Full detail, including the
verification performed before each one, is in
[the W-D design doc](2026-08-25-w-d-truth-layer-consolidation-design.md).

- **D-17 · `orchestrator.js` and `brainCore.js`'s own weighted composites collapse onto
  `pillars.orgScore`.** Both computed an independently-weighted "Organizational Intelligence
  Score" / "Brain Index" from the same `domain.intelligence.all()` inputs D-02 already
  consolidated everything else onto — a restatement of F-C the original D-02 pass missed for two
  files. The pre-existing `brain-as-library-design.md` (§11, open question 3) had already flagged
  this pair as unresolved.
- **D-18 · The 8 Org Science cards route through `domain.graph`, not `brain/` directly.** None of
  the 8 (`pattern`/`dna`/`culture`/`maturity`/`behavior`/`benchmark`/`strategic-alignment`/
  `capability-by-dept`) has a `derived.js` equivalent — they're graph-structural, not root-table
  aggregates — so D-12's "brain stops being reached into directly" is satisfied by an
  import-path swap (`domain.graph.run` already re-exports `brain.run`), not a reimplementation.
- **D-19 · Pre-existing uncommitted WIP is reviewed and selectively absorbed.** `health.js` and
  `executive.js` already implemented D-02/D-12's shape correctly at session start, uncommitted;
  redoing them from HEAD would have produced a second, divergent fix. Files confirmed unrelated
  by diff review are left untouched.
- **D-20 · Historical provenance stamping on the 4 genuinely-frozen KEEP-list tables.** Verified
  individually — zero writers anywhere in `backend/` for `org_health_snapshots`,
  `documentation_trend`, `learning_snapshots`, `organizational_forecasts`. `executive_briefings`
  looked like a fifth by association (`briefing.js` reads it constantly) but is written daily by
  `/today`; deliberately excluded.
- **D-21 / F-L · `dept_health_scores` (D-09 DROP list) and two uncatalogued frozen tables
  (`department_exposure`, `failure_patterns`) get live `derived.js` equivalents.** Two new
  functions, kept deliberately separate: `orgHealthByDepartment` reuses `orgHealth()`'s exact
  formula partitioned by department; `departmentExposure` is a distinct, authored
  incident-exposure metric — not `continuityScore` under a new name, despite sharing input
  tables.

### D-22…D-27 — decided during W-E's brainstorming phase (2026-08-25)

D-07 and D-10 above did not fully specify how to wire `evidenceGate()` (built and tested in W-C,
zero callers before W-E) into the ~10 backend sites and ~8 frontend sites that needed it; these six
close the gaps found while tracing every score-producing route and its frontend consumers. Full
detail is in [the W-E design doc](2026-08-25-w-e-provenance-evidence-design.md) and
[plan](../plans/2026-08-25-w-e-provenance-evidence-semantics.md).

- **D-22 · Evidence gating is per-component, not just top-level.** GI/MI/DI, and each
  `derived.js` aggregate (`accountability`, `collaboration`, `orgHealth`'s five dimensions,
  `departmentExposure`, `decisionQuality`), independently declares its required inputs and gates
  on its own coverage — not one blanket gate at the top of a function.
- **D-23 · Sibling `evidence` object, not a wrapped value.** Score/rating fields keep their
  existing type (number-or-null / string-or-null); a new sibling `evidence: {sufficient, status,
  coverage, covered, total, threshold}` carries the detail. A new `combineEvidence()` helper
  (`definitions.js`) composes several named `evidenceGate()` results into one that still exposes
  this same flat shape, surfacing the worst (lowest-coverage) named gate — needed because several
  sites (GI, MI, DI, orgScore, `orgHealth`, `departmentExposure`) draw evidence from more than one
  population.
- **D-24 · The optimistic-fabrication mirror bug is in scope.** The same absence-reads-as-a-verdict
  defect exists in the opposite direction: `pillars()` GI's `violationScore` (100 on zero
  `ai_platforms`), `orgHealth()`'s `ownershipSpreadScore` (100 on zero owned agents),
  `decisionIntelligence.js`'s `calcDQI` (100 on zero decisions), and two client-side TS
  equivalents — `frontend/lib/risk.ts`'s `calculateHealthScore` and `frontend/lib/orgMemory.ts`'s
  `calcIMHS` (both 100 on an empty population). All five fixed under the same gate.
- **D-25 · `decisionQuality()`'s ad hoc `hasEvidence`/`score ?? 50` pattern is replaced by
  `evidenceGate()`.** One evidence mechanism everywhere, same principle W-C applied to
  criticality. Breaking change, accepted under D-16: a 0-decision org moves from a WEAK (50)
  rating to `insufficient_evidence`.
- **D-26 · Sentinel surfacing (`unknown` criticality, SPOF `not_evaluable`) uses the same visual
  language as score-level evidence gaps — narrowed during execution.** Tracing found
  `spofVerdict()` (built in W-C) has zero callers anywhere; `routes/workflows/spof.js` was never
  migrated onto it. That migration is D-06's affected-file list, not D-07/D-10b's, so SPOF
  `not_evaluable` UI surfacing has no live site yet and was left out of W-E rather than silently
  expanded into a D-06 migration. The `unknown` criticality sentinel (already live via
  `decisionIntelligence.js`/`tools.js` post-W-C) did not end up needing dedicated new UI wiring
  either — no confirmed live consumer renders it as a bare tier badge today.
- **D-27 · Minimal TypeScript port of `coverage()`/`evidenceGate()` for client-side scoring.**
  `frontend/lib/riskIntelligence.ts` and `orgMemory.ts` compute their own aggregate score
  client-side from raw fetched rows, bypassing `derived.js`/`domain.intelligence` entirely — the
  same bug class, living in the browser. A new `frontend/lib/evidenceGate.ts` ports just the
  population/coverage primitives (not the criticality vocabulary — nothing client-side
  reimplements SPOF). Originally scoped to four files (design doc); narrowed to two during
  planning — `knowledgeRisk.ts` and `aiToolIntelligence.ts` turned out to have no single top-level
  aggregate score to gate, only per-item tiers over already-empty-safe lists.

**Corrections found during W-E's own execution, beyond the design doc's trace:** `FivePillarsRadar.tsx`
reads the 13-module registry (explicitly narration-only per D-17/D-19, never gated) — no change
needed, contrary to the design doc's assumption. `ConcentrationRiskPanel.tsx` and
`DecisionSupportQueue.tsx` turned out to read unrelated client-side/mock logic, not `spofVerdict()`
or `dqiVerdict` respectively; the real `dqiVerdict` consumer is `DecisionHeader.tsx`. Two more direct
`calculateHealthScore` callers were found only while wiring `riskIntelligence.ts`:
`components/risk/RiskHeader.tsx` (a second, more prominent OHS gauge on `/risk` alongside
`OrgHealthBanner.tsx` — both now wired) and `components/simulation/SimulationDashboard.tsx` /
`TwinHealthIndex.tsx` (given a defensive `?? 0` fallback only, no evidence-badge UI, since neither
is a traced consumer of a published verdict for this workstream). None of these were wrong
reasoning in the design doc — the same lesson W-D recorded for D-02/D-09a/D-12: unverified
generalization from a name or an import, not individually checked, is what slips through.

### D-28…D-32 — decided during W-G's brainstorming phase (2026-08-25)

D-14 named the fix (manual reload + expose `loadedAt`) but not the full trace; these five close
what D-14 left implicit, the same way D-22…D-27 closed D-07/D-10's gaps for W-E. Full detail,
including the verification performed before each one, is in
[the W-G design doc](2026-08-25-w-g-graph-lifecycle-design.md) and
[plan](../plans/2026-08-25-w-g-graph-lifecycle.md).

- **D-28 · F-H's "no `loadedAt` exposed anywhere" was already stale the day it was written.**
  `backend/routes/intelligence/prediction.js` (the 8 Org Science cards, D-18) has sent
  `dataSource: domain.graph.source()` — which includes `loadedAt` — since W-D's D-18 migration
  commit (`f00576e`), predating this workstream entirely. The real gap was never the backend field;
  it was that `frontend/lib/api.ts`'s `IntelligenceResponse<T>` never typed `dataSource` and no
  component ever rendered it, so a value the backend had been sending for a full workstream cycle
  stayed invisible. Same mistake class as the withdrawn F-G: a claim checked against the code
  without reading what the code already did.
- **D-29 · `voice.js` / `dataset.js`'s graph path is out of scope.** `backend/domain/dataset.js`'s
  `loadOrgDataset()` is a second, independent consumer of the same graph singleton, used only by
  `voice.js`. Traced every voice route individually rather than assuming "reads the same graph →
  same fix" — all of them return a single natural-language answer (`{query, answer, confidence,
  ...}`), not a score tile or verdict, and no UI surface anywhere renders a "data as of" indicator
  for a conversational response. Revisit only if the voice UI grows a provenance panel of its own.
- **D-30 · No rate limit or de-dup on the reload endpoint.** D-14 already accepted "any
  authenticated user triggering it" as fine. Verified `loadGraph()`'s actual concurrency behavior
  (`backend/brain/index.js`): each call builds an independent graph locally and only swaps the
  shared reference in on success, so concurrent reloads cannot corrupt each other — merely
  redundant Supabase reads under heavy simultaneous use, not a realistic risk for this
  single-tenant tool. Skipped deliberately, not by omission.
- **D-31 · Two new routes on `prediction.js`, not a new mount point.** `GET
  /api/intelligence/graph/status` (cheap, no analysis run — current `isReady()`/`source()` only)
  and `POST /api/intelligence/graph/reload` (calls `domain.graph.load()`; 502 with the *previous*
  `loadedAt` still attached on failure, so a failed reload degrades to "stale but serving," never
  to "serving nothing"). Neither imports `requireRole` — global `requireAuth` already covers them,
  matching D-05.
- **D-32 · One shared banner, not eight per-card edits.** `GraphFreshnessBanner` on the Org Science
  page (the only page whose cards are graph-derived) fetches `/graph/status` once, shows relative
  time plus a Reload button, and remounts the 10-card grid via a key bump on success. Follows
  `EvidenceBadge.tsx`'s precedent (W-E) of a small, neutral, reusable status chip rather than
  inventing new visual language. `EndpointHealthGrid.tsx` gained one new pingable row for the
  status endpoint; the reload endpoint was deliberately **not** added there — an automatic
  health-check pinger silently reloading the graph on a timer is exactly the invisible side effect
  this workstream removes elsewhere.

Verified live against a running backend (not just the test suite) per §5's standing rule for
UI-observable changes: the banner rendered `Graph data as of 1m ago`, network inspection confirmed
`dataSource.loadedAt` on the wire matched it, clicking Reload advanced the timestamp to "just now"
while all 8 graph-backed cards visibly re-fetched, and `/admin`'s new Graph Status row pinged LIVE.

### D-33…D-36 — decided during W-F's brainstorming phase (2026-08-25)

D-01/D-05/D-13 named the fixes but not every gap; these four close what tracing found, the same way
every prior batch closed gaps in the decisions before it. Full detail is in
[the W-F design doc](2026-08-25-w-f-tenancy-auth-cleanup-design.md) and
[plan](../plans/2026-08-25-w-f-tenancy-auth-cleanup.md).

- **D-33 · `lib/search.ts` was never a D-05 file.** D-05's affected-file list named
  `Sidebar.tsx`, `app/account/page.tsx`, and `lib/search.ts` as needing "role is cosmetic"
  documentation. Traced individually: the first two read `useAuth()`'s auth role; `search.ts`'s only
  `role` reference is `employees[].role`, an organizational job title from the company dataset,
  never touched by `requireRole` or any auth path. Same word, two unrelated vocabularies — the log's
  own §1 already warned about exactly this pattern for criticality fields. Left untouched rather than
  given a comment the decision never actually meant for it.
- **D-34 · `provision-user.js` takes role as an explicit argument, not an env default.**
  `DEFAULT_USER_ROLE`/`ORG_SLUG` existed only inside the deleted `/register` handler and were not
  carried into the CLI tool — an admin creating an account on purpose says what it is. `org` is
  hardcoded to `'horquva'` rather than env-configurable, since D-01 leaves exactly one valid value.
- **D-35 · The `process.exit(1)` boot gate has a real, stated verification boundary.**
  `checkSingleTenant()`'s pure logic is unit-tested offline (`orgGuard.unit.test.js`). The
  `index.js` wiring that calls `process.exit(1)` on a bad result is verified by code review and a
  live happy-path check only — proving the failure path would mean deliberately reintroducing a bad
  org value into the now-consolidated production data purely to watch it crash, which is the same
  class of action W-D's own automation was correctly refused for (§5's mistakes-list, the
  `orchestrator_snapshots` `DELETE`). Recorded as a known gap rather than silently claimed as
  covered.
- **D-36 · Deleting `/register` moves its test, doesn't just delete it.** `authRoutes.test.js`'s
  registration block is replaced with the same "removed endpoint, assert 404" pattern the file
  already used for `reset-password` — proving the route is gone rather than merely that nothing
  currently calls it.

Two calls in this workstream were the owner's, made live rather than decided on the owner's behalf
(§ status line): rewriting `org` → `'horquva'` for all 5 accounts instead of deleting the 3
non-`'horquva'` stragglers, and the hard-exit boot behavior. Both live-database writes (the
consolidation UPDATE, and creating/removing a `provision-user.js` verification account) ran only
after an explicit go-ahead at the moment each one executed.

---

## 3. Workstream map

Tests are **not** a separate workstream. Each workstream carries regression tests for the findings
it closes, written before the fix.

| Workstream | Scope | Decisions | Status |
|---|---|---|---|
| W-A | Auth hardening | — | **DONE** |
| W-B | Frozen intelligence → live | — | **DONE** |
| **W-C** | Canonical definitions layer | D-03, D-06, D-10, F-G′, F-K | **DONE** — 11 commits, `387bd42`…`687a659` on `ocos/develop` |
| **W-F** | Tenancy & auth cleanup | D-01, D-05, D-13, D-33, D-34, D-35, D-36 | **DONE** — 6 tasks, 11 commits, `a3acd57`…`df2edd0` on `ocos/develop` |
| **W-D** | Truth layer consolidation | D-02, D-09a, D-11, D-12, D-17, D-18, D-19, D-20, D-21, F-L | **DONE** — 16 commits, `c66d871`…`9c15daf` on `ocos/develop` |
| **W-E** | Provenance & evidence semantics | D-07, D-10b, D-22, D-23, D-24, D-25, D-26, D-27 | **DONE** — 20 commits, `2553b20`…`d5d9c7d` on `ocos/develop` |
| **W-G** | Graph lifecycle & narrative honesty | D-14, D-28, D-29, D-30, D-31, D-32 | **DONE** — 4 tasks, 6 commits, `c0dd891`…`9b0f641` on `ocos/develop` |
| **W-H** | Cleanup & final audit | D-09b, D-15, F-I | last |

W-C is done: every downstream workstream now has one module to consume
(`backend/domain/definitions.js`) instead of ~16 independent SPOF implementations and 20
criticality filters. Its artifacts are the quality template for every workstream after it — see §5.

W-F remains genuinely independent and may run whenever, in any order relative to W-D onward.

---

## 4. Deferred, with reasons

| Item | Why | Revisit when |
|---|---|---|
| Write/action loop (Phases 9–10) | D-04 | W-E is done; owner decides when to start this |
| Acceptance criteria §20 items 8–9 | unreachable without the write loop | with the write loop |
| Recommendation lifecycle | depends on the write loop | with the write loop |
| `verification_actions` table | dormant, no writer | with the write loop |
| Multi-tenancy | D-01 chose single-tenant | if a second customer appears |
| OIS weight recalibration | D-11 kept them authored | if the owner wants measured weights |
| `routes/workflows/spof.js` migration onto `spofVerdict()` | D-06's own affected-file list, not yet done; found during W-E that `spofVerdict()` (built W-C) still has zero callers | when D-06 itself is revisited — also unblocks SPOF `not_evaluable` UI surfacing, which W-E's D-26 left undone for exactly this reason |

---

## 5. Process notes for the next workstream (read this before starting W-H)

Each workstream from here on runs in its **own fresh session** — no shared conversation memory with
W-C, W-D, or W-E. This section is what carried W-C's rigor into W-D and then W-E with nothing but
this file — three data points now, not two. Match it; don't skip steps because "the decisions are
already made."

**The sequence that produced W-C, W-D, and W-E, in order:**

1. **Brainstorming skill, architectural path.** Repo exploration first — actual file reads and greps,
   not assumptions from the teardown or from this log. Then batched questions to the owner (4 at a
   time), each answer restated as a Decision with Reason/Affected/Migration/Consequence before moving
   on. This is where D-01…D-16 (W-C) and D-17…D-21/F-L (W-D) came from and why they're trustworthy.
   **W-D's addition:** even when the prior workstream's decisions name the affected files, trace
   every one individually before trusting the list — D-02/D-09a/D-12 named files and tables that
   turned out incomplete (a 4th OIS in `brainCore.js` D-02 never mentioned; `dept_health_scores` and
   `department_exposure`, two frozen tables D-09's DROP/KEEP lists never catalogued;
   `executive_briefings`, which looked like a 5th KEEP-list table by association but is written
   daily). None of these were wrong reasoning, just unverified generalization — checking each item
   individually instead of extrapolating from a pattern is what caught them.
   **W-E's addition:** the same discipline applies to frontend consumers, not just backend files
   and tables — a component *importing* a function is not the same as a component *rendering its
   published verdict*. `FivePillarsRadar.tsx` imports from the same intelligence surface but reads
   the narration-only 13-module registry, not a gated score; `ConcentrationRiskPanel.tsx` and
   `DecisionSupportQueue.tsx` looked like SPOF/DQI consumers by name and page placement but read
   unrelated client-side mock logic. Two more real consumers (`components/risk/RiskHeader.tsx`,
   `components/simulation/SimulationDashboard.tsx`/`TwinHealthIndex.tsx`) were found only while
   wiring a sibling file, not during the design doc's own frontend grep — `grep`ing for a function
   name finds every *caller*; it does not tell you which callers are *published verdicts* worth
   gating versus internal plumbing safe to leave with a defensive fallback. Check each render site
   individually, the same as every backend table.
2. **Design doc** (`docs/superpowers/specs/YYYY-MM-DD-w-x-*-design.md`), committed before any plan
   exists.
3. **writing-plans skill** against that design. Every task gets the actual test code and
   implementation code written out — no "add appropriate handling" placeholders. This is what let
   execution be mechanical instead of another round of judgment calls.
4. **Inline execution, task by task:** red (verify the test fails for the right reason) → green →
   full-suite check (`node tests/run-all.js`) → commit. Never batch multiple tasks into one commit.
   **W-D's addition:** for changes only observable through a running server (a route reading
   `domain.intelligence.all()` instead of computing its own value), the full-suite check alone does
   not prove the wiring is correct — this codebase has no automated HTTP-level test in the default
   suite. Start a local server on a scratch port, log in via the `ADMIN_EMAIL`/`ADMIN_PASSWORD` env
   fallback, and `curl` the changed endpoint against a value read directly from the same domain
   function in a `node -e` snippet. **Restart the server after every code change you're about to
   verify** — Node does not hot-reload, and a stale process will silently serve the old computation
   (caught twice during W-D: once each for `brainCore.js` and `prediction.js`).
   **W-E's addition:** this extends to frontend UI changes claimed complete. `tsc --noEmit` proves
   the types are consistent; it does not prove the component renders correctly. Start both dev
   servers (`.claude/launch.json` has `backend`/`frontend` entries with `autoPort` — another
   session's server on the default port is common and should not be reused or killed), log in
   through the actual UI form with the real `ADMIN_EMAIL`/`ADMIN_PASSWORD` already in `backend/.env`
   (no need to invent scratch credentials — they're already there), and read the rendered page text
   plus console/network logs. If the frontend's `NEXT_PUBLIC_API_URL` (`.env.local`) points at a
   port your own backend instance isn't running on, retarget it and restart the frontend dev
   server for the env change to take effect — then put it back afterward, since `.env.local` is
   gitignored local config, not something a workstream's commits should touch. A cached daily
   snapshot (`orchestrator_snapshots`) will read stale in the browser exactly as it does over curl;
   the "always live" sibling route (`/modules` alongside `/summary`) or a direct `node -e` call
   against the same domain function is the way to see current behavior, matching W-D's stale-cache
   note below.

**Mistakes made and corrected — don't repeat them:**

- **A finding (F-G, W-C) was wrong** because it checked a route's `row.criticality` read against the
  database schema without reading the *loader* that populates that property. The loader normalized
  it correctly; the schema check alone produced a false bug report. **Before calling any
  `row.<field>` read a bug, trace it to the function that builds that row.** This cost a withdrawal
  and a corrected pair of findings (F-G′, F-K) — cheaper to just check first.
- **`git add <file>` is not safe in this repo right now.** Several files carry substantial
  *pre-existing uncommitted work* unrelated to any workstream — visible in `git status` before you
  touch anything. As of the end of W-E, that's `governance.js`, `memory.js`, `orchestration.js`,
  `gateCheck.js`, `knowledge/gaps.js`, `knowledge/impact.js`, `index.js`, `middleware/auth.js`,
  `auth/auth.js`, `.env.example`, `schema.sql`, `.claude/launch.json`, `constitutional-modules.js`,
  `employeeLeaves.js`, `platformDown.js`, and a command-bar/deep-link frontend feature
  (`GlobalSearchOverlay.tsx`, `DependencyEvolutionTab.tsx`, `SignalDrilldown.tsx`, `CommandBar.tsx`,
  `DeepLinkFocus.tsx`, `commandIndex.ts`, `focusTarget.ts`, `globals.css`,
  `recommendations/page.tsx`, `GlobalPanelsContext.tsx`, `AppShell.tsx`, `notifications.ts`,
  `package.json`) — check `git status --short` fresh each session, this list will have moved.
  (`voice.js`, `health.js`, `learning.js`, `forecast.js`, `briefing.js` carried WIP through W-C but
  were fully absorbed or finished during W-D — they're clean now. W-E touched none of the files on
  this list — confirmed by a final `git status --short` diff against the session-start snapshot
  before its last commit.) A directory-wide or whole-file `git add` will bundle
  unrelated work into your commit. Before staging a file that was already modified at session start:
  `git diff <file>` first. If it's larger than your own edit, isolate your change against
  `git show HEAD:<file>` (reconstruct a clean version containing only your edit, stage that, commit,
  then restore the working tree to the full pre-existing-plus-your-edit content) rather than
  committing the mixture — or, simpler and what W-D actually did: commit the unrelated WIP alone
  first (its own commit, naming it as pre-existing and unrelated), *then* make your own edit on top
  and commit that separately. `git status --short` before every commit, always.
- **A destructive action on live data will be blocked, and should be.** W-D's own automation tried to
  `DELETE` a stale cached row in `orchestrator_snapshots` to make a manual verification check read
  cleanly *right now* instead of after the next cache miss. The permission classifier correctly
  refused it — a routine verification step is not grounds for mutating a live table. If a live-server
  checkpoint would read stale for a reason the design already anticipated (a daily cache, in this
  case), find another route that bypasses the cache rather than clearing it.

**Standing constraints that don't change per workstream:**

- No test framework in `backend/` — hand-rolled `node` scripts with a local `check()` helper. Follow
  `backend/tests/definitions.unit.test.js` as the template.
- `backend/domain/definitions.js` is pure (no I/O) and is now the dependency every score-producing
  file should route through — don't reintroduce a parallel definition of criticality, SPOF, or
  coverage anywhere. As of W-D, `backend/domain/derived.js`'s `pillars.orgScore` is the same for
  "the one Organizational Intelligence Score" — don't reintroduce a second weighted composite either.
  As of W-E, `evidenceGate()`/`combineEvidence()` (also in `definitions.js`) are the one evidence
  mechanism — don't reintroduce a second ad hoc "is there enough data" check. The one narrow,
  deliberate exception is `frontend/lib/evidenceGate.ts`, a hand-kept TypeScript port that exists
  only because there is no shared runtime between `backend/` and `frontend/`; the two must be kept
  in sync by hand if the 50% threshold or the coverage formula ever changes.
- Commit messages name the responsible decision (`D-nn`, `F-nn`) — this is the compensating control
  for D-16 (no before/after reconciliation table).
- Threshold-class retyping (behavior-preserving) and bug fixes (behavior-changing) never share a
  commit — otherwise a real regression hides in a wall of no-op renames.

**Quality bar, concretely:** the finished [W-C plan](../plans/2026-08-24-w-c-canonical-definitions.md)
(11 commits, `387bd42`…`687a659`), [W-D plan](../plans/2026-08-25-w-d-truth-layer-consolidation.md)
(16 commits, `c66d871`…`9c15daf`), [W-E plan](../plans/2026-08-25-w-e-provenance-evidence-semantics.md)
(19 tasks, 20 commits, `2553b20`…`d5d9c7d`), [W-G plan](../plans/2026-08-25-w-g-graph-lifecycle.md)
(4 tasks, 6 commits, `c0dd891`…`9b0f641`), and [W-F plan](../plans/2026-08-25-w-f-tenancy-auth-cleanup.md)
(6 tasks, 11 commits, `a3acd57`…`df2edd0`), all on `ocos/develop`, are the reference. If a future
workstream's design doc, plan, or commit history looks thinner than these — fewer regression tests,
vaguer task steps, batched commits, no live-server verification for route-wiring or frontend UI
changes — that's the signal quality slipped, not that the work was faster.

**W-G's addition:** a workstream can run entirely unattended under explicit owner delegation
without lowering the bar — the questioning phase became "trace the code and decide as the owner
would," not "skip deciding." The tell that this held: D-28 corrected a finding using the exact same
method F-G's withdrawal established (read the code the claim is about before trusting the claim),
found independently in a fresh session with no memory of F-G ever happening. When a workstream runs
unattended, say so explicitly in the log (§'s opening Status line) rather than leaving it
indistinguishable from a normal live session — a decision made without the owner in the room is a
different kind of decision than one they weighed in on, even when it turns out to be the same
answer.

**W-F's addition:** the reverse case — a workstream whose own decision (D-01) is explicitly
owner-gated needs its own explicit go-ahead at the moment the gated action runs, separate from the
general "here's the plan, go" approval that started the session. General approval covers writing
code; it does not retroactively cover a specific destructive database write the design doc itself
flagged as needing the owner's eyes first. Two such moments came up here — the org-consolidation
UPDATE and, unplanned, a verification account the live-check step created and then had to ask
whether to remove — and both got their own confirmation rather than being folded into the earlier
yes. The unplanned one is the more useful lesson: a "verify live" step that writes to a real table
is itself a decision point the plan should flag in advance, not one to notice only after the write
already happened.
