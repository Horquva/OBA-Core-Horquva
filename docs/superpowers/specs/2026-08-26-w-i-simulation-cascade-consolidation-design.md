# W-I — Simulation Cascade & Ranking Consolidation

Date: 2026-08-26
Status: design drafted in chat, awaiting owner review of this file. No code changed yet.

Follows W-A through W-H (all landed 2026-08-25, per the
[remediation decision log](2026-08-24-oba-remediation-decision-log.md), §3: "All eight workstreams
have landed"). **This is a new workstream, not part of the original 16-decision interrogation.** It
was found on 2026-08-26 while auditing the codebase fresh (ignoring stale memory of prior sessions)
to design an AI agent layer on top of the truth layer W-D established. The audit's premise —
"the agent must reason from one trustworthy answer per fact" — turned out to be false for
organizational-impact simulation specifically, so this closes that gap before any agent work starts.

---

## 1. The problem this solves

Four things independently answer "what happens if X leaves/fails/goes down/is disrupted," and they
disagree by construction, not by bug:

- **`backend/domain/derived.js`** has a private, unexported `dependencyIndex()`/`cascadeReach()` pair
  that does real transitive BFS over the `dependencies` root table. Nothing outside `derived.js` can
  call it.
- **`backend/brain/modules/analytics.js`** has its own separate transitive BFS
  (`transitiveDependents`/`transitiveDependencies`) over the in-memory knowledge graph. Used
  throughout the M-module catalog. Does not share code with `derived.js`'s version — different data
  source (graph vs. root table), different implementation.
- **`backend/routes/simulations/{agentFails,employeeLeaves,platformDown,workflowDisruption}.js`** —
  the four live scenario endpoints — call neither of the above. Each does a single direct-relationship
  hop (ownership, platform membership, workflow membership, or one dependency edge) and stops. None of
  them compute real cascade reach. Each also has its own severity-bucket thresholds, unrelated to the
  others and unrelated to `definitions.js`'s shared `LEVELS`:
  - `employeeLeaves.js`: `>=4` impacted agents → critical, `>=2` → high
  - `platformDown.js`: `>=3` impacted agents → critical, else high (never "medium")
  - `agentFails.js`: any critical-type dependency → critical, `>2` impacted agents → high, else medium
  - `workflowDisruption.js`: any critical agent link → critical, else high (never "medium")
- **`frontend/lib/simulation.ts`** is a fifth, fully independent implementation — client-side BFS
  (`getDownstream`/`getSPOFs` from `frontend/lib/graph.ts`) plus its own health-score-delta math,
  driving `SimulationDashboard.tsx`. **It never calls any of the four backend routes above.** The
  backend routes and the live UI are two disconnected products today; fixing the backend alone would
  be invisible to every current user.

The backend routes' shallow-hop behavior is a live correctness bug independent of any agent work: "if
Sarah leaves" today only counts people/agents one hop away, not the real blast radius the brain/derived
layers already know how to compute. This predates and is unrelated to the AI-agent design.

## 2. What gets built

### 2.1 One shared cascade primitive (D-41)

Export `dependencyIndex` and `cascadeReach` from `derived.js` (currently private). No behavior change
to existing callers — this is additive to `module.exports`.

**`analytics.js`'s separate graph-based traversal is intentionally left untouched.** Per D-12, brain
modules answer graph-structural questions the graph is the right substrate for; `derived.js`/
`simulations.js` answer root-aggregate questions. These are two different computations over two
different data sources by design, not an unresolved duplicate — unifying them would repeat the mistake
the earlier "graph as canonical model" discussion already worked through and rejected.

### 2.2 Two missing root tables (D-42)

`derived.js`'s `ROOT_TABLES` list is missing `agent_platform` and `workflow_dependencies` — the two
link tables `platformDown.js`/`workflowDisruption.js`/`agentFails.js` currently query ad hoc, outside
`loadRoots()`. `loadRoots()`'s own header comment states the intended remedy for exactly this
situation: *"If a future analysis needs something not in it, the honest move is to add a root."* Add
both. Purely additive — `loadRoots()` just returns two more keys; none of the six existing analyses
that read `roots` are affected.

### 2.3 One severity rule (D-43)

New `severityFor(impactedEntities)` in `backend/domain/simulations.js`, built on `definitions.js`'s
existing `LEVELS`/`atOrAbove` rather than a sixth ad hoc bucket scheme. Exact thresholds (count of
impacted entities, weighted by their own criticality) are a small product call to make during
implementation, but the *mechanism* is: reuse the canonical criticality vocabulary, don't invent a new
one. This directly continues the pattern D-03/D-06/W-C already established for criticality elsewhere
in the codebase.

### 2.4 Health delta reuses the real formula, not a sixth one (D-44)

Rather than inventing a "simulated health" proxy formula, each scenario function clones `roots`,
applies a scenario-specific mutation (null the `owner_id` for employee-leaves; mark `status: 'failed'`
for agent-fails; etc.), and reruns `derived.js`'s actual `orgHealth()` on the mutated copy versus
baseline. Same formula the rest of the product already trusts, applied twice, diffed. The dataset is
small (≈40 employees, 15 agents, 12 tools, 10 workflows), so recomputing `orgHealth()` per candidate in
`rankAllScenarios` (≈65 candidates) is not a performance concern.

### 2.5 New module: `backend/domain/simulations.js`

A peer to `derived.js`, following its existing pattern (pure functions over `roots`):

- `buildDependencyIndex(roots)` / `cascadeFrom(type, id, index)` — wraps 2.1's exports; the index is
  built once per request/batch, not once per candidate.
- `severityFor(impactedEntities)` — 2.3.
- `employeeLeaves(id, roots)`, `agentFails(id, roots)`, `platformDown(id, roots)`,
  `workflowDisruption(id, roots)` — each keeps today's correct scenario-specific direct hop, then
  extends it with `cascadeFrom` for real transitive reach, computes severity via 2.3 and health delta
  via 2.4.

  **Correction found during planning, not present in the original problem statement:**
  `employeeLeaves`'s "direct hop" is not actually correct today and needs fixing, not just extending.
  The live route finds "agents owned by this employee" via the `employee_agent` table — an
  operator/usage-role link (used elsewhere for adoption metrics) — rather than `agents.owner_id`,
  which is the ownership fact every other consumer (`predictiveRisk`, `pillars`, `routes/ownership.js`)
  actually uses. `routes/ownership.js` carries its own explicit warning about this id space
  (`agents.owner_id` references `employees.id` directly, not `owners.id` — "both id spaces start at 1,
  so joining on the wrong one never errors, it silently returns a different, plausible person"). The
  new `employeeLeaves()` must filter agents by `owner_id === employeeId` directly, matching
  `ownership.js`'s pattern, and use the `owners` table only for `backup_owner` enrichment as
  `ownership.js` already does.
- `rankAllScenarios(roots)` — iterates every employee, every agent, and every tool whose criticality is
  high or critical **per `definitions.js`'s `entityCriticality()`** (not the raw, disputed `agents.risk`
  column) — calls the relevant function above for each (reusing one dependency index across the whole
  pass); returns them sorted by health delta.

### 2.6 Routes become thin; one new bulk endpoint (D-45)

`routes/simulations/{agentFails,employeeLeaves,platformDown,workflowDisruption}.js` keep their existing
name→id `ilike` lookup, then delegate to the matching `domain.simulations.*` function and return its
result. **Response shape is unchanged** from today (`scenario`, `impactedAgents`, `impactedWorkflows`,
`impactedPeople`, `healthBefore`, `healthAfter`, `riskLevel`) — this is a byte-shape-preserving swap of
what computes the numbers, not a contract change, matching how W-D verified its `domain.graph.run`
swaps.

New `routes/simulations/rank.js` exposes `GET /api/simulations/rank`, calling
`domain.simulations.rankAllScenarios(roots)`. This exists because `SimulationDashboard.tsx` ranks
*everything* up front (see 2.7) — a shape none of the four single-target routes can serve without
either a new bulk endpoint or ~65 parallel requests per page load. The single-target routes remain
useful independently — for `voice.js`, and later the AI agent, asking about one specific entity.

### 2.7 Frontend repointing

**Correction found during planning:** three components use `lib/simulation.ts`, not one, and
`DepartureSim.tsx` turned out not to be a consumer at all (verified by grep — no false assumption
carried forward). `frontend/app/simulation/page.tsx` fetches `agents`/`dependencies`/`tools` once and
passes them to all three:

- `SimulationDashboard.tsx` and `SimulationUniverseRanking.tsx` both call `rankScenarios()` — the
  bulk/ranked view. `page.tsx` fetches `/api/simulations/rank` once, in the same `Promise.all` as
  today's other fetches, and passes the result down as a new prop to both — they render the same
  ranked list two different ways, they don't need to fetch it twice.
- `ScenarioSandbox.tsx` calls `simulatePersonLeaving`/`simulateAgentFailing`/`simulateToolUnavailable`
  individually, on button press, for a user-picked one-of-three preset scenario ("Stress Test" = the
  frontend's current highest-risk person, "Node Outage" = its highest-risk agent, "Data Breach" = its
  most-used tool). It calls the matching single-target route on click
  (`/api/simulations/employee-leaves/:name`, `/agent-fails/:name`, `/platform-down/:name` — "tool" in
  the frontend and "platform" in `ai_platforms` are the same entity, 12 rows either side) instead of
  computing locally. Its existing client-side logic for *picking* which person/agent/tool is riskiest
  is unaffected — only the simulation call itself moves server-side.

`frontend/lib/simulation.ts` becomes types-only once all three are repointed (`ScenarioResult`,
`ScenarioType` stay — `ScenarioRanking.tsx`/`ImpactSummary.tsx` import only the types today), matching
the precedent `lib/decisionIntelligence.ts` already set for this exact situation.

## 3. Testing & verification

- Unit tests for `domain/simulations.js` against a fixture `roots` object, reusing the `roots(overrides)`
  fixture builder pattern `derived.js`'s own tests already use (per the W-D design doc) rather than
  building a second fixture set. Cover: reach beyond one hop, severity at its boundaries, health delta
  sign (a departure/failure must never *improve* the score).
- Route-level tests confirming the 4 existing endpoints' response shape is byte-identical in field
  names/types to today, values aside.
- Manual verification: load `/simulation` in the browser, confirm `SimulationDashboard`'s ranked list
  and detail view match `/api/simulations/rank` and a direct single-target call.

## 4. Explicitly out of scope

- **SPOF definition unification** (three disagreeing definitions found: `definitions.js`'s
  `spofVerdict()`, `analytics.js`'s `singlePointsOfFailure()`, `routes/risks.js`'s own bucket rule) —
  a separate workstream; it needs a product decision about what "SPOF" means (backup-coverage-based vs.
  dependent-count-based), not a mechanical fix. Note: the existing decision log's §4 (Deferred) already
  flagged `spofVerdict()` as having zero production callers and named `routes/workflows/spof.js` as the
  file that should migrate onto it — that item is real and still open, and belongs to the SPOF
  workstream, not this one.
- **Ownership concentration definition** (four disagreeing formulas) — needs an owner decision, no
  clear survivor to promote.
- **Frontend risk/health-score client-side recomputation** on `/risk`, `/knowledge`, `/ai-tools`
  (`lib/risk.ts`, `lib/riskIntelligence.ts`, `lib/knowledgeRisk.ts`, `lib/aiToolIntelligence.ts`) — a
  separate, larger frontend-truth-repointing workstream. This spec's frontend change is scoped
  narrowly to the simulation dashboard only.

## 5. Decisions introduced by this workstream

| # | Decision |
|---|---|
| D-41 | Export `dependencyIndex`/`cascadeReach` from `derived.js` rather than reimplementing cascade traversal a third time. |
| D-42 | Add `agent_platform` and `workflow_dependencies` to `derived.js`'s `ROOT_TABLES`. |
| D-43 | Simulation severity is computed from `definitions.js`'s shared criticality vocabulary, not a new bucket scheme. |
| D-44 | Simulated health impact is `orgHealth()` recomputed on mutated roots, not a new formula. |
| D-45 | A new `GET /api/simulations/rank` bulk endpoint is added; the four single-target routes are kept (fixed, not removed) for entity-specific callers. |

This table is written in the style of the central decision log but not yet merged into it — see the
note to the user in chat about whether to append these to
`2026-08-24-oba-remediation-decision-log.md`'s §3 workstream map now or after implementation.
