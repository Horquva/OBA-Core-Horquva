const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllDecisions() {
  const { data, error } = await supabase
    .from('organizational_decisions')
    .select('*')
    .order('decision_score', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

function computeDecisionQualityIndex(decisions) {
  if (!decisions.length) return 0
  const total = decisions.reduce((sum, d) => sum + d.decision_score, 0)
  return Math.round(total / decisions.length)
}

function tierBreakdown(decisions) {
  return decisions.reduce((acc, d) => {
    acc[d.quality_tier] = (acc[d.quality_tier] || 0) + 1
    return acc
  }, { GOOD: 0, ACCEPTABLE: 0, POOR: 0, HARMFUL: 0 })
}

// ─────────────────────────────────────────────
// GET /api/decisions/index
// ─────────────────────────────────────────────

router.get('/index', async (req, res) => {
  try {
    const decisions = await fetchAllDecisions()
    const index = computeDecisionQualityIndex(decisions)
    const breakdown = tierBreakdown(decisions)

    res.json({
      organizationalDecisionQualityIndex: index,
      totalDecisionsAudited: decisions.length,
      breakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decisions/all
// ─────────────────────────────────────────────

router.get('/all', async (req, res) => {
  try {
    const decisions = await fetchAllDecisions()

    const formatted = decisions.map(d => ({
      id: d.id,
      decisionType: d.decision_type,
      assetName: d.asset_name,
      assetType: d.asset_type,
      ownerName: d.owner_name,
      decisionScore: d.decision_score,
      qualityTier: d.quality_tier,
      recommendedFix: d.recommended_fix,
      createdAt: d.created_at
    }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decisions/harmful
// ─────────────────────────────────────────────

router.get('/harmful', async (req, res) => {
  try {
    const decisions = await fetchAllDecisions()
    const harmful = decisions.filter(d => d.quality_tier === 'HARMFUL')

    res.json({
      totalHarmful: harmful.length,
      decisions: harmful.map(d => ({
        id: d.id,
        assetName: d.asset_name,
        assetType: d.asset_type,
        ownerName: d.owner_name,
        decisionScore: d.decision_score,
        recommendedFix: d.recommended_fix
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decisions/trail/:id
// ─────────────────────────────────────────────

router.get('/trail/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: decision, error: decisionError } = await supabase
      .from('organizational_decisions')
      .select('*')
      .eq('id', id)
      .single()

    if (decisionError || !decision) {
      return res.status(404).json({ error: 'Decision not found' })
    }

    const { data: factors, error: factorError } = await supabase
      .from('decision_factors')
      .select('factor_name, factor_status, score_impact')
      .eq('decision_id', id)

    if (factorError) throw new Error(factorError.message)

    res.json({
      id: decision.id,
      assetName: decision.asset_name,
      assetType: decision.asset_type,
      decisionType: decision.decision_type,
      ownerName: decision.owner_name,
      decisionScore: decision.decision_score,
      qualityTier: decision.quality_tier,
      recommendedFix: decision.recommended_fix,
      decisionTrail: factors
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decisions/recommendations
// ─────────────────────────────────────────────

router.get('/recommendations', async (req, res) => {
  try {
    const decisions = await fetchAllDecisions()
    const needsFix = decisions.filter(d => d.quality_tier === 'POOR' || d.quality_tier === 'HARMFUL')

    res.json({
      totalRecommendations: needsFix.length,
      recommendations: needsFix.map(d => ({
        assetName: d.asset_name,
        assetType: d.asset_type,
        qualityTier: d.quality_tier,
        decisionScore: d.decision_score,
        recommendedFix: d.recommended_fix
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router