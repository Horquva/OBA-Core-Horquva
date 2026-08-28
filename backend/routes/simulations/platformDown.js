const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'platform-down',
      hint: 'Call /api/simulations/platform-down/{name} to run a scenario',
      available: roots.ai_platforms.map((p) => ({ id: p.id, name: p.name, type: p.type, status: p.status })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.ai_platforms.find((p) => p.name.toLowerCase() === platform.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Platform not found' })

    const result = domain.simulations.platformDown(target.id, roots)
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