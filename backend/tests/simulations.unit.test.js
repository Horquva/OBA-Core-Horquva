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
