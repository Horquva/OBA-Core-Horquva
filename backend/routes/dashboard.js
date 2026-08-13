const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

// GET /api/dashboard — comprehensive organizational dashboard
router.get('/', async (req, res) => {
  const [agents, owners, deps, recs, employees, workflows, platforms, snapshots] = await Promise.all([
    supabase.from('agents').select('id, owner_id, risk, status'),
    supabase.from('owners').select('id'),
    supabase.from('dependencies').select('dependency_type'),
    supabase.from('recommendations').select('priority, status'),
    supabase.from('employees').select('id, workload'),
    supabase.from('workflows').select('id, status, risk'),
    supabase.from('ai_platforms').select('id, status'),
    supabase.from('snapshots').select('*').order('snapshot_date', { ascending: false }).limit(1)
  ])

  if (agents.error || owners.error || deps.error || recs.error || employees.error || workflows.error || platforms.error || snapshots.error) {
    console.error('Dashboard Error:', {
      agents: agents.error,
      owners: owners.error,
      deps: deps.error,
      recs: recs.error,
      employees: employees.error,
      workflows: workflows.error,
      platforms: platforms.error,
      snapshots: snapshots.error
    })
    return res.status(500).json({ error: 'Failed to load dashboard data' })
  }

  const totalAgents      = agents.data.length
  const orphanedAgents   = agents.data.filter(a => !a.owner_id).length
  const criticalDeps     = deps.data.filter(d => d.dependency_type === 'critical').length
  const openRecs         = recs.data.filter(r => r.status === 'open' || r.status === 'in_progress')
  const criticalRecs     = openRecs.filter(r => r.priority === 'critical').length

  // Risk score calculation
  const weights = { critical: 40, high: 20, medium: 10, low: 5 }
  const raw = agents.data.reduce((sum, a) => sum + (weights[a.risk] || 0), 0)
  const riskScore = totalAgents
    ? Math.min(Math.round((raw / (totalAgents * 40)) * 100), 100)
    : 0

  // Workload
  const avgWorkload = employees.data.length > 0
    ? Math.round(employees.data.reduce((sum, e) => sum + e.workload, 0) / employees.data.length)
    : 0

  // Latest snapshot
  const latestSnapshot = snapshots.data?.[0] ?? null

  res.json({
    agents:               totalAgents,
    orphanedAgents:       orphanedAgents,
    activeAgents:         agents.data.filter(a => a.status === 'active').length,
    failedAgents:         agents.data.filter(a => a.status === 'failed').length,
    riskScore:            riskScore,
    criticalDependencies: criticalDeps,
    totalDependencies:    deps.data.length,
    openRecommendations:  openRecs.length,
    criticalRecommendations: criticalRecs,
    totalEmployees:       employees.data.length,
    averageWorkload:      avgWorkload,
    totalWorkflows:       workflows.data?.length ?? 0,
    degradedWorkflows:    workflows.data?.filter(w => w.status !== 'active').length ?? 0,
    totalTools:           platforms.data?.length ?? 0,
    activeTools:          platforms.data?.filter(p => p.status === 'active').length ?? 0,
    latestSnapshot:       latestSnapshot ? {
      date:              latestSnapshot.snapshot_date,
      memoryHealth:      latestSnapshot.memory_health,
      continuityScore:   latestSnapshot.continuity_score,
      governanceScore:   latestSnapshot.governance_score,
      riskIndex:         latestSnapshot.risk_index
    } : null
  })
})

module.exports = router