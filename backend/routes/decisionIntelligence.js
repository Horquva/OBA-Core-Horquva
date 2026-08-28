const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')
const { loadEnrichedAgents } = require('./agents')
const { loadEnrichedTools } = require('./tools')
const { normalizeLevel, evidenceGate } = require('../domain/definitions')

/*
 * GET /api/decision-intelligence — Module 14, Decision Intelligence.
 *
 * Server-side home of what used to be frontend/lib/decisionIntelligence.ts's
 * computeDecisionIntelligence() (507 lines), consolidated here so there's one
 * implementation instead of a client-side reimplementation working off
 * differently-shaped, sometimes-broken data.
 *
 * Porting this surfaced a real bug in the old client pipeline: decision/page.tsx
 * fed this scoring engine from /api/workflows/intelligence, whose response
 * shape doesn't have `id`, `name` (the field is called `workflow`), `department`,
 * `criticality`, `documented` (the field is `is_documented`), or `backup_owner`
 * at all — every single workflow decision silently scored as "Unknown Workflow",
 * department "Operations", criticality "low", undocumented, no backup, and an
 * empty id (so every workflow decision shared the same React key `dec_`). This
 * endpoint queries workflows directly instead, with the real fields.
 */

// Not a column on `workflows` — see agents.js / ownerBackups.js for why
// "backup coverage" is derived through the owner's `owners` row instead.
async function loadWorkflowsForDecisions() {
  const [{ data: workflows, error: wErr }, { data: runbooks, error: rErr }, backupByEmployee] = await Promise.all([
    supabase.from('workflows').select('id, name, department, risk'),
    supabase.from('workflow_runbooks').select('workflow_id, owner_id, is_documented, employees ( name )'),
    loadOwnerBackupByEmployee(),
  ])
  if (wErr) throw new Error(`workflows: ${wErr.message}`)
  if (rErr) throw new Error(`workflow_runbooks: ${rErr.message}`)

  const runbookByWorkflow = Object.fromEntries((runbooks || []).map((r) => [r.workflow_id, r]))

  return workflows.map((w) => {
    const rb = runbookByWorkflow[w.id]
    return {
      id: w.id,
      name: w.name,
      department: w.department || 'Operations',
      // Not `|| 'low'`. An unmeasured workflow is not a low-criticality one,
      // and presenting it as such is the safest-looking possible lie (F-G').
      criticality: normalizeLevel(w.risk),
      owner: rb?.employees?.name ?? null,
      backup_owner: rb?.owner_id != null ? (backupByEmployee[rb.owner_id] ?? null) : null,
      documented: !!rb?.is_documented,
    }
  })
}

// ─── Scoring constants (unchanged from the original client-side engine) ────

const PENALTY_OWNERSHIP_ORPHANED   = 65
const PENALTY_WORKFLOW_ORPHANED    = 50
const PENALTY_NO_BACKUP            = 25
const PENALTY_NO_DOCS_AGENT        = 20
const PENALTY_NO_DOCS_TOOL         = 15
const PENALTY_NO_DOCS_WORKFLOW     = 15
const PENALTY_CONCENTRATION        = 20 // owner has 5+ agents
const PENALTY_CRITICAL_NO_BACKUP   = 15
const PENALTY_CRITICAL_NO_FALLBACK = 30 // critical tool, no fallback

function qualityTier(score) {
  if (score >= 80) return 'GOOD'
  if (score >= 55) return 'ACCEPTABLE'
  if (score >= 30) return 'POOR'
  return 'HARMFUL'
}

// ─── Ownership (agent) decision scoring ─────────────────────────────────────

function scoreAgentDecision(agent, ownerAgentCount) {
  let score = 100
  const influences = []

  const isCritical = agent.criticality === 'critical'
  const isHigh = agent.criticality === 'high'

  if (!agent.owner) {
    score -= PENALTY_OWNERSHIP_ORPHANED
    influences.push({ factor: 'No Owner Assigned', impact: 'negative', detail: `Agent left unassigned — nobody is accountable (−${PENALTY_OWNERSHIP_ORPHANED})` })
  } else {
    influences.push({ factor: 'Owner Assigned', impact: 'positive', detail: `${agent.owner} holds ownership of this agent` })
    const count = ownerAgentCount[agent.owner] ?? 0
    if (count >= 5) {
      score -= PENALTY_CONCENTRATION
      influences.push({ factor: 'Owner Concentration Risk', impact: 'negative', detail: `${agent.owner} owns ${count} agents — excessive concentration (−${PENALTY_CONCENTRATION})` })
    }
  }

  if (!agent.backup_owner) {
    score -= PENALTY_NO_BACKUP
    influences.push({ factor: 'No Backup Owner', impact: 'negative', detail: `No fallback person if the owner is unavailable (−${PENALTY_NO_BACKUP})` })
  } else {
    influences.push({ factor: 'Backup Owner Present', impact: 'positive', detail: `${agent.backup_owner} can step in if needed` })
  }

  if (!agent.documented) {
    score -= PENALTY_NO_DOCS_AGENT
    influences.push({ factor: 'No Documentation / Runbook', impact: 'negative', detail: `Agent deployed without a runbook — tribal knowledge risk (−${PENALTY_NO_DOCS_AGENT})` })
  } else {
    influences.push({ factor: 'Documented', impact: 'positive', detail: 'Runbook or documentation exists for this agent' })
  }

  if ((isCritical || isHigh) && !agent.backup_owner) {
    score -= PENALTY_CRITICAL_NO_BACKUP
    influences.push({
      factor: `${agent.criticality.charAt(0).toUpperCase()}${agent.criticality.slice(1)} Asset — No Backup`,
      impact: 'negative',
      detail: `High-stakes agent with no coverage (−${PENALTY_CRITICAL_NO_BACKUP})`,
    })
  }

  score = Math.max(0, score)
  const quality = qualityTier(score)
  const fix = quality === 'POOR' || quality === 'HARMFUL' ? buildAgentFix(agent) : null
  const trailSummary = buildAgentTrail(agent, ownerAgentCount)

  return {
    id: `dec_agent_${agent.id}`,
    decision: agent.owner ? `Assign "${agent.name}" to ${agent.owner}` : `Leave "${agent.name}" unassigned`,
    category: 'ownership',
    subject: agent.name,
    subjectId: String(agent.id),
    criticality: agent.criticality,
    department: agent.department,
    decisionMaker: agent.owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  }
}

function buildAgentFix(agent) {
  const parts = []
  if (!agent.owner) parts.push(`Assign a primary owner for "${agent.name}"`)
  if (!agent.backup_owner) parts.push(`Designate a backup owner`)
  if (!agent.documented) parts.push(`Create a runbook / documentation`)
  return parts.join('; ') + '.'
}

function buildAgentTrail(agent, ownerAgentCount) {
  if (!agent.owner) {
    return `"${agent.name}" was deployed in ${agent.department} without assigning any owner, leaving it orphaned with no accountable stakeholder.`
  }
  const count = ownerAgentCount[agent.owner] ?? 0
  const concentration = count >= 5 ? ` ${agent.owner} was already managing ${count} agents, creating unsafe concentration.` : ''
  const backup = agent.backup_owner ? ` ${agent.backup_owner} was named as backup.` : ` No backup was designated.`
  const docs = agent.documented ? ` Documentation was created.` : ` No runbook was created.`
  return `"${agent.name}" was assigned to ${agent.owner} in ${agent.department}.${concentration}${backup}${docs}`
}

// ─── Tooling decision scoring ────────────────────────────────────────────────

function scoreToolDecision(tool, toolMap) {
  let score = 100
  const influences = []
  const isCritical = tool.criticality === 'critical'

  if (!tool.access_owner) {
    score -= PENALTY_OWNERSHIP_ORPHANED
    influences.push({ factor: 'No Access Owner', impact: 'negative', detail: `Tool adopted with no designated access owner (−${PENALTY_OWNERSHIP_ORPHANED})` })
  } else {
    influences.push({ factor: 'Access Owner Assigned', impact: 'positive', detail: `${tool.access_owner} manages access and governance` })
  }

  if (!tool.backup_tool) {
    const penalty = isCritical ? PENALTY_CRITICAL_NO_FALLBACK : PENALTY_NO_BACKUP
    score -= penalty
    influences.push({
      factor: isCritical ? 'Critical Tool — No Fallback' : 'No Fallback Tool',
      impact: 'negative',
      detail: isCritical ? `Critical tool adopted with zero fallback selected (−${penalty})` : `No backup tool designated if this tool becomes unavailable (−${penalty})`,
    })
  } else {
    influences.push({ factor: 'Fallback Tool Available', impact: 'positive', detail: `${toolMap[tool.backup_tool] ?? tool.backup_tool} is the designated fallback` })
  }

  if (!tool.documented) {
    score -= PENALTY_NO_DOCS_TOOL
    influences.push({ factor: 'No Documentation', impact: 'negative', detail: `Tool deployed without usage documentation or runbook (−${PENALTY_NO_DOCS_TOOL})` })
  } else {
    influences.push({ factor: 'Documented', impact: 'positive', detail: 'Usage documentation exists for this tool' })
  }

  score = Math.max(0, score)
  const quality = qualityTier(score)
  const fix = quality === 'POOR' || quality === 'HARMFUL' ? buildToolFix(tool) : null
  const dept = tool.departments?.[0] ?? 'General'
  const trailSummary = buildToolTrail(tool, dept, toolMap)

  return {
    id: `dec_tool_${tool.id}`,
    decision: `Adopt "${tool.name}" as ${tool.criticality} AI tool`,
    category: 'tooling',
    subject: tool.name,
    subjectId: String(tool.id),
    criticality: tool.criticality,
    department: dept,
    decisionMaker: tool.access_owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  }
}

function buildToolFix(tool) {
  const parts = []
  if (!tool.access_owner) parts.push(`Assign an access owner for "${tool.name}"`)
  if (!tool.backup_tool) parts.push(`Select a fallback tool in case of outage`)
  if (!tool.documented) parts.push(`Create usage documentation / runbook`)
  return parts.join('; ') + '.'
}

function buildToolTrail(tool, dept, toolMap) {
  const owner = tool.access_owner ? `Access was granted by ${tool.access_owner}` : 'No access owner was assigned'
  const fallback = tool.backup_tool ? `${toolMap[tool.backup_tool] ?? tool.backup_tool} was chosen as the fallback` : 'No fallback tool was selected'
  const docs = tool.documented ? 'Documentation was created' : 'No documentation was produced'
  const criticalityPhrase = tool.criticality === 'unknown' ? 'an unassessed' : `a ${tool.criticality}`
  return `"${tool.name}" was adopted as ${criticalityPhrase} tool across ${dept}. ${owner}. ${fallback}. ${docs}.`
}

// ─── Workflow decision scoring ──────────────────────────────────────────────

function scoreWorkflowDecision(wf) {
  let score = 100
  const influences = []
  const isCritical = wf.criticality === 'critical'
  const isHigh = wf.criticality === 'high'

  if (!wf.owner) {
    score -= PENALTY_WORKFLOW_ORPHANED
    influences.push({ factor: 'No Workflow Owner', impact: 'negative', detail: `Workflow left without an owner — no accountable stakeholder (−${PENALTY_WORKFLOW_ORPHANED})` })
  } else {
    influences.push({ factor: 'Owner Assigned', impact: 'positive', detail: `${wf.owner} is responsible for this workflow` })
  }

  if (!wf.backup_owner) {
    score -= PENALTY_NO_BACKUP
    influences.push({ factor: 'No Backup Owner', impact: 'negative', detail: `No fallback person if the workflow owner is unavailable (−${PENALTY_NO_BACKUP})` })
  } else {
    influences.push({ factor: 'Backup Owner Present', impact: 'positive', detail: `${wf.backup_owner} can step in if needed` })
  }

  if (!wf.documented) {
    score -= PENALTY_NO_DOCS_WORKFLOW
    influences.push({ factor: 'No Documentation / SOP', impact: 'negative', detail: `Workflow set up without a standard operating procedure (−${PENALTY_NO_DOCS_WORKFLOW})` })
  } else {
    influences.push({ factor: 'Documented', impact: 'positive', detail: 'SOP / documentation exists for this workflow' })
  }

  if ((isCritical || isHigh) && !wf.backup_owner) {
    score -= PENALTY_CRITICAL_NO_BACKUP
    influences.push({
      factor: `${wf.criticality.charAt(0).toUpperCase()}${wf.criticality.slice(1)} Workflow — No Backup`,
      impact: 'negative',
      detail: `High-stakes workflow with zero backup coverage (−${PENALTY_CRITICAL_NO_BACKUP})`,
    })
  }

  score = Math.max(0, score)
  const quality = qualityTier(score)
  const fix = quality === 'POOR' || quality === 'HARMFUL' ? buildWorkflowFix(wf) : null
  const trailSummary = buildWorkflowTrail(wf)

  return {
    id: `dec_workflow_${wf.id}`,
    decision: wf.owner ? `Set up "${wf.name}" under ${wf.owner}` : `Deploy "${wf.name}" with no owner`,
    category: 'workflow',
    subject: wf.name,
    subjectId: String(wf.id),
    criticality: wf.criticality,
    department: wf.department,
    decisionMaker: wf.owner,
    score,
    quality,
    influences,
    fix,
    trailSummary,
  }
}

function buildWorkflowFix(wf) {
  const parts = []
  if (!wf.owner) parts.push(`Assign a primary owner for "${wf.name}"`)
  if (!wf.backup_owner) parts.push(`Designate a backup owner`)
  if (!wf.documented) parts.push(`Create a standard operating procedure (SOP)`)
  return parts.join('; ') + '.'
}

function buildWorkflowTrail(wf) {
  if (!wf.owner) {
    return `"${wf.name}" was deployed in ${wf.department} without assigning an owner — creating an unowned ${wf.criticality} process.`
  }
  const backup = wf.backup_owner ? `${wf.backup_owner} was named as backup` : 'No backup was named'
  const docs = wf.documented ? 'An SOP was documented' : 'No SOP was created'
  return `"${wf.name}" was established under ${wf.owner} in ${wf.department}. ${backup}. ${docs}.`
}

// ─── DQI + orchestration ─────────────────────────────────────────────────────

/**
 * Decides whether there's enough evidence to publish a Decision Quality Index
 * at all, and computes it if so. Zero decisions used to return dqi: 100,
 * banding to 'STRONG' — the optimistic mirror of band()'s CRITICAL-on-absence
 * bug: absence read as the *best* possible verdict instead of "unmeasured"
 * (D-07, D-10, D-24).
 */
function dqiVerdictFor(decisions) {
  const evidence = evidenceGate(decisions, () => true)
  if (!evidence.sufficient) return { dqi: null, dqiVerdict: null, evidence }

  const avg = decisions.reduce((s, d) => s + d.score, 0) / decisions.length
  const dqi = Math.round(avg)
  const dqiVerdict = dqi >= 80 ? 'STRONG' : dqi >= 55 ? 'MIXED' : dqi >= 30 ? 'WEAK' : 'CRITICAL'
  return { dqi, dqiVerdict, evidence }
}

router.get('/', async (req, res) => {
  try {
    const [rawAgents, rawWorkflows, rawTools] = await Promise.all([
      loadEnrichedAgents(),
      loadWorkflowsForDecisions(),
      loadEnrichedTools(),
    ])

    const agents = rawAgents.map((a) => ({
      id: a.id,
      name: a.name,
      owner: a.owner?.name ?? null,
      backup_owner: a.backup_owner,
      criticality: normalizeLevel(a.risk),
      department: a.owner?.department || 'Operations',
      documented: !!a.documented,
    }))

    const workflows = rawWorkflows
    const tools = rawTools.map((t) => ({
      ...t,
      criticality: normalizeLevel(t.criticality),
      documented: !!t.documented,
    }))

    const ownerAgentCount = {}
    for (const a of agents) {
      if (a.owner) ownerAgentCount[a.owner] = (ownerAgentCount[a.owner] ?? 0) + 1
    }

    const toolMap = {}
    for (const t of tools) toolMap[t.id] = t.name

    const agentDecisions = agents.map((a) => scoreAgentDecision(a, ownerAgentCount))
    const workflowDecisions = workflows.map((w) => scoreWorkflowDecision(w))
    const toolDecisions = tools.map((t) => scoreToolDecision(t, toolMap))

    const decisions = [...agentDecisions, ...workflowDecisions, ...toolDecisions]
    decisions.sort((a, b) => a.score - b.score)

    const { dqi, dqiVerdict, evidence } = dqiVerdictFor(decisions)

    res.json({
      decisions,
      good: decisions.filter((d) => d.quality === 'GOOD'),
      acceptable: decisions.filter((d) => d.quality === 'ACCEPTABLE'),
      poor: decisions.filter((d) => d.quality === 'POOR'),
      harmful: decisions.filter((d) => d.quality === 'HARMFUL'),
      dqi,
      dqiVerdict,
      evidence,
      totalDecisions: decisions.length,
      ownerConcentration: ownerAgentCount,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
router.dqiVerdictFor = dqiVerdictFor
