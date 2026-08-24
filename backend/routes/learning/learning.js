const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatLevel(level) {
  return level ? level.replace('_', ' ') : 'unknown'
}

async function fetchLatestSnapshot() {
  const { data, error } = await supabase
    .from('learning_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function fetchFailurePatterns() {
  const { data, error } = await supabase
    .from('failure_patterns')
    .select('*')
    .order('failure_severity', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

async function fetchDepartmentExposure() {
  const { data, error } = await supabase
    .from('department_exposure')
    .select('*')
    .order('incident_exposure_score', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

// ─────────────────────────────────────────────
// GET /api/learning/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const snapshot = await fetchLatestSnapshot()
    const failures = await fetchFailurePatterns()
    const departments = await fetchDepartmentExposure()

    const repeatOffenders = failures.filter(f => f.is_repeat_offender)
    const highestExposureDept = departments[0] ?? null

    res.json({
      learningMaturityScore: snapshot.learning_maturity_score,
      learningMaturityLevel: formatLevel(snapshot.learning_maturity_level),
      totalKnownRisks: snapshot.total_known_risks,
      mitigatedRisks: snapshot.mitigated_risks,
      unmitigatedRisks: snapshot.unmitigated_risks,
      mitigationPercentage: snapshot.mitigation_percentage,
      repeatOffenderCount: repeatOffenders.length,
      highestExposureDepartment: highestExposureDept
        ? { department: highestExposureDept.department, exposureScore: highestExposureDept.incident_exposure_score }
        : null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/learning/failures
// ─────────────────────────────────────────────

router.get('/failures', async (req, res) => {
  try {
    const failures = await fetchFailurePatterns()
    const repeatOffenders = failures.filter(f => f.is_repeat_offender)

    res.json({
      totalFailureProneAssets: failures.length,
      repeatOffenderCount: repeatOffenders.length,
      failureProneAssets: failures.map(f => ({
        assetName: f.asset_name,
        assetType: f.asset_type,
        appearanceCount: f.appearance_count,
        failureSeverity: f.failure_severity,
        isRepeatOffender: f.is_repeat_offender,
        reasons: f.reasons
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/learning/decisions
// ─────────────────────────────────────────────

router.get('/decisions', async (req, res) => {
  try {
    const snapshot = await fetchLatestSnapshot()

    res.json({
      totalKnownRisks: snapshot.total_known_risks,
      mitigatedRisks: snapshot.mitigated_risks,
      unmitigatedRisks: snapshot.unmitigated_risks,
      mitigationPercentage: snapshot.mitigation_percentage,
      interpretation: snapshot.mitigation_percentage < 50
        ? 'Less than half of known organizational risks have been addressed.'
        : 'Majority of known organizational risks have been addressed.'
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/learning/incidents
// ─────────────────────────────────────────────

router.get('/incidents', async (req, res) => {
  try {
    const departments = await fetchDepartmentExposure()

    const ranked = departments.map((d, index) => ({
      rank: index + 1,
      department: d.department,
      documentationCoverage: d.documentation_coverage,
      backupCoverage: d.backup_coverage,
      incidentExposureScore: d.incident_exposure_score,
      incidentRiskLevel: d.incident_risk_level
    }))

    res.json({
      totalDepartments: ranked.length,
      rankedByExposure: ranked
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/learning/departments
// ─────────────────────────────────────────────

router.get('/departments', async (req, res) => {
  try {
    const departments = await fetchDepartmentExposure()

    res.json(departments.map(d => ({
      department: d.department,
      documentationCoverage: d.documentation_coverage,
      backupCoverage: d.backup_coverage,
      incidentExposureScore: d.incident_exposure_score,
      incidentRiskLevel: d.incident_risk_level
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router