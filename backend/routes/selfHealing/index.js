const express = require('express')
const router = express.Router()
const { detectIssues, runSelfHealing } = require('./healingEngine')

// GET /api/self-healing/detect — detect issues only, no intents emitted
router.get('/detect', async (req, res) => {
  try {
    const issues = await detectIssues()
    res.json({
      issues_found: issues.length,
      issues
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/self-healing/run — detect issues + emit intents to M16
router.post('/run', async (req, res) => {
  try {
    const result = await runSelfHealing()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router