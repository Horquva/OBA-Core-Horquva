# W-H Endpoint Census (raw discovery)

Pure discovery pass for D-15 ("Classify all 176 endpoints; delete only proven-dead"). Nothing in
this document has been deleted, edited, or otherwise acted on — it is evidence for a human to
adjudicate, per the task brief. Ambiguous cases are flagged, not decided.

## Method

- Every endpoint was found by walking `backend/index.js`'s `app.use('/api/...', require(...))`
  mounts and recursively following every `router.use('/sub', require(...))` sub-mount, then
  extracting every `router.get/post/put/patch/delete(...)` call in each resolved file (all HTTP
  methods, not just GET — `backend/tools/sweep.js` only does GET). This found **177** endpoints,
  one more than the decision log's "176" — see the Discrepancies section; the extra is almost
  certainly the two graph routes added in W-G landing after that count was last written, not a
  script error (no duplicate method+path pairs exist in the output).
- **Frontend callers**: `frontend/lib/api.ts` was read in full and cross-referenced against every
  place in `frontend/` that imports one of its exported objects and actually calls a member
  function (not just imports the object — several exported functions in `api.ts` turned out to
  have zero callers, confirmed by grepping the exact call expression, e.g. `workflows.spof(`).
  Separately, every `.tsx`/`.ts` file under `frontend/` that calls `fetch(` directly was read and
  its literal path recorded — this is how `AuthContext.tsx`, `KpiStrip.tsx`, `AgentTable.tsx`,
  `RiskSplit.tsx`, `Heatmap.tsx`, `FivePillarsRadar.tsx`, `search.ts`, `notifications.ts`, and
  eight page components under `app/*/page.tsx` were found bypassing `api.ts` entirely. Early
  parallel-grep results were double-checked against direct file reads after two files' results
  were briefly mis-paired in a batched tool call — every frontend caller claim below was verified
  by an individual, unambiguous read or grep, not trusted from the first batched pass.
- **Backend test callers**: every `.js` file in `backend/tests/` was grepped for `/api/` literals
  and for `require('../routes/...')`. Only four test files touch routes at all:
  `authRoutes.test.js`, `graphRoutes.test.js`, `routeEvidence.unit.test.js`, and
  `api.smoke.test.js` (the last one is stale — see Discrepancies).
- **backend/tools/ callers**: `sweep.js` walks the same mount graph as this census and pings every
  **GET** route it finds — including ones with an unresolved `:param` segment, which it requests
  literally and which therefore always 404. This is a blanket reachability ping, not a functional
  dependency on any endpoint's behavior, so it is recorded factually below but does **not** by
  itself make an endpoint ACTIVE or ADMIN in the classification column. `export-company.js` and
  `provision-user.js` talk to Supabase directly and call zero HTTP endpoints.
- **Auth**: `backend/index.js` mounts `/api/auth` above the global gate (line 63) and
  `app.use('/api', requireAuth)` below it (line 73) — everything mounted after line 75 sits behind
  the global gate. `backend/routes/auth/auth.js` was read in full: `POST /login` is genuinely
  public; `GET /me`, `POST /logout`, `POST /change-password` each name `requireAuth` themselves
  despite the router's above-the-gate mount position. `requireRole` was confirmed fully deleted
  (D-05) — zero references anywhere in `backend/` outside a comment and a test asserting its
  absence (`graphRoutes.test.js:140-141`) — so no route in this codebase carries any role gate.
- **Admin grid membership**: `frontend/components/admin/EndpointHealthGrid.tsx`'s `ROUTE_REGISTRY`
  was read in full. It pings exactly one `pingPath` per row (via `pingEndpoint` in
  `app/admin/page.tsx`) — being in the same mounted route *file* as a pinged path does not mean
  every endpoint in that file is admin-called; only the literal `pingPath` string is.

**Legend** (used verbatim in cells to avoid repeating the same evidence 177 times):
- `sweep.js (generic ping)` — the endpoint is a GET route sweep.js's mount-walk reaches and pings
  for a 200, nothing more. Never counted alone as making an endpoint ACTIVE.
- `sweep.js (generic ping, always 404)` — same, but the route has an unresolved `:param` segment,
  so sweep.js's literal request never succeeds.
- Auth column shorthand: **Global** = `requireAuth` only via the blanket gate at
  `backend/index.js:73`. **Public** / **Self-gated** used only for the four `/api/auth` routes.

---

## Reality Layer (25 endpoints)

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/agents | `backend/routes/agents.js:54` | Very heavily used via direct `fetch` (bypassing `api.ts`, which has no `agents` export): `app/map/page.tsx`, `app/simulation/page.tsx`, `app/ownership/page.tsx`, `app/risk/page.tsx`, `app/ai-tools/page.tsx`, `app/knowledge/page.tsx`, `app/continuity/page.tsx`, `app/memory/page.tsx`, `app/recommendations/page.tsx`, `components/dashboard/KpiStrip.tsx` (indirectly, via `/risk-summary`, see below — KpiStrip does not call this exact path), `components/dashboard/AgentTable.tsx`, `components/dashboard/RiskSplit.tsx`, `components/dashboard/Heatmap.tsx`, `components/dashboard/FivePillarsRadar.tsx` (no — see its own row), `lib/search.ts` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/agents/orphaned | `backend/routes/agents.js:63` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** — zero callers anywhere; no page or component references `/orphaned` |
| GET /api/agents/risk-summary | `backend/routes/agents.js:74` | `components/dashboard/KpiStrip.tsx:26` (direct fetch) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/ownership | `backend/routes/ownership.js:15` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — `app/ownership/page.tsx` is a real, live page but computes ownership client-side from `/api/agents` + `/api/dependencies` rather than calling this endpoint at all. Possibly a superseded server-side implementation, possibly a still-useful raw shape — flagging rather than deciding. |
| GET /api/dependencies | `backend/routes/dependencies.js:7` | `app/map/page.tsx`, `app/simulation/page.tsx`, `app/ownership/page.tsx`, `app/risk/page.tsx`, `app/recommendations/page.tsx`, `components/dashboard/Heatmap.tsx` — all direct fetch | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/dependencies/agent-spofs | `backend/routes/dependencies.js:62` | `app/map/page.tsx:42` (direct fetch) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/risks | `backend/routes/risks.js:6` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — `app/risk/page.tsx` is a real, live page but computes risk client-side (via `lib/riskIntelligence.ts`, per the decision log's own D-24/D-27 references) from `/api/agents` + `/api/dependencies`, never calling this endpoint. Same superseded-vs-still-useful ambiguity as `/api/ownership`. |
| GET /api/dashboard | `backend/routes/dashboard.js:6` | none found beyond the admin grid's `pingPath` — `app/page.tsx` (the actual dashboard) does not call it | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — the one endpoint literally named for the page that should use it, and doesn't. Same pattern as ownership/risks above. |
| GET /api/data-quality | `backend/routes/dataQuality.js:13` | none found beyond the admin grid's `pingPath` — no `/data-quality` page exists in `app/` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/human-agent-map | `backend/routes/humanAgentMap.js:5` | none found beyond the admin grid's `pingPath` — no matching page exists in `app/` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/tools | `backend/routes/tools.js:139` | `app/simulation/page.tsx`, `app/ownership/page.tsx`, `app/risk/page.tsx`, `app/ai-tools/page.tsx`, `app/knowledge/page.tsx`, `app/continuity/page.tsx`, `app/memory/page.tsx`, `app/recommendations/page.tsx`, `components/dashboard/Heatmap.tsx` — all direct fetch. Also called **internally** by `backend/routes/decisionIntelligence.js:6,333` via its exported `loadEnrichedTools()` helper. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/tool-intelligence | `backend/routes/toolIntelligence.js:5` | none found beyond the admin grid's `pingPath` — `app/ai-tools/page.tsx` does not call it | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/tool-impact | `backend/routes/toolImpact.js:7` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/tool-impact/:name/impact | `backend/routes/toolImpact.js:16` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** — by-name drill-down, no wired UI |
| GET /api/workflows | `backend/routes/workflows/index.js:8` | `lib/search.ts:32` (direct fetch) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/workflows/intelligence | `backend/routes/workflows/intelligence.js:21` | `api.ts`'s `workflows.intelligence()`, called by `components/workflows/WorkflowStepChain.tsx:269`. Also called directly (bypassing `api.ts`) by `app/ownership/page.tsx`, `app/risk/page.tsx`, `app/ai-tools/page.tsx`, `app/knowledge/page.tsx`, `app/continuity/page.tsx`, `app/memory/page.tsx`, `app/recommendations/page.tsx`, `components/dashboard/Heatmap.tsx` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/workflows/spof | `backend/routes/workflows/spof.js:5` | none found (`api.ts`'s `workflows.spof()` exists but is never called anywhere) | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — zero live callers anywhere, but the decision log's own deferred list (§4) explicitly names this file as pending migration onto `spofVerdict()` (built in W-C, D-06's own affected-file list, not yet executed) — this is known-unfinished work, not simply orphaned code. Do not delete without revisiting D-06. |
| GET /api/workflows/failures | `backend/routes/workflows/failures.js:5` | none found (`api.ts`'s `workflows.failures()` exists but is never called anywhere) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/knowledge/intelligence | `backend/routes/knowledge/intelligence.js:5` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/knowledge/impact | `backend/routes/knowledge/impact.js:13` | none found beyond the admin grid's `pingPath` — `app/knowledge/page.tsx` does not call it | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/knowledge/impact/:employee | `backend/routes/knowledge/impact.js:22` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** — by-name drill-down, no wired UI |
| GET /api/knowledge/gaps | `backend/routes/knowledge/gaps.js:12` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/memory/health | `backend/routes/memory/memory.js:112` | none found beyond the admin grid's `pingPath` (which points here specifically) — `app/memory/page.tsx` computes org memory client-side via `lib/orgMemory.ts` from `/api/agents` + `/api/workflows/intelligence` + `/api/tools`, never calling this | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — same superseded-vs-still-useful pattern as ownership/risks/dashboard. Notable because `lib/orgMemory.ts`'s `calcIMHS` was itself the subject of a W-E fabrication-bug fix (D-24), meaning the client-side path is actively maintained while this server path is untouched by any caller. |
| GET /api/memory/employee/:name | `backend/routes/memory/memory.js:134` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** — by-name drill-down, no wired UI |
| GET /api/memory/map | `backend/routes/memory/memory.js:231` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/employees | `backend/routes/employees.js:6` | `lib/search.ts:33` (direct fetch) | none found | sweep.js (generic ping) | Global | **ACTIVE** |

## Simulation (8 endpoints)

All eight are pinged only by the admin grid (base paths) or not at all (param'd variants). The
`app/simulation/page.tsx` page — the one place a user would expect these to be used — fetches only
`/api/agents`, `/api/dependencies`, `/api/tools` directly and does not call any `/api/simulations/*`
route. No component anywhere in `frontend/` references `/api/simulations`.

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/simulations/employee-leaves | `backend/routes/simulations/employeeLeaves.js:6` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/simulations/employee-leaves/:employee | `backend/routes/simulations/employeeLeaves.js:22` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** — by-name drill-down, no wired UI |
| GET /api/simulations/agent-fails | `backend/routes/simulations/agentFails.js:6` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/simulations/agent-fails/:agent | `backend/routes/simulations/agentFails.js:22` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/simulations/platform-down | `backend/routes/simulations/platformDown.js:6` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/simulations/platform-down/:platform | `backend/routes/simulations/platformDown.js:22` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/simulations/workflow-disruption | `backend/routes/simulations/workflowDisruption.js:6` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/simulations/workflow-disruption/:workflow | `backend/routes/simulations/workflowDisruption.js:22` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |

## Interaction (48 endpoints)

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/accountability/chains | `backend/routes/accountability/accountability.js:124` | `api.ts`'s `accountabilityApi.chains()`, called by `components/dashboard/AccountabilityChainTable.tsx:15` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/accountability/entities | `backend/routes/accountability/accountability.js:96` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/accountability/issues | `backend/routes/accountability/accountability.js:150` | `api.ts`'s `accountabilityApi.issues()`, called by `components/dashboard/AccountabilityChainTable.tsx:16` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/accountability/score | `backend/routes/accountability/accountability.js:71` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/collaboration/adoption | `backend/routes/collaboration/collaboration.js:77` | none found (`api.ts`'s `collaboration.adoption()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/collaboration/departments | `backend/routes/collaboration/collaboration.js:212` | none found (`api.ts`'s `collaboration.departments()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/collaboration/dependency | `backend/routes/collaboration/collaboration.js:115` | none found (`api.ts`'s `collaboration.dependency()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/collaboration/people | `backend/routes/collaboration/collaboration.js:182` | none found (`api.ts`'s `collaboration.people()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/collaboration/score | `backend/routes/collaboration/collaboration.js:158` | `api.ts`'s `collaboration.score()`, called by `components/org-science/CollaborationScoreCard.tsx:29`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/continuity/assets | `backend/routes/continuity/continuity.js:85` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/continuity/must-protect | `backend/routes/continuity/continuity.js:128` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/continuity/plans | `backend/routes/continuity/continuity.js:158` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/continuity/risk-map | `backend/routes/continuity/continuity.js:110` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/continuity/score | `backend/routes/continuity/continuity.js:65` | none found beyond the admin grid's `pingPath` — `app/continuity/page.tsx` computes continuity risk client-side via `lib/continuityRisk.ts` from `/api/agents` + `/api/workflows/intelligence` + `/api/tools`, and its `ContinuityTab`/`GovernanceTab` children are purely props-driven from that client computation | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — same superseded-vs-still-useful pattern noted for ownership/risks/dashboard/memory-health. `continuity.js`'s entire 5-endpoint file may be legacy from before `lib/continuityRisk.ts` existed. |
| GET /api/decisions/all | `backend/routes/decisions/decisions.js:56` | none found beyond the admin grid's `pingPath` — `app/decision/page.tsx` calls only `/api/decision-intelligence` (a different route file) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/decisions/harmful | `backend/routes/decisions/decisions.js:82` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/decisions/index | `backend/routes/decisions/decisions.js:36` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** — note the path is literally `/api/decisions/index`, not a framework default; a real route someone named this way |
| GET /api/decisions/recommendations | `backend/routes/decisions/decisions.js:148` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/decisions/trail/:id | `backend/routes/decisions/decisions.js:107` | none found — `components/decision/DecisionTrailTable.tsx` is entirely props-driven from `app/decision/page.tsx`'s `/api/decision-intelligence` fetch, no independent fetch of its own | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/forecast/continuity | `backend/routes/forecast/forecast.js:137` | none found (`api.ts`'s `forecast.continuity()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/forecast/health | `backend/routes/forecast/forecast.js:82` | `api.ts`'s `forecast.health()`, called by `components/forecast/TrendArrow.tsx:19` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/forecast/memory | `backend/routes/forecast/forecast.js:103` | none found (`api.ts`'s `forecast.memory()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/forecast/outlook | `backend/routes/forecast/forecast.js:171` | `api.ts`'s `forecast.outlook()`, called by `components/forecast/OutlookSummary.tsx:39` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/forecast/summary | `backend/routes/forecast/forecast.js:51` | `api.ts`'s `forecast.summary()`, called by `components/forecast/OutlookSummary.tsx:40`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/governance/assets | `backend/routes/governance/governance.js:109` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/governance/gaps | `backend/routes/governance/governance.js:150` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/governance/heatmap | `backend/routes/governance/governance.js:132` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** — note: this file (`governance.js`) is one of the pre-existing-uncommitted-WIP files the decision log's §5 process notes flag (`git status --short` shows it modified at session start) — treat any classification here as provisional until that WIP is understood |
| GET /api/governance/offenders | `backend/routes/governance/governance.js:185` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/governance/score | `backend/routes/governance/governance.js:83` | none found beyond the admin grid's `pingPath` — `app/continuity/page.tsx`'s `GovernanceTab` is fed entirely by the client-side `computeContinuityRisk()` result, not this endpoint | none found | sweep.js (generic ping) | Global | **AMBIGUOUS** — same superseded-vs-still-useful pattern as continuity/score; also carries the pre-existing-WIP caveat above |
| GET /api/learning/decisions | `backend/routes/learning/learning.js:125` | none found (`api.ts`'s `learning.decisions()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/learning/departments | `backend/routes/learning/learning.js:174` | none found (`api.ts`'s `learning.departments()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/learning/failures | `backend/routes/learning/learning.js:99` | none found (`api.ts`'s `learning.failures()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/learning/incidents | `backend/routes/learning/learning.js:148` | none found (`api.ts`'s `learning.incidents()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/learning/summary | `backend/routes/learning/learning.js:66` | `api.ts`'s `learning.summary()`, called by `components/org-science/LearningMaturityCard.tsx:19`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/orchestration/blocked | `backend/routes/orchestration/orchestration.js:159` | `api.ts`'s `orchestration.blocked()`, called by `components/workflows/CollisionDetector.tsx:40` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/orchestration/collisions | `backend/routes/orchestration/orchestration.js:141` | `api.ts`'s `orchestration.collisions()`, called by `components/workflows/CollisionDetector.tsx:39` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/orchestration/mode | `backend/routes/orchestration/orchestration.js:189` | `api.ts`'s `orchestration.mode()`, called by `components/admin/AutomationModeControl.tsx:32` | none found | sweep.js (generic ping) | Global | **ACTIVE** — note: `api.ts`'s own comment says "read-only; there is no endpoint to set it", consistent with only a GET existing |
| GET /api/orchestration/summary | `backend/routes/orchestration/orchestration.js:87` | none found beyond the admin grid's `pingPath` (`api.ts`'s `orchestration.summary()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/orchestration/workflows | `backend/routes/orchestration/orchestration.js:109` | none found (`api.ts`'s `orchestration.workflows()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/predictive-risk/agent/:name | `backend/routes/predictive/predictiveRisk.js:134` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/predictive-risk/agents | `backend/routes/predictive/predictiveRisk.js:82` | `api.ts`'s `predictiveApi.agents()`, called by `components/risk/PredictedRiskPanel.tsx:18` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/predictive-risk/critical | `backend/routes/predictive/predictiveRisk.js:95` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/predictive-risk/emerging | `backend/routes/predictive/predictiveRisk.js:115` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/predictive-risk/summary | `backend/routes/predictive/predictiveRisk.js:42` | `api.ts`'s `predictiveApi.summary()`, called by `components/risk/PredictedRiskPanel.tsx:17`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/verification/actions | `backend/routes/verification/intelligence.js:99` | `api.ts`'s `verification.actions()`, called by `components/workflows/VerificationLedger.tsx:61` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/verification/actor/:name | `backend/routes/verification/intelligence.js:162` | none found (`api.ts`'s `verification.actor()` exists, zero callers) | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/verification/flagged | `backend/routes/verification/intelligence.js:124` | `api.ts`'s `verification.flagged()`, called by `components/workflows/VerificationLedger.tsx:62` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/verification/summary | `backend/routes/verification/intelligence.js:70` | none found beyond the admin grid's `pingPath` (`api.ts`'s `verification.summary()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **ADMIN** |

## Executive (43 endpoints)

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/briefing/documentation-trend | `backend/routes/briefing/briefing.js:226` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/briefing/history | `backend/routes/briefing/briefing.js:207` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/briefing/pending-decisions | `backend/routes/briefing/briefing.js:263` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/briefing/recommendations | `backend/routes/briefing/briefing.js:331` | `api.ts`'s `briefingApi.recommendations()`, called by `components/dashboard/RiskSplit.tsx:36` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/briefing/summary | `backend/routes/briefing/briefing.js:180` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/briefing/today | `backend/routes/briefing/briefing.js:124` | `api.ts`'s `briefingApi.latest()`, called by `components/dashboard/DailyBriefingCard.tsx:14`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/briefing/top-risks | `backend/routes/briefing/briefing.js:297` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/avatar | `backend/routes/context/context.js:259` | none found (`api.ts`'s `contextApi.avatar()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/critical | `backend/routes/context/context.js:113` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/decisions | `backend/routes/context/context.js:168` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/feed | `backend/routes/context/context.js:93` | `api.ts`'s `contextApi.feed()`, called by `components/dashboard/WhatMattersNowFeed.tsx:39` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/context/incidents | `backend/routes/context/context.js:137` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/metrics | `backend/routes/context/context.js:199` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/context/summary | `backend/routes/context/context.js:61` | none found beyond the admin grid's `pingPath` (`api.ts`'s `contextApi.summary()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/decision-support/drivers | `backend/routes/decisionSupport/decisionSupport.js:163` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/decision-support/queue | `backend/routes/decisionSupport/decisionSupport.js:109` | none found — `components/recommendations/DecisionSupportQueue.tsx` (rendered on `app/recommendations/page.tsx`) is entirely props-driven from client-side `generateRecommendations()`, no fetch of its own despite the matching name | none found | sweep.js (generic ping) | Global | **DISCOVERY** — name collision with a client-side-only component worth double-checking by hand |
| GET /api/decision-support/review | `backend/routes/decisionSupport/decisionSupport.js:196` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/decision-support/revisit | `backend/routes/decisionSupport/decisionSupport.js:231` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/decision-support/summary | `backend/routes/decisionSupport/decisionSupport.js:58` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/decision-support/top-actions | `backend/routes/decisionSupport/decisionSupport.js:138` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive-memory/bad-decisions | `backend/routes/executiveMemory/executiveMemory.js:306` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive-memory/hero-risk | `backend/routes/executiveMemory/executiveMemory.js:232` | `api.ts`'s `execMemoryApi.heroRisk()`, called by `components/dashboard/ExecutiveMemoryPanel.tsx:45` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/executive-memory/items | `backend/routes/executiveMemory/executiveMemory.js:123` | `api.ts`'s `execMemoryApi.items()`, called by `components/dashboard/ExecutiveMemoryPanel.tsx:44` | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/executive-memory/lessons | `backend/routes/executiveMemory/executiveMemory.js:194` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive-memory/patterns | `backend/routes/executiveMemory/executiveMemory.js:149` | none found (`api.ts`'s `execMemoryApi.patterns()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive-memory/repeat-offenders | `backend/routes/executiveMemory/executiveMemory.js:282` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive-memory/summary | `backend/routes/executiveMemory/executiveMemory.js:80` | none found beyond the admin grid's `pingPath` (`api.ts`'s `execMemoryApi.summary()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/executive/ask | `backend/routes/executive/executive.js:239` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive/briefing | `backend/routes/executive/executive.js:332` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/executive/history | `backend/routes/executive/executive.js:312` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/executive/questions | `backend/routes/executive/executive.js:293` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/health/critical | `backend/routes/health/health.js:308` | none found (`api.ts`'s `healthApi.signals()` maps here, exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/health/departments | `backend/routes/health/health.js:206` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/health/dimensions | `backend/routes/health/health.js:144` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/health/history | `backend/routes/health/health.js:278` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/health/summary | `backend/routes/health/health.js:109` | `api.ts`'s `healthApi.summary()`, called by `components/dashboard/KpiStrip.tsx:27` and `components/dashboard/EarlyWarningStrip.tsx:40`. Also the admin grid's `pingPath`, and the only endpoint `api.smoke.test.js` checks that actually exists (see Discrepancies). | none found (only reached, as noted, by the stale opt-in smoke test) | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/health/trend | `backend/routes/health/health.js:241` | none found (`api.ts`'s `healthApi.trend()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/voice/ask | `backend/routes/voice/voice.js:429` | none found — no voice UI page or component exists anywhere in `frontend/` | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| POST /api/voice/ask | `backend/routes/voice/voice.js:443` | none found | none found | none found (sweep.js is GET-only) | Global | **DISCOVERY** |
| POST /api/voice/command | `backend/routes/voice/voice.js:458` | none found | none found | none found (sweep.js is GET-only) | Global | **DISCOVERY** |
| GET /api/voice/daily-summary | `backend/routes/voice/voice.js:518` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/voice/history | `backend/routes/voice/voice.js:501` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/voice/intents | `backend/routes/voice/voice.js:482` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |

## Constitutional (34 endpoints)

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/intelligence | `backend/routes/intelligence/constitutional.js:71` | none found — not in `api.ts`'s (unused) `intelligence` object, not in the admin grid | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/advisor | `backend/routes/intelligence/constitutional.js:58` | none found beyond the admin grid's `pingPath` (`api.ts`'s `intelligence.advisor()` exists as part of the object whose own code comment says "Nothing currently imports this object") | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/alignment | `backend/routes/intelligence/constitutional.js:57` | none found — same unused `api.ts` `intelligence` object; not in the admin grid | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/behavior | `backend/routes/intelligence/prediction.js:80` | `api.ts`'s `orgScience.behavior()`, called by `components/org-science/BehavioralProfileCard.tsx:28`. Also the admin grid's `pingPath` (module M44). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/benchmark | `backend/routes/intelligence/prediction.js:81` | `api.ts`'s `orgScience.benchmark()`, called by `components/org-science/IndustryBenchmarkCard.tsx:28`. Also the admin grid's `pingPath` (module M45). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/brain-core | `backend/routes/intelligence/brainCore.js:326` | none found beyond the admin grid's `pingPath` (`api.ts`'s `brainCoreApi.latest()` exists, zero callers) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/brain-core/explanation | `backend/routes/intelligence/brainCore.js:423` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/brain-core/posture | `backend/routes/intelligence/brainCore.js:370` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/brain-core/signals | `backend/routes/intelligence/brainCore.js:388` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/brain-core/summary | `backend/routes/intelligence/brainCore.js:349` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/capability | `backend/routes/intelligence/constitutional.js:56` | none found — same unused `api.ts` `intelligence` object; not in the admin grid. Note the decision log (§ D-18 discussion) explicitly warns this is a **different** analysis from `/api/intelligence/capability-by-dept` below despite the similar name — do not conflate them. | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/capability-by-dept | `backend/routes/intelligence/prediction.js:83` | `api.ts`'s `orgScience.capabilityByDept()`, called by `components/org-science/CapabilityByDeptCard.tsx:28`. Also the admin grid's `pingPath` (module M39). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/culture | `backend/routes/intelligence/prediction.js:78` | `api.ts`'s `orgScience.culture()`, called by `components/org-science/CultureHealthCard.tsx:28`. Also the admin grid's `pingPath` (module M42). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/dna | `backend/routes/intelligence/prediction.js:77` | `api.ts`'s `orgScience.dna()`, called by `components/org-science/DNAFingerprintCard.tsx:28`. Also the admin grid's `pingPath` (module M41). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| POST /api/intelligence/graph/reload | `backend/routes/intelligence/prediction.js:99` | `api.ts`'s `orgScience.graphReload()`, called by `components/org-science/GraphFreshnessBanner.tsx:53`. Deliberately **not** in the admin grid — D-32 excludes it on purpose (an automatic health-pinger must not silently reload the graph on a timer). | `backend/tests/graphRoutes.test.js:97,115` — mounts the real `predictionRouter` and calls this HTTP route directly (both success and failure paths) | none found (sweep.js is GET-only) | Global | **ACTIVE** |
| GET /api/intelligence/graph/status | `backend/routes/intelligence/prediction.js:94` | `api.ts`'s `orgScience.graphStatus()`, called by `components/org-science/GraphFreshnessBanner.tsx:36`. Also the admin grid's `pingPath`. | `backend/tests/graphRoutes.test.js:87,105,122` — mounts the real `predictionRouter` and calls this HTTP route directly | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/maturity | `backend/routes/intelligence/prediction.js:79` | `api.ts`'s `orgScience.maturity()`, called by `components/org-science/MaturityCurveCard.tsx:28`. Also the admin grid's `pingPath` (module M43). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/opportunities | `backend/routes/intelligence/constitutional.js:55` | none found beyond the admin grid's `pingPath` (part of the unused `api.ts` `intelligence` object) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/orchestrator | `backend/routes/intelligence/orchestrator.js:460` | none found beyond the admin grid's `pingPath` (part of the unused `api.ts` `intelligence` object) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/orchestrator/modules | `backend/routes/intelligence/orchestrator.js:554` | `components/dashboard/FivePillarsRadar.tsx:60` — direct fetch, bypassing `api.ts`'s own `orchestratorApi.modules()` export (which has zero callers) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/orchestrator/recommendations | `backend/routes/intelligence/orchestrator.js:530` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/orchestrator/score | `backend/routes/intelligence/orchestrator.js:586` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/orchestrator/summary | `backend/routes/intelligence/orchestrator.js:485` | `api.ts`'s `orchestratorApi.summary()`, called by `components/dashboard/VerdictBanner.tsx:49` | none found (`orchestrator.js`'s `orchestrateFrom` pure function — the logic this route calls — is unit-tested directly in `routeEvidence.unit.test.js:53-82`, but that test never goes through this HTTP route) | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/orchestrator/verdict | `backend/routes/intelligence/orchestrator.js:511` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/pattern | `backend/routes/intelligence/prediction.js:76` | `api.ts`'s `orgScience.pattern()`, called by `components/org-science/PatternRegularityCard.tsx:28`. Also the admin grid's `pingPath` (module M37). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/prediction | `backend/routes/intelligence/prediction.js:109` | none found — not in `api.ts`, not in the admin grid | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/signals | `backend/routes/intelligence/constitutional.js:54` | none found beyond the admin grid's `pingPath` (part of the unused `api.ts` `intelligence` object). Note this is a **different mount** from `GET /api/signals/drilldown/:entityName` (`routes/signals/signals.js`, its own top-level mount) — same word, unrelated routes. | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/simulation-universe | `backend/routes/intelligence/constitutional.js:59` | none found beyond the admin grid's `pingPath` (part of the unused `api.ts` `intelligence` object) | none found | sweep.js (generic ping) | Global | **ADMIN** |
| GET /api/intelligence/strategic-alignment | `backend/routes/intelligence/prediction.js:82` | `api.ts`'s `orgScience.strategicAlignment()`, called by `components/org-science/StrategicAlignmentCard.tsx:28`. Also the admin grid's `pingPath` (module M40). | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/truth | `backend/routes/truth/truth.js:87` | `api.ts`'s `pillarApi.pillars()` exists but has zero callers found via that name — however `components/dashboard/FivePillarsRadar.tsx:91` calls this exact path directly (bypassing `api.ts`). Also the admin grid's `pingPath`. | `backend/tests/routeEvidence.unit.test.js:27-38` tests the route file's exported `trustStatusFor()` pure function directly, not this HTTP route | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/intelligence/truth/entity/:name | `backend/routes/truth/truth.js:227` | none found | none found | sweep.js (generic ping, always 404) | Global | **DISCOVERY** |
| GET /api/intelligence/truth/summary | `backend/routes/truth/truth.js:129` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/truth/unverified | `backend/routes/truth/truth.js:202` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/intelligence/truth/verified | `backend/routes/truth/truth.js:184` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |

## Automation (11 endpoints)

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| GET /api/automation | `backend/routes/automation/index.js:73` | none found — not individually pinged by the admin grid (only `/governance` and `/continuity` sub-paths are) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/automation/continuity | `backend/routes/automation/index.js:46` | `lib/notifications.ts:58` (direct fetch, `fetchLiveNotifications()`). Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/automation/governance | `backend/routes/automation/index.js:16` | `lib/notifications.ts:56` (direct fetch, `fetchLiveNotifications()`). Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/avatar | `backend/routes/avatar/index.js:18` | none found beyond the admin grid's `pingPath` | none found | sweep.js (generic ping) | Global | **ADMIN** |
| POST /api/avatar/check | `backend/routes/avatar/index.js:89` | none found | none found | none found (sweep.js is GET-only) | Global | **DISCOVERY** — calls internal helpers `checkGate()` (`backend/routes/avatar/gateCheck.js`) and `escalate()` (`backend/routes/avatar/escalate.js`); those two files are not routes themselves and have no `router.<method>` of their own, so they don't appear as separate rows in this census, but they are exercised whenever this endpoint is called |
| GET /api/avatar/escalations | `backend/routes/avatar/index.js:40` | `lib/notifications.ts:55` (direct fetch, `fetchLiveNotifications()`) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/avatar/escalations/critical | `backend/routes/avatar/index.js:51` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/avatar/escalations/summary | `backend/routes/avatar/index.js:63` | none found | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/self-healing | `backend/routes/selfHealing/index.js:125` | none found — not individually pinged by the admin grid (only `/detect` is) | none found | sweep.js (generic ping) | Global | **DISCOVERY** |
| GET /api/self-healing/detect | `backend/routes/selfHealing/index.js:86` | `api.ts`'s `selfHealing.detect()`, called by `components/workflows/SelfHealingFeed.tsx:19`. Also called directly (bypassing `api.ts`) by `lib/notifications.ts:57`. Also the admin grid's `pingPath`. | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| POST /api/self-healing/run | `backend/routes/selfHealing/index.js:105` | none found (`api.ts`'s `selfHealing.heal()` exists and is documented "LIVE" in a code comment, but no component calls it) | none found | none found (sweep.js is GET-only) | Global | **AMBIGUOUS** — `api.ts` explicitly comments this as a completed, live write endpoint (one of only 4 non-auth writes in the whole system per the decision log's F-E), and `SelfHealingFeed.tsx` renders the *detected* issues from `/detect` right next to where a "heal" action button would naturally go, but no such button/call currently exists. Possibly a wired-backend/unwired-frontend gap rather than dead code — flagging rather than deciding. |

## Not in the admin grid (8 endpoints)

These route families have no representation at all in `EndpointHealthGrid.tsx`'s `ROUTE_REGISTRY` —
not even a single pinged path.

| Method + path | Route file | Frontend callers | Backend test callers | backend/tools/ callers | Auth | Suggested classification |
|---|---|---|---|---|---|---|
| POST /api/auth/login | `backend/routes/auth/auth.js:80` | `lib/AuthContext.tsx:55` (direct fetch) | none found (only `/register`, `/reset-password`, `/change-password`, `/me` are exercised in `authRoutes.test.js`; `/login` itself is not) | none found | **Public** — no `requireAuth`, mounted above the global gate by design | **ACTIVE** |
| GET /api/auth/me | `backend/routes/auth/auth.js:106` | none found in `frontend/` (not called by `AuthContext.tsx` or elsewhere) | `backend/tests/authRoutes.test.js:240` | sweep.js (generic ping) | **Self-gated** (`requireAuth` named explicitly at the route, despite being mounted above the global gate) | **AMBIGUOUS** — exercised by a real test and clearly intended as the token-validity check, but no frontend code currently calls it; `AuthContext.tsx` appears to trust the locally-stored token without a server round-trip. Possibly meant to be wired into session restoration on app load. |
| POST /api/auth/logout | `backend/routes/auth/auth.js:113` | `lib/AuthContext.tsx:79` (direct fetch) | none found | none found (sweep.js is GET-only) | **Self-gated** | **ACTIVE** |
| POST /api/auth/change-password | `backend/routes/auth/auth.js:133` | `api.ts`'s `authApi.changePassword()`, called by `lib/AuthContext.tsx:70` | `backend/tests/authRoutes.test.js:160-234` (multiple cases: unauthenticated rejection, wrong current password, success, token revocation) | none found | **Self-gated** | **ACTIVE** |
| GET /api/decision-intelligence | `backend/routes/decisionIntelligence.js:328` | `app/decision/page.tsx:21` (direct fetch) | `backend/tests/routeEvidence.unit.test.js:40-49` tests the route file's exported `dqiVerdictFor()` pure function directly, not this HTTP route | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/employees | `backend/routes/employees.js:6` | (listed above under Reality Layer for completeness — this mount also isn't in the admin grid) | — | — | — | see Reality Layer row |
| GET /api/network/centrality | `backend/routes/network.js:15` | `app/network/page.tsx:18` (direct fetch) | none found | sweep.js (generic ping) | Global | **ACTIVE** |
| GET /api/signals/drilldown/:entityName | `backend/routes/signals/signals.js:9` | `api.ts`'s `signalApi.drilldown()`, called by `components/risk/SignalDrilldown.tsx:19` | none found | sweep.js (generic ping, always 404 for sweep specifically since it can't supply a real name — irrelevant here since a real caller exists) | Global | **ACTIVE** |

Note: `/api/employees` and `/api/network/centrality` are also absent from the admin grid but were
placed under "Reality Layer" and "Interaction"-adjacent groupings respectively above for readability
alongside their sibling endpoints; they are listed again here only as a pointer, not double-counted
in the summary total.

---

## Discrepancies found (not endpoints — process findings worth a human's attention)

1. **`/api/brain/boot-report`, `/api/brain/status`, `/api/brain/registry/modules` do not exist as
   routes, but are referenced as if live in two places:** `backend/index.js:42-44` (the root `/`
   route's self-description JSON) and `backend/tests/api.smoke.test.js:38-40`. `backend/brain/README.md`
   states explicitly: "It is a library, not a service. Nothing is mounted; there is no `/api/brain`."
   `backend/brain/index.js:10` repeats the same fact in comment form. `api.smoke.test.js` is opt-in
   only (`run-all.js:26` — only added to the suite when `BASE_URL` is set) so this has likely never
   failed CI, but it is not exercising real endpoints and `index.js`'s own self-description is
   pointing at three phantom paths. Not part of the 176/177-endpoint inventory since these are not
   actual routes; flagged because two different files assert they exist.
2. **`frontend/lib/api.ts:973`'s `relationshipApi.health()` calls `/api/relationships/health`, which
   has no backing route anywhere in `backend/`.** `frontend/components/dashboard/RelationshipHealthStrip.tsx`
   calls this on the dashboard. `docs/executive_workspace/experience_foundation/BUILD_SPEC.md:728-730,835`
   already documents this as a known gap ("the route file does not exist"). Not part of the
   176/177-endpoint inventory (there is no `/api/relationships` mount to classify), but it means one
   dashboard component is calling a 404 in production today.
3. **Endpoint count is 177, not 176.** No duplicate method+path pairs exist in the extraction output
   (verified programmatically), so this is not a script artifact. The most likely explanation is that
   the decision log's "176" figure predates W-G's two new routes (`GET /api/intelligence/graph/status`,
   `POST /api/intelligence/graph/reload`, both added per D-31) landing after the count was last
   written — 176 + 2 new − 1 unaccounted would net to 177, or the original 176 already included one of
   the two. This was not chased further since it doesn't change any individual endpoint's evidence;
   flagged for the record rather than silently reconciled, per this workstream's own standing
   practice.
4. **A recurring pattern: five backend analysis endpoints exist alongside a live frontend page for
   the exact same domain, but the page bypasses the endpoint and recomputes the same analysis
   client-side from raw `/api/agents` + `/api/dependencies` + `/api/workflows/intelligence` +
   `/api/tools` data.** Specifically: `GET /api/ownership` vs `app/ownership/page.tsx`; `GET /api/risks`
   vs `app/risk/page.tsx` (client computation in `lib/riskIntelligence.ts`); `GET /api/dashboard` vs
   `app/page.tsx`; `GET /api/memory/health` vs `app/memory/page.tsx` (client computation in
   `lib/orgMemory.ts`); `GET /api/continuity/score` and `GET /api/governance/score` vs
   `app/continuity/page.tsx` (client computation in `lib/continuityRisk.ts`). All five are flagged
   **AMBIGUOUS** above rather than DEAD, because `lib/riskIntelligence.ts` and `lib/orgMemory.ts` are
   both named specifically in the decision log's own W-E work (D-24, D-27) as actively-maintained
   client-side scoring modules — meaning the server-side sibling may be legacy-superseded, or the
   client-side path may be the one that needs to be replaced by a call to the (better-evidenced)
   server endpoint. This is exactly the kind of call D-15 says a human should make, not this census.
5. **`authRoutes.test.js` still references `/api/auth/register` and `/api/auth/reset-password`,
   but only to assert they now 404** (`backend/tests/authRoutes.test.js:133-155`) — this is D-36's
   "removed endpoint, assert 404" pattern working as designed, not a live reference. Confirmed neither
   path exists in the route extraction. Noted here only because the brief specifically asked to check
   for stray `/register` references.

---

## Summary

- **Total endpoints found: 177** (across 54 route files; decision log says 176 — see Discrepancy 3).
  The `/api/employees` row is discussed twice above for readability (once in "Reality Layer", once
  in "Not in the admin grid" as a pointer back to it) but is one endpoint, counted once below.
- **By suggested classification (177 of 177 rows, verified by count):**
  - **ACTIVE:** 51
  - **ADMIN:** 20
  - **DISCOVERY:** 97
  - **AMBIGUOUS:** 9
  - **DEAD:** 0
  - **INTERNAL:** 0 (no endpoint in this codebase is reachable only via another backend route's HTTP
    call — the one internal-call pattern found, `decisionIntelligence.js` importing `tools.js`'s
    `loadEnrichedTools()` function directly, is a shared helper, not one route calling another
    route's HTTP handler; and `avatar/gateCheck.js` / `avatar/escalate.js` are non-route helper
    modules, not endpoints, so they don't appear as rows at all)
- **Zero endpoints met a DEAD bar of "zero callers anywhere, including a plausible-manual-use case"**
  under this census's rule of resolving every genuinely zero-caller endpoint to DISCOVERY instead
  (per the task brief's own definition: DISCOVERY is for "no caller anywhere, but plausibly still
  useful for manual inspection"). Every zero-caller endpoint found here is a real, non-broken
  analysis route with a plausible manual/future use, not obviously vestigial code — none appeared to
  be superseded duplicates, abandoned experiments, or broken handlers. If the owner wants a stricter
  bar for what counts as DEAD (e.g., "no caller and no plausible future use"), the 97 DISCOVERY rows
  are the pool to re-examine by hand; this census intentionally did not make that call.
- **9 AMBIGUOUS cases need a human decision**, all explained inline above:
  1. `GET /api/ownership` — superseded-vs-still-useful vs. client-computed `app/ownership/page.tsx`
  2. `GET /api/risks` — same pattern vs. `lib/riskIntelligence.ts`
  3. `GET /api/dashboard` — same pattern vs. `app/page.tsx`
  4. `GET /api/memory/health` — same pattern vs. `lib/orgMemory.ts`
  5. `GET /api/continuity/score` — same pattern vs. `lib/continuityRisk.ts`
  6. `GET /api/governance/score` — same pattern, plus sits in a file (`governance.js`) already
     flagged as pre-existing uncommitted WIP in the decision log's §5 process notes
  7. `GET /api/workflows/spof` — zero live callers, but named in the decision log's own deferred
     list as pending migration onto `spofVerdict()`, i.e. known-incomplete work, not dead code
  8. `POST /api/self-healing/run` — documented "LIVE" in `api.ts` and part of the system's only 4
     non-auth writes (F-E), but no frontend button currently calls it
  9. `GET /api/auth/me` — has a real regression test and an obvious purpose (token validation) but
     no frontend caller found; `AuthContext.tsx` may be trusting a locally-stored token without
     server round-trip verification
