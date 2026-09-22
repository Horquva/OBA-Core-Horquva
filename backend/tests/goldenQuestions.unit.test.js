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
// simulate-reassignment.js, propose-navigation.js).
const REAL_TOOL_NAMES = new Set([
	'resolve_entity',
	'get_org_snapshot',
	'get_entity_profile',
	'list_entities',
	'get_intelligence',
	'run_brain_analysis',
	'get_metric_definition',
	'run_simulation',
	'rank_scenarios',
	'compare_scenarios',
	'simulate_reassignment',
	'propose_navigation',
])

// -----------------------------------------------------------------
// Shape of the fixture itself
// -----------------------------------------------------------------

check('goldenQuestions is an array', Array.isArray(goldenQuestions))
check('has at least the ~20 questions §18.2 asks for', goldenQuestions.length >= 20, goldenQuestions.length)

// -----------------------------------------------------------------
// Every entry, individually
// -----------------------------------------------------------------

const seenIds = new Set()
let allIdsUnique = true
let allHaveQuestionText = true
let allHaveExpectedTools = true
let allToolsAreReal = true
let allFollowsFromReal = true
const unknownToolsFound = []
const badFollowsFrom = []

for (const q of goldenQuestions) {
	if (seenIds.has(q.id)) allIdsUnique = false
	seenIds.add(q.id)

	if (typeof q.question !== 'string' || q.question.trim().length === 0) allHaveQuestionText = false

	// A follow-up turn (§18.2) is the one legitimate case for zero NEW tool
	// calls: it must answer from the prior turn's own result instead of
	// calling anything again. Every other question needs at least one.
	if (!Array.isArray(q.expectedTools)) allHaveExpectedTools = false
	else if (q.expectedTools.length === 0 && !q.followsFrom) allHaveExpectedTools = false

	for (const toolName of q.expectedTools || []) {
		if (!REAL_TOOL_NAMES.has(toolName)) {
			allToolsAreReal = false
			unknownToolsFound.push(`${q.id}: ${toolName}`)
		}
	}
}

// A second pass, once every id is known, so a chain can reference a
// question defined either before or after it in the file.
for (const q of goldenQuestions) {
	if (q.followsFrom && !seenIds.has(q.followsFrom)) {
		allFollowsFromReal = false
		badFollowsFrom.push(`${q.id} -> ${q.followsFrom}`)
	}
}

check('every id is unique', allIdsUnique)
check('every question has non-empty question text', allHaveQuestionText)
check('every question has at least one expected tool, unless it is a follow-up turn', allHaveExpectedTools)
check('every expected tool is a real, existing tool name', allToolsAreReal, unknownToolsFound)
check('every followsFrom points at a real question id in this fixture', allFollowsFromReal, badFollowsFrom)

// -----------------------------------------------------------------
// Specific known cases (spot checks, not exhaustive)
// -----------------------------------------------------------------

const byId = Object.fromEntries(goldenQuestions.map((q) => [q.id, q]))

check('gq-01 targets get_org_snapshot', byId['gq-01'] && byId['gq-01'].expectedTools.includes('get_org_snapshot'))
check('gq-12 (biggest risk) targets rank_scenarios, not run_simulation',
	byId['gq-12'] && byId['gq-12'].expectedTools.includes('rank_scenarios') && !byId['gq-12'].expectedTools.includes('run_simulation'))
check('gq-14 (named successor) targets simulate_reassignment', byId['gq-14'] && byId['gq-14'].expectedTools.includes('simulate_reassignment'))

// §18.2's required categories, each backed by a real question now rather
// than a documented gap.
check('has an ambiguous-name question that expects 2+ real candidates',
	byId['gq-03b'] && Array.isArray(byId['gq-03b'].expectedEntities) && byId['gq-03b'].expectedEntities.length >= 2, byId['gq-03b'])
check('has a propose_navigation question', byId['gq-20'] && byId['gq-20'].expectedTools.includes('propose_navigation'))
check('has a follow-up chain question with zero new tool calls',
	byId['gq-22'] && byId['gq-22'].followsFrom === 'gq-21' && byId['gq-22'].expectedTools.length === 0, byId['gq-22'])

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)