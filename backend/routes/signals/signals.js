const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// GET /api/signals/drilldown/:entityName
// Returns a trend direction and the contributing reasons for a given entity.
// Defensive: always returns a valid { entityName, trendDirection, reasons } shape.
router.get('/drilldown/:entityName', async (req, res) => {
  const { entityName } = req.params
  try {
    let trendDirection = 'stable'
    const reasons = []

    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, status, risk')
      .ilike('name', entityName)
      .maybeSingle()

    if (agent) {
      if (agent.risk === 'high' || agent.risk === 'critical') {
        trendDirection = 'worsening'
        reasons.push({
          id: 'risk-level',
          factor: 'Risk level',
          description: `${agent.name} is currently marked as ${agent.risk} risk.`,
          impactWeight: 'HIGH',
        })
      }
      if (agent.status && !['active', 'healthy'].includes(agent.status)) {
        reasons.push({
          id: 'status',
          factor: 'Operational status',
          description: `Status is "${agent.status}".`,
          impactWeight: 'MEDIUM',
        })
      }

      const { data: prs } = await supabase
        .from('predictive_risk_scores')
        .select('predicted_score')
        .eq('agent_id', agent.id)
        .maybeSingle()

      if (prs && typeof prs.predicted_score === 'number') {
        trendDirection =
          prs.predicted_score >= 70
            ? 'worsening'
            : prs.predicted_score >= 40
              ? 'watch'
              : 'improving'
        reasons.push({
          id: 'predicted-score',
          factor: 'Predicted risk score',
          description: `Model predicts a risk score of ${prs.predicted_score}.`,
          impactWeight: prs.predicted_score >= 70 ? 'HIGH' : 'MEDIUM',
        })
      }
    }

    if (reasons.length === 0) {
      reasons.push({
        id: 'no-signal',
        factor: 'No significant signal',
        description: `No elevated risk signals found for ${entityName}.`,
        impactWeight: 'LOW',
      })
    }

    res.json({ entityName, trendDirection, reasons })
  } catch (err) {
    res.json({
      entityName,
      trendDirection: 'unknown',
      reasons: [
        {
          id: 'error',
          factor: 'Data unavailable',
          description: err.message,
          impactWeight: 'LOW',
        },
      ],
    })
  }
})

module.exports = router
