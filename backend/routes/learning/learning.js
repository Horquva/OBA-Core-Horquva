const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')

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

// Was failure_patterns — a frozen table derived.js's own top-of-file comment
// already names as forbidden input (alongside governance_assessments etc).
// executiveMemory()'s repeat_offender/lesson items answer the same question
// live, from workflow_failures; reshaped here to failure_patterns' original
// field names so this route's response contract is unchanged (F-L).
async function fetchFailurePatterns() {
  const intel = await domain.intelligence.all()
  return intel.executiveMemory.items
    .filter((i) => i.memoryType === 'repeat_offender' || i.memoryType === 'lesson')
    .map((i) => ({
      asset_name: i.entityName,
      asset_type: i.memoryType === 'repeat_offender' ? 'workflow' : 'failure_type',
      appearance_count: i.evidence.failureCount ?? i.evidence.workflowCount ?? 0,
      failure_severity: i.severity,
      is_repeat_offender: i.memoryType === 'repeat_offender',
      reasons: [i.description],
    }))
}

// Was department_exposure — frozen, uncatalogued in the decision log until
// this workstream traced it. Computed live now (D-21) from the same root
// tables orgHealthByDepartment uses, but a different formula answering a
// different question — see domain/derived.js's departmentExposure().
async function fetchDepartmentExposure() {
  const intel = await domain.intelligence.all()
  return [...intel.departmentExposure.departments]
    .sort((a, b) => b.incidentExposureScore - a.incidentExposureScore)
    .map((d) => ({
      department: d.department,
      documentation_coverage: d.documentationCoverage,
      backup_coverage: d.backupCoverage,
      incident_exposure_score: d.incidentExposureScore,
      incident_risk_level: d.incidentRiskLevel,
    }))
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
        : null,
      // learning_snapshots is a genuine, never-rewritten time series (D-09
      // KEEP list) — snapshot.* above can never be recomputed.
      provenance: { source: 'historical', table: 'learning_snapshots' }
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
        : 'Majority of known organizational risks have been addressed.',
      provenance: { source: 'historical', table: 'learning_snapshots' }
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