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
	const merged = { ...base, ...overrides }
	// loadRoots() always attaches this; computeAllFromRoots() reads it
	// (derived.js:255), so a hand-built fixture needs it too.
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

function ctx(overrides = {}) {
	return { snapshotAt: '2026-09-03T00:00:00.000Z', graphSource: { live: true }, ...overrides }
}

console.log('\n=== OBA Core — Read Tools Unit Test ===\n')

// Shaped to the REAL sql/01_schema_migration.sql columns, not to whatever
// a tool happened to read. agents/ai_platforms have no `department` or
// `criticality` column of their own — those are derived (owner's
// department; entityCriticality()'s own `risk` read) — and platforms have
// no `risk`/`criticality` column at all. Getting this fixture right is the
// whole point: the original version invented `department`/`criticality`
// fields that don't exist in production, which is exactly what let the
// read-tools bugs this fixture now catches ship with a green test suite.
const sampleRoots = roots({
	employees: [
		{ id: 1, name: 'Sarah Connor', department: 'ENGINEERING' },
		{ id: 2, name: 'Sarah Smith', department: 'SALES' },
	],
	agents: [
		{ id: 10, name: 'DeployBot', risk: 'high', owner_id: 1 },
	],
	workflows: [
		{ id: 100, name: 'Release Pipeline', department: 'ENGINEERING', risk: 'critical' },
	],
	ai_platforms: [
		{ id: 50, name: 'Salesforce' },
	],
	// Sarah Connor (emp 1) owns DeployBot with no named backup, so DeployBot
	// (risk 'high') is a real SPOF: sole owner, no backup, criticality >= high.
	owners: [
		{ id: 1, employee_id: 1, name: 'Sarah Connor', backup_owner: null },
	],
	// Salesforce is used by Sarah Smith (emp 2, SALES) — this is how a
	// platform's department is actually derived (ownedAssetBase's
	// platformDepts, built from tool_users, not a raw column).
	tool_users: [
		{ employee_id: 2, platform_id: 50, usage_level: 'regular' },
	],
})

// The real pipeline every live turn runs: one roots read, one derive.
// Hand-mocking `intel` risks drifting from what computeAllFromRoots()
// actually produces — the same mistake this whole fix pass is about.
const sampleIntel = d.computeAllFromRoots(sampleRoots)

console.log('resolve_entity:')
{
	const c = { roots: sampleRoots, intel: sampleIntel }
	const one = readTools.find((t) => t.name === 'resolve_entity').run(c, { query: 'DeployBot' })
	check('an unambiguous name resolves to exactly one match', one.data.length === 1 && one.data[0].name === 'DeployBot', one.data)

	const many = readTools.find((t) => t.name === 'resolve_entity').run(c, { query: 'sarah' })
	check('a shared first name returns BOTH matches, never picks one silently', many.data.length === 2, many.data)
	check('ambiguity is flagged in notes', many.notes.length > 0, many.notes)
}

console.log('\nget_org_snapshot:')
{
	const c = { roots: sampleRoots, intel: sampleIntel }
	const snap = readTools.find((t) => t.name === 'get_org_snapshot').run(c, {})
	check('counts every table correctly', snap.data.employees === 2 && snap.data.agents === 1 && snap.data.workflows === 1 && snap.data.platforms === 1, snap.data)
}

console.log('\nget_entity_profile:')
{
	const c = { roots: sampleRoots, intel: sampleIntel }
	const tool = readTools.find((t) => t.name === 'get_entity_profile')

	const found = tool.run(c, { entityId: 10, entityType: 'AGENT' })
	check('the raw identity row is still included', found.data && found.data.record.name === 'DeployBot' && found.data.record.risk === 'high', found.data)
	check('criticality comes from entityCriticality(), not a raw column', found.data.criticality === 'high', found.data)
	check(
		'DeployBot is a real SPOF: sole owner (Sarah Connor), no named backup, criticality high',
		found.data.spofVerdict && found.data.spofVerdict.status === 'spof',
		found.data.spofVerdict,
	)
	check('the resolved owner name is attached', found.data.owner === 'Sarah Connor', found.data.owner)
	check('the derived department (via the owner) is attached', found.data.department === 'ENGINEERING', found.data.department)
	check('predicted risk is attached for an agent', found.data.predictedRisk && found.data.predictedRisk.agentId === 10, found.data.predictedRisk)

	const missing = tool.run(c, { entityId: 999, entityType: 'AGENT' })
	check('an unknown id returns null data, not a throw', missing.data === null, missing)
	check('an unknown id explains itself in notes', missing.notes.length > 0, missing.notes)

	// Platforms are tagged type: 'tool' inside assetContinuity()/ownedAssetBase()
	// (NOT 'platform') — this is the one that would have stayed silently
	// null forever if CONTINUITY_TYPE.PLATFORM were mapped to 'platform'.
	const platform = tool.run(c, { entityId: 50, entityType: 'PLATFORM' })
	check('a platform\'s continuity facts are found despite the "tool" type tag', platform.data.survivalStatus !== null, platform.data)
	check('a platform\'s department is resolved via tool_users, not a raw column', platform.data.department === 'SALES', platform.data.department)
}

console.log('\nlist_entities:')
{
	const c = { roots: sampleRoots, intel: sampleIntel }
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
	const c = { roots: sampleRoots, intel: sampleIntel }
	const tool = readTools.find((t) => t.name === 'get_intelligence')

	const found = tool.run(c, { entityId: 100, entityType: 'WORKFLOW' })
	check('at minimum echoes id/type/name back', found.data.id === 100 && found.data.type === 'WORKFLOW', found.data)
	check('criticality is the real computed value, not a raw column', found.data.criticality === 'critical', found.data.criticality)
	check('an unowned workflow reports orphaned, not not_spof', found.data.spofVerdict && found.data.spofVerdict.status === 'orphaned', found.data.spofVerdict)

	const agentFound = tool.run(c, { entityId: 10, entityType: 'AGENT' })
	check('an agent carries its real predicted-risk score, not a raw column', agentFound.data.predictedRisk && typeof agentFound.data.predictedRisk.predictedScore === 'number', agentFound.data.predictedRisk)

	const missing = tool.run(c, { entityId: 999, entityType: 'WORKFLOW' })
	check('an unknown entity returns null, not a throw', missing.data === null, missing)
}

// run_brain_analysis is async (it awaits domain.graph.run()) and the
// registry-integration block below is too — both need to finish, in
// order, before the pass/fail summary is printed and the process exits.
// Two independent async IIFEs racing to that same summary/exit would be
// a real bug in the test itself, so everything from here on is one
// sequential async flow instead.
;(async () => {
	console.log('\nrun_brain_analysis:')
	{
		const c = { roots: sampleRoots, intel: sampleIntel }
		const tool = readTools.find((t) => t.name === 'run_brain_analysis')

		check('the enum is built from the live module registry, not hardcoded', tool.parameters.properties.analysisType.enum.includes('ownership'), tool.parameters.properties.analysisType.enum)

		// No graph has been loaded in this process, so this must degrade
		// honestly (§11.2) rather than return an empty/fabricated payload.
		const result = await tool.run(c, { targetId: 10, analysisType: 'ownership' })
		check('a not-ready graph is a structured result, never null-with-no-explanation', result.notes.length > 0, result)
		check('a not-ready graph is reported as insufficient evidence, not silently empty', result.evidence && result.evidence.status === 'insufficient_evidence', result.evidence)
	}

	console.log('\nget_metric_definition:')
	{
		const c = { roots: sampleRoots, intel: sampleIntel }
		const tool = readTools.find((t) => t.name === 'get_metric_definition')

		const real = tool.run(c, { metricName: 'accountability' })
		check('a real metric name resolves to its glossary entry', real.data && real.data.metric === 'accountability', real.data)

		const fake = tool.run(c, { metricName: 'not_a_real_metric' })
		check('an unknown metric name returns null, not a fabricated definition', fake.data === null, fake)
	}

	console.log('\nRegistry integration — the actual point of this rewrite:')
	{
		const registry = buildRegistry(readTools, ctx({ roots: sampleRoots, intel: sampleIntel }))

		check('all 7 tools expose declarations with parameters (the shape Bisma\'s original was missing)', registry.declarations.length === 7 && registry.declarations.every((t) => t.parameters), registry.declarations.length)

		const result = await registry.execute('resolve_entity', { query: 'DeployBot' })
		check('a tool call through the REAL registry.execute() returns a proper envelope', 'provenance' in result && 'authored' in result, result)
		check('the envelope\'s data matches what the tool itself returned', result.data.length === 1 && result.data[0].name === 'DeployBot', result.data)

		const badArgs = await registry.execute('resolve_entity', {})
		check('missing required args are now validated before run() -- the validation Bisma\'s original had none of', badArgs.toolError && badArgs.toolError.code === 'MISSING_REQUIRED_FIELD', badArgs.toolError)
	}

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