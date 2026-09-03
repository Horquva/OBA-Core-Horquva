/*
 * OBA Core — Derived intelligence unit test.
 *
 * domain/derived.js replaced six tables that were seeded once and never written
 * again. The risk in that trade is subtle: a frozen number is at least obviously
 * wrong once you know it is frozen, whereas a WRONGLY COMPUTED number looks
 * healthy forever. So these tests assert the DEFINITIONS, on hand-built root
 * bundles where the right answer is known by construction.
 *
 * No database and no network — every function here is pure over its roots.
 *
 * Run from backend/:  node tests/derived.unit.test.js
 */

const d = require('../domain/derived')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

/** Builds a roots bundle with every table present and `_counts` populated. */
function roots(overrides = {}) {
	const base = {}
	for (const t of d.ROOT_TABLES) base[t] = []
	const merged = { ...base, ...overrides }
	merged._counts = Object.fromEntries(d.ROOT_TABLES.map((t) => [t, merged[t].length]))
	return merged
}

console.log('\n=== OBA Core — Derived Intelligence Unit Test ===\n')

// ── Accountability ───────────────────────────────────────────────────────────
console.log('Accountability — RACI scoring:')
{
	const r = roots({
		accountability_entities: [
			{ id: 1, entity_name: 'Separated', entity_type: 'workflow', department: 'Eng' },
			{ id: 2, entity_name: 'SamePerson', entity_type: 'workflow', department: 'Eng' },
			{ id: 3, entity_name: 'OnlyResponsible', entity_type: 'agent', department: 'Ops' },
			{ id: 4, entity_name: 'Nobody', entity_type: 'agent', department: 'Ops' },
		],
		accountability_links: [
			{ entity_id: 1, person_name: 'Ana', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'Ben', raci_role: 'Accountable' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Responsible' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Accountable' },
			{ entity_id: 3, person_name: 'Dee', raci_role: 'Responsible' },
			// Consulted must NOT rescue an entity that has no Responsible.
			{ entity_id: 4, person_name: 'Eve', raci_role: 'Consulted' },
			{ entity_id: 4, person_name: 'Fay', raci_role: 'Informed' },
		],
	})
	const a = d.accountability(r)
	const by = Object.fromEntries(a.perEntity.map((e) => [e.entityName, e]))

	check('R and A held by different people scores 100', by.Separated.score === 100, by.Separated.score)
	check('one person holding both scores lower', by.SamePerson.score === d.constants.RACI_BOTH_SAME_PERSON, by.SamePerson.score)
	check('...and is counted as a separation-of-duties violation', a.sameRandACount === 1, a.sameRandACount)
	check('missing Accountable scores partial', by.OnlyResponsible.score === d.constants.RACI_ONE_ONLY, by.OnlyResponsible.score)
	check('Consulted/Informed alone scores zero', by.Nobody.score === 0, by.Nobody.score)
	check('...and Consulted/Informed do not count as accountability', by.Nobody.missingResponsible && by.Nobody.missingAccountable)
	check('org score is the mean of its entities', a.accountabilityScore === Math.round((100 + 60 + 40 + 0) / 4), a.accountabilityScore)
	check('entitiesWithLinks counts entities, not links', a.entitiesWithLinks === 4, a.entitiesWithLinks)
	// Ana, Ben, Cal (twice), Dee, Eve, Fay -> 6 distinct. Consulted and Informed
	// DO count here even though they do not score: this is a concentration
	// measure ("how few people does everything run through"), and someone who is
	// only ever consulted is still a person the organization depends on knowing.
	check('uniquePeopleCount deduplicates across all RACI roles', a.uniquePeopleCount === 6, a.uniquePeopleCount)
	check('provenance names its inputs', a.source === 'live' && a.inputs.accountability_links === 7, a.inputs)
}

// ── Accountability evidence gate (D-07, D-10) ──────────────────────────────
console.log('\nAccountability — evidence gate:')
{
	const empty = d.accountability(roots())
	check('zero entities is insufficient evidence, not a CRITICAL score',
		empty.evidence.sufficient === false && empty.accountabilityScore === null && empty.status === null,
		empty)
	check('...but provenance is still reported', empty.source === 'live' && typeof empty.computedAt === 'string', empty)

	const mostlyUnlinked = roots({
		accountability_entities: [
			{ id: 1, entity_name: 'Linked', entity_type: 'workflow', department: 'Eng' },
			{ id: 2, entity_name: 'Bare2', entity_type: 'workflow', department: 'Eng' },
			{ id: 3, entity_name: 'Bare3', entity_type: 'agent', department: 'Ops' },
		],
		accountability_links: [
			{ entity_id: 1, person_name: 'Ana', raci_role: 'Responsible' },
		],
	})
	const under = d.accountability(mostlyUnlinked)
	check('1 of 3 entities linked (33%) is below the 50% threshold', under.evidence.coverage < 0.5, under.evidence)
	check('...so it is insufficient too', under.evidence.sufficient === false && under.accountabilityScore === null, under)

	const r = roots({
		accountability_entities: [
			{ id: 1, entity_name: 'Separated', entity_type: 'workflow', department: 'Eng' },
			{ id: 2, entity_name: 'SamePerson', entity_type: 'workflow', department: 'Eng' },
			{ id: 3, entity_name: 'OnlyResponsible', entity_type: 'agent', department: 'Ops' },
			{ id: 4, entity_name: 'Nobody', entity_type: 'agent', department: 'Ops' },
		],
		accountability_links: [
			{ entity_id: 1, person_name: 'Ana', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'Ben', raci_role: 'Accountable' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Responsible' },
			{ entity_id: 2, person_name: 'Cal', raci_role: 'Accountable' },
			{ entity_id: 3, person_name: 'Dee', raci_role: 'Responsible' },
			{ entity_id: 4, person_name: 'Eve', raci_role: 'Consulted' },
			{ entity_id: 4, person_name: 'Fay', raci_role: 'Informed' },
		],
	})
	const full = d.accountability(r)
	check('all 4 entities carry a link (even Consulted/Informed-only) — evidence is sufficient',
		full.evidence.sufficient === true && full.accountabilityScore === 50, full.evidence)
	check('a real, evidenced score is still allowed through, not gated away', full.status === 'WEAK', full.status)
}

// ── Root table coverage (W-I) ──────────────────────────────────────────────
console.log('\nRoot tables — W-I additions:')
{
	check('ROOT_TABLES includes agent_platform', d.ROOT_TABLES.includes('agent_platform'))
	check('ROOT_TABLES includes workflow_dependencies', d.ROOT_TABLES.includes('workflow_dependencies'))
	check('dependencyIndex is exported', typeof d.dependencyIndex === 'function')

	const r = roots({
		dependencies: [
			{ source_id: 1, target_id: 2, source_type: 'agent', target_type: 'agent', dependency_type: 'critical' },
		],
	})
	const idx = d.dependencyIndex(r)
	const hit = idx.dependentsOf.get(idx.key('agent', 2))
	check('dependencyIndex finds the dependent of a target', Array.isArray(hit) && hit.length === 1 && hit[0].id === 1, hit)
}

// ── Collaboration ────────────────────────────────────────────────────────────
console.log('\nCollaboration — adoption, dependency, concentration:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Power', department: 'Eng' },
			{ id: 2, name: 'Light', department: 'Eng' },
			{ id: 3, name: 'Absent', department: 'Ops' },
		],
		tool_users: [
			{ employee_id: 1, platform_id: 1, usage_level: 'power' },
			{ employee_id: 1, platform_id: 2, usage_level: 'power' },
			{ employee_id: 2, platform_id: 1, usage_level: 'rare' },
		],
		employee_agent: [{ employee_id: 1, agent_id: 1, role: 'operator' }],
		// agents.owner_id references employees.id directly, NOT owners.id --
		// owner_id here is 1/2 to match employees.id, not owners.id (10/11).
		owners: [
			{ id: 10, name: 'Power', employee_id: 1, backup_owner: null },
			{ id: 11, name: 'Light', employee_id: 2, backup_owner: 'Someone' },
		],
		agents: [
			{ id: 1, name: 'Critical1', risk: 'critical', owner_id: 1 },
			{ id: 2, name: 'Critical2', risk: 'high', owner_id: 1 },
			{ id: 3, name: 'Minor', risk: 'low', owner_id: 2 },
		],
	})
	const c = d.collaboration(r)
	const by = Object.fromEntries(c.perEmployee.map((e) => [e.name, e]))

	check('people touching no AI are excluded, not scored zero', !by.Absent && c.perEmployee.length === 2, c.perEmployee.map((e) => e.name))
	check('summary reports how many of the workforce it scored', c.summary.peopleScored === 2 && c.summary.peopleTotal === 3, c.summary)
	check('heavy usage outscores light usage', by.Power.adoptionScore > by.Light.adoptionScore, [by.Power.adoptionScore, by.Light.adoptionScore])
	check('only critical/high owned agents raise dependency', by.Power.criticalAgentsOwned === 2, by.Power.criticalAgentsOwned)
	check('a low-risk owned agent does not', by.Light.criticalAgentsOwned === 0, by.Light.criticalAgentsOwned)
	check('no named backup increases dependency', by.Power.dependencyScore ===
		2 * d.constants.DEPENDENCY_PER_CRITICAL_ASSET + d.constants.DEPENDENCY_NO_BACKUP, by.Power.dependencyScore)
	check('concentration lowers the collaboration score despite high adoption',
		by.Power.collaborationScore < by.Power.adoptionScore, [by.Power.collaborationScore, by.Power.adoptionScore])
	check('org dependency is the PEAK, not the average', c.summary.humanDependencyScore === by.Power.dependencyScore, c.summary.humanDependencyScore)
	check('...and the mean is reported alongside it', c.summary.meanDependencyScore < c.summary.humanDependencyScore, c.summary)
	check('the peak names the person it came from', c.summary.highestDependencyEmployee === 'Power', c.summary.highestDependencyEmployee)
	check('a severe peak is not labelled reassuringly', c.summary.dependencyLevel === 'SEVERE', c.summary.dependencyLevel)
}

// ── Collaboration evidence gate (D-07, D-10) ───────────────────────────────
console.log('\nCollaboration — evidence gate:')
{
	const empty = d.collaboration(roots())
	check('zero employees is insufficient evidence',
		empty.summary.evidence.sufficient === false, empty.summary.evidence)
	check('...so every summary verdict is null, not a fabricated MINIMAL/POOR',
		empty.summary.aiAdoptionScore === null && empty.summary.adoptionLevel === null &&
		empty.summary.collaborationScore === null && empty.summary.collaborationLevel === null &&
		empty.summary.dependencyLevel === null, empty.summary)
	check('peopleScored/peopleTotal still report zero, not null', empty.summary.peopleScored === 0 && empty.summary.peopleTotal === 0, empty.summary)

	const oneEmployeeNoAI = d.collaboration(roots({ employees: [{ id: 1, name: 'Solo', department: 'Eng' }] }))
	check('employees exist but none touch AI — a real zero, evidence is sufficient',
		oneEmployeeNoAI.summary.evidence.sufficient === true && oneEmployeeNoAI.summary.aiAdoptionScore === 0,
		oneEmployeeNoAI.summary)
}

// ── Predictive risk ──────────────────────────────────────────────────────────
console.log('\nPredictive risk — factors and emergence:')
{
	const r = roots({
		// agents.owner_id references employees.id directly, NOT owners.id (see
		// routes/ownership.js's header comment) -- owner_id here is 1/2 to match
		// owners.employee_id below, not owners.id (10/11).
		agents: [
			{ id: 1, name: 'Fragile', risk: 'low', status: 'active', owner_id: 1 },
			{ id: 2, name: 'Safe', risk: 'low', status: 'active', owner_id: 2 },
			{ id: 3, name: 'Downstream', risk: 'low', status: 'active', owner_id: 2 },
		],
		owners: [
			{ id: 10, name: 'Solo', employee_id: 1, backup_owner: null },
			{ id: 11, name: 'Covered', employee_id: 2, backup_owner: 'Deputy' },
		],
		workflows: [{ id: 1, name: 'CriticalFlow', risk: 'critical' }],
		dependencies: [
			// Fragile is depended on by a critical workflow and by an agent.
			{ source_id: 1, source_type: 'workflow', target_id: 1, target_type: 'agent', dependency_type: 'critical' },
			{ source_id: 3, source_type: 'agent', target_id: 1, target_type: 'agent', dependency_type: 'high' },
		],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: false, owner_id: 1 }],
	})
	const p = d.predictiveRisk(r)
	const by = Object.fromEntries(p.scores.map((s) => [s.agentName, s]))

	check('every agent is assessed', p.scores.length === 3, p.scores.length)
	check('results are ordered worst-first', p.scores[0].agentName === 'Fragile', p.scores.map((s) => s.agentName))
	check('an owner with no backup contributes single_owner',
		by.Fragile.contributingFactors.single_owner === d.constants.RISK_FACTORS.SINGLE_OWNER, by.Fragile.contributingFactors)
	check('an owner WITH a backup does not', by.Safe.contributingFactors.single_owner === undefined, by.Safe.contributingFactors)
	check('a high-risk dependent workflow contributes critical_workflow',
		by.Fragile.contributingFactors.critical_workflow === d.constants.RISK_FACTORS.CRITICAL_WORKFLOW, by.Fragile.contributingFactors)
	check('undocumented knowledge contributes', by.Fragile.contributingFactors.undocumented === d.constants.RISK_FACTORS.UNDOCUMENTED)
	check('score is the sum of its factors',
		by.Fragile.predictedScore === Object.values(by.Fragile.contributingFactors).reduce((a, b) => a + b, 0), by.Fragile.predictedScore)
	check('every factor has a human-readable reason',
		by.Fragile.reasons.length === Object.keys(by.Fragile.contributingFactors).length, by.Fragile.reasons)
	check('an agent scoring above its recorded label is EMERGING',
		by.Fragile.isEmergingThreat === true && by.Fragile.recordedRisk === 'low', by.Fragile)
	check('an agent matching its recorded label is not', by.Safe.isEmergingThreat === false, by.Safe)
	check('cascadeReach counts everything downstream', by.Fragile.cascadeReach === 2, by.Fragile.cascadeReach)
	check('a clean agent scores zero', by.Safe.predictedScore === 0, by.Safe.predictedScore)
}

// ── Human dependency risk ─────────────────────────────────────────────────────
console.log('\nHuman dependency risk — real predictedScore + RISK_FACTORS-scale exposure:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Overloaded' },
			{ id: 2, name: 'Clean' },
		],
		// Both employees have a personal backup, so neither agent picks up a
		// single_owner factor -- isolates workflow/tool exposure from agentRisk.
		agents: [
			{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: 1 },
			{ id: 2, name: 'A2', risk: 'low', status: 'active', owner_id: 1 },
			{ id: 3, name: 'A3', risk: 'low', status: 'active', owner_id: 2 },
		],
		owners: [
			{ id: 10, name: 'Overloaded', employee_id: 1, backup_owner: 'Deputy' },
			{ id: 11, name: 'Clean', employee_id: 2, backup_owner: 'Deputy2' },
		],
		workflows: [
			{ id: 1, name: 'CritFlow', risk: 'critical' },
			{ id: 2, name: 'LowFlow', risk: 'low' },
		],
		workflow_runbooks: [
			{ workflow_id: 1, owner_id: 1, is_documented: true },
			{ workflow_id: 2, owner_id: 1, is_documented: true },
		],
		ai_platforms: [
			{ id: 1, name: 'ToolA' },
			{ id: 2, name: 'ToolB' },
		],
		tool_ownership: [
			{ platform_id: 1, employee_id: 1 },
			{ platform_id: 2, employee_id: 1 },
		],
		// ToolA has a designated backup platform, ToolB does not.
		tool_backups: [{ primary_platform: 1, backup_platform: 2 }],
	})
	const profiles = d.humanDependencyRisk(r)
	const by = Object.fromEntries(profiles.map((p) => [p.name, p]))

	check('every owning employee gets a profile', profiles.length === 2, profiles.map((p) => p.name))
	check('a fully-backed agent contributes zero agentRisk', by.Clean.totalRiskScore === 0, by.Clean)
	check('1 of 2 owned workflows critical -> half of CRITICAL_WORKFLOW',
		by.Overloaded.criticalWorkflowCount === 1 && by.Overloaded.ownedWorkflowCount === 2, by.Overloaded)
	check('1 of 2 owned tools unbacked -> half of SINGLE_OWNER',
		by.Overloaded.unbackedToolCount === 1 && by.Overloaded.ownedToolCount === 2, by.Overloaded)
	check('score is agentRisk(0) + 0.5*CRITICAL_WORKFLOW(27) + 0.5*SINGLE_OWNER(30), rounded',
		by.Overloaded.totalRiskScore === Math.round(0.5 * d.constants.RISK_FACTORS.CRITICAL_WORKFLOW + 0.5 * d.constants.RISK_FACTORS.SINGLE_OWNER),
		by.Overloaded.totalRiskScore)
	check('tier comes from the canonical threatLevel bands, not an invented scheme',
		by.Overloaded.totalRiskScore < 35 ? by.Overloaded.tier === 'LOW' : true, by.Overloaded)
	check('sorted worst-first', profiles[0].totalRiskScore >= profiles[1].totalRiskScore, profiles)
}

// ── Knowledge concentration ────────────────────────────────────────────────────
console.log('\nKnowledge concentration — criticality-weighted share across agents/workflows/tools:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Concentrated' },
			{ id: 2, name: 'Diffuse' },
		],
		agents: [
			{ id: 1, name: 'CritAgent', risk: 'critical', owner_id: 1 },
			{ id: 2, name: 'LowAgent', risk: 'low', owner_id: 2 },
		],
		workflows: [{ id: 1, name: 'HighFlow', risk: 'high' }],
		workflow_runbooks: [{ workflow_id: 1, owner_id: 1, is_documented: true }],
		// No knowledge_assets row for this platform -> entityCriticality()
		// resolves it to 'unknown', which still weighs 1 (never zero -- an
		// unmeasured tool isn't nothing, matching the frontend's old ?? 1
		// fallback for a criticality value it didn't recognize).
		ai_platforms: [{ id: 1, name: 'UnknownTool' }],
		tool_ownership: [{ platform_id: 1, employee_id: 2 }],
	})
	// Weights: Concentrated = CritAgent(4) + HighFlow(2) = 6.
	//          Diffuse      = LowAgent(0.5) + UnknownTool(1) = 1.5.
	//          total = 7.5 -> Concentrated 80%, Diffuse 20%.
	const profiles = d.knowledgeConcentration(r)
	const by = Object.fromEntries(profiles.map((p) => [p.name, p]))

	check('every owning employee gets a profile', profiles.length === 2, profiles.map((p) => p.name))
	check('a critical agent + a high workflow weighs 6 of 7.5 total -> 80%', by.Concentrated.concentrationScore === 80, by.Concentrated)
	check('a low agent + an unassessed tool weighs 1.5 of 7.5 total -> 20%', by.Diffuse.concentrationScore === 20, by.Diffuse)
	check('shares sum to 100% of the weighted whole', profiles.reduce((s, p) => s + p.concentrationScore, 0) === 100, profiles)
	check('80% lands in the HIGH band (55-89)', by.Concentrated.tier === 'HIGH', by.Concentrated.tier)
	check('20% lands in the LOW band (<30)', by.Diffuse.tier === 'LOW', by.Diffuse.tier)
	check('sorted worst-first', profiles[0].concentrationScore >= profiles[1].concentrationScore, profiles)
}

// ── Org memory (D-60) ──────────────────────────────────────────────────────────
console.log('\nOrg memory — backup_owner + documentation status, per-asset and per-carrier (D-60):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Alice', department: 'Eng' },
			{ id: 2, name: 'Bob', department: 'Ops' },
			{ id: 3, name: 'Cara', department: 'Sales' },
		],
		owners: [
			{ id: 1, employee_id: 1, backup_owner: 'Zed' },
			{ id: 2, employee_id: 2, backup_owner: 'Zed' },
			// Cara has no owners row at all -> no backup, same as an owners row
			// with a null backup_owner.
		],
		agents: [
			{ id: 1, name: 'AgentA', risk: 'high', owner_id: 1 },
			{ id: 2, name: 'OrphanAgent', risk: 'low', owner_id: null },
		],
		workflows: [{ id: 10, name: 'FlowB', risk: 'medium', department: 'Ops' }],
		workflow_runbooks: [{ workflow_id: 10, owner_id: 2, is_documented: false }],
		ai_platforms: [{ id: 100, name: 'ToolC' }],
		tool_ownership: [{ platform_id: 100, employee_id: 3 }],
		tool_users: [{ platform_id: 100, employee_id: 3 }],
		// AgentA is documented; OrphanAgent has no knowledge_assets row at all
		// (documented defaults to false, never null-as-truthy); ToolC is
		// documented and separately assessed critical.
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true },
			{ asset_type: 'platform', asset_id: 100, is_documented: true, criticality: 'critical' },
		],
		// No tool_backups row for ToolC -> Cara has no backup for it.
	})
	const report = d.orgMemory(r)
	const by = Object.fromEntries(report.assets.map((a) => [a.name, a]))

	check('AgentA: documented + owner has a backup -> PRESERVED', by.AgentA.memoryStatus === 'PRESERVED', by.AgentA)
	check('OrphanAgent: no owner + no documentation -> LOST', by.OrphanAgent.memoryStatus === 'LOST', by.OrphanAgent)
	check('FlowB: undocumented but owner has a backup -> AT_RISK', by.FlowB.memoryStatus === 'AT_RISK', by.FlowB)
	check('ToolC: documented but no backup tool -> VULNERABLE', by.ToolC.memoryStatus === 'VULNERABLE', by.ToolC)
	check('ToolC criticality resolved via entityCriticality, not fabricated', by.ToolC.criticality === 'critical', by.ToolC.criticality)
	check('FlowB department comes from the workflow row itself', by.FlowB.department === 'Ops', by.FlowB.department)

	check('4 status buckets partition all 4 assets', report.preserved.length === 1 && report.atRisk.length === 1 && report.vulnerable.length === 1 && report.lost.length === 1, report)

	// IMHS = (1*1.0 + 1*0.5 + 1*0.25) / 4 * 100 = 43.75 -> rounds to 44.
	check('IMHS = round((preserved*1.0 + vulnerable*0.5 + atRisk*0.25) / total * 100)', report.imhs === 44, report.imhs)
	check('44 lands below the 45 AT_RISK floor -> CRITICAL', report.imhsVerdict === 'CRITICAL', report.imhsVerdict)

	const carriers = Object.fromEntries(report.carriers.map((c) => [c.name, c]))
	check('Alice: fully preserved, no undocumented/unbacked load -> LOW tier', carriers.Alice.tier === 'LOW', carriers.Alice)
	check('Bob: 1 undocumented (weight 2) but backed -> MEDIUM tier, not a critical carrier', carriers.Bob.tier === 'MEDIUM' && !carriers.Bob.isCriticalCarrier, carriers.Bob)
	check('Cara: 1 unbacked (weight 1) but documented -> stays LOW, below the MEDIUM floor', carriers.Cara.tier === 'LOW', carriers.Cara)
	check('carrier healthScore uses the same IMHS formula, scoped to their own assets', carriers.Bob.healthScore === 25, carriers.Bob.healthScore)
	check('sorted worst tier first: MEDIUM (Bob) before the two LOWs', report.carriers[0].name === 'Bob', report.carriers.map((c) => c.name))
	check('evidence is sufficient over 4 real assets', report.evidence.sufficient === true, report.evidence)
}

// ── Asset continuity (D-61) ──────────────────────────────────────────────────
console.log('\nAsset continuity — per-asset survival status + governance score (D-61):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Alice', department: 'Eng' },
			{ id: 2, name: 'Bob', department: 'Ops' },
			{ id: 3, name: 'Cara', department: 'Sales' },
		],
		owners: [
			{ id: 1, employee_id: 1, backup_owner: 'Zed' },
			{ id: 2, employee_id: 2, backup_owner: 'Zed' },
			// Cara has no owners row -> no backup for anything she owns.
		],
		agents: [
			{ id: 1, name: 'AgentA', risk: 'critical', owner_id: 1 },
			// No owner, but high-stakes -> LOST, not merely DEGRADED.
			{ id: 4, name: 'CritOrphan', risk: 'critical', owner_id: null },
			// No owner, low-stakes -> DEGRADED, not LOST.
			{ id: 5, name: 'LowOrphan', risk: 'low', owner_id: null },
		],
		workflows: [{ id: 10, name: 'FlowB', risk: 'high', department: 'Ops' }],
		workflow_runbooks: [{ workflow_id: 10, owner_id: 2, is_documented: false }],
		ai_platforms: [{ id: 100, name: 'ToolC' }],
		tool_ownership: [{ platform_id: 100, employee_id: 3 }],
		tool_users: [{ platform_id: 100, employee_id: 3 }],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true },
			{ asset_type: 'agent', asset_id: 4, is_documented: true },
			// LowOrphan (agent id 5) has no knowledge_assets row -> undocumented.
			{ asset_type: 'platform', asset_id: 100, is_documented: true, criticality: 'critical' },
		],
		// No tool_backups row for ToolC -> Cara has no backup for it.
	})
	const report = d.assetContinuity(r)
	const by = Object.fromEntries(report.assets.map((a) => [a.name, a]))

	check('AgentA: owned, backed, documented -> SURVIVES, perfect governance', by.AgentA.survivalStatus === 'SURVIVES' && by.AgentA.governanceScore === 100 && by.AgentA.complianceViolations === 0, by.AgentA)
	check('FlowB: owned + backed but undocumented -> DEGRADED (documentation gates SURVIVES even with backup)', by.FlowB.survivalStatus === 'DEGRADED' && by.FlowB.governanceScore === 80 && by.FlowB.complianceViolations === 1, by.FlowB)
	check('ToolC: owned, high-stakes, but no backup -> FAILS, not merely DEGRADED', by.ToolC.survivalStatus === 'FAILS' && by.ToolC.governanceScore === 75 && by.ToolC.complianceViolations === 1, by.ToolC)
	check('CritOrphan: no owner + high-stakes -> LOST, the worst status', by.CritOrphan.survivalStatus === 'LOST' && by.CritOrphan.governanceScore === 35 && by.CritOrphan.complianceViolations === 2, by.CritOrphan)
	check('LowOrphan: no owner but low-stakes -> DEGRADED, not LOST', by.LowOrphan.survivalStatus === 'DEGRADED' && by.LowOrphan.governanceScore === 15 && by.LowOrphan.complianceViolations === 3, by.LowOrphan)

	// org totals across 5 assets: survival 100+70+30+0+70=270/5=54; governance 100+80+75+35+15=305/5=61.
	check('orgSurvivalScore averages SURVIVAL_VALUE across every asset', report.orgSurvivalScore === 54, report.orgSurvivalScore)
	check('orgGovernanceScore averages governanceScore across every asset', report.orgGovernanceScore === 61, report.orgGovernanceScore)

	check('Eng (AgentA only, SURVIVES) scores a clean 100', report.deptContinuity.Eng.score === 100, report.deptContinuity.Eng)
	check('Sales (ToolC, FAILS) counts toward fails', report.deptContinuity.Sales.fails === 1, report.deptContinuity.Sales)
	check('Unassigned (2 orphan agents, one LOST) counts exactly 1 fail, not 2', report.deptContinuity.Unassigned.fails === 1, report.deptContinuity.Unassigned)

	check('mustProtect is high/critical AND (FAILS or LOST) only -- FlowB (DEGRADED) and LowOrphan (low) excluded', report.mustProtect.map((a) => a.name).sort().join(',') === 'CritOrphan,ToolC', report.mustProtect.map((a) => a.name))
	check('mustProtect sorts worst compliance-violation count first', report.mustProtect[0].name === 'CritOrphan', report.mustProtect.map((a) => a.name))

	check('worstOffenders is governanceScore < 70 only -- FlowB (80) and ToolC (75) excluded', report.worstOffenders.map((a) => a.name).sort().join(',') === 'CritOrphan,LowOrphan', report.worstOffenders.map((a) => a.name))
	check('worstOffenders sorts lowest score first', report.worstOffenders[0].name === 'LowOrphan', report.worstOffenders.map((a) => a.name))

	check('evidence is sufficient over 5 real assets', report.evidence.sufficient === true, report.evidence)
}

// ── Executive memory ─────────────────────────────────────────────────────────
console.log('\nExecutive memory — four types, four roots:')
{
	const r = roots({
		workflows: [
			{ id: 1, name: 'Repeater', risk: 'high' },
			{ id: 2, name: 'OneOff', risk: 'low' },
			{ id: 3, name: 'AlsoHumanSpof', risk: 'medium' },
		],
		workflow_failures: [
			{ workflow_id: 1, failure_type: 'human_spof', severity: 'critical' },
			{ workflow_id: 1, failure_type: 'process_gap', severity: 'high' },
			{ workflow_id: 2, failure_type: 'tool_failure', severity: 'medium' },
			{ workflow_id: 3, failure_type: 'human_spof', severity: 'high' },
		],
		// agents.owner_id references employees.id directly, NOT owners.id --
		// owner_id here is 1 to match employees.id, not owners.id (10).
		employees: [{ id: 1, name: 'Hero', department: 'Eng' }],
		owners: [{ id: 10, name: 'Hero', employee_id: 1, backup_owner: null }],
		agents: [
			{ id: 1, name: 'A1', risk: 'critical', owner_id: 1 },
			{ id: 2, name: 'A2', risk: 'high', owner_id: 1 },
		],
		decision_history: [
			{ id: 1, title: 'Bad call', outcome: 'negative', description: 'went wrong', should_revisit: false },
			{ id: 2, title: 'Revisit me', outcome: 'neutral', should_revisit: true, revisit_reason: 'assumptions changed' },
			{ id: 3, title: 'Fine', outcome: 'positive', should_revisit: false },
		],
	})
	const m = d.executiveMemory(r)
	const types = m.byType

	check('a workflow failing twice is a repeat offender', types.repeat_offender === 1, types)
	check('a workflow failing once is not', !m.items.some((i) => i.memoryType === 'repeat_offender' && i.entityName === 'OneOff'))
	check('a failure mode across two workflows becomes a lesson',
		m.items.some((i) => i.memoryType === 'lesson' && i.evidence.failureType === 'human_spof'), m.items.map((i) => i.title))
	check('a failure mode seen once does not',
		!m.items.some((i) => i.memoryType === 'lesson' && i.evidence.failureType === 'tool_failure'))
	check('a lesson names the workflows it spans',
		m.items.find((i) => i.memoryType === 'lesson').evidence.affectedEntities.length === 2)
	check('two critical assets and no backup is a hero risk', types.hero_risk === 1, types)
	check('the hero risk names the assets', m.items.find((i) => i.memoryType === 'hero_risk').evidence.assets.length === 2)
	check('negative and revisit decisions both surface', types.bad_decision === 2, types)
	check('a positive decision does not', !m.items.some((i) => i.title === 'Fine'))
	check('relevance is normalised to 0-1', m.items.every((i) => i.relevanceScore >= 0 && i.relevanceScore <= 1))
	check('items are ranked most relevant first',
		m.items.every((i, idx) => idx === 0 || m.items[idx - 1].relevanceScore >= i.relevanceScore))
	check('the raw score is not leaked to callers', m.items.every((i) => i.relevanceRaw === undefined))
}

// ── Hero risk with a backup ──────────────────────────────────────────────────
{
	const r = roots({
		employees: [{ id: 1, name: 'Covered', department: 'Eng' }],
		owners: [{ id: 10, name: 'Covered', employee_id: 1, backup_owner: 'Deputy' }],
		agents: [
			{ id: 1, name: 'A1', risk: 'critical', owner_id: 1 },
			{ id: 2, name: 'A2', risk: 'critical', owner_id: 1 },
		],
	})
	const m = d.executiveMemory(r)
	check('a named backup removes the hero risk', !m.items.some((i) => i.memoryType === 'hero_risk'), m.byType)
}

// ── Pillars ──────────────────────────────────────────────────────────────────
console.log('\nPillars — the authored measures:')
{
	const r = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }, { id: 2, name: 'W2', risk: 'low' }],
		workflow_runbooks: [
			{ workflow_id: 1, is_documented: true },
			{ workflow_id: 2, is_documented: false },
		],
		ai_platforms: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
		policy_violations: [],
		owners: [
			{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' },
			{ id: 11, name: 'C', employee_id: 2, backup_owner: null },
		],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 1 },
		],
		truth_claims: [
			{ verdict: 'VERIFIED', is_contradicted: false },
			{ verdict: 'UNVERIFIED', is_contradicted: false },
		],
		accountability_entities: [{ id: 1, entity_name: 'E', entity_type: 'workflow', department: 'Eng' }],
		accountability_links: [
			{ entity_id: 1, person_name: 'A', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'B', raci_role: 'Accountable' },
		],
	})
	const acc = d.accountability(r)
	const p = d.pillars(r, acc)
	const by = Object.fromEntries(p.pillars.map((x) => [x.resultKey, x]))

	check('all three pillars are produced', p.pillars.length === 3 && by.GI && by.MI && by.DI)
	check('GI averages runbook coverage, policy coverage and violations',
		by.GI.components.runbookCoverage === 50 && by.GI.components.policyCoverage === 50, by.GI.components)
	check('no violations means a clean violation score', by.GI.components.violationScore === 100, by.GI.components)
	check('MI reuses the accountability score rather than recomputing it',
		by.MI.components.accountability === acc.accountabilityScore, by.MI.components)
	check('MI counts backup coverage', by.MI.components.backupCoverage === 50, by.MI.components)
	check('DI counts documentation and verification',
		by.DI.components.documentationCoverage === 50 && by.DI.components.verificationRate === 50, by.DI.components)
	check('each pillar is the mean of its three components', by.GI.score === Math.round((50 + 50 + 100) / 3), by.GI.score)
	check('org score applies the declared weights',
		p.orgScore.score === Math.round(by.GI.score * 0.35 + by.MI.score * 0.35 + by.DI.score * 0.30), p.orgScore)
	check('weights are published with the score', p.orgScore.weights.GI === d.constants.PILLAR_WEIGHTS.GI)
	check('components below 50 are named as weaknesses', by.GI.weaknesses.length === 0 || by.GI.weaknesses.every((w) => by.GI.components[w] < 50))
	check('the authored nature of these metrics is declared', p.definitionsAreAuthored === true)
}

// ── Contradictions weigh more than gaps ──────────────────────────────────────
{
	const unverified = roots({
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
		truth_claims: [{ verdict: 'VERIFIED', is_contradicted: false }, { verdict: 'UNVERIFIED', is_contradicted: false }],
		accountability_entities: [], accountability_links: [],
	})
	const contradicted = roots({
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
		truth_claims: [{ verdict: 'VERIFIED', is_contradicted: false }, { verdict: 'UNVERIFIED', is_contradicted: true }],
		accountability_entities: [], accountability_links: [],
	})
	const a = d.pillars(unverified, d.accountability(unverified)).pillars.find((x) => x.resultKey === 'DI')
	const b = d.pillars(contradicted, d.accountability(contradicted)).pillars.find((x) => x.resultKey === 'DI')
	check('a contradicted claim hurts more than a merely unverified one', b.score < a.score, [a.score, b.score])
}

// ── Pillars evidence gate (D-07, D-10, D-24) ────────────────────────────────
console.log('\nPillars — evidence gate:')
{
	const empty = roots()
	const p = d.pillars(empty, d.accountability(empty))
	const by = Object.fromEntries(p.pillars.map((x) => [x.resultKey, x]))

	check('GI is insufficient with no workflows and no platforms',
		by.GI.evidence.sufficient === false && by.GI.score === null && by.GI.rating === null, by.GI.evidence)
	check('...components are still reported (raw intermediate math, not a verdict)',
		'runbookCoverage' in by.GI.components, by.GI.components)

	// D-24: zero platforms used to fabricate a perfect violationScore of 100.
	const noPlatforms = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
	})
	const g = d.pillars(noPlatforms, d.accountability(noPlatforms)).pillars.find((x) => x.resultKey === 'GI')
	check('workflows are covered but platforms are still empty — GI stays insufficient',
		g.evidence.sufficient === false && g.evidence.platforms.sufficient === false, g.evidence)

	// Platforms exist but none has ANY tool_policies row (not even inactive) — never assessed.
	const unassessedPlatforms = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
		tool_policies: [],
	})
	const g2 = d.pillars(unassessedPlatforms, d.accountability(unassessedPlatforms)).pillars.find((x) => x.resultKey === 'GI')
	check('platforms exist but none was ever assessed for policy — still insufficient',
		g2.evidence.sufficient === false, g2.evidence)
	check('...and the flat coverage/covered/total EvidenceBadge reads are populated, not undefined',
		typeof g2.evidence.coverage === 'number' && typeof g2.evidence.total === 'number', g2.evidence)

	const noOwnersOrAssets = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
		accountability_entities: [{ id: 1, entity_name: 'E', entity_type: 'workflow', department: 'Eng' }],
		accountability_links: [{ entity_id: 1, person_name: 'A', raci_role: 'Responsible' }],
	})
	const mi = d.pillars(noOwnersOrAssets, d.accountability(noOwnersOrAssets)).pillars.find((x) => x.resultKey === 'MI')
	check('MI is insufficient with zero owners and zero knowledge_assets, even though accountability is fine',
		mi.evidence.sufficient === false, mi.evidence)

	const insufficientAccountability = roots({
		owners: [{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' }],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
	})
	const mi2 = d.pillars(insufficientAccountability, d.accountability(insufficientAccountability)).pillars.find((x) => x.resultKey === 'MI')
	check('MI inherits an insufficient accountability sub-score rather than recomputing around it',
		mi2.evidence.sufficient === false, mi2.evidence)

	const noAssetsOrClaims = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		ai_platforms: [{ id: 1, name: 'P1' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
	})
	const di = d.pillars(noAssetsOrClaims, d.accountability(noAssetsOrClaims)).pillars.find((x) => x.resultKey === 'DI')
	check('DI is insufficient with zero knowledge_assets and zero truth_claims', di.evidence.sufficient === false, di.evidence)
}

console.log('\norgScore — insufficient if any pillar is insufficient:')
{
	const fullFixture = roots({
		workflows: [{ id: 1, name: 'W1', risk: 'low' }, { id: 2, name: 'W2', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }, { workflow_id: 2, is_documented: false }],
		ai_platforms: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }],
		tool_policies: [{ platform_id: 1, policy_name: 'pol', status: 'active' }],
		policy_violations: [],
		owners: [{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' }, { id: 11, name: 'C', employee_id: 2, backup_owner: null }],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 1 },
		],
		truth_claims: [{ verdict: 'VERIFIED', is_contradicted: false }, { verdict: 'UNVERIFIED', is_contradicted: false }],
		accountability_entities: [{ id: 1, entity_name: 'E', entity_type: 'workflow', department: 'Eng' }],
		accountability_links: [
			{ entity_id: 1, person_name: 'A', raci_role: 'Responsible' },
			{ entity_id: 1, person_name: 'B', raci_role: 'Accountable' },
		],
	})
	const good = d.pillars(fullFixture, d.accountability(fullFixture))
	check('all three pillars evidenced -> orgScore is sufficient and computes',
		good.orgScore.evidence.sufficient === true && typeof good.orgScore.score === 'number', good.orgScore)

	// Same fixture minus truth_claims only (knowledge_assets stays, since MI also
	// depends on it — zeroing it would sink MI too and defeat the point of this
	// check, which is isolating a SINGLE insufficient pillar).
	const diMissing = { ...fullFixture, truth_claims: [], _counts: { ...fullFixture._counts, truth_claims: 0 } }
	const partial = d.pillars(diMissing, d.accountability(diMissing))
	check('DI insufficient alone still sinks orgScore, even though GI and MI are fine',
		partial.orgScore.evidence.sufficient === false && partial.orgScore.score === null, partial.orgScore.evidence)
	check('...and says exactly which pillar is the problem',
		partial.orgScore.evidence.DI.sufficient === false &&
		partial.orgScore.evidence.GI.sufficient === true &&
		partial.orgScore.evidence.MI.sufficient === true, partial.orgScore.evidence)
	check("...and the flat coverage figure is DI's (the worst/only-insufficient one)",
		partial.orgScore.evidence.coverage === partial.orgScore.evidence.DI.coverage, partial.orgScore.evidence)
}

// ── Decision quality ─────────────────────────────────────────────────────────
console.log('\nDecision quality and org health:')
{
	const r = roots({
		decision_history: [
			{ id: 1, outcome: 'positive', should_revisit: false },
			{ id: 2, outcome: 'negative', should_revisit: true },
			{ id: 3, outcome: null, should_revisit: false },
		],
	})
	const q = d.decisionQuality(r)
	check('undecided decisions are excluded, not counted as wins', q.decisionsWithOutcome === 2 && q.score === 50, q)
	check('2 of 3 decisions have an outcome (67%) — evidence is sufficient', q.evidence.sufficient === true, q.evidence)

	const empty = d.decisionQuality(roots())
	check('an empty log is insufficient evidence, not a fabricated WEAK/50', empty.evidence.sufficient === false && empty.score === null && empty.rating === null, empty)
	check('...hasEvidence is gone, replaced by evidence', !('hasEvidence' in empty), empty)

	const mostlyPending = roots({
		decision_history: [
			{ id: 1, outcome: 'positive', should_revisit: false },
			{ id: 2, outcome: null, should_revisit: false },
			{ id: 3, outcome: null, should_revisit: false },
		],
	})
	const under = d.decisionQuality(mostlyPending)
	check('1 of 3 decided (33%) is below the 50% threshold', under.evidence.sufficient === false, under.evidence)
}

// ── Org health ───────────────────────────────────────────────────────────────
{
	const r = roots({
		workflows: [{ id: 1, name: 'W', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		workflow_failures: [],
		owners: [{ id: 10, name: 'A', employee_id: 1, backup_owner: 'B' }],
		agents: [{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: 1 }],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
	})
	const h = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })

	check('the snapshot is stamped with the CURRENT month',
		h.snapshotMonth === `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`, h.snapshotMonth)
	check('a healthy estate scores well', h.healthIndex >= 70 && h.healthStatus === 'STABLE', h)
	check('no failures means a full incident-load score', h.incidentLoadScore === 100, h.incidentLoadScore)
}
{
	// The regression that motivated the fix: failures-per-workflow near 1 used to
	// saturate this score to zero permanently, so it carried no information.
	const busy = roots({
		workflows: [{ id: 1, name: 'W', risk: 'low' }],
		workflow_failures: [{ workflow_id: 1, failure_type: 'x', severity: 'high' }],
		workflow_runbooks: [], owners: [], agents: [], knowledge_assets: [],
	})
	const h = d.orgHealth(busy, { accountability: d.accountability(busy), predictiveRisk: d.predictiveRisk(busy) })
	check('one failure per workflow does not pin incident load to zero', h.incidentLoadScore > 0 && h.incidentLoadScore < 100, h.incidentLoadScore)
}

// ── Org health evidence gate (D-07, D-10, D-24) ─────────────────────────────
console.log('\nOrg health — evidence gate:')
{
	const empty = d.orgHealth(roots(), { accountability: d.accountability(roots()), predictiveRisk: d.predictiveRisk(roots()) })
	check('fully empty roots is insufficient evidence on every dimension',
		empty.evidence.sufficient === false &&
		empty.healthIndex === null && empty.healthStatus === null &&
		empty.documentationScore === null && empty.continuityScore === null &&
		empty.ownershipSpreadScore === null && empty.criticalSafetyScore === null &&
		empty.incidentLoadScore === null, empty)

	// D-24: zero agents-with-owners used to fabricate a perfect ownershipSpreadScore of 100.
	const noOwnedAgents = roots({
		agents: [{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: null }],
	})
	const h = d.orgHealth(noOwnedAgents, { accountability: d.accountability(noOwnedAgents), predictiveRisk: d.predictiveRisk(noOwnedAgents) })
	check('an agent exists but nobody owns anything — ownershipSpreadScore is insufficient, not a fabricated 100',
		h.evidence.ownershipSpread.sufficient === false && h.ownershipSpreadScore === null, h)

	// One dimension insufficient (no owners at all -> continuity fails) does not null out
	// a sibling dimension whose own population (agents) is fine.
	const r = roots({
		workflows: [{ id: 1, name: 'W', risk: 'low' }],
		workflow_runbooks: [{ workflow_id: 1, is_documented: true }],
		workflow_failures: [],
		agents: [{ id: 1, name: 'A1', risk: 'low', status: 'active', owner_id: 10 }],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
		owners: [],
	})
	const h2 = d.orgHealth(r, { accountability: d.accountability(r), predictiveRisk: d.predictiveRisk(r) })
	check('continuity is insufficient (zero owners) while documentation and criticalSafety stay evidenced',
		h2.evidence.continuity.sufficient === false &&
		h2.evidence.documentation.sufficient === true &&
		h2.evidence.criticalSafety.sufficient === true, h2.evidence)
	check('...but healthIndex/healthStatus are still null overall, since one dimension failed',
		h2.healthIndex === null && h2.healthStatus === null, h2)
}

// ── Org health by department ─────────────────────────────────────────────────
console.log('\nOrg health by department — same formula, narrower population (D-21):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Ops' },
		],
		// agents.owner_id references employees.id directly, NOT owners.id (see
		// routes/ownership.js's header comment) -- owner_id here is 1/2 to match
		// employees.id above, not owners.id (10/11).
		owners: [
			{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' },
			{ id: 11, name: 'Ben', employee_id: 2, backup_owner: null },
		],
		agents: [
			{ id: 1, name: 'EngAgent', risk: 'low', status: 'active', owner_id: 1 },
			{ id: 2, name: 'OpsAgent', risk: 'low', status: 'active', owner_id: 2 },
		],
		workflows: [
			{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' },
			{ id: 2, name: 'OpsFlow', risk: 'low', department: 'Ops' },
		],
		workflow_runbooks: [
			{ workflow_id: 1, is_documented: true },
			{ workflow_id: 2, is_documented: false },
		],
		workflow_failures: [],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 2 },
		],
	})
	const byDept = d.orgHealthByDepartment(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const ops = byDept.departments.find((x) => x.department === 'Ops')

	check('every employee department gets a row', byDept.departments.length === 2, byDept.departments.map((x) => x.department))
	check('Eng (documented runbook, backed owner) scores higher than Ops (undocumented, no backup)',
		eng.healthIndex > ops.healthIndex, [eng.healthIndex, ops.healthIndex])
	check('each row uses the same five dimensions as org-level orgHealth',
		'documentationScore' in eng && 'continuityScore' in eng && 'ownershipSpreadScore' in eng &&
		'criticalSafetyScore' in eng && 'incidentLoadScore' in eng, eng)
	check('provenance is reported', byDept.source === 'live' && typeof byDept.computedAt === 'string', byDept)

	const empty = d.orgHealthByDepartment(roots())
	check('no employees means no department rows, not a throw', empty.departments.length === 0, empty.departments)
}

// ── Department exposure ──────────────────────────────────────────────────────
console.log('\nDepartment exposure — a different question from continuityScore (D-21):')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Ops' },
		],
		owners: [
			{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' },
			{ id: 11, name: 'Ben', employee_id: 2, backup_owner: null },
		],
		workflows: [
			{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' },
			{ id: 2, name: 'OpsFlow', risk: 'low', department: 'Ops' },
		],
		workflow_failures: [
			{ workflow_id: 2, failure_type: 'timeout', severity: 'high' },
			{ workflow_id: 2, failure_type: 'timeout', severity: 'high' },
		],
		knowledge_assets: [
			{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 },
			{ asset_type: 'agent', asset_id: 2, is_documented: false, owner_id: 2 },
		],
	})
	const byDept = d.departmentExposure(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const ops = byDept.departments.find((x) => x.department === 'Ops')

	check('Ops (undocumented, no backup, two failures) is more exposed than Eng',
		ops.incidentExposureScore < eng.incidentExposureScore, [eng.incidentExposureScore, ops.incidentExposureScore])
	check('a severe exposure score is not labelled reassuringly',
		ops.incidentRiskLevel === 'SEVERE' || ops.incidentRiskLevel === 'HIGH', ops.incidentRiskLevel)
	check('documentationCoverage and backupCoverage are reported per department, not blended away',
		eng.documentationCoverage === 100 && eng.backupCoverage === 100, eng)
	check('exposure is NOT continuityScore under a new name',
		byDept.departments.every((x) => !('continuityScore' in x)), byDept.departments)
}

// ── Department exposure evidence gate (D-07, D-10) ──────────────────────────
console.log('\nDepartment exposure — evidence gate:')
{
	const r = roots({
		employees: [
			{ id: 1, name: 'Ana', department: 'Eng' },
			{ id: 2, name: 'Ben', department: 'Empty' },
		],
		owners: [{ id: 10, name: 'Ana', employee_id: 1, backup_owner: 'Cal' }],
		workflows: [{ id: 1, name: 'EngFlow', risk: 'low', department: 'Eng' }],
		workflow_failures: [],
		knowledge_assets: [{ asset_type: 'agent', asset_id: 1, is_documented: true, owner_id: 1 }],
	})
	const byDept = d.departmentExposure(r)
	const eng = byDept.departments.find((x) => x.department === 'Eng')
	const empty = byDept.departments.find((x) => x.department === 'Empty')

	check('Eng has owners and knowledge_assets — evidenced', eng.evidence.sufficient === true && typeof eng.incidentExposureScore === 'number', eng)
	check('Empty department has neither — insufficient, not a fabricated score',
		empty.evidence.sufficient === false && empty.incidentExposureScore === null && empty.incidentRiskLevel === null, empty)
}

// ── Provenance across the board ──────────────────────────────────────────────
console.log('\nProvenance:')
{
	const r = roots({ accountability_entities: [], accountability_links: [] })
	for (const fn of ['accountability', 'collaboration', 'predictiveRisk', 'executiveMemory', 'decisionQuality']) {
		const out = fn === 'collaboration' ? d[fn](r) : d[fn](r)
		check(`${fn} reports source and computedAt`,
			out.source === 'live' && typeof out.computedAt === 'string' && !!out.inputs, out.source)
	}
}

// ── Source-level regression: no file re-derives its own OIS ─────────────────
console.log('\nNo route computes a second Organizational Intelligence Score (D-02, D-17):')
{
	const fs = require('fs')
	const path = require('path')
	const filesThatMustReadPillarsOrgScore = [
		'../routes/executive/executive.js',
		'../routes/voice/voice.js',
		'../routes/intelligence/orchestrator.js',
		'../routes/intelligence/brainCore.js',
	]
	for (const rel of filesThatMustReadPillarsOrgScore) {
		const src = fs.readFileSync(path.join(__dirname, rel), 'utf8')
		check(`${rel} reads intel.pillars.orgScore`, src.includes('pillars.orgScore'), rel)
	}
}

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'DERIVED INTELLIGENCE TESTS PASSED ✅' : 'DERIVED INTELLIGENCE TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
