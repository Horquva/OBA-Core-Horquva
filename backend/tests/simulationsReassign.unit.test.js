/*
 * OBA Core — Succession simulation unit test (W-L 13.1).
 *
 * employeeLeavesWithSuccessor() reassigns instead of orphaning. These tests
 * assert the D-70 mutation policy on hand-built root bundles where the right
 * answer is known by construction — same pattern as simulations.unit.test.js.
 *
 * Run from backend/:  node tests/simulationsReassign.unit.test.js
 */

const d = require('../domain/derived')
const s = require('../domain/simulations')

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

console.log('\n=== OBA Core — Succession Simulation Unit Test (13.1) ===\n')

// ── Basic shape / unknown ids ────────────────────────────────────────────────
console.log('employeeLeavesWithSuccessor — basic shape:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: null },
		],
	})

	check('unknown employee returns null', s.employeeLeavesWithSuccessor(999, 2, r) === null)
	check('unknown successor returns null', s.employeeLeavesWithSuccessor(1, 999, r) === null)

	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check('scenario names both people', result.scenario === 'If Sarah leaves and Omar takes over', result.scenario)
	check('successorId is reported', result.successorId === 2)
	check('successorName is reported', result.successorName === 'Omar')
	check('healthDelta is a number', typeof result.healthDelta === 'number', result.healthDelta)
}

// ── Ownership actually transfers, doesn't orphan ─────────────────────────────
console.log('\nownership transfer:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
		workflow_runbooks: [{ id: 1, workflow_id: 100, owner_id: 1, is_documented: true }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: 'Priya' },
		],
	})

	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check('successor now owns the agent (concentration includes it)', result.residualRisk.successorConcentrationAfter === 2, result.residualRisk)
}

// ── D-70: backup coverage does NOT transfer ──────────────────────────────────
console.log('\nD-70 — backup coverage does not transfer:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
			{ id: 3, name: 'Priya', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: 'Priya' }, // Sarah's own backup slot
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: null }, // successor, no backup of his own
			{ id: 3, name: 'Priya', employee_id: 3, backup_owner: 'Sarah' }, // Priya's backup is Sarah — about to be stale
		],
	})

	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check(
		'successor with no backup of their own shows assetsWithoutBackup > 0',
		result.residualRisk.assetsWithoutBackup === 1,
		result.residualRisk,
	)

	// Anyone whose backup_owner named the departing employee must be cleared,
	// not silently left pointing at someone who no longer exists.
	const mutatedPriyaRow = s.cloneRoots(r).owners // sanity: re-derive via the same mutation path is out of scope here;
	// instead assert indirectly through a second scenario below where Priya IS the successor.
}
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 3, name: 'Priya', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 3, name: 'Priya', employee_id: 3, backup_owner: 'Sarah' }, // stale once Sarah leaves
		],
	})
	const result = s.employeeLeavesWithSuccessor(1, 3, r)
	// Priya is both the successor AND previously backed by Sarah. Her own
	// backup_owner ('Sarah') must be cleared — a departed person is not real
	// coverage — so she now has no backup, and inherits the one agent.
	check(
		'successor whose own stale backup pointed at the leaver has no backup after',
		result.residualRisk.assetsWithoutBackup === 1,
		result.residualRisk,
	)
}

// ── D-70: documentation state is untouched by ownership ──────────────────────
console.log('\nD-70 — documentation state does not transfer/change:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [
			{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'Undocumented Bot', status: 'active', risk: 'high', owner_id: 1 },
		],
		knowledge_assets: [
			{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true },
			{ id: 2, asset_type: 'agent', asset_id: 11, is_documented: false },
		],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: 'X' },
		],
	})
	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check(
		'exactly one of the two transferred agents is undocumented',
		result.residualRisk.assetsUndocumented === 1,
		result.residualRisk,
	)
}

// ── Successor concentration can create a NEW SPOF ────────────────────────────
console.log('\nsuccessor becomes a SPOF:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: null }, // no backup -> inheriting a critical agent makes him a SPOF
		],
	})
	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check('successor with no backup inheriting a critical agent becomes a SPOF', result.residualRisk.successorBecomesSpof === true, result.residualRisk)
}
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: 'Priya' }, // has his own backup -> not a SPOF
		],
	})
	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check('successor WITH their own backup does not become a SPOF', result.residualRisk.successorBecomesSpof === false, result.residualRisk)
}

// ── comparedToNoSuccessor: the actual point of the feature ───────────────────
console.log('\ncomparedToNoSuccessor:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Omar', department: 'Eng' },
		],
		agents: [
			{ id: 10, name: 'DeployBot', status: 'active', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'Downstream', status: 'active', risk: 'high', owner_id: 2 },
		],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
		],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true }],
		workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Omar', employee_id: 2, backup_owner: null },
		],
	})
	const result = s.employeeLeavesWithSuccessor(1, 2, r)
	check('comparedToNoSuccessor.healthDelta is a number', typeof result.comparedToNoSuccessor.healthDelta === 'number', result.comparedToNoSuccessor)
	check(
		'a successor is no worse for health than losing the agent outright',
		result.healthDelta <= result.comparedToNoSuccessor.healthDelta,
		{ withSuccessor: result.healthDelta, noSuccessor: result.comparedToNoSuccessor.healthDelta },
	)
}

console.log('\n----------------------------------------')
console.log(`${passed} passed, ${failed} failed`)
console.log('----------------------------------------\n')
process.exit(failed > 0 ? 1 : 0)
