const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    res.json({
      scenario: 'workflow-disruption',
      hint: 'Call /api/simulations/workflow-disruption/{name} to run a scenario',
      available: roots.workflows.map((w) => ({ id: w.id, name: w.name, status: w.status, risk: w.risk, department: w.department })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:workflow', async (req, res) => {
  try {
    const { workflow } = req.params
    const roots = await domain.simulations.loadRoots()
    const target = roots.workflows.find((w) => w.name.toLowerCase() === workflow.toLowerCase())
    if (!target) return res.status(404).json({ error: 'Workflow not found' })

    const result = domain.simulations.workflowDisruption(target.id, roots)
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