const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/:platform', async (req, res) => {
  const { platform } = req.params

  // Get platform
  const { data: plat } = await supabase
    .from('ai_platforms')
    .select('id, name, type, status')
    .ilike('name', platform)
    .single()

  if (!plat) return res.status(404).json({ error: 'Platform not found' })

  // Get agents on this platform
  const { data: agentLinks } = await supabase
    .from('agent_platform')
    .select('agents(id, name, status, risk)')
    .eq('platform_id', plat.id)

  const impactedAgents = agentLinks.map(l => l.agents)

  // Get workflows for those agents
  const agentIds = impactedAgents.map(a => a.id)
  const { data: wfLinks } = await supabase
    .from('workflow_dependencies')
    .select('workflows(id, name, status, risk)')
    .in('agent_id', agentIds)

  const impactedWorkflows = [...new Map(
    wfLinks.map(w => [w.workflows.id, w.workflows])
  ).values()]

  const riskLevel = impactedAgents.length >= 3 ? 'critical' : 'high'

  res.json({
    scenario:         `If ${plat.name} goes down`,
    impactedAgents,
    impactedWorkflows,
    impactedPeople:   [],
    healthBefore:     'stable',
    healthAfter:      'degraded',
    riskLevel
  })
})

module.exports = router