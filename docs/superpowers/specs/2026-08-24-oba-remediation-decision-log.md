# OBA Core Remediation — Decision Log

Date opened: 2026-08-24
Status: decisions D-01…D-16 approved by owner. **No code changed yet.**
Follows workstreams W-A (auth hardening) and W-B (frozen intelligence rebuilt), both landed.

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
| F-G | **Phantom criticality reads (NEW — not in the teardown)** | `backend/routes/decisionIntelligence.js:30` selects `risk` from `workflows`, but `scoreWorkflowDecision` reads `wf.criticality` — a column that does not exist. `isCritical`/`isHigh` are permanently `false`, so every criticality penalty in Decision Intelligence is dead code. Same phantom read at lines 78 (agents) and 162 (tools). The tool narrative renders "adopted as a **undefined** tool". |
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
Route files largely do not.

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

---

## 3. Workstream map

Tests are **not** a separate workstream. Each workstream carries regression tests for the findings
it closes, written before the fix.

| Workstream | Scope | Decisions | Status |
|---|---|---|---|
| W-A | Auth hardening | — | **DONE** |
| W-B | Frozen intelligence → live | — | **DONE** |
| **W-F** | Tenancy & auth cleanup | D-01, D-05, D-13 | not started (independent, cheap) |
| **W-C** | Canonical definitions layer | D-03, D-06, D-10, F-G | **NEXT — keystone** |
| **W-D** | Truth layer consolidation | D-02, D-09a, D-11, D-12 | blocked by W-C |
| **W-E** | Provenance & evidence semantics | D-07, D-10b | blocked by W-C, W-D |
| **W-G** | Graph lifecycle & narrative honesty | D-14 | blocked by W-D |
| **W-H** | Cleanup & final audit | D-09b, D-15, F-I | last |

W-C is the keystone: every downstream workstream consumes its definitions, and it is where the ~16
SPOF implementations and 20 criticality filters collapse into one module.

W-F is genuinely independent and may run first or in parallel.

---

## 4. Deferred, with reasons

| Item | Why | Revisit when |
|---|---|---|
| Write/action loop (Phases 9–10) | D-04 | after W-E |
| Acceptance criteria §20 items 8–9 | unreachable without the write loop | with the write loop |
| Recommendation lifecycle | depends on the write loop | with the write loop |
| `verification_actions` table | dormant, no writer | with the write loop |
| Multi-tenancy | D-01 chose single-tenant | if a second customer appears |
| OIS weight recalibration | D-11 kept them authored | if the owner wants measured weights |
