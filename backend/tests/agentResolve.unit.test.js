/*
 * OBA Core — Entity resolution unit test (W-L 10.3).
 *
 * The implementation plan (§10.3) required this exact file and exact
 * coverage list — "agentResolve.unit.test.js covering: exact full name;
 * first name only; fuzzy multi-word; ambiguous surname returning two or
 * more candidates; unresolvable text returning an empty list; and every
 * case that voice.js handles today, so the lift is provably lossless" —
 * and it did not exist. tools/entity-matching.js shipped as a simplified
 * exact/substring-only matcher with no fuzzy fallback, no confidence
 * field and no ambiguous flag; this file both specifies and now verifies
 * the fuzzy-fallback + confidence/ambiguity contract added to it.
 *
 * Run from backend/:  node tests/agentResolve.unit.test.js
 */

const { resolveEntityMatches } = require('../tools/entity-matching')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// A shared surname (voice.js's own "ambiguous surname" case) plus a name
// only resolvable by dropping a generic category word ("the workflow" ->
// "Release Pipeline"), so both matching stages are exercised.
const entities = [
	{ id: 1, type: 'EMPLOYEE', name: 'Sarah Mitchell' },
	{ id: 2, type: 'EMPLOYEE', name: 'Sarah Connor' },
	{ id: 3, type: 'EMPLOYEE', name: 'Omar Hassan' },
	{ id: 10, type: 'AGENT', name: 'DeployBot' },
	{ id: 100, type: 'WORKFLOW', name: 'Release Pipeline' },
]

console.log('\n=== OBA Core — Entity Resolution Unit Test (10.3) ===\n')

console.log('exact full name:')
{
	const { candidates, ambiguous } = resolveEntityMatches('Omar Hassan', entities)
	check('resolves to exactly one candidate', candidates.length === 1 && candidates[0].name === 'Omar Hassan', candidates)
	check('an exact match carries high confidence', candidates[0].confidence === 'high', candidates[0])
	check('a single candidate is not ambiguous', ambiguous === false)
}

console.log('\nfirst name only (substring):')
{
	const { candidates } = resolveEntityMatches('DeployBot', entities)
	check('an exact single-word name resolves', candidates.length === 1 && candidates[0].id === 10, candidates)
}

console.log('\nambiguous surname — never silently picks one:')
{
	const { candidates, ambiguous } = resolveEntityMatches('Sarah', entities)
	check('a shared first name returns BOTH candidates', candidates.length === 2, candidates)
	check('ambiguity is flagged', ambiguous === true)
	check('every candidate is one of the two Sarahs', candidates.every((c) => c.name === 'Sarah Mitchell' || c.name === 'Sarah Connor'), candidates)
}

console.log('\nfuzzy multi-word (generic category word stripped before scoring):')
{
	// Nothing here is a substring of "Release Pipeline" or vice versa, so
	// this can only resolve through the stage-2 fuzzy fallback — the part
	// the original implementation was entirely missing.
	const { candidates } = resolveEntityMatches('the release workflow', entities)
	check('a fuzzy multi-word query resolves through the fallback', candidates.length === 1 && candidates[0].id === 100, candidates)
	check('a fuzzy match is never labelled high confidence', candidates[0].confidence !== 'high', candidates[0])
}

console.log('\nunresolvable text:')
{
	const { candidates, ambiguous } = resolveEntityMatches('the quarterly compliance report nobody owns', entities)
	check('returns an empty list, not a guess', candidates.length === 0, candidates)
	check('empty is not reported as ambiguous', ambiguous === false)
}

console.log('\ninput edge cases:')
{
	check('empty string returns an empty list', resolveEntityMatches('', entities).candidates.length === 0)
	check('non-string query returns an empty list, not a throw', resolveEntityMatches(null, entities).candidates.length === 0)
	check('no entities returns an empty list, not a throw', resolveEntityMatches('Sarah', []).candidates.length === 0)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nENTITY RESOLUTION UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nENTITY RESOLUTION UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))
