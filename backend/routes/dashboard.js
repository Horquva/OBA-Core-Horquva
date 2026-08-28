const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const domain = require('../domain')

/*
 * GET /api/dashboard — comprehensive organizational dashboard
 *
 * D-67: this used to compute its own `riskScore` from a bespoke weight table
 * ({critical:40, high:20, medium:10, low:5} over agents.risk alone -- no
 * owner/backup/dependency signal at all), duplicating predictiveRisk()'s
 * real, canonical answer with a cruder one. It also served
 * `latestSnapshot.{continuityScore, governanceScore, memoryHealth, riskIndex}`
 * from the `snapshots` table -- seeded once by sql/02_seed_data.sql, zero
 * writers anywhere in this codebase -- under field names that directly
 * collide with the now-live M18/M19/orgMemory()/assetContinuity() concepts.
 * `openRecommendations`/`criticalRecommendations` read the `recommendations`
 * table, the same frozen table D-66 already found and fixed elsewhere.
 *
 * Fixed: riskScore is now the mean of predictiveRisk()'s real predictedScore
 * across agents. Recommendation counts come from brain module M04 (D-62),
 * the real recommendation engine. `latestSnapshot` is dropped entirely
 * rather than reinvented -- the concepts it named already have their own
 * dedicated, correctly-sourced routes (GET /api/memory/health, GET
 * /api/continuity, GET /api/intelligence/continuity, /governance); this
 * route never needed to be a second home for them. The `owners` query this
 * route ran was dead weight even before this fix -- fetched, error-checked,
 * never read -- so it's removed too.
 */
router.get('/', async (req, res) => {
  try {
    const [agents, deps, employees, workflows, platforms] = await Promise.all([
      supabase.from('agents').select('id, owner_id, risk, status'),
      supabase.from('dependencies').select('dependency_type'),
      supabase.from('employees').select('id, workload'),
      supabase.from('workflows').select('id, status, risk'),
      supabase.from('ai_platforms').select('id, status'),
    ])

    const firstError = agents.error || deps.error || employees.error || workflows.error || platforms.error
    if (firstError) {
      console.error('Dashboard Error:', {
        agents: agents.error,
        deps: deps.error,
        employees: employees.error,
        workflows: workflows.error,
        platforms: platforms.error,
      })
      return res.status(500).json({ error: 'Failed to load dashboard data' })
    }

    const totalAgents    = agents.data.length
    const orphanedAgents = agents.data.filter(a => !a.owner_id).length
    const criticalDeps   = deps.data.filter(d => d.dependency_type === 'critical').length

    const intel = await domain.intelligence.all()
    const risk = intel.predictiveRisk
    const riskScore = risk.scores.length
      ? Math.round(risk.scores.reduce((sum, s) => sum + s.predictedScore, 0) / risk.scores.length)
      : 0

    let openRecommendations = 0
    let criticalRecommendations = 0
    if (domain.graph.isReady()) {
      const m04 = await domain.graph.run('recommendation-engine')
      openRecommendations = m04?.payload?.recommendationCount ?? 0
      criticalRecommendations = m04?.payload?.criticalCount ?? 0
    }

    const avgWorkload = employees.data.length > 0
      ? Math.round(employees.data.reduce((sum, e) => sum + e.workload, 0) / employees.data.length)
      : 0

    res.json({
      agents:               totalAgents,
      orphanedAgents:       orphanedAgents,
      activeAgents:         agents.data.filter(a => a.status === 'active').length,
      failedAgents:         agents.data.filter(a => a.status === 'failed').length,
      riskScore:            riskScore,
      criticalDependencies: criticalDeps,
      totalDependencies:    deps.data.length,
      openRecommendations:  openRecommendations,
      criticalRecommendations: criticalRecommendations,
      totalEmployees:       employees.data.length,
      averageWorkload:      avgWorkload,
      totalWorkflows:       workflows.data?.length ?? 0,
      degradedWorkflows:    workflows.data?.filter(w => w.status !== 'active').length ?? 0,
      totalTools:           platforms.data?.length ?? 0,
      activeTools:          platforms.data?.filter(p => p.status === 'active').length ?? 0,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
