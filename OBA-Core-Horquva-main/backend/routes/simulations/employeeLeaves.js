const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/:employee', async (req, res) => {
  const { employee } = req.params

  // Get employee
  const { data: emp } = await supabase
    .from('employees')
    .select('id, name, role, department, risk')
    .ilike('name', employee)
    .single()

  if (!emp) return res.status(404).json({ error: 'Employee not found' })

  // Get agents owned by this employee
  const { data: agentLinks } = await supabase
    .from('employee_agent')
    .select('agent_id, agents(id, name, status, risk)')
    .eq('employee_id', emp.id)

  const impactedAgents = agentLinks.map(l => l.agents)

  // Get workflows those agents belong to
  const agentIds = impactedAgents.map(a => a.id)
  const { data: wfLinks } = await supabase
    .from('workflow_dependencies')
    .select('workflows(id, name, status, risk)')
    .in('agent_id', agentIds)

  const impactedWorkflows = [...new Map(
    wfLinks.map(w => [w.workflows.id, w.workflows])
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
})

module.exports = router