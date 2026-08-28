/*
 * OBA Core — M04 Recommendation Engine unit test (D-62).
 * No external test framework. No Supabase/DB needed (builds graphs by hand).
 * Run from the backend/ folder:  node tests/recommendationEngine.unit.test.js
 *
 * D-62 expanded M04 from 3 rule classes to genuinely cover all 7 of
 * frontend/lib/recommendations.ts's hand-authored rules, computed from the
 * Knowledge Graph. This test hand-verifies each rule fires (and stays quiet)
 * on a constructed fixture where the right answer is known by construction.
 */

const KnowledgeGraph = require('../brain/knowledge/knowledgeGraph')
const IMPL = require('../brain/modules/implementations')

let passed = 0
let failed = 0

function check(name, condition, detail) {
	if (condition) {
		passed++
		console.log('  ✓', name)
	} else {
		failed++
		console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '')
	}
}

function employee(g, name, { backup_owner = null } = {}) {
	return g.addEntity({ type: 'employee', name, metadata: { backup_owner } })
}

function agent(g, name, { documented = null, risk = 'medium' } = {}) {
	return g.addEntity({ type: 'ai_agent', name, metadata: { kind: 'automation-agent', documented, risk } })
}

function tool(g, name, { assetCriticality = null, backupTool = null, agentsUsing = [], workflowsUsing = [] } = {}) {
	return g.addEntity({
		type: 'ai_agent', name,
		metadata: { kind: 'ai-platform', assetCriticality, backupTool, agentsUsing, workflowsUsing },
	})
}

function workflow(g, name, { documented = null, risk = 'medium' } = {}) {
	return g.addEntity({ type: 'workflow', name, metadata: { documented, risk } })
}

function owns(g, ownerEntity, targetEntity, criticality = 'medium') {
	g.addRelationship({ from: ownerEntity.id, to: targetEntity.id, type: 'owns', criticality })
}

function dependsOn(g, fromEntity, toEntity) {
	g.addRelationship({ from: fromEntity.id, to: toEntity.id, type: 'depends_on' })
}

console.log('\n=== OBA Core — M04 Recommendation Engine Unit Test (D-62) ===\n')

const g = new KnowledgeGraph()

// ── 1. Unowned asset (documented, so it isolates rule 1 from rule 4) ──
const orphanAgent = agent(g, 'OrphanAgent', { risk: 'critical', documented: true })

// ── 2. Sole-owned agent, no backup, critical -> SPOF ──
const alice = employee(g, 'Alice') // no backup_owner
const spofAgent = agent(g, 'SpofAgent', { risk: 'critical', documented: true })
owns(g, alice, spofAgent, 'critical')

// ── 4. Undocumented high-risk agent, backed (so it must NOT also trip rule 2) ──
const bob = employee(g, 'Bob', { backup_owner: 'Zed' })
const docGapAgent = agent(g, 'DocGapAgent', { risk: 'high', documented: false })
owns(g, bob, docGapAgent, 'high')

// A documented, low-risk agent should trigger neither rule 2 nor rule 4.
const fineAgent = agent(g, 'FineAgent', { risk: 'low', documented: true })
owns(g, bob, fineAgent, 'low')

// ── 3. Owner concentration: Carol owns 4 medium-risk agents (immune to SPOF/doc rules) ──
const carol = employee(g, 'Carol', { backup_owner: 'Zed' })
for (let i = 1; i <= 4; i++) {
	const a = agent(g, `ConcAgent${i}`, { risk: 'medium', documented: true })
	owns(g, carol, a, 'medium')
}

// ── 5. Sole-owned workflow, no backup, high -> SPOF (documented, so it must NOT also trip rule 7) ──
const dave = employee(g, 'Dave') // no backup_owner
const spofWorkflow = workflow(g, 'SpofWorkflow', { risk: 'high', documented: true })
owns(g, dave, spofWorkflow, 'high')

// ── 7. Undocumented CRITICAL workflow, backed (so it must NOT also trip rule 5) ──
const eve = employee(g, 'Eve', { backup_owner: 'Zed' })
const undocCriticalWorkflow = workflow(g, 'UndocCriticalWorkflow', { risk: 'critical', documented: false })
owns(g, eve, undocCriticalWorkflow, 'critical')

// An undocumented HIGH (not critical) workflow must NOT trip rule 7 -- the
// frontend's own rule 7 only fires on exactly 'critical', a real asymmetry
// ported verbatim, not a bug to "fix" into >=high.
const undocHighWorkflow = workflow(g, 'UndocHighWorkflow', { risk: 'high', documented: false })
owns(g, eve, undocHighWorkflow, 'high')

// ── 6. Tool with no backup platform, critical -> tool governance ──
const noBackupTool = tool(g, 'NoBackupTool', { assetCriticality: 'critical', agentsUsing: ['SpofAgent'], workflowsUsing: [] })

// A backed critical tool must NOT trigger rule 6.
const backedTool = tool(g, 'BackedTool', { assetCriticality: 'critical', backupTool: 'FallbackTool' })

// ── Dependency cycle ──
const cycleA = agent(g, 'CycleAgentA', { risk: 'low', documented: true })
const cycleB = agent(g, 'CycleAgentB', { risk: 'low', documented: true })
dependsOn(g, cycleA, cycleB)
dependsOn(g, cycleB, cycleA)

const out = IMPL.M04({ graph: g })
const recs = out.payload.recommendations
const byTarget = (name) => recs.filter((r) => r.targetName === name)

console.log('Rule 1 — unowned assets:')
{
	check('unowned agent gets an OWNERSHIP recommendation', byTarget('OrphanAgent').some((r) => r.category === 'OWNERSHIP' && r.title.includes('Assign owner')), byTarget('OrphanAgent'))
}

console.log('\nRule 2 — sole-owned agent, no backup, critical -> SPOF:')
{
	const r = byTarget('SpofAgent').find((r) => r.action.includes('backup owner'))
	check('flagged with a backup-owner recommendation', Boolean(r), byTarget('SpofAgent'))
	check('targetType is agent, not tool or workflow', r && r.targetType === 'agent', r)
	check('priority is HIGH', r && r.priority === 'HIGH', r)
}

console.log('\nRule 3 — owner concentration (>=4 agents):')
{
	const r = recs.find((r) => r.category === 'CONCENTRATION' && r.targetName === 'Carol')
	check('Carol (4 agents) gets a concentration recommendation', Boolean(r), recs.filter((r) => r.category === 'CONCENTRATION'))
	check('below the 5-agent CRITICAL floor, so priority is HIGH not CRITICAL', r && r.priority === 'HIGH', r)
	check("Carol's individual agents do not also fire rule 2 (medium risk, immune to SPOF)", !recs.some((r) => r.targetName?.startsWith('ConcAgent')), recs.filter((r) => r.targetName?.startsWith('ConcAgent')))
}

console.log('\nRule 4 — undocumented high-risk agent, backed (isolated from rule 2):')
{
	const r = byTarget('DocGapAgent').find((r) => r.category === 'DOCUMENTATION')
	check('flagged for documentation', Boolean(r), byTarget('DocGapAgent'))
	check('priority matches its own HIGH risk level', r && r.priority === 'HIGH', r)
	check('a backed agent does not also appear as a SPOF backup-owner rec', !byTarget('DocGapAgent').some((r) => r.action.includes('backup owner')))
	check('a documented low-risk agent triggers nothing', byTarget('FineAgent').length === 0, byTarget('FineAgent'))
}

console.log('\nRule 5 — sole-owned workflow, no backup, high -> SPOF:')
{
	const r = byTarget('SpofWorkflow').find((r) => r.action.includes('backup owner'))
	check('flagged with a backup-owner recommendation', Boolean(r), byTarget('SpofWorkflow'))
	check('targetType is workflow', r && r.targetType === 'workflow', r)
	check('a documented workflow does not also trip the documentation rule', !byTarget('SpofWorkflow').some((r) => r.category === 'DOCUMENTATION'))
}

console.log('\nRule 6 — tool with no backup platform, critical:')
{
	const r = recs.find((r) => r.category === 'TOOL_GOVERNANCE' && r.targetName === 'NoBackupTool')
	check('flagged for tool governance', Boolean(r), r)
	check('priority is CRITICAL, matching the tool\'s own assetCriticality', r && r.priority === 'CRITICAL', r)
	check('names real agent/workflow usage counts, not fabricated', r && r.rationale.includes('1 agent(s)') && r.rationale.includes('0 workflow(s)'), r && r.rationale)
	check('a backed critical tool does not trigger tool governance (it is still unowned, so rule 1 legitimately still fires)', !recs.some((r) => r.targetName === 'BackedTool' && r.category === 'TOOL_GOVERNANCE'))
}

console.log('\nRule 7 — undocumented CRITICAL workflow (not merely HIGH):')
{
	const r = recs.find((r) => r.category === 'DOCUMENTATION' && r.targetName === 'UndocCriticalWorkflow')
	check('flagged for documentation', Boolean(r), r)
	check('priority is CRITICAL', r && r.priority === 'CRITICAL', r)
	check('a backed critical workflow does not also fire the SPOF rule', !byTarget('UndocCriticalWorkflow').some((r) => r.action.includes('backup owner')))
	check("an undocumented HIGH (not critical) workflow is NOT flagged -- rule 7 is critical-only, ported verbatim", !recs.some((r) => r.targetName === 'UndocHighWorkflow'))
}

console.log('\nDependency cycles (kept from the pre-D-62 module, not one of the 7):')
{
	const cycleRecs = recs.filter((r) => r.category === 'DEPENDENCY')
	check('the CycleAgentA <-> CycleAgentB cycle is detected', cycleRecs.some((r) => r.action.includes('CycleAgentA') && r.action.includes('CycleAgentB')), cycleRecs)
}

console.log('\nOverall shape:')
{
	check('recs are sorted CRITICAL -> HIGH -> MEDIUM', recs.every((r, i) => i === 0 || (
		{ CRITICAL: 0, HIGH: 1, MEDIUM: 2 }[recs[i - 1].priority] <= { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }[r.priority]
	)), recs.map((r) => r.priority))
	check('payload counts match the actual array', out.payload.recommendationCount === recs.length, [out.payload.recommendationCount, recs.length])
	check('criticalCount/highCount/mediumCount sum to the total', out.payload.criticalCount + out.payload.highCount + out.payload.mediumCount === recs.length, out.payload)
	check('confidence reflects real evidence volume', out.confidence > 0.4, out.confidence)
	check('flat recommendations field mirrors each rec\'s action string', out.recommendations.length === recs.length && out.recommendations[0] === recs[0].action)
	check('every rec has a stable, unique id', new Set(recs.map((r) => r.id)).size === recs.length, recs.map((r) => r.id))
	check('every rec carries title/description/impact for the UI (D-62\'s "no prose" gap)', recs.every((r) => r.title && r.description && r.impact), recs.find((r) => !r.title || !r.description || !r.impact))
}

console.log('\nExplicit summary fields (computed once here, not re-derived from prose client-side):')
{
	const p = out.payload
	// orphanedAgentCount: OrphanAgent + the two cycle agents (all genuinely
	// unowned) -- must count only agents, not the unowned tools/etc rule 1
	// also covers.
	check('orphanedAgentCount counts only unowned AGENTS', p.orphanedAgentCount === 3, p.orphanedAgentCount)
	// undocumented critical/high agents: DocGapAgent only (SpofAgent is documented).
	check('undocumentedCriticalAgentCount matches rule 4\'s agent-targeted DOCUMENTATION recs', p.undocumentedCriticalAgentCount === 1, p.undocumentedCriticalAgentCount)
	check('ownerConcentrationWarning names Carol and her real agent count', p.ownerConcentrationWarning && p.ownerConcentrationWarning.owner === 'Carol' && p.ownerConcentrationWarning.agentCount === 4, p.ownerConcentrationWarning)
}

console.log('\n----------------------------------------')
console.log(`passed: ${passed}   failed: ${failed}`)
console.log(failed === 0 ? 'M04 RECOMMENDATION ENGINE UNIT TESTS PASSED ✅' : 'M04 RECOMMENDATION ENGINE UNIT TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)
