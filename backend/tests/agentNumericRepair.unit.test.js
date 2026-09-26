/*
 * OBA Core — Numeric citation repair-round unit test (D-73, part of W-L 11.8).
 *
 * The plan's §11.8/D-73 spec for the numeric validator includes "one
 * automatic repair round: re-prompt with the specific unverified figures
 * named, asking for a corrected answer using only cited values. If the
 * second attempt still fails, return the answer annotated as containing
 * unverified figures and record validator_status = 'flagged'." Only the
 * pass/fail check (validateNumericCitations) was ever built; this file
 * specifies and verifies the repair round itself
 * (numericValidator.js's repairNumericCitations).
 *
 * No network — a scripted stub provider, same pattern as agentLoop.unit.test.js.
 *
 * Run from backend/:  node tests/agentNumericRepair.unit.test.js
 */

const { repairNumericCitations } = require('../agent/numericValidator')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function stubProvider(reply) {
	const calls = []
	return {
		calls,
		async *stream({ history }) {
			calls.push(history)
			if (reply === 'ERROR') {
				yield { type: 'error', error: new Error('provider unavailable'), retryable: false }
				return
			}
			yield { type: 'text', text: reply }
			yield { type: 'done', usage: null, finishReason: 'STOP' }
		},
	}
}

const TOOL_TRACE = [
	{ id: '1', name: 'get_intelligence', result: { data: { predictedScore: 78, threatLevel: 'HIGH' } } },
]

console.log('\n=== OBA Core — Numeric Repair Round Unit Test (D-73) ===\n')

;(async () => {
	console.log('a clean answer never triggers a repair round:')
	{
		const provider = stubProvider('never called')
		const result = await repairNumericCitations({
			text: 'The predicted score is 78.',
			toolTrace: TOOL_TRACE,
			provider,
			history: [],
			systemInstruction: 'system',
		})
		check('status is clean', result.validatorStatus === 'clean', result)
		check('text is unchanged', result.text === 'The predicted score is 78.', result.text)
		check('the provider was never called', provider.calls.length === 0, provider.calls.length)
	}

	console.log('\na flagged answer gets exactly one repair attempt, and succeeds:')
	{
		const provider = stubProvider('The predicted score is 78.')
		const result = await repairNumericCitations({
			text: 'The predicted score is 95.', // 95 is not in the tool result
			toolTrace: TOOL_TRACE,
			provider,
			history: [{ role: 'user', parts: [{ text: 'what is the risk?' }] }],
			systemInstruction: 'system',
		})
		check('exactly one provider call was made', provider.calls.length === 1, provider.calls.length)
		check('the repair prompt names the unverified figure', JSON.stringify(provider.calls[0]).includes('95'), provider.calls[0])
		check('status is repaired, not clean (it needed a fix)', result.validatorStatus === 'repaired', result)
		check('the corrected text replaces the original', result.text === 'The predicted score is 78.', result.text)
	}

	console.log('\na repair attempt that still cites nothing real is flagged, not retried again:')
	{
		const provider = stubProvider('It is around 95, roughly.')
		const result = await repairNumericCitations({
			text: 'The predicted score is 95.',
			toolTrace: TOOL_TRACE,
			provider,
			history: [],
			systemInstruction: 'system',
		})
		check('still exactly one provider call — never retried twice', provider.calls.length === 1, provider.calls.length)
		check('status is flagged', result.validatorStatus === 'flagged', result)
		check('violations are reported', Array.isArray(result.violations) && result.violations.length > 0, result.violations)
	}

	console.log('\na provider failure during the repair round annotates the ORIGINAL answer:')
	{
		const provider = stubProvider('ERROR')
		const result = await repairNumericCitations({
			text: 'The predicted score is 95.',
			toolTrace: TOOL_TRACE,
			provider,
			history: [],
			systemInstruction: 'system',
		})
		check('status is flagged rather than throwing', result.validatorStatus === 'flagged', result)
		check('the original (unreplaced) text is kept', result.text === 'The predicted score is 95.', result.text)
	}

	console.log('\n' + '-'.repeat(40))
	console.log('passed:', passed, '  failed:', failed)
	console.log('-'.repeat(40))
	if (failed > 0) {
		console.log('\nNUMERIC REPAIR ROUND UNIT TESTS FAILED ❌')
		process.exit(1)
	}
	console.log('\nNUMERIC REPAIR ROUND UNIT TESTS PASSED ✅')
	console.log('-'.repeat(40))
})()
