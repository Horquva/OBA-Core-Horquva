const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/:workflow', async (req, res) => {
  const { workflow } = req.params

  // Get workflow
  const { data: wf } = await supabase
    .from('workflows')
    .select('id, name, status, risk')
    .ilike('name', workflow)
    .single()

  if (!wf) return res.status(404).json({ error: 'Workflow not found' })

  // Get agents in this workflow
  const { data: agentLinks } = await supabase
    .from('workflow_dependencies')
    .select('agents(id, name, status, risk), is_critical')
    .eq('workflow_id', wf.id)

  const impactedAgents = agentLinks.map(l => ({
    ...l.agents,
    is_critical: l.is_critical
  }))

  const hasCritical = agentLinks.some(l => l.is_critical)
  const riskLevel   = hasCritical ? 'critical' : 'high'

  res.json({
    scenario:         `If ${wf.name} is disrupted`,
    impactedAgents,
    impactedWorkflows: [wf],
    impactedPeople:   [],
    healthBefore:     'stable',
    healthAfter:      hasCritical ? 'critical' : 'degraded',
    riskLevel
  })
})

module.exports = router