const express = require('express')
const router  = express.Router()
const supabase = require('../../supabase')
const { loadOwnerBackupByEmployee } = require('../../lib/ownerBackups')

// GET /api/workflows — list all workflows with owner resolved via workflow_runbooks
// (workflows itself has no owner column — ownership + documentation status live
// on the runbook row, same pattern as /api/agents resolving owner via employees).
//
// This is the canonical shape for the frontend's `Workflow` type (id/name/
// department/criticality/documented/backup_owner/steps). /api/workflows/intelligence
// is a DIFFERENT endpoint returning computed risk-intelligence fields (riskScore,
// spofDetected, impactedAgents/Tools) over a differently-keyed object with no id,
// no department, no steps -- several frontend pages were fetching /intelligence
// and normalizing as if it were this shape, silently losing every one of those
// fields (see decision log, same-day fix "workflow shape mismatch").
router.get('/', async (req, res) => {
  const [{ data: workflows, error: wErr }, { data: runbooks, error: rErr }, { data: steps, error: sErr }] = await Promise.all([
    supabase.from('workflows').select('id, name, status, risk, department, frequency'),
    supabase.from('workflow_runbooks').select('workflow_id, owner_id, is_documented, employees ( id, name, role, department )'),
    supabase.from('workflow_steps').select('workflow_id, step_number, actor_type, actor_name, step_name').order('step_number'),
  ])
  if (wErr) return res.status(500).json({ error: wErr.message })
  if (rErr) return res.status(500).json({ error: rErr.message })
  if (sErr) return res.status(500).json({ error: sErr.message })

  const runbookByWorkflow = Object.fromEntries((runbooks || []).map((r) => [r.workflow_id, r]))
  const ownerBackups = await loadOwnerBackupByEmployee()

  const stepsByWorkflow = {}
  for (const s of steps || []) {
    (stepsByWorkflow[s.workflow_id] ||= []).push({
      step: s.step_number,
      actor: s.actor_type,
      name: s.actor_name,
      action: s.step_name,
    })
  }

  res.json(
    workflows.map((w) => {
      const rb = runbookByWorkflow[w.id]
      return {
        id: w.id,
        name: w.name,
        status: w.status,
        risk: w.risk,
        department: w.department,
        frequency: w.frequency,
        documented: rb ? rb.is_documented : null,
        owner: rb?.employees ?? null,
        // Same pattern as agents.js: backup coverage lives on `owners`, keyed
        // by the runbook owner's employee_id, not a column on this table.
        backup_owner: rb?.owner_id != null ? (ownerBackups[rb.owner_id] ?? null) : null,
        steps: stepsByWorkflow[w.id] || [],
      }
    })
  )
})

router.use('/intelligence', require('./intelligence'))
router.use('/spof',         require('./spof'))
router.use('/failures',     require('./failures'))

module.exports = router