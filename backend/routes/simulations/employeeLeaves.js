const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// Bulk: every employee in one shared root read, not one request per employee.
// DepartureSim (frontend/components/knowledge/DepartureSim.tsx) needs a
// departure scenario for every employee up front to build its candidate
// list, before any one person is selected -- calling the per-employee route
// below once per employee would mean N concurrent calls, each doing its own
// uncached loadRoots(). Same "load once, compute many" pattern as ./rank.js.
router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const baseline = domain.simulations.baselineHealthScore(roots)
    const scenarios = roots.employees.map((e) => {
      const result = domain.simulations.employeeLeaves(e.id, roots)
      const simulated = baseline != null && result.healthDelta != null ? baseline - result.healthDelta : null
      return {
        employeeId: e.id,
        employeeName: e.name,
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

router.get('/:employee', async (req, res) => {
  try {
    const { employee } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.employees.find((e) => e.name.toLowerCase() === employee.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Employee not found' })

    const result = domain.simulations.employeeLeaves(target.id, roots)
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