const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/agents — list all agents with enriched fields
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      id, name, type, status, risk, owner_id,
      usage_count, adoption_pct, last_used, cost,
      employees ( id, name, role, department )
    `)

  if (error) return res.status(500).json({ error: error.message })

  const result = data.map(a => ({
    id:          a.id,
    name:        a.name,
    type:        a.type,
    status:      a.status,
    risk:        a.risk,
    usageCount:  a.usage_count,
    adoptionPct: a.adoption_pct,
    lastUsed:    a.last_used,
    monthlyCost: a.cost,
    owner:       a.employees ?? null
  }))

  res.json(result)
})

// GET /api/agents/orphaned — agents with no owner
router.get('/orphaned', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, type, status, risk')
    .is('owner_id', null)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ total: data.length, orphanedAgents: data })
})

// GET /api/agents/risk-summary — risk breakdown
router.get('/risk-summary', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('id, name, status, risk, owner_id')

  if (error) return res.status(500).json({ error: error.message })

  const breakdown = {
    critical: data.filter(a => a.risk === 'critical'),
    high:     data.filter(a => a.risk === 'high'),
    medium:   data.filter(a => a.risk === 'medium'),
    low:      data.filter(a => a.risk === 'low')
  }

  const orphaned = data.filter(a => !a.owner_id)
  const inactive = data.filter(a => a.status !== 'active')

  res.json({
    total:    data.length,
    orphaned: orphaned.length,
    inactive: inactive.length,
    breakdown: {
      critical: breakdown.critical.length,
      high:     breakdown.high.length,
      medium:   breakdown.medium.length,
      low:      breakdown.low.length
    },
    criticalAgents: breakdown.critical.map(a => ({ name: a.name, status: a.status })),
    inactiveAgents: inactive.map(a => ({ name: a.name, status: a.status, risk: a.risk }))
  })
})

module.exports = router