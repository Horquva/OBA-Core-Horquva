const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    // Cached and computed off the request path (domain/simulations.js
    // rankedScenarios): ranking every scenario is seconds of CPU on a large
    // org, and running it inline here froze the whole server per request.
    const { baseline, scenarios: ranked, computedAt, fromMemo, refreshing } = await domain.simulations.rankedScenarios()
    const scenarios = ranked.map((s) => {
      const simulated = baseline != null && s.healthDelta != null ? baseline - s.healthDelta : null
      return {
        ...s,
        healthBefore: domain.simulations.healthStatusFor(baseline),
        healthAfter: domain.simulations.healthStatusFor(simulated),
        riskLevel: s.severity,
        baselineHealthScore: baseline,
        simulatedHealthScore: simulated,
      }
    })
    res.json({ scenarios, computedAt, fromMemo, refreshing })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
