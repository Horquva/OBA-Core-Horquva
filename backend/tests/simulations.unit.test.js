/*
 * OBA Core â€” Simulation cascade/severity/health-delta unit test.
 *
 * domain/simulations.js is the one place "what happens if X leaves/fails/goes
 * down/is disrupted" is computed. These tests assert the shared primitives on
 * hand-built root bundles where the right answer is known by construction â€”
 * same pattern as derived.unit.test.js.
 *
 * Run from backend/:  node tests/simulations.unit.test.js
 */

const d = require('../domain/derived')
const s = require('../domain/simulations')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  âœ“', name) }
	else { failed++; console.error('  âœ—', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

console.log('\n=== OBA Core â€” Simulation Unit Test ===\n')

// â”€â”€ cascadeFrom: transitive reach beyond one hop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('cascadeFrom â€” transitive reach:')
{
	// 1 depends on 2, 2 depends on 3. If 3 fails, both 1 and 2 are impacted
	// (2 directly, 1 transitively) â€” a single-hop query would miss agent 1.
	const r = roots({
		dependencies: [
			{ source_id: 2, target_id: 3, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
		],
	})
	const idx = s.buildDependencyIndex(r)
	const hits = s.cascadeFrom('agent', 3, idx)
	const ids = hits.map((h) => h.id).sort()
	check('reaches both the direct and transitive dependent', ids.length === 2 && ids[0] === 1 && ids[1] === 2, ids)
}
{
	// No cycle should infinite-loop.
	const r = roots({
		dependencies: [
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
			{ source_id: 2, target_id: 1, source_type: 'agent', target_type: 'agent', dependency_type: 'high' },
		],
	})
	const idx = s.buildDependencyIndex(r)
	const hits = s.cascadeFrom('agent', 1, idx)
	check('a 2-cycle terminates and returns the one other node', hits.length === 1 && hits[0].id === 2, hits)
}

// â”€â”€ severityFor: reuses definitions.js's criticality vocabulary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nseverityFor â€” thresholds:')
{
	check('no impacted entities is low', s.severityFor([]) === 'low')
	check('one normal-criticality entity is medium', s.severityFor([{ criticality: 'normal' }]) === 'medium')
	check('any high-criticality entity is high even alone', s.severityFor([{ criticality: 'high' }]) === 'high')
	check('any critical-criticality entity is critical even alone', s.severityFor([{ criticality: 'critical' }]) === 'critical')
	check('5+ entities is critical regardless of criticality', s.severityFor([
		{ criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' }, { criticality: 'low' },
	]) === 'critical')
}

// â”€â”€ workflowsUsingAgents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nworkflowsUsingAgents:')
{
	const r = roots({
		workflows: [{ id: 100, name: 'Deploy Pipeline', status: 'active', risk: 'high' }],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 5, is_critical: true }],
	})
	const hit = s.workflowsUsingAgents(new Set([5]), r)
	check('finds the workflow using the given agent', hit.length === 1 && hit[0].id === 100, hit)
	check('an agent with no workflow membership finds nothing', s.workflowsUsingAgents(new Set([999]), r).length === 0)
}

// â”€â”€ healthDelta reuses orgHealth(), never a second formula â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nhealthDelta:')
{
	// orgHealth()'s healthIndex is gated on FIVE evidenceGate()s all being
	// sufficient (documentation, continuity, ownershipSpread, criticalSafety,
	// incidentLoad â€” derived.js:1008-1023), each requiring a non-empty
	// population (definitions.js's evidenceGate: "an EMPTY population is
	// always insufficient"). This fixture deliberately carries >=1 row in
	// knowledge_assets, owners, and workflows (agents already has 2) so
	// healthIndex resolves to a real number instead of null.
	const base = roots({
		agents: [
			{ id: 1, name: 'A', status: 'active', risk: 'high', owner_id: 10 },
			{ id: 2, name: 'B', status: 'active', risk: 'low', owner_id: 20 },
		],
		employees: [{ id: 10, name: 'Owner1' }, { id: 20, name: 'Owner2' }],
		owners: [{ id: 10, name: 'Owner1', employee_id: 10, backup_owner: 'Owner2' }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 1, is_documented: true }],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
		workflow_runbooks: [],
		workflow_failures: [],
	})
	const mutated = s.cloneRoots(base)
	mutated.agents = mutated.agents.filter((a) => a.id !== 1)
	const delta = s.healthDelta(base, mutated)
	check('removing an agent produces a numeric delta, not null', typeof delta === 'number', delta)
}

// â”€â”€ employeeLeaves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nemployeeLeaves:')
{
	// knowledge_assets + owners are populated (in addition to the existing
	// workflows row) purely so orgHealth()'s five evidenceGate()s are all
	// sufficient and healthDelta resolves to a real number, not null â€” see
	// the note on the same pattern in Task 2's healthDelta test above.
	// A second owners row (Priya, unrelated to Sarah) exercises the
	// backup_owner name-match clearing (Priya's backup_owner is 'Sarah').
	// Sarah's own owners row is kept, not removed, by employeeLeaves() (owner
	// decision, 2026-09-18) â€” see the dedicated test below.
	const r = roots({
		employees: [{ id: 1, name: 'Sarah', department: 'Eng' }],
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
			{ id: 2, name: 'Priya', employee_id: 2, backup_owner: 'Sarah' },
		],
	})

	const unknown = s.employeeLeaves(999, r)
	check('unknown employee returns null', unknown === null)

	const result = s.employeeLeaves(1, r)
	check('scenario names the employee', result.scenario === 'If Sarah leaves', result.scenario)
	const agentIds = result.impactedAgents.map((a) => a.id).sort()
	check('owned agent AND its transitive dependent are both impacted', agentIds.length === 2 && agentIds[0] === 10 && agentIds[1] === 11, agentIds)
	check('the workflow using the owned agent is impacted', result.impactedWorkflows.length === 1 && result.impactedWorkflows[0].id === 100, result.impactedWorkflows)
	check('severity reflects the critical owned agent', result.severity === 'critical', result.severity)
	check('healthDelta is a number', typeof result.healthDelta === 'number', result.healthDelta)
}

console.log('\nemployeeLeaves no longer improves continuity by shrinking the population (owner decision, 2026-09-18):')
{
	// Sarah's own owners row has no backup_owner. Priya's does exist and is
	// unrelated to Sarah, so the owners population doesn't empty out.
	// Sarah leaving must not move continuityScore's pct(ownersWithBackup,
	// owners.length) term at all -- under the old filter()-based removal,
	// owners.length dropped from 2 to 1 while ownersWithBackup (Sarah's row
	// had no backup_owner, so it was never in that count) stayed the same,
	// so the ratio jumped from 50% to 100%: an unbacked owner leaving looked
	// like an IMPROVEMENT in backup coverage.
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Priya', department: 'Eng' },
		],
		agents: [
			{ id: 10, name: 'DeployBot', status: 'active', risk: 'high', owner_id: 1 },
			// Keeps ownershipSpreadScore's evidenceGate (at least one agent with
			// owner_id != null) sufficient after Sarah's own agent goes unowned.
			{ id: 11, name: 'Other', status: 'active', risk: 'low', owner_id: 2 },
		],
		workflows: [{ id: 100, name: 'Release', status: 'active', risk: 'high' }],
		workflow_dependencies: [{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: null },
			{ id: 2, name: 'Priya', employee_id: 2, backup_owner: 'Someone Else' },
		],
	})

	const before = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })
	const result = s.employeeLeaves(1, r)
	const mutated = s.cloneRoots(r)
	mutated.employees = mutated.employees.filter((e) => e.id !== 1)
	mutated.agents = mutated.agents.map((a) => (a.owner_id === 1 ? { ...a, owner_id: null } : a))
	const after = d.orgHealth(mutated, { accountability: d.accountability(mutated), predictiveRisk: d.predictiveRisk(mutated) })

	check('owners.length is unchanged after a departure -- the ownership slot stays counted', mutated.owners.length === r.owners.length, mutated.owners.length)
	check('continuityScore does not improve when an unbacked owner departs', after.continuityScore <= before.continuityScore, { before: before.continuityScore, after: after.continuityScore })
	check('healthDelta is not negative -- an unbacked owner departing must not look like an improvement', typeof result.healthDelta === 'number' && result.healthDelta >= 0, result.healthDelta)
}

// â”€â”€ agentFails â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nagentFails:')
{
	const r = roots({
		agents: [
			{ id: 10, name: 'Core', status: 'active', risk: 'critical', owner_id: 1 },
			{ id: 11, name: 'Dependent', status: 'active', risk: 'high', owner_id: 2 },
			{ id: 12, name: 'Transitive', status: 'active', risk: 'low', owner_id: 3 },
		],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
			{ source_id: 12, target_id: 11, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
		],
	})

	check('unknown agent returns null', s.agentFails(999, r) === null)

	const result = s.agentFails(10, r)
	const ids = result.impactedAgents.map((a) => a.id).sort()
	check('reaches direct and transitive dependents, excludes itself', ids.length === 2 && ids[0] === 11 && ids[1] === 12, ids)
	check('impactedPeople is empty for an agent scenario', result.impactedPeople.length === 0)
}

console.log('\nagentFails no longer improves health by shrinking the population (owner decision, 2026-09-18):')
{
	// Agent 1 is pushed to CRITICAL threat level by construction (NO_OWNER 35 +
	// DEPENDENTS_MANY 25 + INTRINSIC_CRITICAL 20 = 80, >= threatLevel's 75 cutoff
	// -- the 3 dependency rows below don't need real agent rows behind their
	// source ids, predictiveRisk() only counts the edges). Under the old
	// filter()-based removal, failing agent 1 would drop BOTH the numerator
	// (0 critical left) and the denominator (1 agent left) of
	// criticalSafetyScore's pct(criticalThreats, agents.length) at once,
	// scoring a perfect 100 -- a critical agent failing looked like the org
	// getting healthier.
	const r = roots({
		agents: [
			{ id: 1, name: 'Critical', status: 'active', risk: 'critical', owner_id: null },
			{ id: 2, name: 'Other', status: 'active', risk: 'low', owner_id: 20 },
		],
		employees: [{ id: 20, name: 'Owner2' }],
		owners: [{ id: 20, name: 'Owner2', employee_id: 20, backup_owner: 'Backup Person' }],
		dependencies: [
			{ source_id: 90, target_id: 1, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
			{ source_id: 91, target_id: 1, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
			{ source_id: 92, target_id: 1, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
		],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 1, is_documented: true }],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
	})

	const before = d.predictiveRisk(r).scores.find((x) => x.agentId === 1)
	check('fixture setup: agent 1 is CRITICAL threat before failing', before?.threatLevel === 'CRITICAL', before)

	const result = s.agentFails(1, r)
	check(
		'healthDelta is not negative -- a critical agent failing must not look like an improvement',
		typeof result.healthDelta === 'number' && result.healthDelta >= 0,
		result.healthDelta,
	)

	// Prove the mechanism directly: the mutated roots still count the agent,
	// marked failed rather than removed.
	const mutated = s.cloneRoots(r)
	mutated.agents = mutated.agents.map((a) => (a.id === 1 ? { ...a, status: 'failed' } : a))
	check('agents.length is unchanged after a failure -- the agent stays counted', mutated.agents.length === r.agents.length, mutated.agents.length)
	const afterRisk = d.predictiveRisk(mutated).scores.find((x) => x.agentId === 1)
	check('the failed agent is still CRITICAL, not silently gone from the population', afterRisk?.threatLevel === 'CRITICAL', afterRisk)
}

// â”€â”€ platformDown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nplatformDown:')
{
	const r = roots({
		ai_platforms: [{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' }],
		agents: [
			{ id: 10, name: 'User1', status: 'active', risk: 'high', owner_id: 1 },
			{ id: 11, name: 'Downstream', status: 'active', risk: 'low', owner_id: 2 },
		],
		agent_platform: [{ id: 1, agent_id: 10, platform_id: 50 }],
		dependencies: [
			{ source_id: 11, target_id: 10, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' },
		],
	})

	check('unknown platform returns null', s.platformDown(999, r) === null)

	const result = s.platformDown(50, r)
	const ids = result.impactedAgents.map((a) => a.id).sort()
	check('reaches the agent on the platform AND its transitive dependent', ids.length === 2 && ids[0] === 10 && ids[1] === 11, ids)
}

console.log('\nplatformDown no longer improves continuity by shrinking the population (owner decision, 2026-09-18):')
{
	// Platform 51 is backed via tool_backups, platform 50 is not. Taking the
	// UNBACKED platform down must not move continuityScore's
	// pct(platformsWithBackup, ai_platforms.length) term at all -- under the
	// old filter()-based removal, ai_platforms.length dropped from 2 to 1
	// while platformsWithBackup (read from tool_backups, untouched by this
	// mutation) stayed at 1, so the ratio jumped from 50% to 100%: an
	// unrelated platform outage looked like an IMPROVEMENT in backup
	// coverage.
	const r = roots({
		ai_platforms: [
			{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' },
			{ id: 51, name: 'OtherAPI', type: 'llm', status: 'active' },
		],
		tool_backups: [{ id: 1, primary_platform: 51, backup_platform: 'Backup' }],
		agents: [{ id: 10, name: 'User1', status: 'active', risk: 'high', owner_id: 1 }],
		agent_platform: [{ id: 1, agent_id: 10, platform_id: 50 }],
		employees: [{ id: 1, name: 'Owner1' }],
		owners: [{ id: 1, name: 'Owner1', employee_id: 1, backup_owner: null }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
	})

	const before = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })
	const result = s.platformDown(50, r)
	const mutated = s.cloneRoots(r)
	mutated.ai_platforms = mutated.ai_platforms.map((p) => (p.id === 50 ? { ...p, status: 'down' } : p))
	const after = d.orgHealth(mutated, { accountability: d.accountability(mutated), predictiveRisk: d.predictiveRisk(mutated) })

	check('ai_platforms.length is unchanged after an outage -- the platform stays counted', mutated.ai_platforms.length === r.ai_platforms.length, mutated.ai_platforms.length)
	check('continuityScore does not improve when an unbacked platform goes down', after.continuityScore <= before.continuityScore, { before: before.continuityScore, after: after.continuityScore })
	check('healthDelta is not negative -- an unbacked platform outage must not look like an improvement', typeof result.healthDelta === 'number' && result.healthDelta >= 0, result.healthDelta)
}

// â”€â”€ workflowDisruption â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nworkflowDisruption:')
{
	const r = roots({
		workflows: [
			{ id: 100, name: 'Release', status: 'active', risk: 'high' },
			{ id: 101, name: 'Hotfix', status: 'active', risk: 'critical' },
		],
		agents: [
			{ id: 10, name: 'Shared', status: 'active', risk: 'high', owner_id: 1 },
		],
		workflow_dependencies: [
			{ id: 1, workflow_id: 100, agent_id: 10, is_critical: true },
			{ id: 2, workflow_id: 101, agent_id: 10, is_critical: false },
		],
	})

	check('unknown workflow returns null', s.workflowDisruption(999, r) === null)

	const result = s.workflowDisruption(100, r)
	const wfIds = result.impactedWorkflows.map((w) => w.id).sort()
	check('includes itself and the sibling workflow sharing the same agent', wfIds.length === 2 && wfIds[0] === 100 && wfIds[1] === 101, wfIds)
	check('the shared agent is impacted', result.impactedAgents.some((a) => a.id === 10))
}

// â”€â”€ compoundScenario â€” simultaneous multi-node removal (AI-8) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\ncompoundScenario:')
{
	// Hand-checked fixture. "X depends on Y" is dependencies row source=X target=Y.
	//
	//   Ahmed(1) owns Alpha(10).   Sara(2) owns Beta(11), Gamma(12), Delta(13).
	//   Gamma(12) depends on Beta(11).   Delta(13) runs on platform 50.
	//   WfA(100) uses Alpha.  WfShared(101) uses Alpha AND Gamma.
	//   WfB(104) uses Beta.   WfUnrelated(105) uses Delta.
	//
	// By hand:
	//   Ahmed leaves      -> agents {10},        workflows {100,101}
	//   Beta(11) fails    -> agents {12},        workflows {104,101}   (Gamma cascades)
	//   BOTH together     -> agents {10,12},     workflows {100,101,104}, people {Ahmed}
	//                        101 is reached by both removals but counted ONCE.
	//                        Delta(13) and WfUnrelated(105) are untouched.
	//   Entities: singles = 3 each (high); combined = 2 agents + 3 workflows = 5 (critical).
	const r = roots({
		employees: [{ id: 1, name: 'Ahmed', department: 'Eng' }, { id: 2, name: 'Sara', department: 'Ops' }],
		agents: [
			{ id: 10, name: 'Alpha', status: 'active', risk: 'low', owner_id: 1 },
			{ id: 11, name: 'Beta', status: 'active', risk: 'low', owner_id: 2 },
			{ id: 12, name: 'Gamma', status: 'active', risk: 'low', owner_id: 2 },
			{ id: 13, name: 'Delta', status: 'active', risk: 'low', owner_id: 2 },
		],
		dependencies: [{ source_id: 12, target_id: 11, source_type: 'agent', target_type: 'agent', dependency_type: 'normal' }],
		ai_platforms: [{ id: 50, name: 'ClaudeAPI', type: 'llm', status: 'active' }],
		agent_platform: [{ id: 1, agent_id: 13, platform_id: 50 }],
		workflows: [
			{ id: 100, name: 'WfA', status: 'active', risk: 'low' },
			{ id: 101, name: 'WfShared', status: 'active', risk: 'low' },
			{ id: 104, name: 'WfB', status: 'active', risk: 'low' },
			{ id: 105, name: 'WfUnrelated', status: 'active', risk: 'low' },
		],
		workflow_dependencies: [
			{ id: 1, workflow_id: 100, agent_id: 10, is_critical: false },
			{ id: 2, workflow_id: 101, agent_id: 10, is_critical: false },
			{ id: 3, workflow_id: 101, agent_id: 12, is_critical: false },
			{ id: 4, workflow_id: 104, agent_id: 11, is_critical: false },
			{ id: 5, workflow_id: 105, agent_id: 13, is_critical: false },
		],
		// populated only so orgHealth()'s evidence gates pass and healthDelta is a real number
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [{ id: 1, name: 'Ahmed', employee_id: 1, backup_owner: null }],
	})
	const ids = (rows) => rows.map((x) => x.id).sort((a, b) => a - b)
	const both = [{ type: 'employee', id: 1 }, { type: 'agent', id: 11 }]

	const c = s.compoundScenario(both, r)
	check('combined agents are exactly {Alpha, Gamma}', JSON.stringify(ids(c.impactedAgents)) === '[10,12]', ids(c.impactedAgents))
	check('combined workflows are exactly {100,101,104}; shared 101 counted once', JSON.stringify(ids(c.impactedWorkflows)) === '[100,101,104]', ids(c.impactedWorkflows))
	check('unrelated agent and workflow are not impacted', !c.impactedAgents.some((a) => a.id === 13) && !c.impactedWorkflows.some((w) => w.id === 105))
	check('the leaving employee is in impactedPeople', c.impactedPeople.length === 1 && c.impactedPeople[0].id === 1, c.impactedPeople)
	check('scenario text names both events', c.scenario === 'If Ahmed leaves and Beta fails', c.scenario)
	check('targets lists each removal with its individual result', c.targets.length === 2 && c.targets[0].name === 'Ahmed' && c.targets[1].name === 'Beta', c.targets)

	const solo1 = s.employeeLeaves(1, r)
	const solo2 = s.agentFails(11, r)
	check('each removal alone stays below critical', solo1.severity === 'high' && solo2.severity === 'high', [solo1.severity, solo2.severity])
	check('combined crosses into critical â€” worse than either alone', c.severity === 'critical', c.severity)

	const rev = s.compoundScenario([...both].reverse(), r)
	check('order of removals does not change the blast radius',
		JSON.stringify(ids(rev.impactedAgents)) === JSON.stringify(ids(c.impactedAgents)) &&
		JSON.stringify(ids(rev.impactedWorkflows)) === JSON.stringify(ids(c.impactedWorkflows)) &&
		rev.severity === c.severity && rev.healthDelta === c.healthDelta)

	const manual = s.cloneRoots(r)
	manual.employees = manual.employees.filter((e) => e.id !== 1)
	manual.agents = manual.agents.map((a) => (a.owner_id === 1 ? { ...a, owner_id: null } : a)).filter((a) => a.id !== 11)
	s.recount(manual)
	check('healthDelta is a number', typeof c.healthDelta === 'number', c.healthDelta)
	check('healthDelta is computed on ONE snapshot with both removals applied', c.healthDelta === s.healthDelta(r, manual), [c.healthDelta, s.healthDelta(r, manual)])

	// Health is not additive. Beta and Delta failing independently move health by
	// -2 each, yet failing together it moves by -7 (not -4, and not either alone) â€”
	// so a compound must apply BOTH removals to one snapshot, never sum singles.
	const pair = [{ type: 'agent', id: 11 }, { type: 'agent', id: 13 }]
	const pairResult = s.compoundScenario(pair, r)
	const pairManual = s.cloneRoots(r)
	pairManual.agents = pairManual.agents.filter((a) => a.id !== 11 && a.id !== 13)
	s.recount(pairManual)
	const soloBeta = s.agentFails(11, r).healthDelta
	const soloDelta = s.agentFails(13, r).healthDelta
	check('two independent failures: healthDelta equals both removed from one snapshot', pairResult.healthDelta === s.healthDelta(r, pairManual), [pairResult.healthDelta, s.healthDelta(r, pairManual)])
	check('...and differs from either failure alone', pairResult.healthDelta !== soloBeta && pairResult.healthDelta !== soloDelta, [pairResult.healthDelta, soloBeta, soloDelta])
	check('...and is not the sum of the individual deltas', pairResult.healthDelta !== soloBeta + soloDelta, [pairResult.healthDelta, soloBeta + soloDelta])

	// A single-element compound must be indistinguishable from the single-node scenario.
	const one = s.compoundScenario([{ type: 'employee', id: 1 }], r)
	check('single-element compound matches employeeLeaves exactly',
		JSON.stringify(ids(one.impactedAgents)) === JSON.stringify(ids(solo1.impactedAgents)) &&
		JSON.stringify(ids(one.impactedWorkflows)) === JSON.stringify(ids(solo1.impactedWorkflows)) &&
		one.severity === solo1.severity && one.healthDelta === solo1.healthDelta)
	const oneAgent = s.compoundScenario([{ type: 'agent', id: 11 }], r)
	check('single-element compound matches agentFails exactly',
		JSON.stringify(ids(oneAgent.impactedAgents)) === JSON.stringify(ids(solo2.impactedAgents)) &&
		JSON.stringify(ids(oneAgent.impactedWorkflows)) === JSON.stringify(ids(solo2.impactedWorkflows)) &&
		oneAgent.severity === solo2.severity && oneAgent.healthDelta === solo2.healthDelta)

	// Overlapping removals: Gamma is already inside Beta's cascade.
	const overlap = s.compoundScenario([{ type: 'agent', id: 11 }, { type: 'agent', id: 12 }], r)
	check('overlapping removals do not double-count', JSON.stringify(ids(overlap.impactedAgents)) === '[12]' && JSON.stringify(ids(overlap.impactedWorkflows)) === '[101,104]', [ids(overlap.impactedAgents), ids(overlap.impactedWorkflows)])

	// Mixed node types.
	const mixed = s.compoundScenario([{ type: 'employee', id: 1 }, { type: 'platform', id: 50 }], r)
	check('employee + platform combine: {Alpha, Delta} and their workflows', JSON.stringify(ids(mixed.impactedAgents)) === '[10,13]' && JSON.stringify(ids(mixed.impactedWorkflows)) === '[100,101,105]', [ids(mixed.impactedAgents), ids(mixed.impactedWorkflows)])
	const wf = s.compoundScenario([{ type: 'workflow', id: 104 }, { type: 'employee', id: 1 }], r)
	check('workflow + employee combine without error', wf && wf.impactedWorkflows.some((w) => w.id === 104) && wf.impactedWorkflows.some((w) => w.id === 100))

	// Duplicates and bad input.
	const dup = s.compoundScenario([...both, ...both], r)
	check('duplicate removals are ignored', dup.targets.length === 2 && dup.severity === c.severity)
	check('empty removal list returns null', s.compoundScenario([], r) === null)
	check('non-array input returns null', s.compoundScenario(undefined, r) === null)
	check('any unknown target returns null', s.compoundScenario([{ type: 'employee', id: 1 }, { type: 'agent', id: 999 }], r) === null)
	check('unknown node type returns null', s.compoundScenario([{ type: 'vendor', id: 1 }], r) === null)
	check('the input roots are not mutated', r.employees.length === 2 && r.agents.length === 4 && r.agents[0].owner_id === 1)
console.log('\nworkflowDisruption no longer improves continuity by shrinking the population (owner decision, 2026-09-18):')
{
	// Workflow 100 has a documented runbook, workflow 101 does not. Disrupting
	// the UNDOCUMENTED workflow must not move continuityScore's
	// pct(documentedRunbooks, workflows.length) term at all -- under the old
	// filter()-based removal, workflows.length dropped from 2 to 1 while
	// documentedRunbooks (read from workflow_runbooks, untouched by this
	// mutation) stayed at 1, so the ratio jumped from 50% to 100%: disrupting
	// the one workflow with no runbook looked like an IMPROVEMENT in runbook
	// coverage.
	const r = roots({
		workflows: [
			{ id: 100, name: 'Release', status: 'active', risk: 'high' },
			{ id: 101, name: 'Hotfix', status: 'active', risk: 'critical' },
		],
		workflow_runbooks: [{ id: 1, workflow_id: 100, is_documented: true }],
		agents: [{ id: 10, name: 'Shared', status: 'active', risk: 'high', owner_id: 1 }],
		workflow_dependencies: [{ id: 1, workflow_id: 101, agent_id: 10, is_critical: true }],
		employees: [{ id: 1, name: 'Owner1' }],
		owners: [{ id: 1, name: 'Owner1', employee_id: 1, backup_owner: null }],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
	})

	const before = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })
	const result = s.workflowDisruption(101, r)
	const mutated = s.cloneRoots(r)
	mutated.workflows = mutated.workflows.map((w) => (w.id === 101 ? { ...w, status: 'disrupted' } : w))
	const after = d.orgHealth(mutated, { accountability: d.accountability(mutated), predictiveRisk: d.predictiveRisk(mutated) })

	check('workflows.length is unchanged after a disruption -- the workflow stays counted', mutated.workflows.length === r.workflows.length, mutated.workflows.length)
	check('continuityScore does not improve when an undocumented workflow is disrupted', after.continuityScore <= before.continuityScore, { before: before.continuityScore, after: after.continuityScore })
	check('healthDelta is not negative -- an undocumented workflow disruption must not look like an improvement', typeof result.healthDelta === 'number' && result.healthDelta >= 0, result.healthDelta)
}

// â”€â”€ rankAllScenarios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('\nrankAllScenarios:')
{
	// knowledge_assets/owners/workflows populated so healthDelta is a real
	// number for every candidate (same evidence-gate reasoning as Task 2/3's
	// tests) â€” otherwise every entry's healthDelta is null and the sort-order
	// check below passes vacuously (JS coerces null >= null to true) without
	// actually exercising the sort.
	const r = roots({
		employees: [
			{ id: 1, name: 'Sarah', department: 'Eng' },
			{ id: 2, name: 'Bob', department: 'Ops' },
		],
		agents: [
			{ id: 10, name: 'Minor', status: 'active', risk: 'low', owner_id: 1 },
			{ id: 11, name: 'Critical', status: 'active', risk: 'critical', owner_id: 2 },
		],
		dependencies: [],
		knowledge_assets: [{ id: 1, asset_type: 'agent', asset_id: 10, is_documented: true }],
		owners: [
			{ id: 1, name: 'Sarah', employee_id: 1, backup_owner: 'Bob' },
			{ id: 2, name: 'Bob', employee_id: 2, backup_owner: null },
		],
		workflows: [{ id: 1, name: 'Wf', status: 'active', risk: 'low' }],
		workflow_runbooks: [],
		workflow_failures: [],
	})

	const ranked = s.rankAllScenarios(r)
	check('returns a non-empty ranked list', Array.isArray(ranked) && ranked.length > 0, ranked.length)
	check('every entry has a real numeric healthDelta, not null', ranked.every((res) => typeof res.healthDelta === 'number'), ranked.map((x) => x.healthDelta))
	check('sorted worst-first by healthDelta', ranked.every((res, i) => i === 0 || ranked[i - 1].healthDelta >= res.healthDelta), ranked.map((x) => x.healthDelta))
	check('every entry has a severity', ranked.every((res) => ['low', 'medium', 'high', 'critical'].includes(res.severity)))
}

console.log('\n========================================')
console.log(`${passed} passed, ${failed} failed`)
console.log('========================================\n')
process.exit(failed === 0 ? 0 : 1)
