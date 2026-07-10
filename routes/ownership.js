const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/ownership — all owners with agents and concentration detection
router.get('/', async (req, res) => {
  // Fetch all owners
  const { data: owners, error: ownersError } = await supabase
    .from('owners')
    .select('id, name, role, backup_owner, risk, employee_id')

  if (ownersError) return res.status(500).json({ error: ownersError.message })

  // Fetch all agents
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, status, risk, owner_id')

  if (agentsError) return res.status(500).json({ error: agentsError.message })

  // Join in JS, matching agents.owner_id to owners.employee_id
  const data = owners.map(o => ({
    ...o,
    agents: agents.filter(a => a.owner_id === o.employee_id)
  }))

  // Detect ownership concentration
  const enriched = data.map(o => ({
    ...o,
    agentCount: o.agents?.length ?? 0,
    hasBackup: !!o.backup_owner,
    concentrationRisk: (o.agents?.length ?? 0) >= 4 ? 'high'
      : (o.agents?.length ?? 0) >= 2 ? 'medium'
        : 'low'
  }))

  // Find owners without backups
  const noBackup = enriched.filter(o => !o.hasBackup)
  const overloaded = enriched.filter(o => o.concentrationRisk === 'high')

  res.json({
    owners: enriched,
    gaps: {
      ownersWithoutBackup: noBackup.map(o => ({ name: o.name, role: o.role, agentCount: o.agentCount })),
      overloadedOwners: overloaded.map(o => ({ name: o.name, role: o.role, agentCount: o.agentCount }))
    }
  })
})

module.exports = router