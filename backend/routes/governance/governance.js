const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatStatus(status) {
  return status.replace('_', ' ')
}

async function fetchAllAssessments() {
  const { data, error } = await supabase
    .from('governance_assessments')
    .select('*')
    .order('governance_score', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

async function fetchAllGaps() {
  const { data, error } = await supabase
    .from('governance_gaps')
    .select(`
      id,
      gap_type,
      gap_severity,
      description,
      governance_assessments ( asset_name, asset_type, department, criticality, governance_score )
    `)

  if (error) throw new Error(error.message)
  return data
}

function computeOrgScore(assessments) {
  if (!assessments.length) return 0
  const total = assessments.reduce((sum, a) => sum + a.governance_score, 0)
  return Math.round(total / assessments.length)
}

function statusBreakdown(assessments) {
  return assessments.reduce((acc, a) => {
    acc[a.governance_status] = (acc[a.governance_status] || 0) + 1
    return acc
  }, { HEALTHY: 0, WARNING: 0, AT_RISK: 0, CRITICAL: 0 })
}

function buildHeatmap(assessments) {
  const depts = {}

  assessments.forEach(a => {
    if (!depts[a.department]) {
      depts[a.department] = { assets: [], totalScore: 0 }
    }
    depts[a.department].assets.push(a)
    depts[a.department].totalScore += a.governance_score
  })

  return Object.entries(depts).map(([department, info]) => {
    const breakdown = statusBreakdown(info.assets)
    return {
      department,
      governanceScore: Math.round(info.totalScore / info.assets.length),
      assetCount: info.assets.length,
      healthyAssets: breakdown.HEALTHY,
      warningAssets: breakdown.WARNING,
      atRiskAssets: breakdown.AT_RISK,
      criticalAssets: breakdown.CRITICAL
    }
  })
}

const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

// ─────────────────────────────────────────────
// GET /api/governance/score
// ─────────────────────────────────────────────

router.get('/score', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()
    const orgScore = computeOrgScore(assessments)
    const breakdown = statusBreakdown(assessments)

    const status = orgScore >= 80 ? 'HEALTHY'
                  : orgScore >= 60 ? 'WARNING'
                  : orgScore >= 40 ? 'AT RISK'
                  : 'CRITICAL'

    res.json({
      governanceScore: orgScore,
      governanceStatus: status,
      totalAssetsAssessed: assessments.length,
      breakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/governance/assets
// ─────────────────────────────────────────────

router.get('/assets', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()

    res.json(assessments.map(a => ({
      id: a.id,
      assetName: a.asset_name,
      assetType: a.asset_type,
      department: a.department,
      ownerName: a.owner_name,
      governanceScore: a.governance_score,
      governanceStatus: formatStatus(a.governance_status),
      criticality: a.criticality
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/governance/heatmap
// ─────────────────────────────────────────────

router.get('/heatmap', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()
    const heatmap = buildHeatmap(assessments)

    res.json({
      departmentCount: heatmap.length,
      heatmap
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/governance/gaps
// ─────────────────────────────────────────────

router.get('/gaps', async (req, res) => {
  try {
    const gaps = await fetchAllGaps()

    const ranked = gaps
      .sort((a, b) => severityRank[b.gap_severity] - severityRank[a.gap_severity])
      .map(g => ({
        assetName: g.governance_assessments?.asset_name,
        assetType: g.governance_assessments?.asset_type,
        department: g.governance_assessments?.department,
        criticality: g.governance_assessments?.criticality,
        gapType: g.gap_type,
        gapSeverity: g.gap_severity,
        description: g.description
      }))

    const gapTypeCounts = ranked.reduce((acc, g) => {
      acc[g.gapType] = (acc[g.gapType] || 0) + 1
      return acc
    }, {})

    res.json({
      totalGaps: ranked.length,
      gapTypeCounts,
      gaps: ranked
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/governance/offenders
// ─────────────────────────────────────────────

router.get('/offenders', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()

    const offenders = assessments.filter(a =>
      (a.criticality === 'critical' || a.criticality === 'high') &&
      (a.governance_status === 'CRITICAL' || a.governance_status === 'AT_RISK')
    )

    res.json({
      totalOffenders: offenders.length,
      offenders: offenders.map(a => ({
        assetName: a.asset_name,
        assetType: a.asset_type,
        department: a.department,
        ownerName: a.owner_name,
        governanceScore: a.governance_score,
        governanceStatus: formatStatus(a.governance_status),
        criticality: a.criticality
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router