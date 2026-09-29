const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const { applyOrgScope } = require('../../lib/tenant')
const { spofVerdict } = require('../../domain/definitions')
const { loadOwnerBackupByEmployee } = require('../../lib/ownerBackups')

/*
 * GET /api/workflows/spof — workflow-level single-point-of-failure list.
 *
 * Was this route's own multi-reason heuristic (a recorded human_spof failure,
 * OR exactly one dependent tool, OR exactly one dependent agent) instead of
 * the canonical spofVerdict() (D-06: sole owner AND no backup owner AND
 * criticality >= high) every other SPOF consumer in the product uses
 * (routes/risks.js, routes/dependencies.js's /agent-spofs) — flagged as
 * blocked on "workflow_runbooks has no backup-owner concept," which turned
 * out to be wrong: workflow_runbooks.owner_id is an employees.id, exactly
 * like agents.owner_id, and lib/ownerBackups.js's loadOwnerBackupByEmployee()
 * already documents that lookup for this table (see its own header comment).
 * domain/derived.js's assetContinuity() already resolves workflow backup
 * coverage this same way; this route just never adopted it.
 *
 * agentCount/toolCount/humanSpofRecorded are kept as informational blast-
 * radius/incident context, not folded into the SPOF gate itself -- the same
 * separation D-06 already drew for /agent-spofs' victimsCount.
 */
router.get('/', async (req, res) => {
  const [
    { data: workflows, error: wfErr },
    { data: runbooks, error: rbErr },
    { data: failures, error: failErr },
    { data: agentLinks, error: agErr },
    { data: toolLinks, error: tlErr },
    backupByEmployee,
  ] = await Promise.all([
    applyOrgScope(supabase.from('workflows').select('id, name, status, risk')),
    applyOrgScope(supabase.from('workflow_runbooks').select('workflow_id, owner_id, is_documented, employees ( id, name, role )')),
    applyOrgScope(supabase.from('workflow_failures').select('workflow_id, failure_type, severity')),
    applyOrgScope(supabase.from('workflow_dependencies').select('workflow_id, agent_id')),
    applyOrgScope(supabase.from('workflow_tool_dependencies').select('workflow_id, platform_id')),
    loadOwnerBackupByEmployee(),
  ])

  if (wfErr) return res.status(500).json({ error: wfErr.message })
  if (rbErr) return res.status(500).json({ error: rbErr.message })
  if (failErr) return res.status(500).json({ error: failErr.message })
  if (agErr) return res.status(500).json({ error: agErr.message })
  if (tlErr) return res.status(500).json({ error: tlErr.message })

  // First runbook row per workflow -- the schema allows more than one, but
  // every real workflow carries at most one today (same simplification the
  // old version of this route made).
  const runbookByWorkflow = new Map()
  for (const rb of runbooks) {
    if (!runbookByWorkflow.has(rb.workflow_id)) runbookByWorkflow.set(rb.workflow_id, rb)
  }

  const spofWorkflows = []

  for (const wf of workflows) {
    const runbook = runbookByWorkflow.get(wf.id) || null
    const agentCount = agentLinks.filter(l => l.workflow_id === wf.id).length
    const toolCount = toolLinks.filter(l => l.workflow_id === wf.id).length
    const humanSpofRecorded = failures.some(f => f.workflow_id === wf.id && f.failure_type === 'human_spof')

    const hasOwner = runbook?.owner_id != null
    const verdict = spofVerdict({
      criticality: wf.risk,
      ownerCount: hasOwner ? 1 : 0,
      hasBackup: hasOwner ? Boolean(backupByEmployee[runbook.owner_id]) : false,
    })

    if (verdict.status !== 'spof') continue

    spofWorkflows.push({
      workflow:      wf.name,
      status:        wf.status,
      risk:          wf.risk,
      owner:         runbook?.employees
                       ? { name: runbook.employees.name, role: runbook.employees.role }
                       : null,
      is_documented: runbook?.is_documented ?? false,
      agentCount,
      toolCount,
      humanSpofRecorded,
      spofReasons:   verdict.reasons,
      spofDetected:  true
    })
  }

  spofWorkflows.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return (order[a.risk] ?? 4) - (order[b.risk] ?? 4)
  })

  res.json({ total: spofWorkflows.length, spofWorkflows })
})

module.exports = router
