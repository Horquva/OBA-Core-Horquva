const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS — pull live signals from existing modules
// ─────────────────────────────────────────────

async function getTopSPOF() {
  const { data } = await supabase
    .from('predictive_risk_scores')
    .select('predicted_score, agents(name, risk, owner_id)')
    .eq('threat_level', 'CRITICAL')
    .order('predicted_score', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

async function getMostOverloaded() {
  const { data } = await supabase
    .from('collaboration_scores')
    .select('dependency_score, critical_agents_owned, has_backup, employees(name, department)')
    .order('dependency_score', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

async function getLatestIncident() {
  const { data } = await supabase
    .from('workflow_failures')
    .select('failure_type, severity, description, workflow_id, workflows(name)')
    .eq('severity', 'critical')
    .order('workflow_id', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

async function getDocTrend() {
  const { data } = await supabase
    .from('documentation_trend')
    .select('*')
    .order('recorded_month', { ascending: false })
    .limit(2)

  if (!data || data.length < 2) return null

  const [latest, previous] = data
  const direction =
    latest.coverage_pct > previous.coverage_pct ? 'IMPROVING'
    : latest.coverage_pct < previous.coverage_pct ? 'DECLINING'
    : 'STABLE'

  return { latest, previous, direction }
}

async function getPendingDecisionsCount() {
  const { count } = await supabase
    .from('pending_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return count ?? 0
}

function buildSummaryPoints({ spof, overloaded, incident, docTrend, pendingCount }) {
  const points = []

  if (spof) {
    points.push(
      `SPOF ALERT: ${spof.agents?.name} has no backup owner. It is rated CRITICAL with a predicted risk score of ${spof.predicted_score}.`
    )
  }

  if (overloaded) {
    const backup = overloaded.has_backup ? 'has backup coverage' : 'has no backup coverage'
    points.push(
      `OVERLOAD: ${overloaded.employees?.name} carries a dependency score of ${overloaded.dependency_score}/100 and owns ${overloaded.critical_agents_owned} critical agents. ${backup}.`
    )
  }

  if (incident) {
    points.push(
      `INCIDENT: ${incident.description} — occurred in workflow: ${incident.workflows?.name}.`
    )
  }

  if (docTrend) {
    const { latest, previous, direction } = docTrend
    const emoji = direction === 'IMPROVING' ? 'up' : direction === 'DECLINING' ? 'down' : 'flat'
    points.push(
      `DOCUMENTATION: Coverage is ${direction} — moved from ${previous.coverage_pct}% to ${latest.coverage_pct}% (trend: ${emoji}). Safe threshold is 60%.`
    )
  }

  if (pendingCount >= 0) {
    points.push(
      `DECISIONS: ${pendingCount} pending decision${pendingCount !== 1 ? 's' : ''} require executive attention.`
    )
  }

  return points
}

// ─────────────────────────────────────────────
// GET /api/briefing/today
// ─────────────────────────────────────────────

router.get('/today', async (req, res) => {
  try {
    // Try to serve today's cached briefing first
    const today = new Date().toISOString().split('T')[0]
    const { data: cached } = await supabase
      .from('executive_briefings')
      .select('*')
      .eq('briefing_date', today)
      .single()

    if (cached) return res.json(cached)

    // No cached briefing for today — compute live
    const [spof, overloaded, incident, docTrend, pendingCount] = await Promise.all([
      getTopSPOF(),
      getMostOverloaded(),
      getLatestIncident(),
      getDocTrend(),
      getPendingDecisionsCount()
    ])

    const summaryPoints = buildSummaryPoints({ spof, overloaded, incident, docTrend, pendingCount })

    const briefing = {
      briefing_date: today,
      top_spof: spof?.agents?.name ?? null,
      top_spof_owner: null,
      most_overloaded_owner: overloaded?.employees?.name ?? null,
      overload_score: overloaded?.dependency_score ?? null,
      latest_incident: incident?.description ?? null,
      lesson_learned: null,
      doc_trend_current: docTrend?.latest?.coverage_pct ?? null,
      doc_trend_previous: docTrend?.previous?.coverage_pct ?? null,
      doc_trend_status: docTrend?.direction ?? null,
      summary_points: summaryPoints
    }

    // Cache it
    await supabase.from('executive_briefings').insert(briefing)

    res.json(briefing)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/briefing/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('executive_briefings')
      .select('briefing_date, summary_points, doc_trend_status, most_overloaded_owner, top_spof')
      .order('briefing_date', { ascending: false })
      .limit(1)
      .single()

    if (error) throw new Error(error.message)

    res.json({
      briefingDate: data.briefing_date,
      topSPOF: data.top_spof,
      mostOverloadedOwner: data.most_overloaded_owner,
      documentationTrend: data.doc_trend_status,
      summaryPoints: data.summary_points
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/briefing/history
// ─────────────────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('executive_briefings')
      .select('*')
      .order('briefing_date', { ascending: false })
      .limit(30)

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/briefing/documentation-trend
// ─────────────────────────────────────────────

router.get('/documentation-trend', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('documentation_trend')
      .select('*')
      .order('recorded_month', { ascending: true })

    if (error) throw new Error(error.message)

    const latest = data[data.length - 1]
    const first = data[0]

    res.json({
      currentCoverage: latest?.coverage_pct ?? null,
      startingCoverage: first?.coverage_pct ?? null,
      safeThreshold: 60,
      belowSafeThreshold: (latest?.coverage_pct ?? 0) < 60,
      trend: data.map(d => ({
        month: d.recorded_month,
        coveragePct: d.coverage_pct,
        totalAssets: d.total_assets,
        documented: d.documented
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/briefing/pending-decisions
// ─────────────────────────────────────────────

router.get('/pending-decisions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pending_decisions')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })

    if (error) throw new Error(error.message)

    const critical = data.filter(d => d.priority === 'critical').length
    const high = data.filter(d => d.priority === 'high').length

    res.json({
      totalPending: data.length,
      criticalCount: critical,
      highCount: high,
      decisions: data.map(d => ({
        title: d.title,
        description: d.description,
        priority: d.priority,
        sourceModule: d.source_module,
        raisedAt: d.raised_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/briefing/top-risks
// ─────────────────────────────────────────────

router.get('/top-risks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('predictive_risk_scores')
      .select(`
        predicted_score,
        threat_level,
        is_emerging_threat,
        reasons,
        agents ( name, status, risk )
      `)
      .in('threat_level', ['CRITICAL', 'HIGH'])
      .order('predicted_score', { ascending: false })
      .limit(5)

    if (error) throw new Error(error.message)

    res.json({
      totalHighAndCritical: data.length,
      agents: data.map(d => ({
        agentName: d.agents?.name,
        currentRisk: d.agents?.risk,
        predictedScore: d.predicted_score,
        threatLevel: d.threat_level,
        isEmergingThreat: d.is_emerging_threat,
        reasons: d.reasons
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router