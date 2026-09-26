const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const derived = require('../domain/derived')
const changeImpact = require('../domain/changeImpact')
const store = require('../lib/changeImpactStore')
const { requireAdmin } = require('../middleware/requireRole')

/*
 * AI-6 — Change → Impact.
 *
 * Mounted at /api/change-impact, behind index.js's global requireAuth, so every
 * route here already has a verified req.user.
 *
 *   GET  /events    the change history — any authenticated user (D3, per D-05)
 *   POST /scan      detect, diff and record changes — admin only (D1)
 *   POST /preview   what a given change WOULD do, on live data — writes nothing
 *
 * Design and decisions:
 * docs/superpowers/specs/2026-09-21-ai-6-change-impact-persistence-design.md
 */

/**
 * GET /api/change-impact/events
 *   ?change_type= ?target_type= ?target_id= ?priced= ?from= ?to= ?limit= ?before_id=
 * Invalid filters are a 400, not an empty list.
 */
router.get('/events', async (req, res) => {
  try {
    res.json(await store.listEvents(supabase, req.query))
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/**
 * POST /api/change-impact/scan[?dry_run=true]
 * Admin only (D1). Fail-closed: on any failure the baseline is not advanced,
 * and the error says so.
 */
router.post('/scan', requireAdmin, async (req, res) => {
  try {
    res.json(await store.scanForChanges(supabase, { dryRun: req.query.dry_run === 'true' }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/change-impact/preview   body: { change: { type, ... } }
 * Runs the engine's before/after diff for a hypothetical change against live
 * data and returns it. Records nothing, touches no baseline. A malformed
 * change — unknown type, missing target — is the caller's error, so 400.
 */
router.post('/preview', async (req, res) => {
  const change = req.body && req.body.change
  if (!change || typeof change !== 'object') {
    return res.status(400).json({ error: 'Body must be { change: { type, ... } }' })
  }

  let roots
  try {
    roots = await derived.loadRoots(supabase)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  try {
    res.json(changeImpact.diffChange(roots, change))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
