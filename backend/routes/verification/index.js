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

// GET /api/verification/flagged — get only flagged actions
router.get('/flagged', async (req, res) => {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')
    .eq('status', 'flagged')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/verification/summary — counts by status
router.get('/summary', async (req, res) => {
  const { data, error } = await supabase
    .from('verification_logs')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })

  const summary = {
    total: data.length,
    completed: data.filter(r => r.status === 'completed').length,
    flagged: data.filter(r => r.status === 'flagged').length,
    failed: data.filter(r => r.status === 'failed').length,
    policy_violations: data.filter(r => !r.policy_compliant).length,
    unverified: data.filter(r => !r.verified).length,
  }

  res.json(summary)
})

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