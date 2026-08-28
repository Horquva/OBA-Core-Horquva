const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// ─────────────────────────────────────────────
// HELPERS
//
// These predictions used to be SELECTed from `predictive_risk_scores`, a table
// seeded once by SQL and updated by nothing. Every agent's threat level was
// therefore fixed at whatever it had been when the seed was written, and no
// change to ownership, dependencies or documentation could ever move it —
// while `computed_at` gave every response a timestamp implying otherwise.
//
// They are now computed from the root tables on each request. The factor names
// in `contributingFactors` are unchanged, so consumers of that object keep
// working; see domain/derived.js for what each factor weighs and why.
// ─────────────────────────────────────────────

async function fetchAllPredictions() {
  const intel = await domain.intelligence.all()
  return intel.predictiveRisk
}

function formatPrediction(p, computedAt) {
  return {
    agentName: p.agentName,
    currentRisk: p.recordedRisk,
    predictedScore: p.predictedScore,
    threatLevel: p.threatLevel,
    isEmergingThreat: p.isEmergingThreat,
    contributingFactors: p.contributingFactors,
    reasons: p.reasons,
    cascadeReach: p.cascadeReach,
    computedAt
  }
}

// ─────────────────────────────────────────────
// GET /api/predictive-risk/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const { scores, emergingThreats, computedAt, source, inputs } = await fetchAllPredictions()

    const breakdown = scores.reduce((acc, p) => {
      acc[p.threatLevel] = (acc[p.threatLevel] || 0) + 1
      return acc
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 })

    // Top contributing factors across all agents
    const factorTotals = {}
    scores.forEach(p => {
      Object.entries(p.contributingFactors || {}).forEach(([key, val]) => {
        factorTotals[key] = (factorTotals[key] || 0) + val
      })
    })

    const topDrivers = Object.entries(factorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor]) => factor)

    res.json({
      totalAgentsAssessed: scores.length,
      breakdown,
      emergingThreats: emergingThreats.length,
      topRiskDrivers: topDrivers,
      computedAt,
      source,
      inputs
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/agents
// ─────────────────────────────────────────────

router.get('/agents', async (req, res) => {
  try {
    const { scores, computedAt } = await fetchAllPredictions()
    res.json(scores.map(p => formatPrediction(p, computedAt)))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/critical
// ─────────────────────────────────────────────

router.get('/critical', async (req, res) => {
  try {
    const { scores, computedAt, source } = await fetchAllPredictions()
    const critical = scores.filter(p => p.threatLevel === 'CRITICAL')

    res.json({
      totalCritical: critical.length,
      agents: critical.map(p => formatPrediction(p, computedAt)),
      computedAt,
      source
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/emerging
// ─────────────────────────────────────────────

router.get('/emerging', async (req, res) => {
  try {
    const { emergingThreats, computedAt, source } = await fetchAllPredictions()

    res.json({
      totalEmerging: emergingThreats.length,
      agents: emergingThreats.map(p => formatPrediction(p, computedAt)),
      computedAt,
      source
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/agent/:name
// ─────────────────────────────────────────────

router.get('/agent/:name', async (req, res) => {
  try {
    const { name } = req.params
    const { scores, computedAt, source } = await fetchAllPredictions()

    const prediction = scores.find(
      p => (p.agentName || '').toLowerCase() === name.toLowerCase()
    )
    if (!prediction) return res.status(404).json({ error: 'Agent not found' })

    res.json({ ...formatPrediction(prediction, computedAt), source })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router