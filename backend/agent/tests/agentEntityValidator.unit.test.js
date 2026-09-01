/*
 * OBA Core — Entity allowlist validator unit test (part of W-L 11.8).
 * No DB, no express, no provider. Run from backend/:
 *   node agent/tests/agentEntityValidator.unit.test.js
 */

const { buildAllowedEntitySet, validateEntityAllowlist } = require('../entityValidator')
const { fakeRoots } = require('./entityFixtures')

let passed = 0
let failed = 0
function check(name, cond) {
	if (cond) { passed++; console.log('  \u2713', name) }
	else { failed++; console.error('  \u2717', name) }
}

console.log('\n=== OBA Core \u2014 Entity Allowlist Validator Unit Test ===\n')

const allowed = buildAllowedEntitySet(fakeRoots)

// buildAllowedEntitySet
check('builds allowed set from employees, agents, workflows, platforms',
	allowed.has('Sarah Mitchell') && allowed.has('DeployBot') && allowed.has('Quarterly Close') && allowed.has('Snowflake'))

// flags an invented person
{
	const result = validateEntityAllowlist('John Smith is the primary owner of this workflow.', allowed)
	check('flags an invented person', result.status === 'flagged' && result.violations.includes('John Smith'))
}

// does not flag a real employee
{
	const result = validateEntityAllowlist('Sarah Mitchell owns this workflow.', allowed)
	check('does not flag a real employee', result.status === 'clean')
}

// does not flag a real agent
{
	const result = validateEntityAllowlist('DeployBot handled the last three releases.', allowed)
	check('does not flag a real agent', result.status === 'clean')
}

// does not flag a real workflow name
{
	const result = validateEntityAllowlist('The Quarterly Close workflow depends on four systems.', allowed)
	check('does not flag a real workflow name', result.status === 'clean')
}

// single-word entity names are outside this validator's scope by design
// (spec: "capitalised multi-word sequences") — a single invented word
// like "AutoScaler" is indistinguishable from a real product noun like
// "Snowflake" without more context, so the spec deliberately doesn't
// try to catch it here.
{
	const result = validateEntityAllowlist('AutoScaler resolved the incident automatically.', allowed)
	check('single-word names are out of scope by design (spec limitation, not a bug)', result.status === 'clean')
}

// does not flag ordinary capitalized English
{
	const result = validateEntityAllowlist('The Engineering Department carries most of the risk.', allowed)
	check('does not flag ordinary capitalized English', result.status === 'clean')
}

// is a warning, never blocks — status is 'flagged', not an exception/throw
{
	let threw = false
	try { validateEntityAllowlist('Totally Fake Person exists.', allowed) }
	catch (_) { threw = true }
	check('never throws — a warning, not a block', !threw)
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)