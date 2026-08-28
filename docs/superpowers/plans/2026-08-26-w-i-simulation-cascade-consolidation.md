# W-I Simulation Cascade & Ranking Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace five independent, disagreeing implementations of "what happens if X leaves/fails/goes
down/is disrupted" (frontend client engine + 4 shallow backend routes + 2 private backend traversals)
with one shared cascade/severity/health-delta core, wired into both the 4 existing single-target routes
and a new bulk-ranking endpoint the frontend actually calls.

**Architecture:** New `backend/domain/simulations.js` module (peer to `derived.js`) holds all shared
logic — transitive cascade reach, severity, and health-delta-by-reusing-`orgHealth()`. The 4 existing
routes become thin wrappers over it; a new `GET /api/simulations/rank` route serves the bulk case.
Frontend's `app/simulation/page.tsx` fetches the ranked list once and passes it to the two components
that render rankings; `ScenarioSandbox.tsx` calls the single-target routes on demand.

**Tech Stack:** Node.js (CommonJS, no semicolons — match `backend/domain/derived.js`'s style),
Express 5, custom test harness (`node tests/run-all.js`, no Jest/Mocha) matching
`backend/tests/derived.unit.test.js`. Next.js/React/TypeScript on the frontend (semicolons, matching
existing `.tsx` files).

**Spec:** [docs/superpowers/specs/2026-08-26-w-i-simulation-cascade-consolidation-design.md](../specs/2026-08-26-w-i-simulation-cascade-consolidation-design.md)

## Global Constraints

- No semicolons in backend `.js` files; semicolons in frontend `.tsx` files — match each file's
  existing style exactly.
- `derived.js`'s rule applies to the new module too: compute from roots or from `derived.js`'s own
  exported functions, never re-query Supabase directly inside `simulations.js`.
- The 4 existing routes' JSON response shape must stay backward compatible — same field names/types as
  today, new fields only additive (`healthDelta`).
- Criticality/severity must be derived via `backend/domain/definitions.js`'s `entityCriticality`/
  `atOrAbove`, never a new hardcoded bucket scheme.
- Do **not** touch `backend/domain/derived.js`'s `predictiveRisk()` or `filterRootsByDepartment()` — the
  `owner_id`/`owners.id` join bug found while planning this is explicitly out of scope (see the
  decision log's Deferred list) and must not be silently fixed or worked around inside this plan.
- Every new backend function is pure (no I/O) except where it explicitly loads roots — matches
  `derived.js`'s existing testability contract.

---

### Task 1: Export cascade primitive + add two missing root tables

**Files:**
- Modify: `backend/domain/derived.js:64-70` (`ROOT_TABLES`), `:1270-1296` (`module.exports`)
- Test: `backend/tests/derived.unit.test.js` (append; do not create a new file for this)

**Interfaces:**
- Produces: `derived.dependencyIndex(roots)` → `{ dependentsOf: Map<string, Array<{type, id, dependency_type}>>, key: (type, id) => string }` (already implemented, currently private — this task only exports it)
- Produces: `derived.ROOT_TABLES` now includes `'agent_platform'` and `'workflow_dependencies'`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/derived.unit.test.js`, after the existing "Collaboration" block (find the line
`console.log('\nCollaboration — adoption, dependency, concentration:')` and add this new block right
before it, so it runs early and cheaply):

```js
// ── Root table coverage (W-I) ──────────────────────────────────────────────
console.log('Root tables — W-I additions:')
{
	check('ROOT_TABLES includes agent_platform', d.ROOT_TABLES.includes('agent_platform'))
	check('ROOT_TABLES includes workflow_dependencies', d.ROOT_TABLES.includes('workflow_dependencies'))
	check('dependencyIndex is exported', typeof d.dependencyIndex === 'function')

	const r = roots({
		dependencies: [
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
		],
	})
	const idx = d.dependencyIndex(r)
	const hit = idx.dependentsOf.get(idx.key('agent', 2))
	check('dependencyIndex finds the dependent of a target', Array.isArray(hit) && hit.length === 1 && hit[0].id === 1, hit)
}

```

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `node tests/derived.unit.test.js`
Expected: FAIL — `ROOT_TABLES includes agent_platform` and `dependencyIndex is exported` both print `✗`.

- [ ] **Step 3: Implement**

In `backend/domain/derived.js`, change `ROOT_TABLES` (around line 64):

```js
const ROOT_TABLES = [
  'employees', 'agents', 'owners', 'workflows', 'workflow_failures',
  'workflow_runbooks', 'dependencies', 'knowledge_assets', 'tool_users',
  'employee_agent', 'ai_platforms', 'tool_policies', 'policy_violations',
  'tool_ownership', 'accountability_entities', 'accountability_links',
  'truth_claims', 'decision_history', 'agent_platform', 'workflow_dependencies',
]
```

In `module.exports` (around line 1270), add `dependencyIndex` and `cascadeReach` to the exported object
(insert after `loadRoots,`):

```js
module.exports = {
  ROOT_TABLES,
  loadRoots,
  dependencyIndex,
  cascadeReach,
  computeAllCached,
  invalidate,
  MEMO_TTL_MS,
  accountability,
  collaboration,
  predictiveRisk,
  executiveMemory,
  pillars,
  decisionQuality,
  orgHealth,
  orgHealthByDepartment,
  departmentExposure,
  computeAll,
  constants: {
    RACI_BOTH_SEPARATE, RACI_BOTH_SAME_PERSON, RACI_ONE_ONLY,
    USAGE_WEIGHT, AGENT_ENGAGEMENT_WEIGHT, ADOPTION_SATURATION,
    DEPENDENCY_PER_CRITICAL_ASSET, DEPENDENCY_NO_BACKUP,
    RISK_FACTORS, MANY_DEPENDENTS,
    HERO_CRITICAL_ASSET_THRESHOLD,
    PILLAR_WEIGHTS, VIOLATION_SEVERITY_PENALTY,
  },
```

(Leave the rest of the object — everything after `constants: {...}` — exactly as it is today; this is
an additive change to the two lines named above, not a rewrite of the export block.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/derived.unit.test.js`
Expected: PASS — all `✓`, no `✗` in output.

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED`

- [ ] **Step 6: Commit**

```bash
git add backend/domain/derived.js backend/tests/derived.unit.test.js
git commit -m "feat(W-I): export dependencyIndex/cascadeReach, add agent_platform + workflow_dependencies roots"
```

---

### Task 2: `backend/domain/simulations.js` — shared helpers

**Files:**
- Create: `backend/domain/simulations.js`
- Create: `backend/tests/simulations.unit.test.js`

**Interfaces:**
- Consumes: `derived.dependencyIndex(roots)`, `derived.ROOT_TABLES`, `derived.accountability(roots)`,
  `derived.predictiveRisk(roots)`, `derived.orgHealth(roots, {accountability, predictiveRisk})` (all
  from Task 1 / existing `derived.js`); `entityCriticality(type, row)`, `atOrAbove(level, threshold)`
  from `backend/domain/definitions.js` (existing, unchanged).
- Produces (used by Tasks 3-7): `buildDependencyIndex(roots)`, `cascadeFrom(type, id, index)`,
  `severityFor(impacted)`, `cloneRoots(roots)`, `workflowsUsingAgents(agentIdSet, roots)`,
  `healthDelta(baselineRoots, mutatedRoots)`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/simulations.unit.test.js`:

```js
/*
 * OBA Core — Simulation cascade/severity/health-delta unit test.
 *
 * domain/simulations.js is the one place "what happens if X leaves/fails/goes
 * down/is disrupted" is computed. These tests assert the shared primitives on
 * hand-built root bundles where the right answer is known by construction —
 * same pattern as derived.unit.test.js.
 *
 * Run from backend/:  node tests/simulations.unit.test.js
 */

const d = require('../domain/derived')
const s = require('../domain/simulations')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

console.log('\n=== OBA Core — Simulation Unit Test ===\n')

// ── cascadeFrom: transitive reach beyond one hop ────────────────────────────
console.log('cascadeFrom — transitive reach:')
{
	// 1 depends on 2, 2 depends on 3. If 3 fails, both 1 and 2 are impacted
	// (2 directly, 1 transitively) — a single-hop query would miss agent 1.
	const r = roots({
		dependencies: [
			{ source_id: 2, target_id: 3, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
		],
	})
	const idx = s.buildDependencyIndex(r)
	const hits = s.cascadeFrom('agent', 3, idx)
	const ids = hits.map((h) => h.id).sort()
	check('reaches both the direct and transitive dependent', ids.length === 2 && ids[0] === 1 && ids[1] === 2, ids)
}
{
	// No cycle should infinite-loop.
	const r = roots({
		dependencies: [
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
			{ source_id: 2, target_id: 1, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
		],
	})
	const idx = s.buildDependencyIndex(r)
	const hits = s.cascadeFrom('agent', 1, idx)
	check('a 2-cycle terminates and returns the one other node', hits.length === 1 && hits[0].id === 2, hits)
}

// ── severityFor: reuses definitions.js's criticality vocabulary ────────────
console.log('\nseverityFor — thresholds:')
{
	check('no impacted entities is low', s.severityFor([]) === 'low')
	check('one normal-criticality entity is medium', s.severityFor([{ criticality: 'normal' }]) === 'medium')
	check('any high-criticality entity is high even alone', s.severityFor([{ criticality: 'high' }]) === 'high')
	check('any critical-criticality entity is critical even alone', s.severityFor([{ criticality: 'critical' }]) === 'critical')
	check('5+ entities is critical regardless of criticality', s.severityFor([
		{ criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' },
	]) === 'critical')
}

// ── workflowsUsingAgents ─────────────────────────────────────────────────────
console.log('\nworkflowsUsingAgents:')
{
	const r = roots({
		workflows: [{ id: 100, name: 'Deploy Pipeline', status: 'active', risk: 'high' }],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 5, is_critical: true }],
	})
	const hit = s.workflowsUsingAgents(new Set([5]), r)
	check('finds the workflow using the given agent', hit.length === 1 && hit[0].id === 100, hit)
	check('an agent with no workflow membership finds nothing', s.workflowsUsingAgents(new Set([999]), r).length === 0)
}

// ── healthDelta reuses orgHealth(), never a second formula ─────────────────
console.log('\nhealthDelta:')
{
	// orgHealth()'s healthIndex is gated on FIVE evidenceGate()s all being
	// sufficient (documentation, continuity, ownershipSpread, criticalSafety,
	// incidentLoad — derived.js:1008-1023), each requiring a non-empty
	// population (definitions.js's evidenceGate: "an EMPTY population is
	// always insufficient"). This fixture deliberately carries >=1 row in
	// knowledge_assets, owners, and workflows (agents already has 2) so
	// healthIndex resolves to a real number instead of null.
	const base = roots({
		agents: [
			{ id: 1, name: 'A', status: 'active', risk: 'high', owner_id: 10 },
			{ id: 2, name: 'B', status: 'active', risk: 'low', owner_id: 20 },
		],
		employees: [{ id: 10, name: 'Owner1' }, { id: 20, name: 'Owner2' }],
		owners: [{ id: 10, name: 'Owner1', employee_id: 10, backup_owner: 'Owner2' }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 1, is_documented: true }],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
		workflow_runbooks: [],
		workflow_failures: [],
	})
	const mutated = s.cloneRoots(base)
	mutated.agents = mutated.agents.filter((a) => a.id !== 1)
	const delta = s.healthDelta(base, mutated)
	check('removing an agent produces a numeric delta, not null', typeof delta === 'number', delta)
}

console.log('\n========================================')
console.log(`${passed} passed, ${failed} failed`)
console.log('========================================\n')
process.exit(failed === 0 ? 0 : 1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL immediately with `Cannot find module '../domain/simulations'`.

- [ ] **Step 3: Implement**

Create `backend/domain/simulations.js`:

```js
/**
 * SIMULATION — cascade reach, severity, and health impact, in one place
 * -----------------------------------------------------------------------
 * Before this file, "what happens if X leaves/fails/goes down/is disrupted"
 * was answered four different ways in backend/routes/simulations/*.js (each
 * doing a single-hop query with its own severity thresholds) and a fifth way
 * client-side in frontend/lib/simulation.ts. This is the one shared core.
 *
 * Severity reuses definitions.js's criticality vocabulary rather than
 * inventing a sixth bucket scheme. Health impact reuses derived.js's real
 * orgHealth() on a mutated roots snapshot rather than inventing a new
 * "simulated health" formula — see the W-I design doc §2.4.
 */

const derived = require('./derived')
const { entityCriticality, atOrAbove } = require('./definitions')

// ─── Cascade ─────────────────────────────────────────────────────────────────

function buildDependencyIndex(roots) {
  return derived.dependencyIndex(roots)
}

/** Everything that transitively fails downstream of one node, as entities not just a count. */
function cascadeFrom(startType, startId, index) {
  const seen = new Set([index.key(startType, startId)])
  const impacted = []
  const queue = [[startType, startId]]
  while (queue.length) {
    const [t, id] = queue.shift()
    for (const dep of index.dependentsOf.get(index.key(t, id)) || []) {
      const k = index.key(dep.type, dep.id)
      if (seen.has(k)) continue
      seen.add(k)
      impacted.push({ type: dep.type, id: dep.id })
      queue.push([dep.type, dep.id])
    }
  }
  return impacted
}

/** Workflows that use any of the given agent ids, via workflow_dependencies. */
function workflowsUsingAgents(agentIds, roots) {
  const workflowIds = new Set()
  for (const wd of roots.workflow_dependencies) {
    if (agentIds.has(wd.agent_id)) workflowIds.add(wd.workflow_id)
  }
  return roots.workflows.filter((w) => workflowIds.has(w.id))
}

// ─── Severity ────────────────────────────────────────────────────────────────

/**
 * One shared severity rule, built on definitions.js's LEVELS/atOrAbove rather
 * than a new bucket scheme. `impacted` is an array of { criticality } —
 * already-resolved via entityCriticality(), not raw rows.
 */
function severityFor(impacted) {
  const count = impacted.length
  const hasCritical = impacted.some((e) => atOrAbove(e.criticality, 'critical'))
  const hasHigh = impacted.some((e) => atOrAbove(e.criticality, 'high'))
  if (hasCritical || count >= 5) return 'critical'
  if (hasHigh || count >= 2) return 'high'
  if (count >= 1) return 'medium'
  return 'low'
}

// ─── Health delta ────────────────────────────────────────────────────────────

/** Deep-enough clone: every root table array gets fresh row objects. */
function cloneRoots(roots) {
  const clone = {}
  for (const key of Object.keys(roots)) {
    clone[key] = key === '_counts' ? { ...roots[key] } : roots[key].map((row) => ({ ...row }))
  }
  return clone
}

function recount(roots) {
  const counts = {}
  for (const t of derived.ROOT_TABLES) counts[t] = (roots[t] || []).length
  roots._counts = counts
  return roots
}

function healthScore(roots) {
  const acc = derived.accountability(roots)
  const risk = derived.predictiveRisk(roots)
  return derived.orgHealth(roots, { accountability: acc, predictiveRisk: risk }).healthIndex
}

/** Positive = health drops after the mutation. Null if either side lacks evidence. */
function healthDelta(baselineRoots, mutatedRoots) {
  const before = healthScore(baselineRoots)
  const after = healthScore(mutatedRoots)
  if (before == null || after == null) return null
  return before - after
}

module.exports = {
  buildDependencyIndex,
  cascadeFrom,
  workflowsUsingAgents,
  severityFor,
  cloneRoots,
  recount,
  healthDelta,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add domain/simulations.js shared cascade/severity/health-delta core"
```

---

### Task 3: `employeeLeaves()`

**Files:**
- Modify: `backend/domain/simulations.js` (append)
- Modify: `backend/tests/simulations.unit.test.js` (append)

**Interfaces:**
- Consumes: everything from Task 2, plus `roots.employees`, `roots.agents` (`owner_id` compared
  directly against `employees.id` — **not** via the `owners` table; see the design doc's correction
  in §2.5 and `routes/ownership.js`'s comment for why).
- Produces: `employeeLeaves(employeeId, roots)` → `{ scenario, targetType: 'employee', targetId,
  targetName, impactedAgents, impactedWorkflows, impactedPeople, severity, healthDelta } | null`

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/simulations.unit.test.js`, before the final `console.log('\n========...')`:

```js
// ── employeeLeaves ───────────────────────────────────────────────────────────
console.log('\nemployeeLeaves:')
{
	// knowledge_assets + owners are populated (in addition to the existing
	// workflows row) purely so orgHealth()'s five evidenceGate()s are all
	// sufficient and healthDelta resolves to a real number, not null — see
	// the note on the same pattern in Task 2's healthDelta test above.
	const r = roots({
		employees: [{ id: 1, name: 'Sarah', department: 'Eng' }],
		agents: [
			{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'Downstream', status: 'active', risk: 'high', owner_id: 2 },
		],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
		],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true }],
		workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null }],
	})

	const unknown = s.employeeLeaves(999, r)
	check('unknown employee returns null', unknown === null)

	const result = s.employeeLeaves(1, r)
	check('scenario names the employee', result.scenario === 'If Sarah leaves', result.scenario)
	const agentIds = result.impactedAgents.map((a) => a.id).sort()
	check('owned agent AND its transitive dependent are both impacted', agentIds.length === 2 && agentIds[0] === 10 && agentIds[1] === 11, agentIds)
	check('the workflow using the owned agent is impacted', result.impactedWorkflows.length === 1 && result.impactedWorkflows[0].id === 100, result.impactedWorkflows)
	check('severity reflects the critical owned agent', result.severity === 'critical', result.severity)
	check('healthDelta is a number', typeof result.healthDelta === 'number', result.healthDelta)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL with `s.employeeLeaves is not a function`.

- [ ] **Step 3: Implement**

Append to `backend/domain/simulations.js`, before `module.exports`:

```js
// ─── Scenarios ───────────────────────────────────────────────────────────────

function impactedEntitiesFor(agentIds, workflows) {
  return [
    ...[...agentIds].map((id) => ({ type: 'agent', id })),
    ...workflows.map((w) => ({ type: 'workflow', id: w.id })),
  ]
}

function resolveCriticality(entities, roots) {
  const agentsById = new Map(roots.agents.map((a) => [a.id, a]))
  const workflowsById = new Map(roots.workflows.map((w) => [w.id, w]))
  return entities.map((e) => ({
    ...e,
    criticality: e.type === 'agent'
      ? entityCriticality('agent', agentsById.get(e.id))
      : entityCriticality('workflow', workflowsById.get(e.id)),
  }))
}

function employeeLeaves(employeeId, roots) {
  const employee = roots.employees.find((e) => e.id === employeeId)
  if (!employee) return null

  const ownedAgents = roots.agents.filter((a) => a.owner_id === employeeId)
  const index = buildDependencyIndex(roots)

  const impactedAgentIds = new Set(ownedAgents.map((a) => a.id))
  for (const agent of ownedAgents) {
    for (const hit of cascadeFrom('agent', agent.id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  mutated.employees = mutated.employees.filter((e) => e.id !== employeeId)
  mutated.agents = mutated.agents.map((a) => (a.owner_id === employeeId ? { ...a, owner_id: null } : a))
  recount(mutated)

  return {
    scenario: `If ${employee.name} leaves`,
    targetType: 'employee',
    targetId: employeeId,
    targetName: employee.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [employee],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}
```

Update `module.exports` at the bottom of the file to add `employeeLeaves`:

```js
module.exports = {
  buildDependencyIndex,
  cascadeFrom,
  workflowsUsingAgents,
  severityFor,
  cloneRoots,
  recount,
  healthDelta,
  employeeLeaves,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add employeeLeaves() using agents.owner_id directly, with real cascade"
```

---

### Task 4: `agentFails()`

**Files:**
- Modify: `backend/domain/simulations.js` (append)
- Modify: `backend/tests/simulations.unit.test.js` (append)

**Interfaces:**
- Produces: `agentFails(agentId, roots)` → same shape as `employeeLeaves`, with `targetType: 'agent'`,
  `impactedPeople: []`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/simulations.unit.test.js`:

```js
// ── agentFails ───────────────────────────────────────────────────────────────
console.log('\nagentFails:')
{
	const r = roots({
		agents: [
			{ id: 10, name: 'Core', status: 'active', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'Dependent', status: 'active', risk: 'high', owner_id: 2 },
			{ id: 12, name: 'Transitive', status: 'active', risk: 'low', owner_id: 3 },
		],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
			{ source_id: 12, target_id: 11, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
		],
	})

	check('unknown agent returns null', s.agentFails(999, r) === null)

	const result = s.agentFails(10, r)
	const ids = result.impactedAgents.map((a) => a.id).sort()
	check('reaches direct and transitive dependents, excludes itself', ids.length === 2 && ids[0] === 11 && ids[1] === 12, ids)
	check('impactedPeople is empty for an agent scenario', result.impactedPeople.length === 0)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL with `s.agentFails is not a function`.

- [ ] **Step 3: Implement**

Append to `backend/domain/simulations.js`, after `employeeLeaves`:

```js
function agentFails(agentId, roots) {
  const agent = roots.agents.find((a) => a.id === agentId)
  if (!agent) return null

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set()
  for (const hit of cascadeFrom('agent', agentId, index)) {
    if (hit.type === 'agent') impactedAgentIds.add(hit.id)
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(new Set([agentId, ...impactedAgentIds]), roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  mutated.agents = mutated.agents.filter((a) => a.id !== agentId)
  recount(mutated)

  return {
    scenario: `If ${agent.name} fails`,
    targetType: 'agent',
    targetId: agentId,
    targetName: agent.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}
```

Add `agentFails` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add agentFails() with real transitive cascade"
```

---

### Task 5: `platformDown()`

**Files:**
- Modify: `backend/domain/simulations.js` (append)
- Modify: `backend/tests/simulations.unit.test.js` (append)

**Interfaces:**
- Produces: `platformDown(platformId, roots)` → same shape, `targetType: 'platform'`.

- [ ] **Step 1: Write the failing test**

```js
// ── platformDown ─────────────────────────────────────────────────────────────
console.log('\nplatformDown:')
{
	const r = roots({
		ai_platforms: [{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' }],
		agents: [
			{ id: 10, name: 'User1', status: 'active', risk: 'high', owner_id: 1 },
			{ id: 11, name: 'Downstream', status: 'active', risk: 'low', owner_id: 2 },
		],
		agent_platform: [{ id: 1, agent_id: 10, platform_id: 50 }],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
		],
	})

	check('unknown platform returns null', s.platformDown(999, r) === null)

	const result = s.platformDown(50, r)
	const ids = result.impactedAgents.map((a) => a.id).sort()
	check('reaches the agent on the platform AND its transitive dependent', ids.length === 2 && ids[0] === 10 && ids[1] === 11, ids)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL with `s.platformDown is not a function`.

- [ ] **Step 3: Implement**

Append to `backend/domain/simulations.js`, after `agentFails`:

```js
function platformDown(platformId, roots) {
  const platform = roots.ai_platforms.find((p) => p.id === platformId)
  if (!platform) return null

  const directAgentIds = new Set(
    roots.agent_platform.filter((ap) => ap.platform_id === platformId).map((ap) => ap.agent_id),
  )

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set(directAgentIds)
  for (const id of directAgentIds) {
    for (const hit of cascadeFrom('agent', id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  mutated.ai_platforms = mutated.ai_platforms.filter((p) => p.id !== platformId)
  recount(mutated)

  return {
    scenario: `If ${platform.name} goes down`,
    targetType: 'platform',
    targetId: platformId,
    targetName: platform.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}
```

Add `platformDown` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add platformDown() with real transitive cascade"
```

---

### Task 6: `workflowDisruption()`

**Files:**
- Modify: `backend/domain/simulations.js` (append)
- Modify: `backend/tests/simulations.unit.test.js` (append)

**Interfaces:**
- Produces: `workflowDisruption(workflowId, roots)` → same shape, `targetType: 'workflow'`,
  `impactedWorkflows` includes the target workflow itself plus any others sharing an impacted agent.

- [ ] **Step 1: Write the failing test**

```js
// ── workflowDisruption ───────────────────────────────────────────────────────
console.log('\nworkflowDisruption:')
{
	const r = roots({
		workflows: [
			{ id: 100, name: 'Release', status: 'active', risk: 'high' },
			{ id: 101, name: 'Hotfix', status: 'active', risk: 'critical' },
		],
		agents: [
			{ id: 10, name: 'Shared', status: 'active', risk: 'high', owner_id: 1 },
		],
		workflow_dependencies: [
			{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true },
			{ id: 2, workflow_id: 101, agent_id: 10, is_critical: false },
		],
	})

	check('unknown workflow returns null', s.workflowDisruption(999, r) === null)

	const result = s.workflowDisruption(100, r)
	const wfIds = result.impactedWorkflows.map((w) => w.id).sort()
	check('includes itself and the sibling workflow sharing the same agent', wfIds.length === 2 && wfIds[0] === 100 && wfIds[1] === 101, wfIds)
	check('the shared agent is impacted', result.impactedAgents.some((a) => a.id === 10))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL with `s.workflowDisruption is not a function`.

- [ ] **Step 3: Implement**

Append to `backend/domain/simulations.js`, after `platformDown`:

```js
function workflowDisruption(workflowId, roots) {
  const workflow = roots.workflows.find((w) => w.id === workflowId)
  if (!workflow) return null

  const directAgentIds = new Set(
    roots.workflow_dependencies.filter((wd) => wd.workflow_id === workflowId).map((wd) => wd.agent_id),
  )

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set(directAgentIds)
  for (const id of directAgentIds) {
    for (const hit of cascadeFrom('agent', id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const siblingWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const impactedWorkflows = [
    workflow,
    ...siblingWorkflows.filter((w) => w.id !== workflowId),
  ]
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  mutated.workflows = mutated.workflows.filter((w) => w.id !== workflowId)
  recount(mutated)

  return {
    scenario: `If ${workflow.name} is disrupted`,
    targetType: 'workflow',
    targetId: workflowId,
    targetName: workflow.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}
```

Add `workflowDisruption` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add workflowDisruption() with real transitive cascade"
```

---

### Task 7: `rankAllScenarios()`

**Files:**
- Modify: `backend/domain/simulations.js` (append)
- Modify: `backend/tests/simulations.unit.test.js` (append)

**Interfaces:**
- Consumes: `employeeLeaves`, `agentFails`, `platformDown` (Tasks 3-5), `entityCriticality`/`atOrAbove`
  from `definitions.js`.
- Produces: `rankAllScenarios(roots)` → `Array` of the scenario-function results, sorted by
  `healthDelta` descending (worst first), `null` results filtered out.

- [ ] **Step 1: Write the failing test**

```js
// ── rankAllScenarios ─────────────────────────────────────────────────────────
console.log('\nrankAllScenarios:')
{
	// knowledge_assets/owners/workflows populated so healthDelta is a real
	// number for every candidate (same evidence-gate reasoning as Task 2/3's
	// tests) — otherwise every entry's healthDelta is null and the sort-order
	// check below passes vacuously (JS coerces null >= null to true) without
	// actually exercising the sort.
	const r = roots({
		employees: [{ id: 1, name: 'Sarah', department: 'Eng' }],
		agents: [
			{ id: 10, name: 'Minor', status: 'active', risk: 'low', owner_id: 1 },
			{ id: 11, name: 'Critical', status: 'active', risk: 'critical', owner_id: 1 },
		],
		dependencies: [],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null }],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
	})

	const ranked = s.rankAllScenarios(r)
	check('returns a non-empty ranked list', Array.isArray(ranked) && ranked.length > 0, ranked.length)
	check('every entry has a real numeric healthDelta, not null', ranked.every((res) => typeof res.healthDelta === 'number'), ranked.map((x) => x.healthDelta))
	check('sorted worst-first by healthDelta', ranked.every((res, i) => i === 0 || ranked[i - 1].healthDelta >= res.healthDelta), ranked.map((x) => x.healthDelta))
	check('every entry has a severity', ranked.every((res) => ['low', 'medium', 'high', 'critical'].includes(res.severity)))
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulations.unit.test.js`
Expected: FAIL with `s.rankAllScenarios is not a function`.

- [ ] **Step 3: Implement**

Append to `backend/domain/simulations.js`, after `workflowDisruption`:

```js
/**
 * Every employee, every high/critical-criticality agent, and every
 * high/critical-criticality tool (ai_platforms row), ranked worst-first by
 * health impact. Criticality is entityCriticality() — never the raw,
 * disputed agents.risk column read directly.
 */
function rankAllScenarios(roots) {
  const results = []

  for (const employee of roots.employees) {
    const r = employeeLeaves(employee.id, roots)
    if (r) results.push(r)
  }

  for (const agent of roots.agents) {
    if (!atOrAbove(entityCriticality('agent', agent), 'high')) continue
    const r = agentFails(agent.id, roots)
    if (r) results.push(r)
  }

  for (const platform of roots.ai_platforms) {
    const criticality = entityCriticality('platform', platform, { knowledgeAssets: roots.knowledge_assets })
    if (!atOrAbove(criticality, 'high')) continue
    const r = platformDown(platform.id, roots)
    if (r) results.push(r)
  }

  results.sort((a, b) => (b.healthDelta ?? -Infinity) - (a.healthDelta ?? -Infinity))
  return results
}
```

Add `rankAllScenarios` to `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulations.unit.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/domain/simulations.js backend/tests/simulations.unit.test.js
git commit -m "feat(W-I): add rankAllScenarios() for the bulk simulation endpoint"
```

---

### Task 8: Expose `domain.simulations` from the domain layer

**Files:**
- Modify: `backend/domain/index.js`

**Interfaces:**
- Produces: `domain.simulations.employeeLeaves`, `.agentFails`, `.platformDown`, `.workflowDisruption`,
  `.rankAllScenarios`, `.loadRoots` (re-export of `derived.loadRoots`, so routes don't need to
  `require('./derived')` directly for this).

- [ ] **Step 1: Write the failing test**

There's no dedicated test file for `domain/index.js`'s wiring in this codebase (it's exercised
end-to-end by the route tests in Task 9). Skip straight to implementation; Task 9's route test is
this step's verification.

- [ ] **Step 2: Implement**

In `backend/domain/index.js`, add a `require` near the top (after the existing `const derived =
require('./derived')`):

```js
const simulations = require('./simulations')
```

Add a new top-level key to the exported object, after the existing `intelligence: {...}` block (before
the closing `}` of `module.exports`):

```js
  // ─── Simulation (cascade reach, severity, health impact) ───
  simulations: {
    loadRoots: () => derived.loadRoots(requireSupabase()),
    employeeLeaves: simulations.employeeLeaves,
    agentFails: simulations.agentFails,
    platformDown: simulations.platformDown,
    workflowDisruption: simulations.workflowDisruption,
    rankAllScenarios: simulations.rankAllScenarios,
  },
```

- [ ] **Step 3: Verify by running the full backend suite**

Run (from `backend/`): `node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED` (this change is additive; nothing existing should break — if
anything fails, the `require('./simulations')` path or export shape has a typo).

- [ ] **Step 4: Commit**

```bash
git add backend/domain/index.js
git commit -m "feat(W-I): expose domain.simulations from the domain layer"
```

---

### Task 9: Rewrite the 4 existing routes to be thin

**Files:**
- Modify: `backend/routes/simulations/employeeLeaves.js`
- Modify: `backend/routes/simulations/agentFails.js`
- Modify: `backend/routes/simulations/platformDown.js`
- Modify: `backend/routes/simulations/workflowDisruption.js`
- Test: `backend/tests/simulationRoutes.test.js` (new)

**Interfaces:**
- Consumes: `domain.simulations.*` (Task 8), `domain.simulations.loadRoots()`.
- Produces: same JSON shape as today (`scenario`, `impactedAgents`, `impactedWorkflows`,
  `impactedPeople`, `healthBefore`, `healthAfter`, `riskLevel`) plus new additive fields
  (`severity`, `healthDelta`).

This codebase's HTTP-level tests stub Supabase rather than hitting a real database — follow
`backend/tests/graphRoutes.test.js`'s stubbing pattern. Read that file first if the stub shape below is
unclear; it is the established precedent for testing a route without a live database.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/simulationRoutes.test.js`. This follows `backend/tests/graphRoutes.test.js`'s
established stubbing pattern exactly — `require.resolve()` the real module's path, then overwrite
`require.cache[path]` with a fake `exports` **before** requiring anything that transitively requires
it. Read `graphRoutes.test.js` first if this is unfamiliar; do not invent a different mocking
mechanism (no `Module._resolveFilename` patching, no writing temp files to disk):

```js
/*
 * OBA Core — Simulation routes HTTP-level test.
 * Stubs Supabase so this runs offline, same require.cache pattern as
 * graphRoutes.test.js.
 * Run from backend/:  node tests/simulationRoutes.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── Fake supabase — domain.simulations.loadRoots() reads every root table
// from this fixture instead of a real database ──────────────────────────────
const FIXTURE_ROOTS = {
	employees: [{ id: 1, name: 'Sarah', department: 'Eng' }],
	agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
	owners: [],
	workflows: [],
	workflow_failures: [],
	workflow_runbooks: [],
	dependencies: [],
	knowledge_assets: [],
	tool_users: [],
	employee_agent: [],
	ai_platforms: [{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' }],
	tool_policies: [],
	policy_violations: [],
	tool_ownership: [],
	accountability_entities: [],
	accountability_links: [],
	truth_claims: [],
	decision_history: [],
	agent_platform: [],
	workflow_dependencies: [],
}

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath,
	filename: supabasePath,
	loaded: true,
	exports: {
		from: (table) => ({
			select: () => Promise.resolve({ data: FIXTURE_ROOTS[table] || [], error: null }),
		}),
	},
}

const express = require('express')
const employeeLeavesRoute = require('../routes/simulations/employeeLeaves')
const agentFailsRoute = require('../routes/simulations/agentFails')

const app = express()
app.use('/api/simulations/employee-leaves', employeeLeavesRoute)
app.use('/api/simulations/agent-fails', agentFailsRoute)

const server = app.listen(0, async () => {
	const port = server.address().port
	const base = `http://localhost:${port}`

	const r1 = await fetch(`${base}/api/simulations/employee-leaves/Sarah`)
	const j1 = await r1.json()
	check('employee-leaves 200s for a known name', r1.status === 200, r1.status)
	check('response has the legacy field names', 'impactedAgents' in j1 && 'healthBefore' in j1 && 'riskLevel' in j1, Object.keys(j1))
	check('response additionally carries healthDelta', 'healthDelta' in j1, Object.keys(j1))

	const r2 = await fetch(`${base}/api/simulations/agent-fails/NoSuchAgent`)
	check('agent-fails 404s for an unknown name', r2.status === 404, r2.status)

	console.log('\n========================================')
	console.log(`${passed} passed, ${failed} failed`)
	console.log('========================================\n')
	server.close(() => process.exit(failed === 0 ? 0 : 1))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulationRoutes.test.js`
Expected: FAIL — the routes still query the real `../../supabase` module for `ilike`/`.maybeSingle()`
calls the stub doesn't implement, so this errors out rather than returning the expected shape.

- [ ] **Step 3: Implement**

Rewrite `backend/routes/simulations/employeeLeaves.js`:

```js
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'employee-leaves',
      hint: 'Call /api/simulations/employee-leaves/{name} to run a scenario',
      available: roots.employees.map((e) => ({ id: e.id, name: e.name, role: e.role, department: e.department })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:employee', async (req, res) => {
  try {
    const { employee } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.employees.find((e) => e.name.toLowerCase() === employee.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Employee not found' })

    const result = domain.simulations.employeeLeaves(target.id, roots)
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: 'stable',
      healthAfter: result.severity === 'critical' ? 'critical' : result.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
```

Rewrite `backend/routes/simulations/agentFails.js` (same shape, agent-flavored):

```js
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'agent-fails',
      hint: 'Call /api/simulations/agent-fails/{name} to run a scenario',
      available: roots.agents.map((a) => ({ id: a.id, name: a.name, status: a.status, risk: a.risk })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:agent', async (req, res) => {
  try {
    const { agent } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.agents.find((a) => a.name.toLowerCase() === agent.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Agent not found' })

    const result = domain.simulations.agentFails(target.id, roots)
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: 'stable',
      healthAfter: result.severity === 'critical' ? 'critical' : result.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
```

Rewrite `backend/routes/simulations/platformDown.js`:

```js
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'platform-down',
      hint: 'Call /api/simulations/platform-down/{name} to run a scenario',
      available: roots.ai_platforms.map((p) => ({ id: p.id, name: p.name, type: p.type, status: p.status })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.ai_platforms.find((p) => p.name.toLowerCase() === platform.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Platform not found' })

    const result = domain.simulations.platformDown(target.id, roots)
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: 'stable',
      healthAfter: result.severity === 'critical' ? 'critical' : result.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
```

Rewrite `backend/routes/simulations/workflowDisruption.js`:

```js
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'workflow-disruption',
      hint: 'Call /api/simulations/workflow-disruption/{name} to run a scenario',
      available: roots.workflows.map((w) => ({ id: w.id, name: w.name, status: w.status, risk: w.risk, department: w.department })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:workflow', async (req, res) => {
  try {
    const { workflow } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.workflows.find((w) => w.name.toLowerCase() === workflow.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Workflow not found' })

    const result = domain.simulations.workflowDisruption(target.id, roots)
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: 'stable',
      healthAfter: result.severity === 'critical' ? 'critical' : result.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
```

`loadRoots` itself is not memoized (only `derived.js`'s separate `computeAllCached` wrapper is, via
`MEMO_TTL_MS`) — `domain.simulations.loadRoots()` re-reads the stub fresh on every call, so no
cache-busting is needed between the two requests this test makes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulationRoutes.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Run the full suite**

Run: `node tests/run-all.js` — note this new test file is not yet registered (Task 11 does that); run
it directly for now: `node tests/simulationRoutes.test.js` and `node tests/simulations.unit.test.js`
and `node tests/derived.unit.test.js` together to confirm no regressions among the files this task
touched.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/simulations/employeeLeaves.js backend/routes/simulations/agentFails.js backend/routes/simulations/platformDown.js backend/routes/simulations/workflowDisruption.js backend/tests/simulationRoutes.test.js
git commit -m "feat(W-I): rewrite the 4 simulation routes to delegate to domain.simulations, same response shape"
```

---

### Task 10: New bulk endpoint `GET /api/simulations/rank`

**Files:**
- Create: `backend/routes/simulations/rank.js`
- Modify: `backend/index.js` (mount the new route)
- Modify: `backend/tests/simulationRoutes.test.js` (append)

**Interfaces:**
- Consumes: `domain.simulations.loadRoots()`, `domain.simulations.rankAllScenarios()`.
- Produces: `GET /api/simulations/rank` → `{ scenarios: Array<ScenarioResult> }`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/simulationRoutes.test.js`, inside the `app.listen` callback, before the final
`console.log`:

```js
	const r3 = await fetch(`${base}/api/simulations/rank`)
	const j3 = await r3.json()
	check('rank 200s', r3.status === 200, r3.status)
	check('rank returns a scenarios array', Array.isArray(j3.scenarios), j3)
```

And register the new route on the test's local `app` (add alongside the other two `app.use(...)` calls
near the top):

```js
const rankRoute = require('../routes/simulations/rank')
// ...
app.use('/api/simulations/rank', rankRoute)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/simulationRoutes.test.js`
Expected: FAIL with `Cannot find module '../routes/simulations/rank'`.

- [ ] **Step 3: Implement**

Create `backend/routes/simulations/rank.js`:

```js
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const scenarios = domain.simulations.rankAllScenarios(roots)
    res.json({ scenarios })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
```

In `backend/index.js`, add the mount line immediately after the existing four (around line 86):

```js
app.use('/api/simulations/employee-leaves', require('./routes/simulations/employeeLeaves'))
app.use('/api/simulations/agent-fails',     require('./routes/simulations/agentFails'))
app.use('/api/simulations/platform-down',   require('./routes/simulations/platformDown'))
app.use('/api/simulations/workflow-disruption', require('./routes/simulations/workflowDisruption'))
app.use('/api/simulations/rank',            require('./routes/simulations/rank'))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/simulationRoutes.test.js`
Expected: `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add backend/routes/simulations/rank.js backend/index.js backend/tests/simulationRoutes.test.js
git commit -m "feat(W-I): add GET /api/simulations/rank bulk endpoint"
```

---

### Task 11: Register the new test files in the suite runner

**Files:**
- Modify: `backend/tests/run-all.js`

- [ ] **Step 1: Implement**

In `backend/tests/run-all.js`, add the two new files to the `tests` array (insert after
`'derived.unit.test.js'`):

```js
	'derived.unit.test.js', // pure; asserts the derived-intelligence definitions
	'simulations.unit.test.js', // pure; asserts cascade/severity/health-delta (W-I)
	'definitions.unit.test.js', // pure; asserts the canonical criticality/SPOF definitions
	'routeEvidence.unit.test.js', // pure; asserts evidence gating in routes outside derived.js
	'authRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline
	'graphRoutes.test.js', // HTTP-level; stubs brain, so it runs offline
	'simulationRoutes.test.js', // HTTP-level; stubs Supabase, so it runs offline (W-I)
```

- [ ] **Step 2: Run the full suite**

Run: `node tests/run-all.js`
Expected: `ALL TEST SUITES PASSED`, with `simulations.unit.test.js` and `simulationRoutes.test.js`
both shown running in the output.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/run-all.js
git commit -m "test(W-I): register simulations.unit.test.js and simulationRoutes.test.js in run-all.js"
```

---

### Task 12: Frontend — repoint the bulk-ranking views

**Files:**
- Modify: `frontend/app/simulation/page.tsx`
- Modify: `frontend/components/simulation/SimulationDashboard.tsx`
- Modify: `frontend/components/simulation/SimulationUniverseRanking.tsx`

**Interfaces:**
- Consumes: `GET /api/simulations/rank` (Task 10) → `{ scenarios: ScenarioResult[] }`, matching the
  existing `ScenarioResult` shape from `frontend/lib/simulation.ts` closely enough that
  `ScenarioRanking.tsx`/`ImpactSummary.tsx` need no changes (both only consume the type, not the
  computation).

This task is manually verified in the browser (per the design doc's testing plan), not unit-tested —
there is no existing frontend test harness for this component tree to extend.

- [ ] **Step 1: Fetch the ranked list once in `page.tsx`**

In `frontend/app/simulation/page.tsx`, add a new state variable near the top (after
`const [error, setError] = useState<string | null>(null);`):

```tsx
  const [scenarios, setScenarios] = useState<any[]>([]);
```

Add a fourth fetch to the existing `Promise.all` (after the `tools` fetch):

```tsx
    Promise.all([
      fetch(`${base}/api/agents`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load agents');
        return r.json();
      }),
      fetch(`${base}/api/dependencies`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load dependencies');
        return r.json();
      }),
      fetch(`${base}/api/tools`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load tools');
        return r.json();
      }),
      fetch(`${base}/api/simulations/rank`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load simulation ranking');
        return r.json();
      })
    ])
    .then(([agentsData, depsData, toolsData, rankData]) => {
```

(Keep the existing body of the `.then()` unchanged, just add one line before the closing of that
block:)

```tsx
      setAgents(mappedAgents);
      setDependencies(mappedDeps);
      setTools(mappedTools);
      setScenarios(Array.isArray(rankData.scenarios) ? rankData.scenarios : []);
```

Pass `scenarios` down to both consumers, replacing their existing `agents`/`dependencies`/`tools` props
with the fetched ranking:

```tsx
        <SimulationDashboard
          scenarios={scenarios}
        />
```

```tsx
        <SimulationUniverseRanking
          scenarios={scenarios}
        />
```

- [ ] **Step 2: Update `SimulationDashboard.tsx` to consume the prop instead of computing it**

In `frontend/components/simulation/SimulationDashboard.tsx`, replace the import and prop handling:

```tsx
import { ScenarioResult } from '../../lib/simulation';
```

(remove the `rankScenarios` import — it no longer exists after Task 13's cleanup, but removing the
import now avoids a dead import in the meantime)

```tsx
interface Props {
  scenarios: ScenarioResult[];
}

export function SimulationDashboard({ scenarios }: Props) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const baselineHealthScore = useMemo(
    () => (scenarios[0] ? scenarios[0].baselineHealthScore : 0),
    [scenarios]
  );
```

Remove the old `const scenarios = useMemo(() => rankScenarios(...), ...)` block entirely — `scenarios`
is now the prop, not a local computation. Everything below that (worstScenario, activeScenario, KPI
counts, JSX) is unchanged, since it already reads from the `scenarios` variable by name.

- [ ] **Step 3: Update `SimulationUniverseRanking.tsx` the same way**

Read the file first to confirm its current prop shape and internal `rankScenarios`/`useMemo` call —
apply the identical transformation as Step 2: replace its `agents`/`dependencies`/`tools` props with a
single `scenarios: ScenarioResult[]` prop, remove its internal `rankScenarios()` call, and read from the
prop directly.

- [ ] **Step 4: Manual verification**

Start the frontend dev server, navigate to `/simulation`, and confirm:
- The page loads without console errors.
- `SimulationDashboard`'s ranked list and `SimulationUniverseRanking`'s full list both render and show
  the same top-ranked scenario.
- Selecting a scenario in `SimulationDashboard` still shows its `ImpactSummary` detail correctly.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/simulation/page.tsx frontend/components/simulation/SimulationDashboard.tsx frontend/components/simulation/SimulationUniverseRanking.tsx
git commit -m "feat(W-I): repoint SimulationDashboard + SimulationUniverseRanking to /api/simulations/rank"
```

---

### Task 13: Frontend — repoint `ScenarioSandbox` and clean up `lib/simulation.ts`

**Files:**
- Modify: `frontend/components/simulation/ScenarioSandbox.tsx`
- Modify: `frontend/lib/simulation.ts`

**Interfaces:**
- Consumes: `GET /api/simulations/employee-leaves/:name`, `/agent-fails/:name`, `/platform-down/:name`
  (Task 9), called on button press rather than on page load.
- Produces: `lib/simulation.ts` exports only `ScenarioResult`, `ScenarioType` (types), matching the
  precedent already set by `lib/decisionIntelligence.ts`.

- [ ] **Step 1: Read the full current file**

Read `frontend/components/simulation/ScenarioSandbox.tsx` in full (only its first 40 lines were seen
during planning) to see exactly how `simulatePersonLeaving`/`simulateAgentFailing`/
`simulateToolUnavailable` are invoked today — in particular how it currently picks *which* person/
agent/tool to target (via `deriveRisk`/`getSPOFs` from `lib/risk.ts`/`lib/graph.ts`), since that
targeting logic is explicitly staying client-side per the design doc and must not be accidentally
removed.

- [ ] **Step 2: Replace each `simulate*` call with a fetch to the matching route**

For the "Stress Test" (`PERSON_LEAVES`) button handler, replace the `simulatePersonLeaving(...)` call
with:

```tsx
const res = await fetch(`${base}/api/simulations/employee-leaves/${encodeURIComponent(targetName)}`, { headers: authHeader() });
const result = await res.json();
```

(using whatever `base`/`authHeader` pattern the rest of `frontend/app/simulation/page.tsx` already
uses — pass `base` down as a prop from `page.tsx`, or import `authHeader` from `../../lib/authFetch`
directly, matching how `page.tsx` does it.)

Apply the same transformation for `simulateAgentFailing` → `/api/simulations/agent-fails/:name` and
`simulateToolUnavailable` → `/api/simulations/platform-down/:name`.

- [ ] **Step 3: Update `lib/simulation.ts` to be types-only**

Replace the entire contents of `frontend/lib/simulation.ts` with just the type/interface
declarations already at the top of the file today:

```ts
import { Agent, Dependency, AITool, RiskLevel } from '../types';

export interface SimulatedAgent extends Agent {
  _simulation_override?: number;
  _simulation_penalty?: number;
  _baseline_risk_level?: RiskLevel;
  _baseline_risk_score?: number;
}

export type ScenarioType = 'PERSON_LEAVES' | 'AGENT_FAILS' | 'TOOL_UNAVAILABLE';

export interface ScenarioResult {
  id: string;
  type: ScenarioType;
  targetId: string;
  targetName: string;
  typeLabel: string;
  baselineHealthScore: number;
  simulatedHealthScore: number;
  healthScoreDelta: number;
  impactedAgents: {
    agentId: string;
    agentName: string;
    beforeRisk: RiskLevel;
    afterRisk: RiskLevel;
    reason: string;
  }[];
  impactedWorkflowNames?: string[];
  simulatedAgents: SimulatedAgent[];
}
```

(Remove every function — `simulatePersonLeaving`, `simulateAgentFailing`, `simulateToolUnavailable`,
`rankScenarios` — and their imports of `calculateHealthScore`/`deriveRisk`/`deriveRiskScore`/
`getDownstream`/`getSPOFs`, since nothing calls them anymore after Task 12 and this task's Step 2.)

- [ ] **Step 4: Search for any remaining importers of the removed functions**

Run: `grep -rn "simulatePersonLeaving\|simulateAgentFailing\|simulateToolUnavailable\|rankScenarios" frontend/ --include="*.tsx" --include="*.ts"`
Expected: no matches. If any remain, that consumer was missed during planning — read it and repoint it
the same way as Task 12/this task did, before proceeding.

- [ ] **Step 5: Manual verification**

In the running dev server, on `/simulation`, click each of the three `ScenarioSandbox` buttons ("Stress
Test", "Node Outage", "Data Breach") and confirm each produces a result (not a console error / 404).

- [ ] **Step 6: Commit**

```bash
git add frontend/components/simulation/ScenarioSandbox.tsx frontend/lib/simulation.ts
git commit -m "feat(W-I): repoint ScenarioSandbox to backend routes, reduce lib/simulation.ts to types only"
```

---

## Plan Self-Review Notes

- **Spec coverage:** §2.1 → Task 1. §2.2 → Task 1. §2.3 → Task 2 (`severityFor`). §2.4 → Task 2
  (`healthDelta`). §2.5 → Tasks 2-7. §2.6 → Tasks 8-10. §2.7 → Tasks 12-13. Testing plan → Tasks 1-11
  (unit + route tests) and Tasks 12-13 (manual browser verification, since no frontend test harness
  exists in this repo to extend).
- **Known follow-up, explicitly not in this plan:** the `predictiveRisk()`/`filterRootsByDepartment()`
  `owner_id`/`owners.id` join bug (decision log, Deferred list) — do not fix it while touching
  `derived.js` in Task 1; that task's diff is additive-only (exports + two root tables).
- **Type consistency check:** `employeeLeaves`/`agentFails`/`platformDown`/`workflowDisruption` all
  return the same shape (`scenario, targetType, targetId, targetName, impactedAgents,
  impactedWorkflows, impactedPeople, severity, healthDelta`) — verified consistent across Tasks 3-6 so
  `rankAllScenarios` (Task 7) and the route handlers (Task 9) can treat all four uniformly.
