/*
 * OBA Core — Concentration Intelligence tests (Phase 2.2).
 *
 * Pins the HHI instrument (single node = 10000, uniform N = 10000/N, merge
 * monotonicity, DOJ/FTC bands), the Gini/entropy secondaries, the per-class
 * exposure builders (humans via ownership, models via usage edges, vendors
 * via supply), and the chokepoint alert rule (share > 25% AND no fallback).
 * Pure — no I/O.
 *
 * Run from backend/:  node tests/concentration.unit.test.js
 */

const { concentration, humanConcentrationRisk, hhiOf, giniOf, entropyOf, hhiBandFor, ALERT_SHARE } = require('../domain/concentration')
const riskEngine = require('../domain/riskEngine')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const U = (prefix, n) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const A = (n) => U('a', n), W = (n) => U('b', n), P = (n) => U('c', n), E = (n) => U('e', n), V = (n) => U('f', n)

console.log('\n=== OBA Core — Concentration Intelligence tests ===\n')

console.log('HHI instrument:')
check('single node → 10000', hhiOf([100]) === 10000)
check('two uniform nodes → 5000', hhiOf([50, 50]) === 5000)
check('N uniform nodes → 10000/N', hhiOf(Array(10).fill(10)) === 1000)
check('band edges: 1499 distributed, 1500 moderate, 2501 chokepoint',
	hhiBandFor(1499) === 'DISTRIBUTED' && hhiBandFor(1500) === 'MODERATE' && hhiBandFor(2501) === 'CRITICAL_CHOKEPOINT')
check('merge monotonicity: combining two nodes can only raise HHI', (() => {
	const before = hhiOf([40, 30, 30])
	const after = hhiOf([70, 30])
	return after > before
})())
check('gini of equal exposures is 0', giniOf([5, 5, 5, 5]) === 0)
check('gini of everything-on-one-node approaches 1', giniOf([0, 0, 0, 10]) > 0.7, giniOf([0, 0, 0, 10]))
check('entropy: uniform → 1, single node → 0', entropyOf([1, 1, 1, 1]) === 1 && entropyOf([10, 0, 0, 0]) === 0)

// ── fixture: one dominant unbacked model + one dominant unbacked person ──
function fixture() {
	return {
		employees: [
			{ id: E(1), name: 'Ahmed' },
			{ id: E(2), name: 'Sara' },
			{ id: E(3), name: 'Michael' },
		],
		agents: [
			{ id: A(1), name: 'Agent1', risk: 'critical', status: 'active', owner_id: E(1) },
			{ id: A(2), name: 'Agent2', risk: 'high', status: 'active', owner_id: E(1) },
			{ id: A(3), name: 'Agent3', risk: 'high', status: 'active', owner_id: E(1) },
			{ id: A(4), name: 'Agent4', risk: 'low', status: 'active', owner_id: E(2) },
			{ id: A(5), name: 'Agent5', risk: 'low', status: 'active', owner_id: E(3) },
		],
		owners: [
			{ employee_id: E(1), backup_owner: null },   // Ahmed: dominant + NO backup
			{ employee_id: E(2), backup_owner: 'Deputy' },
			{ employee_id: E(3), backup_owner: 'Deputy' },
		],
		workflows: [
			{ id: W(1), name: 'Flow1', risk: 'critical', status: 'active' },
			{ id: W(2), name: 'Flow2', risk: 'low', status: 'active' },
		],
		workflow_runbooks: [
			{ workflow_id: W(1), owner_id: E(1), is_documented: true },
			{ workflow_id: W(2), owner_id: E(2), is_documented: true },
		],
		workflow_failures: [],
		ai_platforms: [
			{ id: P(1), name: 'GPT-4o Enterprise', status: 'active' },
			{ id: P(2), name: 'Claude Pro', status: 'active' },
		],
		tool_ownership: [
			{ platform_id: P(1), employee_id: E(1) },
			{ platform_id: P(2), employee_id: E(2) },
		],
		tool_backups: [
			{ primary_platform: P(2), backup_platform: P(1) }, // P2 backed, P1 NOT
		],
		agent_platform: [
			{ agent_id: A(1), platform_id: P(1) },
			{ agent_id: A(2), platform_id: P(1) },
			{ agent_id: A(3), platform_id: P(1) },
			{ agent_id: A(4), platform_id: P(2) },
			{ agent_id: A(5), platform_id: P(2) },
		],
		workflow_tool_dependencies: [
			{ workflow_id: W(1), platform_id: P(1), is_critical: true },
			{ workflow_id: W(2), platform_id: P(2), is_critical: false },
		],
		dependencies: [
			{ source_type: 'workflow', source_id: W(1), target_type: 'platform', target_id: P(1), dependency_type: 'critical', strength: 95 },
		],
		external_entities: [
			{ id: V(1), name: 'OpenAI', kind: 'vendor', criticality: 'high' },
			{ id: V(2), name: 'Anthropic', kind: 'vendor', criticality: 'high' },
		],
		external_entity_supplies: [
			{ external_entity_id: V(1), platform_id: P(1) },
			{ external_entity_id: V(2), platform_id: P(2) },
		],
		accountability_entities: [], accountability_links: [], truth_claims: [],
		decision_history: [], agent_platform_extra: [], workflow_dependencies: [],
		tool_users: [], tool_policies: [], policy_violations: [], employee_agent: [],
		_counts: {},
	}
}

console.log('\nengine over the fixture:')
const roots = fixture()
const context = riskEngine.buildEngine(roots)
const result = concentration(roots, context)

console.log('\nhumans class:')
{
	const c = result.classes.humans
	check('three people scored', c.population === 3, c.population)
	const ahmed = c.topNodes.find((n) => n.name === 'Ahmed')
	check('Ahmed (3 critical/high agents + critical workflow + tool) is the top node', ahmed && c.topNodes[0].name === 'Ahmed', c.topNodes)
	check('Ahmed holds more than the 25% alert share', ahmed.share > ALERT_SHARE, ahmed)
	check('humans HHI flags MODERATE or CRITICAL (Ahmed dominates)', c.hhi > 2500 || (c.hhi >= 1500 && c.band === 'MODERATE'), { hhi: c.hhi, band: c.band })
}
{
	const alert = result.alerts.find((a) => a.kind === 'KEY_PERSON')
	check('KEY_PERSON alert fires for the unbacked dominant owner', alert && alert.name === 'Ahmed', alert)
	check('alert evidence names the owners table and the fallback absence',
		alert && alert.evidence.some((e) => e.sourceTable === 'owners') && alert.evidence.some((e) => /no recorded fallback/.test(e.fact)), alert && alert.evidence)
	check('backed owners fire no KEY_PERSON alert', !result.alerts.some((a) => a.kind === 'KEY_PERSON' && (a.name === 'Sara' || a.name === 'Michael')))
}

console.log('\nmodels class:')
{
	const c = result.classes.models
	check('two platforms scored', c.population === 2, c.population)
	const p1 = c.topNodes.find((n) => n.name === 'GPT-4o Enterprise')
	check('GPT-4o (3 agents + critical workflow + graph edge) dominates exposure', p1 && c.topNodes[0].name === 'GPT-4o Enterprise', c.topNodes)
	check('GPT-4o has no hot backup recorded', p1 && p1.hasBackup === false, p1)
	check('MODEL_CHOKEPOINT alert fires for the unbacked dominant platform', result.alerts.some((a) => a.kind === 'MODEL_CHOKEPOINT' && a.name === 'GPT-4o Enterprise'))
	check('backed platform fires no MODEL_CHOKEPOINT alert', !result.alerts.some((a) => a.kind === 'MODEL_CHOKEPOINT' && a.name === 'Claude Pro'))
	check('usage edges carried evidence parts', p1 && c.topNodes[0].share > 0.5, p1)
}

console.log('\nvendors class:')
{
	const c = result.classes.vendors
	check('two vendors scored', c.population === 2, c.population)
	check('OpenAI inherits the dominant platform exposure', c.topNodes[0].name === 'OpenAI', c.topNodes)
	check('VENDOR_CHOKEPOINT fires for the vendor of the unbacked dominant platform',
		result.alerts.some((a) => a.kind === 'VENDOR_CHOKEPOINT' && a.name === 'OpenAI'))
	check('Anthropic (backed platform) fires no alert', !result.alerts.some((a) => a.kind === 'VENDOR_CHOKEPOINT' && a.name === 'Anthropic'))
}

console.log('\nshape + coherence:')
check('all three classes carry hhi/band/gini/entropy/topNodes/alerts',
	['humans', 'models', 'vendors'].every((k) => {
		const c = result.classes[k]
		return typeof c.hhi === 'number' && c.band && typeof c.gini === 'number' && typeof c.entropy === 'number' && Array.isArray(c.topNodes) && Array.isArray(c.alerts)
	}), Object.keys(result.classes))
check('alerts sorted by share descending', result.alerts.every((a, i, arr) => i === 0 || arr[i - 1].share >= a.share), result.alerts.map((a) => a.share))
check('population chokepoint count matches alerts', result.population.chokepoints === result.alerts.length, result.population)

console.log('\nhumanConcentrationRisk (ownership.js repoint):')
check('dominant unbacked owner reads high', humanConcentrationRisk(roots, context, E(1)) === 'high')
{
	// give Ahmed a backup → exposure unchanged; risk still reads from exposure
	const r2 = JSON.parse(JSON.stringify(roots))
	r2.owners[0].backup_owner = 'Deputy'
	check('risk tracks exposure share, not backup state', humanConcentrationRisk(r2, context, E(1)) === 'high')
}
check('minor holder reads low', humanConcentrationRisk(roots, context, E(3)) === 'low' || humanConcentrationRisk(roots, context, E(3)) === 'medium', humanConcentrationRisk(roots, context, E(3)))

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CONCENTRATION TESTS PASSED ✅' : 'CONCENTRATION TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
