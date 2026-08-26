const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { spofVerdict } = require('../domain/definitions')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')

// GET /api/risks — comprehensive risk intelligence
router.get('/', async (req, res) => {
  const { data: agents, error: agentErr } = await supabase
    .from('agents')
    .select('id, name, risk, status, owner_id')

  if (agentErr) return res.status(500).json({ error: agentErr.message })

  const weights = { critical: 40, high: 20, medium: 10, low: 5 }
  const maxScore = 100

  const raw = agents.reduce((sum, a) => sum + (weights[a.risk] || 0), 0)
  const score = agents.length
    ? Math.min(Math.round((raw / (agents.length * 40)) * 100), maxScore)
    : 0

  const breakdown = {
    critical: agents.filter(a => a.risk === 'critical').length,
    high:     agents.filter(a => a.risk === 'high').length,
    medium:   agents.filter(a => a.risk === 'medium').length,
    low:      agents.filter(a => a.risk === 'low').length,
  }

  // SPOF detection — D-06: sole owner AND no backup AND criticality >= high,
  // via the canonical spofVerdict() rather than this route's own ad hoc rule
  // (which used to require owner present + risk high/critical + >=2 dependents,
  // and never checked backup coverage at all). Backup lookup goes through the
  // shared lib/ownerBackups.js rather than a second hand-rolled owners query —
  // same table/columns, previously duplicated by hand.
  const backupByEmployee = await loadOwnerBackupByEmployee()

  // Dependents are informational display data only here — D-06 deliberately
  // does not gate the verdict on them (an incomplete dependency graph must
  // not hide a SPOF that has no recorded dependent yet). This used to fall
  // back to `[]` on failure, which meant a broken query reported zero
  // dependents for every agent instead of the request failing.
  const { data: deps, error: depsErr } = await supabase
    .from('dependencies')
    .select('target_id, target_type, dependency_type')
    .eq('target_type', 'agent')
    .in('dependency_type', ['critical', 'high'])

  if (depsErr) return res.status(500).json({ error: depsErr.message })

  const depCounts = {}
  deps.forEach(d => {
    depCounts[d.target_id] = (depCounts[d.target_id] || 0) + 1
  })

  const spofAgents = agents
    .filter(a => spofVerdict({
      criticality: a.risk,
      ownerCount: a.owner_id != null ? 1 : 0,
      hasBackup: a.owner_id != null ? Boolean(backupByEmployee[a.owner_id]) : false,
    }).status === 'spof')
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