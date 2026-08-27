const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'employee-leaves',
      hint: 'Call /api/simulations/employee-leaves/{name} to run a scenario',
      available: roots.employees.map((e) => ({ id: e.id, name: e.name, role: e.role, department: e.department })),
    })
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