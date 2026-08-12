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

// NOTE: GET /recommendations was deleted here (2026-08-12). It duplicated
// briefing/briefing.js's route of the same name, which reads the real, populated
// `recommendations` table (10 rows) directly. This one derived its list from
// getRiskSummary()/getOrgHealth(), which read orchestration_state/verification_logs/
// escalation_logs — the same near-empty shadow tables flagged elsewhere. The
// mounted version is the one to keep.

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