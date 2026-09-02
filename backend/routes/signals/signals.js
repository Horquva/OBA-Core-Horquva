const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')

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

      // Was a lookup in `predictive_risk_scores`, a table seeded once and
      // written by nothing — so an agent's trend could never actually trend.
      const intel = await domain.intelligence.all()
      const prs = intel.predictiveRisk.scores.find(p => p.agentId === agent.id)

      if (prs && typeof prs.predictedScore === 'number') {
        trendDirection =
          prs.predictedScore >= 70
            ? 'worsening'
            : prs.predictedScore >= 40
              ? 'watch'
              : 'improving'
        reasons.push({
          id: 'predicted-score',
          factor: 'Predicted risk score',
          description: `Model predicts a risk score of ${prs.predictedScore}.`,
          impactWeight: prs.predictedScore >= 70 ? 'HIGH' : 'MEDIUM',
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
