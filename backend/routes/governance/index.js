const express = require('express')
const router = express.Router()
const { detectViolations, enforceGovernance, generateReport } = require('./governanceEngine')

// GET /api/governance/audit — detect all governance violations
router.get('/audit', async (req, res) => {
  try {
    const violations = await detectViolations()
    res.json({
      violations_found: violations.length,
      violations
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/governance/enforce — detect + emit intents to M16
router.post('/enforce', async (req, res) => {
  try {
    const result = await enforceGovernance()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/governance/report — full governance report
router.get('/report', async (req, res) => {
  try {
    const report = await generateReport()
    res.json(report)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router