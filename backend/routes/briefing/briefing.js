const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')
const { must, optional } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// HELPERS — pull live signals from existing modules
// ─────────────────────────────────────────────

// Both of these used to SELECT from tables seeded once by SQL and written by
// nothing, so the "daily" briefing opened with the same single point of failure
// and the same overloaded person every day regardless of what had changed.
// Row shapes below match the old SELECTs so the briefing prose is untouched.

async function getTopSPOF() {
  const intel = await domain.intelligence.all()
  const top = intel.predictiveRisk.scores.find(p => p.threatLevel === 'CRITICAL')
  if (!top) return null
  return {
    predicted_score: top.predictedScore,
    agents: { name: top.agentName, risk: top.recordedRisk, owner_id: null },
  }
}

async function getMostOverloaded() {
  const intel = await domain.intelligence.all()
  const people = intel.collaboration.perEmployee
  if (!people.length) return null
  const top = people.reduce((a, b) => (b.dependencyScore > a.dependencyScore ? b : a))
  return {
    dependency_score:      top.dependencyScore,
    critical_agents_owned: top.criticalAgentsOwned,
    has_backup:            top.hasBackup,
    employees: { name: top.name, department: top.department },
  }
}

// workflow_failures has no timestamp column in any migration — there is no
// real recency to sort by. Ordering by workflow_id descending is the best
// available proxy, not an actual "latest" guarantee; do not present this as
// time-ordered without adding a real timestamp column first.
async function getLatestIncident() {
  return must('workflow_failures', supabase
    .from('workflow_failures')
    .select('failure_type, severity, description, workflow_id, workflows(name)')
    .eq('severity', 'critical')
    .order('workflow_id', { ascending: false })
    .limit(1)
    .maybeSingle())
}

async function getDocTrend() {
  const data = await must('documentation_trend', supabase
    .from('documentation_trend')
    .select('*')
    .order('recorded_month', { ascending: false })
    .limit(2))

  if (data.length < 2) return null

  const [latest, previous] = data
  const direction =
    latest.coverage_pct > previous.coverage_pct ? 'IMPROVING'
    : latest.coverage_pct < previous.coverage_pct ? 'DECLINING'
    : 'STABLE'

  return { latest, previous, direction }
}

async function getPendingDecisionsCount() {
  const { count, error } = await supabase
    .from('pending_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw new Error(`pending_decisions: ${error.message}`)
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
    // A failed cache read is non-fatal — computing live is the right fallback —
    // but log the real error rather than silently treating it as "no cache".
    const cached = await optional('executive_briefings (cache read)', supabase
      .from('executive_briefings')
      .select('*')
      .eq('briefing_date', today)
      .maybeSingle())

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

    // Cache it. The briefing is already computed and valid, so a write failure
    // must not deny it to the caller — but it can't vanish either.
    const { error: cacheError } = await supabase.from('executive_briefings').insert(briefing)
    if (cacheError) {
      console.warn(`[briefing] failed to cache today's briefing: ${cacheError.message}`)
    }

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
      })),
      // documentation_trend is a genuine, never-rewritten time series (D-09
      // KEEP list). Unlike executive_briefings elsewhere in this file (which
      // IS written daily by /today below), this can never be recomputed.
      provenance: { source: 'historical', table: 'documentation_trend' }
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
    const intel = await domain.intelligence.all()
    const data = intel.predictiveRisk.scores
      .filter(p => ['CRITICAL', 'HIGH'].includes(p.threatLevel))
      .slice(0, 5)
      .map(p => ({
        predicted_score:    p.predictedScore,
        threat_level:       p.threatLevel,
        is_emerging_threat: p.isEmergingThreat,
        reasons:            p.reasons,
        agents: { name: p.agentName, status: null, risk: p.recordedRisk },
      }))

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

// ─────────────────────────────────────────────
// GET /api/briefing/recommendations — top open recommendations
// ─────────────────────────────────────────────

// D-66: this used to SELECT from the `recommendations` table — seeded once
// by SQL, zero writers anywhere in this codebase, so it answered the same
// list every day regardless of what had changed (the same class of bug the
// header comment above already fixed for getTopSPOF()/getMostOverloaded()).
// Brain module M04 (D-62) is the real, comprehensive recommendation engine;
// this now reads it directly instead of a frozen table under the same name.
router.get('/recommendations', async (req, res) => {
  try {
    if (!domain.graph.isReady()) {
      return res.status(503).json({ error: 'Brain graph not loaded' })
    }
    const intel = await domain.graph.run('recommendation-engine')
    const recs = intel?.payload?.recommendations ?? []

    const items = recs.slice(0, 10).map((r) => ({
      type: r.priority.toLowerCase(),
      message: `${r.title} — ${r.description}`,
    }))

    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router