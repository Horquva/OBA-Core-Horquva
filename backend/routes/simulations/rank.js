const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const baseline = domain.simulations.baselineHealthScore(roots)
    const scenarios = domain.simulations.rankAllScenarios(roots).map((s) => ({
      ...s,
      healthBefore: 'stable',
      healthAfter: s.severity === 'critical' ? 'critical' : s.severity === 'low' ? 'stable' : 'degraded',
      riskLevel: s.severity,
      baselineHealthScore: baseline,
      simulatedHealthScore: baseline != null && s.healthDelta != null ? baseline - s.healthDelta : null,
    }))
    res.json({ scenarios })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
