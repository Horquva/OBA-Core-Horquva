const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllPredictions() {
  const { data, error } = await supabase
    .from('predictive_risk_scores')
    .select(`
      id,
      agent_id,
      predicted_score,
      threat_level,
      is_emerging_threat,
      contributing_factors,
      reasons,
      computed_at,
      agents ( name, status, risk, owner_id )
    `)
    .order('predicted_score', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

function formatPrediction(p) {
  return {
    agentName: p.agents?.name,
    currentRisk: p.agents?.risk,
    predictedScore: p.predicted_score,
    threatLevel: p.threat_level,
    isEmergingThreat: p.is_emerging_threat,
    contributingFactors: p.contributing_factors,
    reasons: p.reasons,
    computedAt: p.computed_at
  }
}

// ─────────────────────────────────────────────
// GET /api/predictive-risk/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const predictions = await fetchAllPredictions()

    const breakdown = predictions.reduce((acc, p) => {
      acc[p.threat_level] = (acc[p.threat_level] || 0) + 1
      return acc
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 })

    const emergingCount = predictions.filter(p => p.is_emerging_threat).length

    // Top contributing factors across all agents
    const factorTotals = {}
    predictions.forEach(p => {
      const factors = p.contributing_factors || {}
      Object.entries(factors).forEach(([key, val]) => {
        factorTotals[key] = (factorTotals[key] || 0) + val
      })
    })

    const topDrivers = Object.entries(factorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor]) => factor)

    res.json({
      totalAgentsAssessed: predictions.length,
      breakdown,
      emergingThreats: emergingCount,
      topRiskDrivers: topDrivers
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
    const predictions = await fetchAllPredictions()
    res.json(predictions.map(formatPrediction))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/critical
// ─────────────────────────────────────────────

router.get('/critical', async (req, res) => {
  try {
    const predictions = await fetchAllPredictions()
    const critical = predictions.filter(p => p.threat_level === 'CRITICAL')

    res.json({
      totalCritical: critical.length,
      agents: critical.map(formatPrediction)
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
    const predictions = await fetchAllPredictions()
    const emerging = predictions.filter(p => p.is_emerging_threat)

    res.json({
      totalEmerging: emerging.length,
      agents: emerging.map(formatPrediction)
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

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, risk')
      .ilike('name', name)
      .single()

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const { data: prediction, error: predError } = await supabase
      .from('predictive_risk_scores')
      .select('*')
      .eq('agent_id', agent.id)
      .single()

    if (predError || !prediction) {
      return res.status(404).json({ error: 'No prediction found for this agent' })
    }

    res.json({
      agentName: agent.name,
      currentRisk: agent.risk,
      status: agent.status,
      predictedScore: prediction.predicted_score,
      threatLevel: prediction.threat_level,
      isEmergingThreat: prediction.is_emerging_threat,
      contributingFactors: prediction.contributing_factors,
      reasons: prediction.reasons,
      computedAt: prediction.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router