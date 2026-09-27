const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { applyOrgScope } = require('../../lib/tenant')

// GET /api/intelligence/score-history — Spec 1 ledger read (Phase 2.3).
//
// Query: ?entity_type=agent&entity_id=<uuid>&limit=50 (defaults: agent, 50).
// Returns the persisted score rows (newest first) with their linked
// evidence_records — the proof an auditor replays a stored score with.
router.get('/', async (req, res) => {
  try {
    const entityType = String(req.query.entity_type || 'agent')
    const entityId = req.query.entity_id ? String(req.query.entity_id) : null
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50))

    let query = applyOrgScope(supabase.from('score_history').select('*')).eq('entity_type', entityType).order('recorded_at', { ascending: false }).limit(limit)
    if (entityId) query = query.eq('entity_id', entityId)
    const { data: scores, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Link evidence for the returned rows.
    const ids = (scores || []).map((s) => s.id)
    let evidence = []
    if (ids.length) {
      const { data: ev, error: evErr } = await applyOrgScope(supabase.from('evidence_records').select('*')).in('score_history_id', ids)
      if (evErr) return res.status(500).json({ error: evErr.message })
      evidence = ev || []
    }

    res.json({ scores: scores || [], evidence })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
