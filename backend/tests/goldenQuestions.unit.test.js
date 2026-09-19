/*
 * OBA Core — Golden-question suite structural unit test (W-L 13.4).
 * Pure/offline — validates the FIXTURE (goldenQuestions.js) is well-formed:
 * unique ids, real tool names only, no empty fields. This does NOT run the
 * agent or a live/stub provider — that is a separate future runner, per the
 * plan's own note that a stub-provider CI run and a manual live-provider run
 * are two different things from this fixture file.
 *
 * Run from backend/:  node tests/goldenQuestions.unit.test.js
 */

const { goldenQuestions } = require('./goldenQuestions')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  \u2713', name) }
	else { failed++; console.error('  \u2717', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core \u2014 Golden Question Suite Structural Test (13.4) ===\n')

// Every tool name that actually exists in the tool registry, confirmed
// directly from source (backend/tools/read-tools.js, simulation-tools.js,
// simulate-reassignment.js). run_brain_analysis and propose_navigation are
// deliberately absent — neither is wired/real yet, so no golden question
// should target them.
const REAL_TOOL_NAMES = new Set([
	'resolve_entity',
	'get_org_snapshot',
	'get_entity_profile',
	'list_entities',
	'get_intelligence',
	'get_metric_definition',
	'run_simulation',
	'rank_scenarios',
	'compare_scenarios',
	'simulate_reassignment',
])

// -----------------------------------------------------------------
// Shape of the fixture itself
// -----------------------------------------------------------------

check('goldenQuestions is an array', Array.isArray(goldenQuestions))
check('has exactly 19 questions', goldenQuestions.length === 19, goldenQuestions.length)

// -----------------------------------------------------------------
// Every entry, individually
// -----------------------------------------------------------------

const seenIds = new Set()
let allIdsUnique = true
let allHaveQuestionText = true
let allHaveExpectedTools = true
let allToolsAreReal = true
const unknownToolsFound = []

for (const q of goldenQuestions) {
	if (seenIds.has(q.id)) allIdsUnique = false
	seenIds.add(q.id)

	if (typeof q.question !== 'string' || q.question.trim().length === 0) allHaveQuestionText = false

	if (!Array.isArray(q.expectedTools) || q.expectedTools.length === 0) allHaveExpectedTools = false

	for (const toolName of q.expectedTools || []) {
		if (!REAL_TOOL_NAMES.has(toolName)) {
			allToolsAreReal = false
			unknownToolsFound.push(`${q.id}: ${toolName}`)
		}
	}
}

check('every id is unique', allIdsUnique)
check('every question has non-empty question text', allHaveQuestionText)
check('every question has at least one expected tool', allHaveExpectedTools)
check('every expected tool is a real, existing tool name', allToolsAreReal, unknownToolsFound)

// -----------------------------------------------------------------
// Specific known cases (spot checks, not exhaustive)
// -----------------------------------------------------------------

const byId = Object.fromEntries(goldenQuestions.map((q) => [q.id, q]))

check('gq-01 targets get_org_snapshot', byId['gq-01'] && byId['gq-01'].expectedTools.includes('get_org_snapshot'))
check('gq-12 (biggest risk) targets rank_scenarios, not run_simulation',
	byId['gq-12'] && byId['gq-12'].expectedTools.includes('rank_scenarios') && !byId['gq-12'].expectedTools.includes('run_simulation'))
check('gq-14 (named successor) targets simulate_reassignment', byId['gq-14'] && byId['gq-14'].expectedTools.includes('simulate_reassignment'))
check('no question targets run_brain_analysis (not wired yet)',
	goldenQuestions.every((q) => !q.expectedTools.includes('run_brain_analysis')))
check('no question targets propose_navigation (does not exist on this branch)',
	goldenQuestions.every((q) => !q.expectedTools.includes('propose_navigation')))

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)