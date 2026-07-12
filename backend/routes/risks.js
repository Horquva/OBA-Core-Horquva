const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/risks — comprehensive risk intelligence
router.get('/', async (req, res) => {
  const { data: agents, error: agentErr } = await supabase
    .from('agents')
    .select('id, name, risk, status, owner_id')

  if (agentErr) return res.status(500).json({ error: agentErr.message })

  const weights = { critical: 40, high: 20, medium: 10, low: 5 }
  const maxScore = 100

  const raw = agents.reduce((sum, a) => sum + (weights[a.risk] || 0), 0)
  const score = Math.min(Math.round((raw / (agents.length * 40)) * 100), maxScore)

  const breakdown = {
    critical: agents.filter(a => a.risk === 'critical').length,
    high:     agents.filter(a => a.risk === 'high').length,
    medium:   agents.filter(a => a.risk === 'medium').length,
    low:      agents.filter(a => a.risk === 'low').length,
  }

  // SPOF detection
  const spofs = agents.filter(a =>
    (a.risk === 'critical' || a.risk === 'high') && a.owner_id
  )

  // Fetch dependency counts for SPOF analysis
  const { data: deps } = await supabase
    .from('dependencies')
    .select('target_id, target_type, dependency_type')
    .eq('target_type', 'agent')
    .in('dependency_type', ['critical', 'high'])

  const depCounts = {}
  ;(deps || []).forEach(d => {
    depCounts[d.target_id] = (depCounts[d.target_id] || 0) + 1
  })

  const spofAgents = spofs
    .filter(a => (depCounts[a.id] || 0) >= 2)
    .map(a => ({
      name:            a.name,
      risk:            a.risk,
      status:          a.status,
      dependentsCount: depCounts[a.id] || 0
    }))

  res.json({
    score,
    breakdown,
    singlePointsOfFailure: spofAgents,
    inactiveAgents: agents.filter(a => a.status !== 'active').map(a => ({
      name:   a.name,
      status: a.status,
      risk:   a.risk
    }))
  })
})

module.exports = router