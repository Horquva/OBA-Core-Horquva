const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const [agents, owners, deps, recs] = await Promise.all([
    supabase.from('agents').select('id, owner_id, risk'),
    supabase.from('owners').select('id'),
    supabase.from('dependencies').select('dependency_type'),
    supabase.from('recommendations').select('priority')
  ])

  if (agents.error || owners.error || deps.error || recs.error) {
    return res.status(500).json({ error: 'Failed to load dashboard data' })
  }

  const totalAgents      = agents.data.length
  const orphanedAgents   = agents.data.filter(a => !a.owner_id).length
  const criticalDeps     = deps.data.filter(d => d.dependency_type === 'critical').length
  const criticalRecs     = recs.data.filter(r => r.priority === 'critical').length

  // Risk score calculation
  const weights = { critical: 40, high: 20, medium: 10, low: 5 }
  const raw = agents.data.reduce((sum, a) => sum + (weights[a.risk] || 0), 0)
  const riskScore = Math.min(Math.round((raw / (totalAgents * 40)) * 100), 100)

  res.json({
    agents:               totalAgents,
    orphanedAgents:       orphanedAgents,
    riskScore:            riskScore,
    criticalDependencies: criticalDeps,
    criticalRecommendations: criticalRecs
  })
})

module.exports = router