/*
 * OBA Core — Simulation Tools unit test.
 *
 * tools/simulation-tools.js implements Task 11.3: run_simulation,
 * rank_scenarios, compare_scenarios, thin wrappers around
 * domain/simulations.js. compare_scenarios must compute its own diff
 * (Invariant I-3 — the model never subtracts numbers itself).
 *
 * NOTE: these tools read ctx.roots, per this file's own header comment.
 * That property name is still a working assumption pending 11.6 landing
 * for real (see the discrepancy between the code comment, which says
 * "confirmed", and the author's own written report, which says
 * "adopted as the working assumption" — worth resolving with him).
 * If 11.6 lands under a different ctx property, update `ctx.roots`
 * below and in simulation-tools.js together.
 *
 * Run from backend/:  node tests/simulation-tools.unit.test.js
 */

const d = require('../domain/derived')
const [runSimulationTool, rankScenariosTool, compareScenariosTool] = require('../tools/simulation-tools')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// Same roots() builder as simulations.unit.test.js, so this fixture
// exercises the real domain functions underneath, not a stub.
function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

console.log('\n=== OBA Core — Simulation Tools Unit Test ===\n')

console.log('run_simulation:')
{
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
	const ctx = { roots: r }

	const ok = runSimulationTool.run(ctx, { scenario: 'employee_leaves', targetId: 1 })
	check('a valid single-scenario run returns data', ok.data !== null, ok)
	check('the wrapped scenario names the right employee', ok.data.scenario === 'If Sarah leaves', ok.data.scenario)
	check('healthDelta comes through as a number', typeof ok.data.healthDelta === 'number', ok.data.healthDelta)

	const badId = runSimulationTool.run(ctx, { scenario: 'employee_leaves', targetId: 999 })
	check('an unresolvable target id returns null data, not a throw', badId.data === null, badId)
	check('an unresolvable target id explains itself in notes', badId.notes.length > 0 && badId.notes[0].includes('999'), badId.notes)
}

console.log('\nrank_scenarios:')
{
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
	})
	const ctx = { roots: r }

	const all = rankScenariosTool.run(ctx, {})
	check('ranked-list output is a non-empty array', Array.isArray(all.data) && all.data.length > 0, all.data && all.data.length)

	const limited = rankScenariosTool.run(ctx, { limit: 1 })
	check('a limit trims the ranked output', limited.data.length === 1, limited.data.length)
}

console.log('\ncompare_scenarios:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Bob', department: 'Ops' },
		],
		agents: [
			{ id: 10, name: 'Shared', status: 'active', risk: 'high', owner_id: 1 },
			{ id: 11, name: 'OnlyUnderSarah', status: 'active', risk: 'high', owner_id: 1 },
		],
		dependencies: [],
	})
	const ctx = { roots: r }

	const cmp = compareScenariosTool.run(ctx, {
		scenarioA: { scenario: 'employee_leaves', targetId: 1 },
		scenarioB: { scenario: 'employee_leaves', targetId: 2 },
	})
	check('a two-scenario comparison returns both scenario results', cmp.data.scenarioA && cmp.data.scenarioB, cmp.data)
	check('overlap calculation is present for agents', cmp.data.agentsOverlap && Array.isArray(cmp.data.agentsOverlap.intersection), cmp.data.agentsOverlap)
	check('the model is never asked to subtract -- healthDeltaDifference is pre-computed', 'healthDeltaDifference' in cmp.data, cmp.data)

	const badCmp = compareScenariosTool.run(ctx, {
		scenarioA: { scenario: 'employee_leaves', targetId: 999 },
		scenarioB: { scenario: 'employee_leaves', targetId: 2 },
	})
	check('an unresolvable target within a comparison returns null data', badCmp.data === null, badCmp)
	check('an unresolvable target within a comparison explains which side failed', badCmp.notes.some((n) => n.includes('Scenario A')), badCmp.notes)
}

console.log('\nKnown open gap (matches the author\'s own todo):')
{
	console.log('  ⧗ a genuinely null healthDelta feeding into compare_scenarios -- not asserted here either, same as the author\'s test.todo(). Left as an explicit, visible gap.')
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nSIMULATION TOOLS UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nSIMULATION TOOLS UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))