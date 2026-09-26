const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const baseline = domain.simulations.baselineHealthScore(roots)

    const scenarios = domain.simulations
      .rankAllScenarios(roots)
      .map((s) => {
        const simulated = baseline != null && s.healthDelta != null ? baseline - s.healthDelta : null
        return {
          ...s,
          blastRadius:
            (s.impactedAgents?.length || 0) +
            (s.impactedWorkflows?.length || 0) +
            (s.impactedPeople?.length || 0),
          healthBefore: domain.simulations.healthStatusFor(baseline),
          healthAfter: domain.simulations.healthStatusFor(simulated),
          riskLevel: s.severity,
          baselineHealthScore: baseline,
          simulatedHealthScore: simulated,
        }
      })
      .sort((a, b) => b.blastRadius - a.blastRadius)

    res.json({ scenarios })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
