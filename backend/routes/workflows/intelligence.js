const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')

// helpers
function calcRiskScore({ is_documented, humanSpofFailure, toolCount, failures }) {
  let score = 0

  if (!is_documented)     score += 30  // undocumented
  if (humanSpofFailure)   score += 30  // recorded single-human-dependency failure
  if (toolCount  <= 1)    score += 20  // single tool dependency

  // failure severity weight  critical=10  high=6  medium=3  low=1
  const weights = { critical: 10, high: 6, medium: 3, low: 1 }
  const failureScore = failures.reduce((sum, f) => sum + (weights[f.severity] || 0), 0)
  score += Math.min(failureScore, 20)   // cap failure contribution at 20

  return Math.min(score, 100)
}

router.get('/', async (req, res) => {
  // 1 — fetch all workflows with runbook + failures
  const { data: workflows, error: wfErr } = await supabase
    .from('workflows')
    .select(`
      id, name, status, risk,
      workflow_runbooks ( owner_id, is_documented, last_updated,
        employees ( id, name, role, department )
      ),
      workflow_failures ( failure_type, severity, description )
    `)

  if (wfErr) return res.status(500).json({ error: wfErr.message })

  // 2 — fetch agent links
  const { data: agentLinks, error: agErr } = await supabase
    .from('workflow_dependencies')
    .select('workflow_id, agents ( id, name, status, risk )')

  if (agErr) return res.status(500).json({ error: agErr.message })

  // 3 — fetch tool links
  const { data: toolLinks, error: tlErr } = await supabase
    .from('workflow_tool_dependencies')
    .select('workflow_id, ai_platforms ( id, name, type, status )')

  if (tlErr) return res.status(500).json({ error: tlErr.message })

  // 4 — build response
  const result = workflows.map(wf => {
    const runbook  = wf.workflow_runbooks?.[0] || null
    const owner    = runbook?.employees        || null
    const failures = wf.workflow_failures      || []

    const impactedAgents = agentLinks
      .filter(l => l.workflow_id === wf.id)
      .map(l => l.agents)
      .filter(Boolean)

    const impactedTools = toolLinks
      .filter(l => l.workflow_id === wf.id)
      .map(l => l.ai_platforms)
      .filter(Boolean)

    const is_documented    = runbook?.is_documented ?? false
    // The schema has no concept of multiple runbook owners — every workflow has
    // at most one — so "owner count" can never discriminate risk. The real signal
    // for single-human dependency is a recorded human_spof failure on this workflow.
    const humanSpofFailure = failures.some(f => f.failure_type === 'human_spof')
    const riskScore         = calcRiskScore({
      is_documented,
      humanSpofFailure,
      toolCount: impactedTools.length,
      failures
    })

    const spofDetected =
      humanSpofFailure ||
      impactedTools.length <= 1

    return {
      workflow:       wf.name,
      status:         wf.status,
      owner:          owner ? { name: owner.name, role: owner.role } : null,
      is_documented,
      lastUpdated:    runbook?.last_updated || null,
      totalAgents:    impactedAgents.length,
      totalTools:     impactedTools.length,
      riskScore,
      spofDetected,
      impactedAgents,
      impactedTools,
      failures
    }
  })

  // sort highest risk first
  result.sort((a, b) => b.riskScore - a.riskScore)

  res.json({ total: result.length, workflows: result })
})

module.exports = router