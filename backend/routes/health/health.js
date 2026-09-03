const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')
const { must } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Used only to grade an individual dimension's raw 0-100 score (see
// /dimensions below) — NOT to combine dimensions into an overall index. This
// route used to also carry its own weighted combiner (documentation 20% /
// continuity 25% / ownershipSpread 15% / criticalSafety 25% / incidentLoad
// 15%) that /critical alone read from, while /summary and /dimensions read
// domain/derived.js's orgHealth.healthIndex — an unweighted mean with
// different STABLE/WARNING/CRITICAL thresholds (70/45, not 60/40). Same org,
// same moment, two different "health index" numbers depending which endpoint
// you called. There is one authoritative index now: domain.intelligence.all()
// .orgHealth. See getCurrentSnapshot() below.
function healthStatus(score) {
  if (score >= 60) return 'STABLE'
  if (score >= 40) return 'WARNING'
  return 'CRITICAL'
}

// The "current" snapshot was the newest STORED month — June, in a database
// whose newest month is June and whose write path does not exist. Current means
// now: this is computed. The stored months remain the historical series and are
// still read by fetchAllSnapshots() below, because history genuinely cannot be
// recomputed (the graph has no time dimension).
async function getCurrentSnapshot() {
  const intel = await domain.intelligence.all()
  const h = intel.orgHealth
  return {
    snapshot_month:         h.snapshotMonth,
    health_index:           h.healthIndex,
    health_status:          h.healthStatus,
    documentation_score:    h.documentationScore,
    continuity_score:       h.continuityScore,
    ownership_spread_score: h.ownershipSpreadScore,
    critical_safety_score:  h.criticalSafetyScore,
    incident_load_score:    h.incidentLoadScore,
    computed_at:            h.computedAt,
    source:                 h.source,
  }
}

async function fetchAllSnapshots() {
  const { data, error } = await supabase
    .from('org_health_snapshots')
    .select('*')
    .order('snapshot_month', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

function detectTrend(snapshots) {
  if (snapshots.length < 2) return 'INSUFFICIENT_DATA'
  const latest = snapshots[snapshots.length - 1].health_index
  const previous = snapshots[snapshots.length - 2].health_index
  if (latest > previous) return 'IMPROVING'
  if (latest < previous) return 'DECLINING'
  return 'STABLE'
}

// /summary pairs its trend with a LIVE current healthIndex (getCurrentSnapshot()),
// so it needs a trend spanning "then" to "now" — not detectTrend()'s two most-
// recent STORED rows, which compares the same two fixed months forever in a
// series nothing writes to (see fetchAllSnapshots()'s comment: the stored
// series stops at June while the live index moves every request). Mirrors
// orchestrator.js's readHealthTrend(): earliest stored row as baseline, the
// live current value as the other end. `/trend` below deliberately keeps using
// detectTrend() on the stored series alone — it presents a purely historical
// monthly series and never claims to reflect "now".
function detectLiveTrend(historicalSnapshots, currentHealthIndex) {
  if (!historicalSnapshots.length) return 'INSUFFICIENT_DATA'
  const earliest = historicalSnapshots[0].health_index
  if (currentHealthIndex > earliest) return 'IMPROVING'
  if (currentHealthIndex < earliest) return 'DECLINING'
  return 'STABLE'
}

// ─────────────────────────────────────────────
// LIVE DIMENSION SCORES — pulled from existing modules
// ─────────────────────────────────────────────

// Every read here feeds the headline live health index, so every one of them
// uses must(): a failure has to reach the caller as a 500. Previously these
// destructured only `{ data }`, so a total Supabase outage scored
// documentation/continuity/ownership/safety at 0 and incidentLoad at 100,
// yielding a confident-looking index of 15 / "CRITICAL" — a real number,
// reported to an executive, derived from nothing.
async function computeLiveDimensions() {
  // This function used to compute all five dimensions itself, from five direct
  // queries — a second, independent definition of continuity, ownership spread,
  // critical safety and incident load sitting alongside the one in the domain
  // layer. Two of its five inputs (collaboration_scores, predictive_risk_scores)
  // were frozen tables, so the "live" dimensions were partly not live; and where
  // its definitions disagreed with the domain layer's, this page and the rest of
  // the product reported different numbers for the same question with no rule
  // about which was right.
  //
  // It delegates now. The definitions live in domain/derived.js, once.
  const intel = await domain.intelligence.all()
  const h = intel.orgHealth

  return {
    healthIndex:          h.healthIndex,
    healthStatus:         h.healthStatus,
    documentationScore:   h.documentationScore,
    continuityScore:      h.continuityScore,
    ownershipSpreadScore: h.ownershipSpreadScore,
    criticalSafetyScore:  h.criticalSafetyScore,
    incidentLoadScore:    h.incidentLoadScore,
    computedAt:           h.computedAt,
    source:               h.source,
  }
}

// ─────────────────────────────────────────────
// GET /api/health/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const snapshot = await getCurrentSnapshot()
    const allSnapshots = await fetchAllSnapshots()
    const trend = detectLiveTrend(allSnapshots, snapshot.health_index)

    res.json({
      healthIndex: snapshot.health_index,
      healthStatus: snapshot.health_status,
      trend,
      snapshotMonth: snapshot.snapshot_month,
      dimensions: {
        documentation:   { score: snapshot.documentation_score,    weight: '20%' },
        continuity:      { score: snapshot.continuity_score,        weight: '20%' },
        ownershipSpread: { score: snapshot.ownership_spread_score,  weight: '20%' },
        criticalSafety:  { score: snapshot.critical_safety_score,   weight: '20%' },
        incidentLoad:    { score: snapshot.incident_load_score,      weight: '20%' }
      },
      // Two different provenances in one response: healthIndex/dimensions are
      // this month's live computation (getCurrentSnapshot() -> derived.js's
      // orgHealth); trend is read from org_health_snapshots' stored rows, which
      // can never be recomputed. Collapsing these into one field would
      // misrepresent whichever half it didn't describe.
      computedProvenance: { source: snapshot.source, computedAt: snapshot.computed_at },
      trendProvenance: { source: 'historical', table: 'org_health_snapshots' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/health/dimensions
// ─────────────────────────────────────────────

router.get('/dimensions', async (req, res) => {
  try {
    const snapshot = await getCurrentSnapshot()

    const dimensions = [
      {
        name: 'Critical Safety',
        key: 'criticalSafety',
        weight: '20%',
        score: snapshot.critical_safety_score,
        status: healthStatus(snapshot.critical_safety_score),
        description: 'Percentage of agents not predicted at CRITICAL threat level'
      },
      {
        name: 'Continuity',
        key: 'continuity',
        weight: '20%',
        score: snapshot.continuity_score,
        status: healthStatus(snapshot.continuity_score),
        description: 'Percentage of workflows that are documented with backup coverage'
      },
      {
        name: 'Documentation',
        key: 'documentation',
        weight: '20%',
        score: snapshot.documentation_score,
        status: healthStatus(snapshot.documentation_score),
        description: 'Percentage of total assets that are documented'
      },
      {
        name: 'Ownership Spread',
        key: 'ownershipSpread',
        weight: '20%',
        score: snapshot.ownership_spread_score,
        status: healthStatus(snapshot.ownership_spread_score),
        description: 'How evenly agent ownership is spread across owners (100 = perfectly even; falls as one owner\'s load exceeds the org average)'
      },
      {
        name: 'Incident Load',
        key: 'incidentLoad',
        weight: '20%',
        score: snapshot.incident_load_score,
        status: healthStatus(snapshot.incident_load_score),
        description: 'Inverse of the proportion of critical-severity workflow failures'
      }
    ].sort((a, b) => a.score - b.score)

    const weakest = dimensions[0]

    res.json({
      weakestDimension: weakest.name,
      dimensions
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/health/departments
// ─────────────────────────────────────────────

router.get('/departments', async (req, res) => {
  try {
    // Was dept_health_scores — a frozen table, one row per department, never
    // rewritten after seeding. Computed live now, from the same orgHealth()
    // formula the org-level score uses, per department (D-09a, D-21).
    const intel = await domain.intelligence.all()
    const departments = [...intel.orgHealthByDepartment.departments]
      .sort((a, b) => a.healthIndex - b.healthIndex)

    const weakest = departments[0]

    res.json({
      weakestDepartment: weakest?.department ?? null,
      departments: departments.map(d => ({
        department: d.department,
        healthIndex: d.healthIndex,
        healthStatus: d.healthStatus,
        scores: {
          documentation: d.documentationScore,
          continuity:    d.continuityScore,
          ownership:     d.ownershipSpreadScore,
          safety:        d.criticalSafetyScore,
          incident:      d.incidentLoadScore
        }
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/health/trend
// ─────────────────────────────────────────────

router.get('/trend', async (req, res) => {
  try {
    const snapshots = await fetchAllSnapshots()
    const trend = detectTrend(snapshots)

    const first = snapshots[0]
    const latest = snapshots[snapshots.length - 1]
    const change = latest
      ? Math.round(latest.health_index - first.health_index)
      : 0

    res.json({
      trend,
      changeFromBaseline: change,
      baselineMonth: first?.snapshot_month,
      latestMonth: latest?.snapshot_month,
      baselineIndex: first?.health_index,
      latestIndex: latest?.health_index,
      monthlyTrend: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status
      })),
      // org_health_snapshots is a genuine, never-rewritten time series (D-09
      // KEEP list) — this trend can never be recomputed, unlike the current
      // month's figures the rest of this file reads from domain.intelligence.
      provenance: { source: 'historical', table: 'org_health_snapshots' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/health/history
// ─────────────────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const snapshots = await fetchAllSnapshots()

    res.json({
      totalSnapshots: snapshots.length,
      snapshots: snapshots.map(s => ({
        month: s.snapshot_month,
        healthIndex: s.health_index,
        healthStatus: s.health_status,
        dimensions: {
          documentation:   s.documentation_score,
          continuity:      s.continuity_score,
          ownershipSpread: s.ownership_spread_score,
          criticalSafety:  s.critical_safety_score,
          incidentLoad:    s.incident_load_score
        }
      })),
      provenance: { source: 'historical', table: 'org_health_snapshots' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/health/critical
// Pulls live critical signals from existing modules
// ─────────────────────────────────────────────

router.get('/critical', async (req, res) => {
  try {
    const [dimensions, predictions, runbooks, accountability] = await Promise.all([
      computeLiveDimensions(),

      domain.intelligence.all().then(intel => intel.predictiveRisk.scores
        .filter(p => p.threatLevel === 'CRITICAL')
        .map(p => ({
          predicted_score: p.predictedScore,
          threat_level:    p.threatLevel,
          agents: { name: p.agentName, risk: p.recordedRisk },
        }))),

      must('workflow_runbooks', supabase
        .from('workflow_runbooks')
        .select('workflows(name, department), employees(name)')
        .eq('is_documented', false)),

      domain.intelligence.all().then(intel => ({
        accountability_score: intel.accountability.accountabilityScore,
        same_r_and_a_count:   intel.accountability.sameRandACount,
        unique_people_count:  intel.accountability.uniquePeopleCount,
      }))
    ])

    res.json({
      liveHealthIndex: dimensions.healthIndex,
      liveHealthStatus: dimensions.healthStatus,
      liveDimensions: {
        documentation:   { score: dimensions.documentationScore,   weight: '20%' },
        continuity:      { score: dimensions.continuityScore,       weight: '20%' },
        ownershipSpread: { score: dimensions.ownershipSpreadScore,  weight: '20%' },
        criticalSafety:  { score: dimensions.criticalSafetyScore,   weight: '20%' },
        incidentLoad:    { score: dimensions.incidentLoadScore,      weight: '20%' }
      },
      criticalAgents: predictions.map(p => ({
        name: p.agents?.name,
        predictedScore: p.predicted_score
      })),
      undocumentedWorkflows: runbooks.map(r => ({
        workflowName: r.workflows?.name,
        department: r.workflows?.department,
        owner: r.employees?.name
      })),
      accountabilitySummary: accountability
        ? {
            score: accountability.accountability_score,
            sameRAndACount: accountability.same_r_and_a_count,
            uniquePeople: accountability.unique_people_count
          }
        : null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router