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

    // single tool -- a SPOF reason means "this breaks if the one thing it
    // depends on fails." Zero tools/agents is the opposite condition: there
    // is nothing there to BE a single point of failure, so it used to get
    // its own "no_x_dependency" reason that counted a workflow with no tool
    // or agent involvement at all as SPOF evidence, inflating this route's
    // SPOF count far past the other pages computing the same question.
    // Exactly one is the real single-point-of-failure signal.
    if (toolCount === 1) reasons.push('single_tool_dependency')

    // single critical agent -- same distinction for agents.
    if (agentCount === 1) reasons.push('single_agent_dependency')

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