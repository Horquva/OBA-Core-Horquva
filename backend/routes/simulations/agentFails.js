const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'agent-fails',
      hint: 'Call /api/simulations/agent-fails/{name} to run a scenario',
      available: roots.agents.map((a) => ({ id: a.id, name: a.name, status: a.status, risk: a.risk })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:agent', async (req, res) => {
  try {
    const { agent } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.agents.find((a) => a.name.toLowerCase() === agent.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Agent not found' })

    const result = domain.simulations.agentFails(target.id, roots)
    const baseline = domain.simulations.baselineHealthScore(roots)
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: 'stable',
      healthAfter: result.severity === 'critical' ? 'critical' : result.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
      baselineHealthScore: baseline,
      simulatedHealthScore: baseline != null && result.healthDelta != null ? baseline - result.healthDelta : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router