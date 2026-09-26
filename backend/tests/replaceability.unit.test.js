/*
 * OBA Core — Replaceability Intelligence tests (Phase 2.1).
 *
 * Pins the K_i decomposition (0.40 doc + 0.30 alt + 0.30 bench), the bench
 * formula, banding, the 2×2 quadrant assignment against Engine A blast
 * radius, and the evidence each component carries. Pure — no I/O.
 *
 * Run from backend/:  node tests/replaceability.unit.test.js
 */

const { replaceability, benchScore, bandFor, quadrantFor } = require('../domain/replaceability')
const riskEngine = require('../domain/riskEngine')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const A = (id) => `a0000000-0000-4000-8000-${String(id).padStart(12, '0')}`
const W = (id) => `b0000000-0000-4000-8000-${String(id).padStart(12, '0')}`
const P = (id) => `c0000000-0000-4000-8000-${String(id).padStart(12, '0')}`
const E = (id) => `e0000000-0000-4000-8000-${String(id).padStart(12, '0')}`

function fixture() {
	return {
		employees: [
			{ id: E(1), name: 'Dana' },
			{ id: E(2), name: 'Lee' },
			{ id: E(3), name: 'Sam' },
		],
		agents: [
			{ id: A(1), name: 'BackedAgent', risk: 'critical', status: 'active', owner_id: E(1) },
			{ id: A(2), name: 'BareAgent', risk: 'low', status: 'active', owner_id: E(2) },
		],
		owners: [
			{ employee_id: E(1), backup_owner: 'Deputy' },  // Dana has a backup
			{ employee_id: E(2), backup_owner: null },      // Lee does not
		],
		workflows: [
			{ id: W(1), name: 'AutomatedFlow', risk: 'high', status: 'active' },
		],
		workflow_runbooks: [
			{ workflow_id: W(1), owner_id: E(1), is_documented: true },
		],
		workflow_steps: [
			{ workflow_id: W(1), step_number: 1, actor_type: 'system', actor_name: 'CI' },
			{ workflow_id: W(1), step_number: 2, actor_type: 'system', actor_name: 'CD' },
		],
		ai_platforms: [
			{ id: P(1), name: 'BackedPlatform', status: 'active' },
			{ id: P(2), name: 'LonePlatform', status: 'active' },
		],
		tool_ownership: [
			{ platform_id: P(1), employee_id: E(1) },
			{ platform_id: P(2), employee_id: E(2) },
		],
		tool_backups: [
			{ primary_platform: P(1), backup_platform: P(2) },
		],
		agent_platform: [
			{ agent_id: A(1), platform_id: P(1) },
			{ agent_id: A(2), platform_id: P(2) },
		],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: A(1), is_documented: true },
			{ asset_type: 'agent', asset_id: A(2), is_documented: false },
		],
		dependencies: [
			// a critical workflow depends on BackedAgent → nonzero blast radius
			{ source_type: 'workflow', source_id: W(1), target_type: 'agent', target_id: A(1), dependency_type: 'critical', strength: 90 },
		],
		workflow_failures: [],
		_counts: {},
	}
}

async function main() {
	console.log('\n=== OBA Core — Replaceability Intelligence tests ===\n')

	const roots = fixture()
	const context = riskEngine.buildEngine(roots)
	const result = replaceability(roots, context)
	const byName = Object.fromEntries(result.entities.map((e) => [e.name, e]))

	console.log('bench formula:')
	check('backup + 2 peers → capped at 100', benchScore(true, 2) === 100)
	check('no backup + 1 peer → 25', benchScore(false, 1) === 25)
	check('backup only → 50', benchScore(true, 0) === 50)
	check('nothing → 0', benchScore(false, 0) === 0)

	console.log('\ncomponent decomposition:')
	{
		const a = byName.BackedAgent
		check('documented agent reads doc 100', a.components.doc.score === 100, a.components.doc)
		check('agent on a backed platform reads alt 60', a.components.alt.score === 60, a.components.alt)
		check('bench reads owner backup (50) + same-type peers (25·N)', a.components.bench.ownerHasBackup === true && a.components.bench.score === 50 + 25 * a.components.bench.crossTrainedPeers, a.components.bench)
		check('K_i = 0.4·doc + 0.3·alt + 0.3·bench',
			a.replaceability === Math.round(0.4 * a.components.doc.score + 0.3 * a.components.alt.score + 0.3 * a.components.bench.score),
			{ K: a.replaceability, parts: a.components })
	}
	{
		const a = byName.BareAgent
		check('undocumented agent reads doc 0', a.components.doc.score === 0, a.components.doc)
		check('agent on an unbacked platform reads alt 20', a.components.alt.score === 20, a.components.alt)
		check('backup-less owner reads bench 0·50 + peers', a.components.bench.ownerHasBackup === false, a.components.bench)
		check('BareAgent is harder to replace than BackedAgent', a.replaceability < byName.BackedAgent.replaceability, { bare: a.replaceability, backed: byName.BackedAgent.replaceability })
	}
	{
		const p = byName.LonePlatform
		check('platform without a hot backup reads alt 0', p.components.alt.hotBackup === false && p.components.alt.score === 0, p.components.alt)
		const pb = byName.BackedPlatform
		check('platform with a hot backup reads alt 100', pb.components.alt.hotBackup === true && pb.components.alt.score === 100, pb.components.alt)
	}
	{
		const w = byName.AutomatedFlow
		check('fully machine-acted workflow reads alt 100 and doc 100', w.components.alt.via === 'fully-automated' && w.components.doc.score === 100, w.components)
	}

	console.log('\nbanding + quadrants:')
	check('band thresholds honored', bandFor(100) === 'EASY' && bandFor(70) === 'EASY' && bandFor(69) === 'MODERATE' && bandFor(45) === 'MODERATE' && bandFor(44) === 'DIFFICULT' && bandFor(20) === 'DIFFICULT' && bandFor(19) === 'IRREPLACEABLE')
	check('quadrant boundaries', quadrantFor(70, 40) === 'VULNERABLE_CORE' && quadrantFor(70, 60) === 'REPLACEABLE_CRITICALITY' && quadrantFor(30, 40) === 'NICHE_DEPENDENCY' && quadrantFor(30, 60) === 'COMMODITY_UTILITY')
	check('quadrant assignment is self-coherent with the reported criticality and K_i',
		result.entities.every((e) => e.quadrant === quadrantFor(e.criticality, e.replaceability)), result.entities.map((e) => [e.name, e.criticality, e.replaceability, e.quadrant]))
	check('a critical dependent gives BackedAgent more Engine A criticality than the isolated BareAgent',
		byName.BackedAgent.criticality > byName.BareAgent.criticality, { backed: byName.BackedAgent.criticality, bare: byName.BareAgent.criticality })
	check('quadrant summary counts match entities', result.quadrants.VULNERABLE_CORE.length + result.quadrants.REPLACEABLE_CRITICALITY.length + result.quadrants.NICHE_DEPENDENCY.length + result.quadrants.COMMODITY_UTILITY.length === result.entities.length, result.quadrants)

	console.log('\npopulation + ordering:')
	check('all 5 entities scored (2 agents, 1 workflow, 2 platforms)', result.entities.length === 5, result.entities.map((e) => e.name))
	check('sorted hardest-to-replace first', result.entities.every((e, i, arr) => i === 0 || arr[i - 1].replaceability <= e.replaceability || arr[i - 1].criticality >= e.criticality), result.entities.map((e) => [e.name, e.replaceability]))
	check('population counts are coherent', result.population.total === 5 && typeof result.population.vulnerableCore === 'number', result.population)

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'REPLACEABILITY TESTS PASSED ✅' : 'REPLACEABILITY TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})
