/*
 * OBA Core — Change → Impact engine tests (Phase 3.2).
 *
 * Pins: the seeded Engine A forward walk on the MUTATED topology (mass lands
 * downstream of the mutated node), the ΔOHI sign convention (damage-only
 * mutations never IMPROVE health), threshold behaviour at 0.15, and the
 * deterministic mitigation rules. Pure — no I/O.
 *
 * Run from backend/:  node tests/changeImpact.unit.test.js
 */

const { changeImpact, IMPACT_THRESHOLD } = require('../domain/changeImpact')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const A = (n) => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const W = (n) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const E = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function roots({ agentStatus = 'active', ownerAgent1 = E(1) } = {}) {
	return {
		employees: [{ id: E(1), name: 'Dana' }, { id: E(2), name: 'Lee' }],
		agents: [
			{ id: A(1), name: 'Hub', risk: 'critical', status: agentStatus, owner_id: ownerAgent1 },
			{ id: A(2), name: 'Spoke', risk: 'low', status: 'active', owner_id: E(2) },
		],
		owners: [{ employee_id: E(1), backup_owner: null }, { employee_id: E(2), backup_owner: 'Deputy' }],
		workflows: [
			{ id: W(1), name: 'Flow A', risk: 'critical', status: 'active' },
			{ id: W(2), name: 'Flow B', risk: 'high', status: 'active' },
			{ id: W(3), name: 'Flow C', risk: 'high', status: 'active' },
		],
		// Evidence-sufficient fixture: pillars()' orgScore (the OHI the delta
		// reads) is evidence-gated — GI needs every workflow runbook'd and
		// every platform policy'd; MI needs accountability rows + owners +
		// knowledge_assets; DI needs knowledge_assets + truth_claims. Without
		// those, ΔOHI is legitimately null (the Ironclad rule).
		workflow_runbooks: [
			{ workflow_id: W(1), owner_id: E(1), is_documented: true },
			{ workflow_id: W(2), owner_id: E(2), is_documented: true },
			{ workflow_id: W(3), owner_id: E(2), is_documented: true },
		],
		workflow_failures: [],
		dependencies: [
			{ source_type: 'workflow', source_id: W(1), target_type: 'agent', target_id: A(1), dependency_type: 'critical', strength: 95 },
			{ source_type: 'workflow', source_id: W(2), target_type: 'agent', target_id: A(1), dependency_type: 'critical', strength: 90 },
			{ source_type: 'workflow', source_id: W(3), target_type: 'agent', target_id: A(1), dependency_type: 'high', strength: 85 },
		],
		knowledge_assets: [
			{ id: 'ka-1', asset_type: 'agent', asset_id: A(1), is_documented: true },
			{ id: 'ka-2', asset_type: 'agent', asset_id: A(2), is_documented: true },
		],
		ai_platforms: [{ id: 'p1', name: 'GPT-4o', status: 'active' }],
		tool_policies: [{ platform_id: 'p1', policy_name: 'usage', status: 'active' }],
		tool_users: [], employee_agent: [], tool_ownership: [], tool_backups: [],
		accountability_entities: [
			{ id: 'ae-1', entity_name: 'Flow A', entity_type: 'workflow', department: 'Eng' },
			{ id: 'ae-2', entity_name: 'Hub', entity_type: 'agent', department: 'Eng' },
		],
		accountability_links: [
			{ entity_id: 'ae-1', person_name: 'Dana', raci_role: 'Responsible' },
			{ entity_id: 'ae-1', person_name: 'Lee', raci_role: 'Accountable' },
			{ entity_id: 'ae-2', person_name: 'Lee', raci_role: 'Responsible' },
			{ entity_id: 'ae-2', person_name: 'Dana', raci_role: 'Accountable' },
		],
		truth_claims: [{ id: 'tc-1', claim_text: 'Hub is documented', entity_name: 'Hub', is_verified: true }],
		decision_history: [], agent_platform: [], workflow_dependencies: [],
		policy_violations: [],
		_counts: {},
	}
}

console.log('\n=== OBA Core — Change → Impact tests ===\n')

console.log('forward cascade (agent node):')
{
	const before = roots()
	const after = roots({ agentStatus: 'failed' }) // Hub fails
	const impact = changeImpact(before, after, { mutationType: 'STATUS_CHANGED', targetType: 'agent', targetId: A(1), payload: { status: 'failed' } })

	check('three dependent workflows are impacted', impact.impactedEntities.workflows.length === 3, impact.impactedEntities)
	check('impacted list names the workflow uuids', impact.impactedEntities.workflows.includes(W(1)) && impact.impactedEntities.workflows.includes(W(3)), impact.impactedEntities)
	check('blast radius is a positive 0-100 number', impact.blastRadiusScore > 0 && impact.blastRadiusScore <= 100, impact.blastRadiusScore)
	// OHI is STRUCTURAL (ownership/runbook/policy coverage) — it deliberately
	// does not price an agent's runtime state; that is Engine B's job, and the
	// cascade signal here is the blast radius. A status flip alone moves ΔOHI
	// by exactly zero.
	check('a status flip alone does not move the structural health index', impact.healthDelta === 0, impact.healthDelta)
	check('mitigation recommends ownership/backup action for a failed critical asset',
		impact.mitigation.recommendations.some((r) => r.action === 'DESIGNATE_BACKUP' || r.action === 'ASSIGN_OWNER'), impact.mitigation)
}
{
	// healthy → healthy (no-op mutation): damage-free change must not
	// fabricate health damage
	const before = roots()
	const after = roots({ ownerAgent1: E(2) }) // owner changed, nothing else
	const impact = changeImpact(before, after, { mutationType: 'OWNER_ASSIGNED', targetType: 'agent', targetId: A(1), payload: { ownerId: E(2) } })
	check('an ownership handover with no structural change yields ΔOHI of 0 (or ~0)',
		impact.healthDelta != null && Math.abs(impact.healthDelta) < 0.5, impact.healthDelta)
	check('blast radius still reports the downstream set (walk runs regardless)',
		impact.impactedEntities.workflows.length === 3, impact.impactedEntities)
}

console.log('\nthreshold behaviour:')
check('IMPACT_THRESHOLD is the blueprint-authored 0.15', IMPACT_THRESHOLD === 0.15)
{
	// An agent nothing depends on: the walk runs but nothing crosses 0.15
	const before = roots()
	const after = roots()
	const impact = changeImpact(before, after, { mutationType: 'STATUS_CHANGED', targetType: 'agent', targetId: A(2), payload: { status: 'failed' } })
	check('an isolated node failure impacts nothing at the 0.15 line', impact.impactedEntities.workflows.length === 0 && impact.impactedEntities.agents.length === 0, impact.impactedEntities)
	check('blast radius for an isolated node is 0', impact.blastRadiusScore === 0, impact.blastRadiusScore)
}

console.log('\nstructural health (ΔOHI):')
{
	// What structurally moves OHI: backupCoverage = ownersWithBackup /
	// namedOwners. Losing the org's only recorded backup is exactly that.
	const before = roots()
	const after = roots()
	after.owners[1].backup_owner = null // Lee's backup designation lost
	const impact = changeImpact(before, after, { mutationType: 'BACKUP_LOST', targetType: 'employee', targetId: E(2), payload: {} })
	check('losing the org’s only backup degrades structural health (ΔOHI > 0)', impact.healthDelta > 0, impact.healthDelta)
}
{
	// What does NOT move OHI: an agent owner change. OHI's ownershipCoverage
	// reads knowledge_assets.owner_id (the documentation-ownership signal),
	// not agents.owner_id — an agent handover is priced by Engine B's
	// ownership evidence and the change log, not by the structural index.
	const before = roots()
	const after = roots({ ownerAgent1: null })
	const impact = changeImpact(before, after, { mutationType: 'OWNER_REMOVED', targetType: 'employee', targetId: E(1), payload: {} })
	check('agent-owner removal with unchanged documentation ownership leaves OHI flat', impact.healthDelta === 0, impact.healthDelta)
}

console.log('\nemployee seeding:')
{
	// OWNER_REMOVED for Dana (owns the Hub in the fixture): seeds Dana's
	// still-held assets from the BEFORE roots (they are unowned in the after)
	const before = roots()
	const after = roots({ ownerAgent1: null })
	const impact = changeImpact(before, after, { mutationType: 'OWNER_REMOVED', targetType: 'employee', targetId: E(1), payload: {} })
	check('removing an owner cascades through their former assets', impact.impactedEntities.workflows.length === 3, impact.impactedEntities)
	check('unowned critical asset triggers ASSIGN_OWNER with a concentration warning',
		impact.mitigation.recommendations.some((r) => r.action === 'ASSIGN_OWNER' && /splitting ownership/.test(r.detail)), impact.mitigation)
}

console.log('\ndeterminism:')
{
	const before = roots()
	const after = roots({ agentStatus: 'failed' })
	const a = changeImpact(before, after, { mutationType: 'STATUS_CHANGED', targetType: 'agent', targetId: A(1), payload: { status: 'failed' } })
	const b = changeImpact(before, after, { mutationType: 'STATUS_CHANGED', targetType: 'agent', targetId: A(1), payload: { status: 'failed' } })
	check('same inputs → identical envelope', JSON.stringify(a) === JSON.stringify(b))
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'CHANGE IMPACT TESTS PASSED ✅' : 'CHANGE IMPACT TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
