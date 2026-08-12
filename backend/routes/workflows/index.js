const express = require('express')
const router  = express.Router()
const supabase = require('../../supabase')

// GET /api/workflows — list all workflows with owner resolved via workflow_runbooks
// (workflows itself has no owner column — ownership + documentation status live
// on the runbook row, same pattern as /api/agents resolving owner via employees).
router.get('/', async (req, res) => {
  const [{ data: workflows, error: wErr }, { data: runbooks, error: rErr }] = await Promise.all([
    supabase.from('workflows').select('id, name, status, risk, department, frequency'),
    supabase.from('workflow_runbooks').select('workflow_id, is_documented, employees ( id, name, role, department )'),
  ])
  if (wErr) return res.status(500).json({ error: wErr.message })
  if (rErr) return res.status(500).json({ error: rErr.message })

  const runbookByWorkflow = Object.fromEntries((runbooks || []).map((r) => [r.workflow_id, r]))

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
      }
    })
  )
})

router.use('/intelligence', require('./intelligence'))
router.use('/spof',         require('./spof'))
router.use('/failures',     require('./failures'))

module.exports = router