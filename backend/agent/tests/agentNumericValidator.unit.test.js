/*
 * OBA Core — Numeric citation validator unit test (part of W-L 11.8).
 * No DB, no express, no provider. Run from backend/:
 *   node agent/tests/agentNumericValidator.unit.test.js
 */

const { validateNumericCitations } = require('../numericValidator')
const fixtures = require('./numericFixtures')

let passed = 0
let failed = 0
function check(name, cond) {
	if (cond) { passed++; console.log('  \u2713', name) }
	else { failed++; console.error('  \u2717', name) }
}

console.log('\n=== OBA Core \u2014 Numeric Citation Validator Unit Test ===\n')

// 1. Catches an invented figure — 95 appears nowhere in the tool result.
{
	const text = 'Sarah Mitchell has a predicted risk score of 95.'
	const result = validateNumericCitations(text, fixtures.toolTraceSingleEntity)
	check('catches an invented figure', result.status === 'flagged' && result.violations.some((v) => v.value === 95))
}

// 2. Passes a quoted figure — cited verbatim from the result.
{
	const text = 'Her predicted risk is "0.82", based on the latest snapshot.'
	const result = validateNumericCitations(text, fixtures.toolTraceSingleEntity)
	check('passes a quoted figure', result.status === 'clean')
}

// 3. Passes rounding within 0.5 of a real value.
{
	const text = 'Org score is about 62.'
	const result = validateNumericCitations(text, fixtures.toolTraceOrgSnapshot)
	check('passes rounding within 0.5', result.status === 'clean')
}

// 4. Passes an ordinal within the real list length (3 items ranked).
{
	const text = 'KnowledgeIndexer is the 2nd highest risk in the list of 3.'
	const result = validateNumericCitations(text, fixtures.toolTraceRankedList)
	check('passes an ordinal within list length', result.status === 'clean')
}

// 5. Passes a year present in the results.
{
	const text = 'This snapshot is from 2026.'
	const result = validateNumericCitations(text, fixtures.toolTraceOrgSnapshot)
	check('passes a year present in results', result.status === 'clean')
}

// 6. Real, un-cited number in a longer answer still gets caught.
{
	const text = 'Sarah Mitchell has 5 dependents and a risk score around 88.'
	const result = validateNumericCitations(text, fixtures.toolTraceSingleEntity)
	check('catches a real-looking but uncited number mixed with valid ones',
		result.status === 'flagged' && result.violations.some((v) => v.value === 88))
}

// 7. Reads from result.data, not from summary — proves we're pointed at
//    the right field after Maaz's 50e21b0 change.
{
	const text = 'Predicted risk is 0.82.'
	const traceWithoutResult = [{ ...fixtures.toolTraceSingleEntity[0], result: undefined }]
	const resultWithData = validateNumericCitations(text, fixtures.toolTraceSingleEntity)
	const resultWithoutData = validateNumericCitations(text, traceWithoutResult)
	check('reads from result.data (flags everything if result is missing)',
		resultWithData.status === 'clean' && resultWithoutData.status === 'flagged')
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)