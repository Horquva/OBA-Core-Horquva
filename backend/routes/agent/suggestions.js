// backend/routes/agent/suggestions.js
//
// GET /api/agent/suggestions?from=<frontend route>
// Starter questions for the agent's empty state, built from live data
// (agent/suggestions.js). Plain JSON, not SSE, like conversations.js.

const express = require('express')
const { buildTurnContext } = require('../../agent/turnContext')
const { buildSuggestions, slugForRoute } = require('../../agent/suggestions')

const router = express.Router()

router.get('/suggestions', async (req, res) => {
  try {
    const ctx = await buildTurnContext()
    res.json(buildSuggestions(ctx, slugForRoute(req.query.from)))
  } catch (err) {
    res.status(500).json({ error: 'Unable to build suggestions' })
  }
})

module.exports = router
