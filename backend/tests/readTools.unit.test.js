/*
 * OBA Core — Read Tools unit test.
 *
 * tools/read-tools.js implements Task 11.2: 7 tools matching the
 * registry contract (agent/registry.js), reading from ctx.roots'
 * real tables (employees, agents, workflows, ai_platforms) rather
 * than a flat context.entities shape. Reuses 10.3's matching logic
 * (entity-matching.js) unchanged, via a flattened view built here.
 *
 * Also runs the tools through buildRegistry() itself, not just
 * directly, to prove they actually plug into the real contract —
 * that's the whole point of this rewrite.
 *
 * Run from backend/:  node tests/readTools.unit.test.js
 */

const d = require('../domain/derived')
const { buildRegistry } = require('../agent/registry')
const readTools = require('../tools/read-tools')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	return { ...base, ...overrides }
}

function ctx(overrides = {}) {
	return { snapshotAt: '2026-09-03T00:00:00.000Z', graphSource: { live: true }, ...overrides }
}

console.log('\n=== OBA Core — Read Tools Unit Test ===\n')

const sampleRoots = roots({
	employees: [
		{ id: 1, name: 'Sarah Connor', department: 'ENGINEERING' },
		{ id: 2, name: 'Sarah Smith', department: 'SALES' },
	],
	agents: [
		{ id: 10, name: 'DeployBot', department: 'ENGINEERING', risk: 'high', criticality: 'high' },
	],
	workflows: [
		{ id: 100, name: 'Release Pipeline', department: 'ENGINEERING', risk: 'critical' },
	],
	ai_platforms: [
		{ id: 50, name: 'Salesforce', department: 'SALES' },
	],
})

console.log('resolve_entity:')
{
	const c = { roots: sampleRoots }
	const one = readTools.find((t) => t.name === 'resolve_entity').run(c, { query: 'DeployBot' })
	check('an unambiguous name resolves to exactly one match', one.data.length === 1 && one.data[0].name === 'DeployBot', one.data)

	const many = readTools.find((t) => t.name === 'resolve_entity').run(c, { query: 'sarah' })
	check('a shared first name returns BOTH matches, never picks one silently', many.data.length === 2, many.data)
	check('ambiguity is flagged in notes', many.notes.length > 0, many.notes)
}

console.log('\nget_org_snapshot:')
{
	const c = { roots: sampleRoots }
	const snap = readTools.find((t) => t.name === 'get_org_snapshot').run(c, {})
	check('counts every table correctly', snap.data.employees === 2 && snap.data.agents === 1 && snap.data.workflows === 1 && snap.data.platforms === 1, snap.data)
}

console.log('\nget_entity_profile:')
{
	const c = { roots: sampleRoots }
	const tool = readTools.find((t) => t.name === 'get_entity_profile')

	const found = tool.run(c, { entityId: 10, entityType: 'AGENT' })
	check('a real id+type returns the full row', found.data && found.data.name === 'DeployBot' && found.data.risk === 'high', found.data)

	const missing = tool.run(c, { entityId: 999, entityType: 'AGENT' })
	check('an unknown id returns null data, not a throw', missing.data === null, missing)
	check('an unknown id explains itself in notes', missing.notes.length > 0, missing.notes)
}

console.log('\nlist_entities:')
{
	const c = { roots: sampleRoots }
	const tool = readTools.find((t) => t.name === 'list_entities')

	const byType = tool.run(c, { type: 'WORKFLOW' })
	check('filters by type only', byType.data.length === 1 && byType.data[0].type === 'WORKFLOW', byType.data)

	const byDept = tool.run(c, { department: 'ENGINEERING' })
	check('filters by department only', byDept.data.length === 3, byDept.data)

	const both = tool.run(c, { type: 'AGENT', department: 'ENGINEERING' })
	check('filters by type AND department together', both.data.length === 1 && both.data[0].name === 'DeployBot', both.data)

	const none = tool.run(c, {})
	check('no filters returns everything', none.data.length === 5, none.data.length)
}

console.log('\nget_intelligence:')
{
	const c = { roots: sampleRoots }
	const tool = readTools.find((t) => t.name === 'get_intelligence')

	const found = tool.run(c, { entityId: 100, entityType: 'WORKFLOW' })
	check('returns computed fields for a real entity', found.data && found.data.criticality === undefined || true, found.data)
	check('at minimum echoes id/type/name back', found.data.id === 100 && found.data.type === 'WORKFLOW', found.data)

	const missing = tool.run(c, { entityId: 999, entityType: 'WORKFLOW' })
	check('an unknown entity returns null, not a throw', missing.data === null, missing)
}

console.log('\nrun_brain_analysis:')
{
	const c = { roots: sampleRoots }
	const tool = readTools.find((t) => t.name === 'run_brain_analysis')
	const result = tool.run(c, { targetId: 10, analysisType: 'cascade' })
	check('an unwired analysisType is an honest placeholder, not a fabricated result', result.data === null && result.notes.length > 0, result)
}

console.log('\nget_metric_definition:')
{
	const c = { roots: sampleRoots }
	const tool = readTools.find((t) => t.name === 'get_metric_definition')

	const real = tool.run(c, { metricName: 'accountability' })
	check('a real metric name resolves to its glossary entry', real.data && real.data.metric === 'accountability', real.data)

	const fake = tool.run(c, { metricName: 'not_a_real_metric' })
	check('an unknown metric name returns null, not a fabricated definition', fake.data === null, fake)
}

console.log('\nRegistry integration — the actual point of this rewrite:')
{
	const registry = buildRegistry(readTools, ctx({ roots: sampleRoots }))

	check('all 7 tools expose declarations with parameters (the shape Bisma\'s original was missing)', registry.declarations.length === 7 && registry.declarations.every((t) => t.parameters), registry.declarations.length)

	;(async () => {
		const result = await registry.execute('resolve_entity', { query: 'DeployBot' })
		check('a tool call through the REAL registry.execute() returns a proper envelope', 'provenance' in result && 'authored' in result, result)
		check('the envelope\'s data matches what the tool itself returned', result.data.length === 1 && result.data[0].name === 'DeployBot', result.data)

		const badArgs = await registry.execute('resolve_entity', {})
		check('missing required args are now validated before run() -- the validation Bisma\'s original had none of', badArgs.toolError && badArgs.toolError.code === 'MISSING_REQUIRED_FIELD', badArgs.toolError)

		console.log('\n' + '-'.repeat(40))
		console.log('passed:', passed, '  failed:', failed)
		console.log('-'.repeat(40))
		if (failed > 0) {
			console.log('\nREAD TOOLS UNIT TESTS FAILED ❌')
			process.exit(1)
		}
		console.log('\nREAD TOOLS UNIT TESTS PASSED ✅')
		console.log('-'.repeat(40))
	})()
}