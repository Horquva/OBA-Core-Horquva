const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')
const { must, optional } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const URGENCY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

function sortByUrgency(items) {
  return [...items].sort((a, b) => {
    const urgencyDiff =
      (URGENCY_RANK[b.urgency] ?? 0) - (URGENCY_RANK[a.urgency] ?? 0)
    if (urgencyDiff !== 0) return urgencyDiff
    return b.blast_radius - a.blast_radius   // blast radius as tiebreaker
  })
}

function formatItem(i) {
  return {
    contextType:       i.context_type,
    title:             i.title,
    description:       i.description,
    entityName:        i.entity_name,
    responsiblePerson: i.responsible_person,
    urgency:           i.urgency,
    blastRadius:       i.blast_radius,
    sourceModule:      i.source_module,
    status:            i.status
  }
}

async function fetchOpenItems() {
  const { data, error } = await supabase
    .from('context_items')
    .select('*')
    .eq('status', 'open')

  if (error) throw new Error(error.message)
  return sortByUrgency(data)
}

async function fetchByType(contextType) {
  const { data, error } = await supabase
    .from('context_items')
    .select('*')
    .eq('context_type', contextType)
    .eq('status', 'open')

  if (error) throw new Error(error.message)
  return sortByUrgency(data)
}

// ─────────────────────────────────────────────
// GET /api/context/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const items = await fetchOpenItems()

    const byType = items.reduce((acc, i) => {
      acc[i.context_type] = (acc[i.context_type] || 0) + 1
      return acc
    }, {})

    const byUrgency = items.reduce((acc, i) => {
      acc[i.urgency] = (acc[i.urgency] || 0) + 1
      return acc
    }, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 })

    const topItem = items[0]

    res.json({
      totalContextItems: items.length,
      byType,
      byUrgency,
      topPriorityItem: topItem ? formatItem(topItem) : null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/feed
// The ranked "What Matters Right Now" feed
// ─────────────────────────────────────────────

router.get('/feed', async (req, res) => {
  try {
    const items = await fetchOpenItems()

    res.json({
      totalItems: items.length,
      feed: items.map((item, index) => ({
        rank: index + 1,
        ...formatItem(item)
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/critical
// ─────────────────────────────────────────────

router.get('/critical', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('context_items')
      .select('*')
      .eq('urgency', 'CRITICAL')
      .eq('status', 'open')
      .order('blast_radius', { ascending: false })

    if (error) throw new Error(error.message)

    res.json({
      totalCritical: data.length,
      items: data.map(formatItem)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/incidents
// ─────────────────────────────────────────────

router.get('/incidents', async (req, res) => {
  try {
    const items = await fetchByType('incident')

    // Enrich with live failure data from workflow_failures
    const failures = await must('workflow_failures', supabase
      .from('workflow_failures')
      .select('severity, description, failure_type, workflows(name)')
      .in('severity', ['critical', 'high'])
      .order('severity', { ascending: true })
      .limit(6))

    res.json({
      totalOpenIncidents: items.length,
      incidents: items.map(formatItem),
      liveFailureSignals: failures.map(f => ({
        workflowName: f.workflows?.name,
        failureType:  f.failure_type,
        severity:     f.severity,
        description:  f.description
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/decisions
// ─────────────────────────────────────────────

router.get('/decisions', async (req, res) => {
  try {
    const items = await fetchByType('decision')

    // Pull live pending decisions from decision_support module
    const pending = await must('pending_decisions', supabase
      .from('pending_decisions')
      .select('title, description, priority, source_module, raised_at')
      .eq('status', 'pending')
      .order('priority', { ascending: true }))

    res.json({
      totalPendingDecisions: items.length,
      contextItems: items.map(formatItem),
      pendingDecisionQueue: pending.map(d => ({
        title:        d.title,
        description:  d.description,
        priority:     d.priority,
        sourceModule: d.source_module,
        raisedAt:     d.raised_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/metrics
// ─────────────────────────────────────────────

router.get('/metrics', async (req, res) => {
  try {
    const items = await fetchByType('metric')

    // Pull live metric signals from existing modules — maybeSingle since an
    // empty table (no snapshot recorded yet) is legitimate, not a failure;
    // optional() still logs a real query error instead of rendering it as null.
    const [healthSnapshot, docTrend, orgScore] = await Promise.all([
      // Was the newest STORED month, which in a database with no write path
      // means a fixed month forever. Computed now.
      domain.intelligence.all().then(intel => ({
        health_index:   intel.orgHealth.healthIndex,
        health_status:  intel.orgHealth.healthStatus,
        snapshot_month: intel.orgHealth.snapshotMonth,
      })),

      optional('documentation_trend', supabase
        .from('documentation_trend')
        .select('coverage_pct, recorded_month')
        .order('recorded_month', { ascending: false })
        .limit(1)
        .maybeSingle()),

      domain.intelligence.all().then(intel => ({
        score:  intel.pillars.orgScore.score,
        rating: intel.pillars.orgScore.rating,
      }))
    ])

    res.json({
      totalWeakMetrics: items.length,
      contextItems: items.map(formatItem),
      liveMetrics: {
        organizationalHealthIndex: healthSnapshot?.health_index ?? null,
        healthStatus:              healthSnapshot?.health_status ?? null,
        documentationCoverage:     docTrend?.coverage_pct ?? null,
        orgIntelligenceScore:      orgScore?.score ?? null,
        orgIntelligenceRating:     orgScore?.rating ?? null
      },
      // organizationalHealthIndex/orgIntelligenceScore above are this
      // moment's live computation; documentationCoverage is read directly
      // from documentation_trend, a genuine never-rewritten time series
      // (D-09 KEEP list) — the one figure in this response that cannot be
      // recomputed.
      metricsProvenance: {
        documentationCoverage: { source: 'historical', table: 'documentation_trend' },
        organizationalHealthIndex: { source: 'live' },
        orgIntelligenceScore: { source: 'live' }
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/context/avatar
// Single endpoint for the Executive Avatar — highest priority context first
// ─────────────────────────────────────────────

router.get('/avatar', async (req, res) => {
  try {
    const items = await fetchOpenItems()

    // Top 5 for avatar display
    const top5 = items.slice(0, 5)

    // Pull latest briefing summary
    const briefing = await must('executive_briefings', supabase
      .from('executive_briefings')
      .select('summary_points, briefing_date')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .maybeSingle())

    // Pull hero risk for avatar context.
    // `hero_dependencies` was seeded once and written by nothing, so naming a
    // backup owner for somebody never removed them from this list. Hero risk is
    // computed now: owning two or more critical assets with no named backup.
    const heroIntel = await domain.intelligence.all()
    const heroes = heroIntel.executiveMemory.items
      .filter(i => i.memoryType === 'hero_risk' && i.severity === 'critical')
      .map(i => ({ person_name: i.entityName, resolution_count: null, risk_level: i.severity }))

    const criticalCount  = items.filter(i => i.urgency === 'CRITICAL').length
    const highCount      = items.filter(i => i.urgency === 'HIGH').length
    const spofCount      = items.filter(i => i.context_type === 'spof').length
    const incidentCount  = items.filter(i => i.context_type === 'incident').length

    res.json({
      avatarContext: {
        totalItemsRequiringAttention: items.length,
        criticalCount,
        highCount,
        spofCount,
        incidentCount
      },
      whatMattersRightNow: top5.map((item, index) => ({
        rank:              index + 1,
        urgency:           item.urgency,
        title:             item.title,
        entityName:        item.entity_name,
        responsiblePerson: item.responsible_person,
        blastRadius:       item.blast_radius,
        sourceModule:      item.source_module
      })),
      dailyBriefingPoints: briefing?.summary_points ?? [],
      heroDependencies: heroes.map(h => ({
        person:          h.person_name,
        resolutionCount: h.resolution_count,
        riskLevel:       h.risk_level
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router