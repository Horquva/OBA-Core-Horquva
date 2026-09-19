const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// Bulk: every platform in one shared root read, not one request per platform.
// OutageImpactPanel (frontend/lib/aiToolIntelligence.ts) needs an outage
// scenario for every AI tool on the page regardless of criticality tier --
// calling the per-platform route below once per tool would mean N concurrent
// calls, each doing its own uncached loadRoots() (loadRoots() has no cache;
// that's what computeAllCachedStampede.unit.test.js guards for a DIFFERENT
// code path, computeAllCached, which these simulation routes don't go
// through). Same "load once, compute many" pattern as ./rank.js.
router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const baseline = domain.simulations.baselineHealthScore(roots)
    const scenarios = roots.ai_platforms.map((p) => {
      const result = domain.simulations.platformDown(p.id, roots)
      const simulated = baseline != null && result.healthDelta != null ? baseline - result.healthDelta : null
      return {
        platformId: p.id,
        platformName: p.name,
        scenario: result.scenario,
        impactedAgents: result.impactedAgents,
        impactedWorkflows: result.impactedWorkflows,
        impactedPeople: result.impactedPeople,
        healthBefore: domain.simulations.healthStatusFor(baseline),
        healthAfter: domain.simulations.healthStatusFor(simulated),
        riskLevel: result.severity,
        healthDelta: result.healthDelta,
        baselineHealthScore: baseline,
        simulatedHealthScore: simulated,
      }
    })
    res.json({ scenarios })
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
    const simulated = baseline != null && result.healthDelta != null ? baseline - result.healthDelta : null
    res.json({
      scenario: result.scenario,
      impactedAgents: result.impactedAgents,
      impactedWorkflows: result.impactedWorkflows,
      impactedPeople: result.impactedPeople,
      healthBefore: domain.simulations.healthStatusFor(baseline),
      healthAfter: domain.simulations.healthStatusFor(simulated),
      riskLevel: result.severity,
      healthDelta: result.healthDelta,
      baselineHealthScore: baseline,
      simulatedHealthScore: simulated,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router