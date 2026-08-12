const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// GET /api/verification — get all verification logs
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// NOTE: GET /flagged, /summary were deleted here (2026-08-12). They duplicated
// verification/intelligence.js's routes of the same name, which read the real,
// populated `verification_actions` table (20 rows) joined against employees and
// policy_violations. These read `verification_logs`, a near-empty (2-row) shadow
// table nothing else uses for display. The mounted versions are the ones to keep.

// POST /api/verification — log a new verification record
router.post('/', async (req, res) => {
  const {
    action_id,
    actor_type,
    actor_name,
    action,
    workflow_id,
    status,
    policy_compliant,
    verified,
    flag_reason
  } = req.body

  if (!actor_type || !actor_name || !action || !workflow_id || !status) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabase
    .from('verification_logs')
    .insert([{
      action_id,
      actor_type,
      actor_name,
      action,
      workflow_id,
      status,
      policy_compliant: policy_compliant ?? true,
      verified: verified ?? true,
      flag_reason: flag_reason || null
    }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data[0])
})

module.exports = router