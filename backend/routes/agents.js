const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')

/** agent_id -> is_documented, via knowledge_assets where asset_type='agent'.
 *  null when no assessment exists — never fabricate a default (matches tools.js). */
async function loadAgentDocumentation() {
  const { data } = await supabase.from('knowledge_assets').select('asset_id, is_documented').eq('asset_type', 'agent')
  const byAgent = {}
  for (const k of data || []) byAgent[k.asset_id] = k.is_documented
  return byAgent
}

/** The enriched agent list — pulled out so other routes (decisionIntelligence.js)
 *  can reuse this exact computation instead of re-deriving owner/backup/documented. */
async function loadEnrichedAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      id, name, type, status, risk, owner_id,
      usage_count, adoption_pct, last_used, cost,
      employees ( id, name, role, department )
    `)
  if (error) throw new Error(`agents: ${error.message}`)

  const [documented, ownerBackups] = await Promise.all([
    loadAgentDocumentation(),
    loadOwnerBackupByEmployee(),
  ])

  return data.map(a => ({
    id:          a.id,
    name:        a.name,
    type:        a.type,
    status:      a.status,
    risk:        a.risk,
    usageCount:  a.usage_count,
    adoptionPct: a.adoption_pct,
    lastUsed:    a.last_used,
    monthlyCost: a.cost,
    owner:       a.employees ?? null,
    // There is no backup_owner column on `agents` — "backup coverage" is a
    // property of the agent's OWNER, recorded on the `owners` table keyed by
    // employee_id (see ownership.js). Derived here so every consumer of this
    // list gets a real value instead of silently reading `undefined` (which
    // is falsy the same way "genuinely no backup" is, hiding the difference).
    backup_owner: a.owner_id != null ? (ownerBackups[a.owner_id] ?? null) : null,
    documented:  a.id in documented ? documented[a.id] : null
  }))
}

// GET /api/agents — list all agents with enriched fields
router.get('/', async (req, res) => {
  try {
    res.json(await loadEnrichedAgents())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
module.exports.loadEnrichedAgents = loadEnrichedAgents
