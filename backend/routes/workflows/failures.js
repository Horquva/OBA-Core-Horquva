const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')

router.get('/', async (req, res) => {
  const { data: workflows, error: wfErr } = await supabase
    .from('workflows')
    .select(`
      id, name,
      workflow_failures ( failure_type, severity, description )
    `)

  if (wfErr) return res.status(500).json({ error: wfErr.message })

  const result = workflows
    .filter(wf => wf.workflow_failures?.length > 0)
    .map(wf => {
      const failures = wf.workflow_failures

      // group by type — these four are the actual failure_type values recorded
      // in workflow_failures; there is no agent-caused failure category in this
      // data model, and tool failures are recorded as 'tool_failure', not 'tool_spof'.
      const grouped = {
        human_spof:        failures.filter(f => f.failure_type === 'human_spof'),
        tool_failure:      failures.filter(f => f.failure_type === 'tool_failure'),
        process_gap:       failures.filter(f => f.failure_type === 'process_gap'),
        escalation_failure: failures.filter(f => f.failure_type === 'escalation_failure')
      }

      // severity breakdown
      const severitySummary = {
        critical: failures.filter(f => f.severity === 'critical').length,
        high:     failures.filter(f => f.severity === 'high').length,
        medium:   failures.filter(f => f.severity === 'medium').length,
        low:      failures.filter(f => f.severity === 'low').length
      }

      return {
        workflow:      wf.name,
        totalFailures: failures.length,
        severitySummary,
        breakdown: {
          human_spof: {
            count:    grouped.human_spof.length,
            failures: grouped.human_spof
          },
          tool_failure: {
            count:    grouped.tool_failure.length,
            failures: grouped.tool_failure
          },
          process_gap: {
            count:    grouped.process_gap.length,
            failures: grouped.process_gap
          },
          escalation_failure: {
            count:    grouped.escalation_failure.length,
            failures: grouped.escalation_failure
          }
        }
      }
    })

  // sort by total failures descending
  result.sort((a, b) => b.totalFailures - a.totalFailures)

  const totalFailuresAcrossAll = result.reduce((s, w) => s + w.totalFailures, 0)

  res.json({
    totalWorkflows: result.length,
    totalFailures:  totalFailuresAcrossAll,
    workflows:      result
  })
})

module.exports = router