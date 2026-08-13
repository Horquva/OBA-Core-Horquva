const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// WEIGHTS (must sum to 1.0)
// ─────────────────────────────────────────────

const WEIGHTS = {
  documentation:    0.20,
  continuity:       0.25,
  ownershipSpread:  0.15,
  criticalSafety:   0.25,
  incidentLoad:     0.15
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function computeHealthIndex(scores) {
  return Math.round(
    (scores.documentation  * WEIGHTS.documentation)  +
    (scores.continuity     * WEIGHTS.continuity)      +
    (scores.ownershipSpread * WEIGHTS.ownershipSpread) +
    (scores.criticalSafety * WEIGHTS.criticalSafety)  +
    (scores.incidentLoad   * WEIGHTS.incidentLoad)
  )
}

function healthStatus(score) {
  if (score >= 60) return 'STABLE'
  if (score >= 40) return 'WARNING'
  return 'CRITICAL'
}

async function getCurrentSnapshot() {
  const { data, error } = await supabase
    .from('org_health_snapshots')
    .select('*')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .single()

  if (error) throw new Error(error.message)
  return data
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

  const [docTrend, runbooks, collabs, predictions, failures] = await Promise.all([
    // A missing row here is legitimately "not measured yet", not a failure, so
    // maybeSingle() — but a broken query still throws.
    must('documentation_trend', supabase
      .from('documentation_trend')
      .select('coverage_pct')
      .order('recorded_month', { ascending: false })
      .limit(1)
      .maybeSingle()),

    must('workflow_runbooks', supabase
      .from('workflow_runbooks')
      .select('is_documented')),

    must('collaboration_scores', supabase
      .from('collaboration_scores')
      .select('has_backup')),

    must('predictive_risk_scores', supabase
      .from('predictive_risk_scores')
      .select('threat_level')),

    must('workflow_failures', supabase
      .from('workflow_failures')
      .select('severity')),
  ])

  // 1 — DOCUMENTATION: from documentation_trend
  const documentationScore = docTrend ? Math.round(docTrend.coverage_pct) : 0

  // 2 — CONTINUITY: from workflow_runbooks — % that are documented
  const continuityScore = runbooks.length
    ? Math.round((runbooks.filter(r => r.is_documented).length / runbooks.length) * 100)
    : 0

  // 3 — OWNERSHIP SPREAD: from collaboration_scores — % employees with backup
  const ownershipSpreadScore = collabs.length
    ? Math.round((collabs.filter(c => c.has_backup).length / collabs.length) * 100)
    : 0

  // 4 — CRITICAL SAFETY: from predictive_risk_scores — % agents NOT at CRITICAL threat
  const criticalSafetyScore = predictions.length
    ? Math.round(
        (predictions.filter(p => p.threat_level !== 'CRITICAL').length / predictions.length) * 100
      )
    : 0

  // 5 — INCIDENT LOAD: from workflow_failures — inverse of critical severity %
  const criticalFailures = failures.filter(f => f.severity === 'critical').length
  const incidentLoadScore = failures.length
    ? Math.round(((failures.length - criticalFailures) / failures.length) * 100)
    : 100

  return {
    documentationScore,
    continuityScore,
    ownershipSpreadScore,
    criticalSafetyScore,
    incidentLoadScore
  }
}

// ─────────────────────────────────────────────
// GET /api/health/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const snapshot = await getCurrentSnapshot()
    const allSnapshots = await fetchAllSnapshots()
    const trend = detectTrend(allSnapshots)

    res.json({
      healthIndex: snapshot.health_index,
      healthStatus: snapshot.health_status,
      trend,
      snapshotMonth: snapshot.snapshot_month,
      dimensions: {
        documentation:   { score: snapshot.documentation_score,    weight: '20%' },
        continuity:      { score: snapshot.continuity_score,        weight: '25%' },
        ownershipSpread: { score: snapshot.ownership_spread_score,  weight: '15%' },
        criticalSafety:  { score: snapshot.critical_safety_score,   weight: '25%' },
        incidentLoad:    { score: snapshot.incident_load_score,      weight: '15%' }
      }
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
        weight: '25%',
        score: snapshot.critical_safety_score,
        status: healthStatus(snapshot.critical_safety_score),
        description: 'Percentage of agents not predicted at CRITICAL threat level'
      },
      {
        name: 'Continuity',
        key: 'continuity',
        weight: '25%',
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
        weight: '15%',
        score: snapshot.ownership_spread_score,
        status: healthStatus(snapshot.ownership_spread_score),
        description: 'Percentage of employees who have backup coverage assigned'
      },
      {
        name: 'Incident Load',
        key: 'incidentLoad',
        weight: '15%',
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
    const { data, error } = await supabase
      .from('dept_health_scores')
      .select('*')
      .order('snapshot_month', { ascending: false })

    if (error) throw new Error(error.message)

    // Keep only the latest snapshot per department
    const latestByDept = {}
    data.forEach(d => {
      if (!latestByDept[d.department]) latestByDept[d.department] = d
    })

    const departments = Object.values(latestByDept)
      .sort((a, b) => a.health_index - b.health_index)

    const weakest = departments[0]

    res.json({
      weakestDepartment: weakest?.department ?? null,
      departments: departments.map(d => ({
        department: d.department,
        healthIndex: d.health_index,
        healthStatus: d.health_status,
        scores: {
          documentation: d.documentation_score,
          continuity:    d.continuity_score,
          ownership:     d.ownership_score,
          safety:        d.safety_score,
          incident:      d.incident_score
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
      }))
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
      }))
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

      must('predictive_risk_scores', supabase
        .from('predictive_risk_scores')
        .select('predicted_score, threat_level, agents(name, risk)')
        .eq('threat_level', 'CRITICAL')
        .order('predicted_score', { ascending: false })),

      must('workflow_runbooks', supabase
        .from('workflow_runbooks')
        .select('workflows(name, department), employees(name)')
        .eq('is_documented', false)),

      // No summary row yet is a real possibility; a broken query is not the same
      // thing, so maybeSingle() + must() rather than the old bare .single().
      must('accountability_summary', supabase
        .from('accountability_summary')
        .select('accountability_score, same_r_and_a_count, unique_people_count')
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle())
    ])

    const liveIndex = computeHealthIndex({
      documentation:    dimensions.documentationScore,
      continuity:       dimensions.continuityScore,
      ownershipSpread:  dimensions.ownershipSpreadScore,
      criticalSafety:   dimensions.criticalSafetyScore,
      incidentLoad:     dimensions.incidentLoadScore
    })

    res.json({
      liveHealthIndex: liveIndex,
      liveHealthStatus: healthStatus(liveIndex),
      liveDimensions: {
        documentation:   { score: dimensions.documentationScore,   weight: '20%' },
        continuity:      { score: dimensions.continuityScore,       weight: '25%' },
        ownershipSpread: { score: dimensions.ownershipSpreadScore,  weight: '15%' },
        criticalSafety:  { score: dimensions.criticalSafetyScore,   weight: '25%' },
        incidentLoad:    { score: dimensions.incidentLoadScore,      weight: '15%' }
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