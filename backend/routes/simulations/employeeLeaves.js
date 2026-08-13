const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// Base list — which employees can be simulated
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, role, department, risk')
    if (error) return res.status(500).json({ error: error.message })
    res.json({
      scenario: 'employee-leaves',
      hint: 'Call /api/simulations/employee-leaves/{name} to run a scenario',
      available: data || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:employee', async (req, res) => {
  try {
    const { employee } = req.params

    // Get employee
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id, name, role, department, risk')
      .ilike('name', employee)
      .maybeSingle()
    if (empErr) return res.status(500).json({ error: empErr.message })
    if (!emp) return res.status(404).json({ error: 'Employee not found' })

    // Get agents owned by this employee
    const { data: agentLinks, error: agentErr } = await supabase
      .from('employee_agent')
      .select('agent_id, agents(id, name, status, risk)')
      .eq('employee_id', emp.id)
    if (agentErr) return res.status(500).json({ error: agentErr.message })

    const impactedAgents = (agentLinks || []).map(l => l.agents)

    // Get workflows those agents belong to
    const agentIds = impactedAgents.map(a => a.id)
    const { data: wfLinks, error: wfErr } = await supabase
      .from('workflow_dependencies')
      .select('workflows(id, name, status, risk)')
      .in('agent_id', agentIds)
    if (wfErr) return res.status(500).json({ error: wfErr.message })

    const impactedWorkflows = [...new Map(
      (wfLinks || []).map(w => [w.workflows.id, w.workflows])
    ).values()]

    const riskLevel = impactedAgents.length >= 4 ? 'critical'
                    : impactedAgents.length >= 2 ? 'high'
                    : 'medium'

    res.json({
      scenario:         `If ${emp.name} leaves`,
      impactedAgents,
      impactedWorkflows,
      impactedPeople:   [emp],
      healthBefore:     'stable',
      healthAfter:      riskLevel === 'critical' ? 'critical' : 'degraded',
      riskLevel
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router