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

// ── rankAllScenarios ─────────────────────────────────────────────────────────
console.log('\nrankAllScenarios:')
{
	// knowledge_assets/owners/workflows populated so healthDelta is a real
	// number for every candidate (same evidence-gate reasoning as Task 2/3's
	// tests) — otherwise every entry's healthDelta is null and the sort-order
	// check below passes vacuously (JS coerces null >= null to true) without
	// actually exercising the sort.
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Bob', department: 'Ops' },
		],
		agents: [
			{ id: 10, name: 'Minor', status: 'active', risk: 'low', owner_id: 1 },
			{ id: 11, name: 'Critical', status: 'active', risk: 'critical', owner_id: 2 },
		],
		dependencies: [],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: 'Bob' },
			{ id: 2, name: 'Bob', employee_id: 2, backup_owner: null },
		],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
		workflow_runbooks: [],
		workflow_failures: [],
	})

	const ranked = s.rankAllScenarios(r)
	check('returns a non-empty ranked list', Array.isArray(ranked) && ranked.length > 0, ranked.length)
	check('every entry has a real numeric healthDelta, not null', ranked.every((res) => typeof res.healthDelta === 'number'), ranked.map((x) => x.healthDelta))
	check('sorted worst-first by healthDelta', ranked.every((res, i) => i === 0 || ranked[i - 1].healthDelta >= res.healthDelta), ranked.map((x) => x.healthDelta))
	check('every entry has a severity', ranked.every((res) => ['low', 'medium', 'high', 'critical'].includes(res.severity)))
}

console.log('\n========================================')
console.log(`${passed} passed, ${failed} failed`)
console.log('========================================\n')
process.exit(failed === 0 ? 0 : 1)
