const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')

router.get('/', async (req, res) => {
  // fetch workflows with runbooks + failures
  const { data: workflows, error: wfErr } = await supabase
    .from('workflows')
    .select(`
      id, name, status, risk,
      workflow_runbooks ( owner_id, is_documented,
        employees ( id, name, role )
      ),
      workflow_failures ( failure_type, severity )
    `)

  if (wfErr) return res.status(500).json({ error: wfErr.message })

  // fetch agent + tool counts per workflow
  const { data: agentLinks, error: agErr } = await supabase
    .from('workflow_dependencies')
    .select('workflow_id, agent_id')

  if (agErr) return res.status(500).json({ error: agErr.message })

  const { data: toolLinks, error: tlErr } = await supabase
    .from('workflow_tool_dependencies')
    .select('workflow_id, platform_id')

  if (tlErr) return res.status(500).json({ error: tlErr.message })

  const spofWorkflows = []

  workflows.forEach(wf => {
    const runbook  = wf.workflow_runbooks?.[0] || null
    const failures = wf.workflow_failures      || []

    const agentCount = agentLinks.filter(l => l.workflow_id === wf.id).length
    const toolCount  = toolLinks.filter(l => l.workflow_id  === wf.id).length

    const reasons = []

    // single human owner — the schema supports at most one runbook owner per
    // workflow, so that alone can't signal risk; a recorded human_spof failure is
    // the actual evidence of single-human dependency.
    const humanSpof = failures.some(f => f.failure_type === 'human_spof')
    if (humanSpof) reasons.push('single_human_owner')

    // single tool -- zero tools is a different, worse fact than exactly one
    // ("single tool dependency" asserts a tool exists and there's only one of
    // it; toolCount===0 means none does), so it gets its own reason instead of
    // being folded into "single" under a `<= 1` comparison.
    if (toolCount === 0) reasons.push('no_tool_dependency')
    else if (toolCount === 1) reasons.push('single_tool_dependency')

    // single critical agent -- same distinction for agents.
    if (agentCount === 0) reasons.push('no_agent_dependency')
    else if (agentCount === 1) reasons.push('single_agent_dependency')

    // explicit critical human spof failure
    const hasCriticalSpof = failures.some(
      f => f.failure_type === 'human_spof' && f.severity === 'critical'
    )
    if (hasCriticalSpof && !reasons.includes('single_human_owner')) {
      reasons.push('critical_human_spof')
    }

    if (reasons.length > 0) {
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
        spofReasons:   reasons,
        spofDetected:  true
      })
    }
  })

  spofWorkflows.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return (order[a.risk] ?? 4) - (order[b.risk] ?? 4)
  })

  res.json({ total: spofWorkflows.length, spofWorkflows })
})

module.exports = router