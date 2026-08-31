const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { receiveIntent, getCurrentMode } = require('./intentReceiver')
const { executeIntent, approveIntent, rejectIntent } = require('./executionEngine')

// GET /api/orchestration — get all orchestration states
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('orchestration_state')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/orchestration/blocked — get only blocked workflows
router.get('/blocked', async (req, res) => {
  const { data, error } = await supabase
    .from('orchestration_state')
    .select('*')
    .eq('status', 'blocked')

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/orchestration/collisions — get all workflows with collisions
router.get('/collisions', async (req, res) => {
  const { data, error } = await supabase
    .from('orchestration_state')
    .select('*')
    .eq('collision_detected', true)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/orchestration/summary — counts by status
router.get('/summary', async (req, res) => {
  const { data, error } = await supabase
    .from('orchestration_state')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })

  const summary = {
    total: data.length,
    running: data.filter(r => r.status === 'running').length,
    blocked: data.filter(r => r.status === 'blocked').length,
    paused: data.filter(r => r.status === 'paused').length,
    completed: data.filter(r => r.status === 'completed').length,
    collisions_detected: data.filter(r => r.collision_detected).length,
  }

  res.json(summary)
})

// POST /api/orchestration — save a workflow orchestration state
router.post('/', async (req, res) => {
  const {
    workflow_id,
    workflow_name,
    current_step,
    total_steps,
    next_actor_type,
    next_actor_name,
    status,
    collision_detected,
    collision_detail
  } = req.body

  if (!workflow_id || !workflow_name || !status) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const { data, error } = await supabase
    .from('orchestration_state')
    .insert([{
      workflow_id,
      workflow_name,
      current_step: current_step ?? 1,
      total_steps: total_steps ?? 0,
      next_actor_type: next_actor_type || null,
      next_actor_name: next_actor_name || null,
      status,
      collision_detected: collision_detected ?? false,
      collision_detail: collision_detail || null,
      updated_at: new Date().toISOString()
    }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data[0])
})

// PATCH /api/orchestration/:workflow_id — update step or status
router.patch('/:workflow_id', async (req, res) => {
  const { workflow_id } = req.params
  const updates = req.body

  const { data, error } = await supabase
    .from('orchestration_state')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('workflow_id', workflow_id)
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data[0])
})

// ─── NEW: EXECUTION MODE ───────────────────────────────────────────────────

// GET /api/orchestration/mode — get current execution mode
router.get('/mode', async (req, res) => {
  try {
    const mode = await getCurrentMode()
    res.json({ mode })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orchestration/mode — set execution mode
router.post('/mode', async (req, res) => {
  const { mode, set_by } = req.body
  const validModes = ['advisory', 'assisted', 'governed_autonomous', 'fully_autonomous']

  if (!mode || !validModes.includes(mode)) {
    return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` })
  }

  const { data, error } = await supabase
    .from('execution_mode')
    .insert([{ mode, set_by: set_by || 'system' }])
    .select()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ mode: data[0].mode, set_by: data[0].set_by, message: `Execution mode set to '${mode}'` })
})

// ─── NEW: INTENT HANDLING ──────────────────────────────────────────────────

// GET /api/orchestration/intents — list all intents
router.get('/intents', async (req, res) => {
  const { data, error } = await supabase
    .from('execution_intents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// POST /api/orchestration/intent — receive intent from M51/M52/M53
router.post('/intent', async (req, res) => {
  try {
    const result = await receiveIntent(req.body)
    res.status(201).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orchestration/execute/:intent_id — execute an approved intent
router.post('/execute/:intent_id', async (req, res) => {
  try {
    const result = await executeIntent(req.params.intent_id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orchestration/approve/:intent_id — approve a pending intent
router.post('/approve/:intent_id', async (req, res) => {
  try {
    const result = await approveIntent(req.params.intent_id)
    res.json({ message: 'Intent approved', intent: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/orchestration/reject/:intent_id — reject a pending intent
router.post('/reject/:intent_id', async (req, res) => {
  try {
    const result = await rejectIntent(req.params.intent_id)
    res.json({ message: 'Intent rejected', intent: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router