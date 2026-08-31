const express = require('express')
const router = express.Router()
const { detectContinuityRisks, generateContinuityPlan, getContinuityStatus } = require('./continuityEngine')

// GET /api/continuity/risks — detect continuity risks only
router.get('/risks', async (req, res) => {
  try {
    const risks = await detectContinuityRisks()
    res.json({
      risks_found: risks.length,
      risks
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/continuity/plan — generate + emit continuity intents to M16
router.post('/plan', async (req, res) => {
  try {
    const result = await generateContinuityPlan()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/continuity/status — overall continuity status report
router.get('/status', async (req, res) => {
  try {
    const status = await getContinuityStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router