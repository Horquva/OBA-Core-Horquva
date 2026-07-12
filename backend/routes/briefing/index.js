const express = require('express')
const router = express.Router()
const { getRiskSummary, getOrgHealth } = require('./briefingEngine')
const { generateRecommendations } = require('./recommendations')

// GET /api/briefing/risks — risk summary only
router.get('/risks', async (req, res) => {
  try {
    const risks = await getRiskSummary()
    res.json(risks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/briefing/health — org health snapshot
router.get('/health', async (req, res) => {
  try {
    const health = await getOrgHealth()
    res.json(health)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/briefing/recommendations — action recommendations only
router.get('/recommendations', async (req, res) => {
  try {
    const risks = await getRiskSummary()
    const health = await getOrgHealth()
    const recommendations = await generateRecommendations(risks, health)
    res.json(recommendations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/briefing/latest — full executive briefing
router.get('/latest', async (req, res) => {
  try {
    const risks = await getRiskSummary()
    const health = await getOrgHealth()
    const recommendations = await generateRecommendations(risks, health)

    const briefing = {
      generated_at: new Date().toISOString(),
      summary: `Executive Briefing — ${new Date().toUTCString()}`,
      org_health: health,
      risk_summary: risks,
      recommendations,
      briefing_text: [
        `EXECUTIVE BRIEFING`,
        `Generated: ${new Date().toUTCString()}`,
        ``,
        `ORG HEALTH: ${health.summary_text}`,
        ``,
        `RISKS: ${risks.summary_text}`,
        ``,
        `RECOMMENDATIONS:`,
        ...recommendations.map((r, i) => `${i + 1}. [${r.type.toUpperCase()}] ${r.message}`)
      ].join('\n')
    }

    res.json(briefing)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router