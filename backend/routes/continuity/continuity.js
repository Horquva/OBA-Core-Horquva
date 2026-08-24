const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { atOrAbove } = require('../../domain/definitions')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllAssessments() {
  const { data, error } = await supabase
    .from('continuity_assessments')
    .select('*')
    .order('continuity_score', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

function computeOrgScore(assessments) {
  if (!assessments.length) return 0
  const total = assessments.reduce((sum, a) => sum + a.continuity_score, 0)
  return Math.round(total / assessments.length)
}

function statusBreakdown(assessments) {
  return assessments.reduce((acc, a) => {
    acc[a.continuity_status] = (acc[a.continuity_status] || 0) + 1
    return acc
  }, { SURVIVES: 0, DEGRADED: 0, FAILS: 0, LOST: 0 })
}

function buildDepartmentRiskMap(assessments) {
  const depts = {}

  assessments.forEach(a => {
    if (!depts[a.department]) {
      depts[a.department] = { assets: [], totalScore: 0 }
    }
    depts[a.department].assets.push(a)
    depts[a.department].totalScore += a.continuity_score
  })

  return Object.entries(depts).map(([department, info]) => {
    const avgScore = Math.round(info.totalScore / info.assets.length)
    const atRisk = info.assets.filter(a => a.continuity_status === 'FAILS' || a.continuity_status === 'LOST')
    const mostFragile = [...info.assets].sort((a, b) => a.continuity_score - b.continuity_score)[0]

    return {
      department,
      averageContinuityScore: avgScore,
      assetCount: info.assets.length,
      atRiskAssetCount: atRisk.length,
      mostFragileAsset: mostFragile
        ? { name: mostFragile.asset_name, score: mostFragile.continuity_score, status: mostFragile.continuity_status }
        : null
    }
  })
}

// ─────────────────────────────────────────────
// GET /api/continuity/score
// ─────────────────────────────────────────────

router.get('/score', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()
    const orgScore = computeOrgScore(assessments)
    const breakdown = statusBreakdown(assessments)

    res.json({
      organizationalContinuityScore: orgScore,
      totalAssetsAssessed: assessments.length,
      breakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/continuity/assets
// ─────────────────────────────────────────────

router.get('/assets', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()

    const formatted = assessments.map(a => ({
      id: a.id,
      assetName: a.asset_name,
      assetType: a.asset_type,
      department: a.department,
      ownerName: a.owner_name,
      continuityScore: a.continuity_score,
      continuityStatus: a.continuity_status,
      criticality: a.criticality
    }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/continuity/risk-map
// ─────────────────────────────────────────────

router.get('/risk-map', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()
    const riskMap = buildDepartmentRiskMap(assessments)

    res.json({
      departmentCount: riskMap.length,
      departmentRiskMap: riskMap
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/continuity/must-protect
// ─────────────────────────────────────────────

router.get('/must-protect', async (req, res) => {
  try {
    const assessments = await fetchAllAssessments()

    const mustProtect = assessments.filter(a =>
      atOrAbove(a.criticality, 'high') &&
      (a.continuity_status === 'FAILS' || a.continuity_status === 'LOST')
    )

    res.json({
      totalMustProtect: mustProtect.length,
      assets: mustProtect.map(a => ({
        assetName: a.asset_name,
        assetType: a.asset_type,
        department: a.department,
        ownerName: a.owner_name,
        continuityScore: a.continuity_score,
        continuityStatus: a.continuity_status,
        criticality: a.criticality
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/continuity/plans
// ─────────────────────────────────────────────

router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('continuity_plans')
      .select(`
        id,
        action_type,
        action_detail,
        status,
        continuity_assessments ( asset_name, asset_type, department, continuity_status, continuity_score )
      `)

    if (error) throw new Error(error.message)

    const formatted = plans.map(p => ({
      assetName: p.continuity_assessments?.asset_name,
      assetType: p.continuity_assessments?.asset_type,
      department: p.continuity_assessments?.department,
      continuityStatus: p.continuity_assessments?.continuity_status,
      continuityScore: p.continuity_assessments?.continuity_score,
      actionType: p.action_type,
      actionDetail: p.action_detail,
      status: p.status
    }))

    res.json({
      totalPlans: formatted.length,
      plans: formatted
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router