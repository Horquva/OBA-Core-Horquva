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

      // group by type
      const grouped = {
        human_spof: failures.filter(f => f.failure_type === 'human_spof'),
        tool_spof:  failures.filter(f => f.failure_type === 'tool_spof'),
        agent_spof: failures.filter(f => f.failure_type === 'agent_spof')
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
          tool_spof: {
            count:    grouped.tool_spof.length,
            failures: grouped.tool_spof
          },
          agent_spof: {
            count:    grouped.agent_spof.length,
            failures: grouped.agent_spof
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