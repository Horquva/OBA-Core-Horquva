const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/:agent', async (req, res) => {
  const { agent } = req.params

  // Get the agent
  const { data: targetAgent } = await supabase
    .from('agents')
    .select('id, name, status, risk')
    .ilike('name', agent)
    .single()

  if (!targetAgent) return res.status(404).json({ error: 'Agent not found' })

  // Get agents that depend on this agent
  const { data: depLinks } = await supabase
    .from('dependencies')
    .select('dependent:agent_source(id, name, status, risk), dependency_type')
    .eq('agent_target', targetAgent.id)

  const impactedAgents = depLinks.map(d => ({
    ...d.dependent,
    dependency_type: d.dependency_type
  }))

  // Get workflows using this agent
  const { data: wfLinks } = await supabase
    .from('workflow_dependencies')
    .select('workflows(id, name, status, risk), is_critical')
    .eq('agent_id', targetAgent.id)

  const impactedWorkflows = wfLinks.map(w => ({
    ...w.workflows,
    is_critical: w.is_critical
  }))

  const hasCritical = depLinks.some(d => d.dependency_type === 'critical')
  const riskLevel   = hasCritical ? 'critical' : impactedAgents.length > 2 ? 'high' : 'medium'

  res.json({
    scenario:         `If ${targetAgent.name} fails`,
    impactedAgents,
    impactedWorkflows,
    impactedPeople:   [],
    healthBefore:     'stable',
    healthAfter:      hasCritical ? 'critical' : 'degraded',
    riskLevel
  })
})

module.exports = router