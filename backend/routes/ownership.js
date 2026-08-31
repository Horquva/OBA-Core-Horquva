const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/ownership — all owners with their agents and concentration detection.
// NOTE: We fetch owners and agents separately and join in JS by owner_id.
// This avoids relying on a PostgREST foreign-key relationship between the
// `owners` and `agents` tables (which is not declared in the schema and was
// causing a 500 when using nested `agents (...)` embedding).
router.get('/', async (req, res) => {
  try {
    const { data: owners, error: ownersErr } = await supabase
      .from('owners')
      .select('id, name, role, backup_owner, risk')

    if (ownersErr) return res.status(500).json({ error: ownersErr.message })

    const { data: agents, error: agentsErr } = await supabase
      .from('agents')
      .select('id, name, status, risk, owner_id')

    if (agentsErr) return res.status(500).json({ error: agentsErr.message })

    const agentList = agents || []

    // Join agents onto their owner and enrich with concentration signals.
    const enriched = (owners || []).map((o) => {
      const ownedAgents = agentList
        .filter((a) => a.owner_id === o.id)
        .map((a) => ({ id: a.id, name: a.name, status: a.status, risk: a.risk }))
      const agentCount = ownedAgents.length
      return {
        ...o,
        agents: ownedAgents,
        agentCount,
        hasBackup: !!o.backup_owner,
        concentrationRisk:
          agentCount >= 4 ? 'high' : agentCount >= 2 ? 'medium' : 'low',
      }
    })

    const noBackup = enriched.filter((o) => !o.hasBackup)
    const overloaded = enriched.filter((o) => o.concentrationRisk === 'high')

    res.json({
      owners: enriched,
      gaps: {
        ownersWithoutBackup: noBackup.map((o) => ({
          name: o.name,
          role: o.role,
          agentCount: o.agentCount,
        })),
        overloadedOwners: overloaded.map((o) => ({
          name: o.name,
          role: o.role,
          agentCount: o.agentCount,
        })),
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
