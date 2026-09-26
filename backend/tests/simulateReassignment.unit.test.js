/*
 * OBA Core — simulate_reassignment TOOL unit test (W-L 13.2).
 *
 * simulationsReassign.unit.test.js already covers employeeLeavesWithSuccessor()
 * (domain/simulations.js) directly, always with matching numeric-literal ids.
 * That never exercised the actual tool wrapper (tools/simulate-reassignment.js)
 * or the id TYPE a live model call is bound to: the tool's own JSON schema
 * declares fromEmployeeId/toEmployeeId as strings, while roots ids are
 * numbers. This file tests the wrapper itself, through string ids, which is
 * the gap that let a real bug (the wrapper passed the raw string args into
 * employeeLeavesWithSuccessor() instead of the employee records' resolved
 * numeric ids, so every live reassignment call silently "found no entity")
 * ship with a fully green test suite.
 *
 * Run from backend/:  node tests/simulateReassignment.unit.test.js
 */

const d = require('../domain/derived')
const simulateReassignmentTool = require('../tools/simulate-reassignment')

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
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

console.log('\n=== OBA Core — simulate_reassignment Tool Unit Test (13.2) ===\n')

const sampleRoots = roots({
	employees: [
		{ id: 1, name: 'Sarah Mitchell', department: 'Engineering' },
		{ id: 2, name: 'Omar Hassan', department: 'Engineering' },
	],
	agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
	workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
	workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true }],
	knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
	owners: [
		{ id: 1, name: 'Sarah Mitchell', employee_id: 1, backup_owner: null },
		{ id: 2, name: 'Omar Hassan', employee_id: 2, backup_owner: null },
	],
})
const ctx = { roots: sampleRoots, snapshotAt: '2026-09-21T00:00:00.000Z' }

console.log('the id type a real model call actually sends:')
{
	// This is the shape a live Gemini call produces — both ids as strings,
	// because that is what the tool's own parameters schema declares.
	const result = simulateReassignmentTool.run(ctx, { fromEmployeeId: '1', toEmployeeId: '2' })
	check('a string-id reassignment resolves, not "no entity found"', result.data !== null, result)
	check('the successor is the one named in the args, not the departing employee', result.data && result.data.successorName === 'Omar Hassan', result.data)
	check('notes name both real people', result.notes.some((n) => n.includes('Sarah Mitchell') && n.includes('Omar Hassan')), result.notes)
}

console.log('\nnumeric ids (defensive — should work either way):')
{
	const result = simulateReassignmentTool.run(ctx, { fromEmployeeId: 1, toEmployeeId: 2 })
	check('a numeric-id reassignment also resolves', result.data !== null, result)
}

console.log('\nunknown people:')
{
	const badFrom = simulateReassignmentTool.run(ctx, { fromEmployeeId: '999', toEmployeeId: '2' })
	check('an unknown departing employee returns null data, not a throw', badFrom.data === null, badFrom)
	check('an unknown departing employee explains itself in notes', badFrom.notes.length > 0, badFrom.notes)

	const badTo = simulateReassignmentTool.run(ctx, { fromEmployeeId: '1', toEmployeeId: '999' })
	check('an unknown successor returns null data, not a throw', badTo.data === null, badTo)
}

console.log('\n' + '-'.repeat(40))
console.log('passed:', passed, '  failed:', failed)
console.log('-'.repeat(40))
if (failed > 0) {
	console.log('\nSIMULATE_REASSIGNMENT TOOL UNIT TESTS FAILED ❌')
	process.exit(1)
}
console.log('\nSIMULATE_REASSIGNMENT TOOL UNIT TESTS PASSED ✅')
console.log('-'.repeat(40))
