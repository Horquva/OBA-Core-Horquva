/*
 * OBA Core — Agent Constitution unit test.
 *
 * agent/constitution.js implements Task 11.4: fixed system rules + a
 * roster builder that turns real org data into model-readable text.
 * No shared fixture exists for this data shape, so this test builds
 * its own small sample org inline -- same pattern as tools.unit.test.js
 * and recommendationEngine.unit.test.js.
 *
 * Run from backend/:  node tests/agentConstitution.unit.test.js
 */

const { CONSTITUTION, buildRoster, buildFullConstitution, estimateTokens } = require('../agent/constitution')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// Small sample org, built by hand -- but shaped to the REAL
// sql/01_schema_migration.sql columns (employees/agents/workflows have no
// `criticality`/`active`/`purpose`/`ownerName`/`dependencyCount` column;
// the real platforms table is `ai_platforms`, not `platforms`). The
// original version of this fixture invented all of those, which is
// exactly what let buildRoster()'s real-schema bugs ship with a green
// test suite — see read-tools.unit.test.js's fixture header for the same
// lesson applied there.
const sampleRoots = {
	employees: [
		{ id: 1, name: 'Sarah Connor', role: 'Engineering Lead', department: 'Engineering', risk: 'high' },
		{ id: 2, name: 'John Doe', role: 'Engineer', department: 'Engineering', risk: 'normal' },
	],
	agents: [
		{ id: 10, name: 'Support Bot', type: 'chat', status: 'active', risk: 'high', owner_id: 1 },
	],
	workflows: [
		{ id: 100, name: 'Incident Response', department: 'Engineering', risk: 'critical' },
	],
	ai_platforms: [
		{ id: 50, name: 'Salesforce', type: 'crm', status: 'active' },
	],
	// Ownership for the workflow is one hop away, via workflow_runbooks.
	workflow_runbooks: [
		{ id: 1, workflow_id: 100, owner_id: 1, is_documented: true },
	],
	knowledge_assets: [],
}

console.log('\n=== OBA Core — Agent Constitution Unit Test ===\n')

console.log('buildRoster():')
{
	const roster = buildRoster(sampleRoots)

	for (const emp of sampleRoots.employees) {
		check(`roster includes employee "${emp.name}"`, roster.includes(emp.name), roster.includes(emp.id))
		check(`roster includes employee id "${emp.id}"`, roster.includes(emp.id))
	}
	for (const agent of sampleRoots.agents) {
		check(`roster includes agent "${agent.name}"`, roster.includes(agent.name))
	}
	for (const wf of sampleRoots.workflows) {
		check(`roster includes workflow "${wf.name}"`, roster.includes(wf.name))
	}
	for (const plat of sampleRoots.ai_platforms) {
		check(`roster includes platform "${plat.name}"`, roster.includes(plat.name))
	}

	check('roster reports correct employee count', roster.includes('EMPLOYEES (2 total)'), roster)
	check('roster reports correct agent count', roster.includes('AGENTS (1 total)'), roster)
	check('roster reports correct workflow count', roster.includes('WORKFLOWS (1 total)'), roster)
	check('roster reports correct platform count', roster.includes('PLATFORMS & SYSTEMS (1 total)'), roster)

	// Criticality is now DERIVED (entityCriticality() reading the real
	// `risk` column), not a raw `criticality` field — this is the actual
	// regression guard for the bug this fixture used to hide.
	check('agent criticality is resolved from its real risk column, not a raw field', roster.includes('Support Bot') && roster.includes('Criticality: high'), roster)
	check('the agent\'s owner is resolved by id, not left as a raw owner_id', roster.includes('Owner: Sarah Connor'), roster)
	check('the workflow\'s owner is resolved via workflow_runbooks', roster.match(/Incident Response[\s\S]*?Owner: Sarah Connor/), roster)

	const empty = buildRoster({})
	check('buildRoster never throws on missing arrays -- defaults to empty', empty.includes('EMPLOYEES (0 total)'), empty)
}

console.log('\nCONSTITUTION rules and tools:')
{
	check('includes Rule 1 (quote numbers)', CONSTITUTION.includes('QUOTE NUMBERS'))
	check('includes Rule 2 (resolve names)', CONSTITUTION.includes('RESOLVE NAMES'))
	check('includes Rule 3 (admit missing data)', CONSTITUTION.includes('ADMIT WHEN DATA IS MISSING'))
	check('includes Rule 4 (every number from a tool)', CONSTITUTION.includes('EVERY NUMBER AND COMPARISON'))
	check('includes Rule 5 (refer to tool context)', CONSTITUTION.includes('REFER TO CONTEXT FROM TOOLS'))
	check('includes Rule 6 (multi-turn awareness)', CONSTITUTION.includes('MULTI-TURN AWARENESS'))

	// All 12 tools that are actually registered in backend/tools/ today —
	// the original list omitted simulate_reassignment (13.2) entirely
	// while still telling the model "use only these 13" and listing 11.
	const tools = [
		'resolve_entity', 'get_org_snapshot', 'get_entity_profile', 'list_entities',
		'get_intelligence', 'run_brain_analysis', 'get_metric_definition',
		'run_simulation', 'rank_scenarios', 'compare_scenarios', 'simulate_reassignment',
		'propose_navigation',
	]
	for (const t of tools) {
		check(`lists tool "${t}"`, CONSTITUTION.includes(t))
	}
	check('the tool count in the prose matches the list actually given', CONSTITUTION.includes('12 total') && CONSTITUTION.includes('Use only these 12'), true)
}

console.log('\nestimateTokens():')
{
	check('empty string is 0 tokens', estimateTokens('') === 0)
	check('token count scales with word count', estimateTokens('one two three four five six seven eight nine ten eleven twelve thirteen') === 10)
}

console.log('\nbuildFullConstitution():')
{
	const result = buildFullConstitution(sampleRoots)

	check('systemInstruction contains the rules', result.systemInstruction.includes('CRITICAL RULES YOU MUST FOLLOW'), true)
	check('systemInstruction contains the roster', result.systemInstruction.includes('ORGANIZATIONAL ROSTER'), true)
	check('rosterTokenCount is a positive number', typeof result.rosterTokenCount === 'number' && result.rosterTokenCount > 0, result.rosterTokenCount)

	// This tiny sample org is far under the 3000-5000 real-org budget --
	// that's expected and correctly reported, not a bug.
	check('small sample org is correctly reported as under budget', result.withinBudget === false && result.warning.includes('under 3000'), result)

	// Build an artificially large org to prove the over-budget path works too.
	const bigRoots = {
		employees: Array.from({ length: 400 }, (_, i) => ({ id: i, name: `Employee Number ${i} With A Fairly Long Descriptive Name`, role: 'Engineer', department: 'Engineering', risk: 'normal' })),
		agents: [], workflows: [], ai_platforms: [],
	}
	const bigResult = buildFullConstitution(bigRoots)
	check('a large org can be correctly reported as over budget', bigResult.rosterTokenCount > 5000 && bigResult.withinBudget === false && bigResult.warning.includes('over 5000'), bigResult.rosterTokenCount)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nAGENT CONSTITUTION UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nAGENT CONSTITUTION UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))