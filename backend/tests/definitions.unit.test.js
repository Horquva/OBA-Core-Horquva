/*
 * OBA Core — Canonical definitions unit test.
 *
 * definitions.js is the single source for three concepts that were previously
 * redefined in every file that needed them: how critical a thing is, how
 * critical a link is, and what counts as a single point of failure.
 *
 * These tests assert the DEFINITIONS themselves. A wrong definition here
 * propagates silently into every score in the product, so the assertions are
 * deliberately about boundaries and about absent data rather than happy paths.
 *
 * No database and no network — every function here is pure.
 *
 * Run from backend/:  node tests/definitions.unit.test.js
 */

const D = require('../domain/definitions')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

console.log('\n=== OBA Core — Canonical Definitions Unit Test ===\n')

// ── The scale ────────────────────────────────────────────────────────────────
console.log('Criticality scale — four distinct levels (D-03):')
{
	check('four levels, lowest to highest', JSON.stringify(D.LEVELS) === JSON.stringify(['low', 'normal', 'high', 'critical']), D.LEVELS)
	check('critical outranks high', D.RANK.critical > D.RANK.high)
	check('high outranks normal', D.RANK.high > D.RANK.normal)
	check('normal outranks low', D.RANK.normal > D.RANK.low)

	check('normalizes casing and whitespace', D.normalizeLevel('  CRITICAL ') === 'critical', D.normalizeLevel('  CRITICAL '))
	check('unrecognized string is unknown', D.normalizeLevel('severe') === D.UNKNOWN, D.normalizeLevel('severe'))
	check('null is unknown', D.normalizeLevel(null) === D.UNKNOWN, D.normalizeLevel(null))
	check('undefined is unknown', D.normalizeLevel(undefined) === D.UNKNOWN, D.normalizeLevel(undefined))
	check('empty string is unknown', D.normalizeLevel('') === D.UNKNOWN, D.normalizeLevel(''))
}

console.log('\nThreshold comparison — unknown never qualifies (D-07):')
{
	check('critical is at or above high', D.atOrAbove('critical', 'high') === true)
	check('high is at or above high', D.atOrAbove('high', 'high') === true)
	check('normal is not at or above high', D.atOrAbove('normal', 'high') === false)
	check('low is not at or above high', D.atOrAbove('low', 'high') === false)
	check('unknown is never at or above anything', D.atOrAbove(D.UNKNOWN, 'low') === false)
	check('unknown compared to unknown is false', D.atOrAbove(D.UNKNOWN, D.UNKNOWN) === false)
	check('a bogus threshold is false, not a throw', D.atOrAbove('critical', 'nonsense') === false)
}

console.log('\nmaxLevel — highest known, ignoring unknowns:')
{
	check('picks the highest', D.maxLevel(['low', 'critical', 'normal']) === 'critical', D.maxLevel(['low', 'critical', 'normal']))
	check('ignores unknown alongside known', D.maxLevel([D.UNKNOWN, 'normal']) === 'normal', D.maxLevel([D.UNKNOWN, 'normal']))
	check('all unknown stays unknown', D.maxLevel([D.UNKNOWN, D.UNKNOWN]) === D.UNKNOWN, D.maxLevel([D.UNKNOWN, D.UNKNOWN]))
	check('empty list is unknown', D.maxLevel([]) === D.UNKNOWN, D.maxLevel([]))
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CANONICAL DEFINITIONS TESTS PASSED ✅' : 'CANONICAL DEFINITIONS TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
