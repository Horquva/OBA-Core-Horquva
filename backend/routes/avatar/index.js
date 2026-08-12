const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { checkGate } = require('./gateCheck')
const { escalate } = require('./escalate')

// GET /api/avatar — demo-safe module status ping (M21 Executive Avatar).
// `mounted` reflects that this route is registered, not that Supabase is
// reachable — a DB error still returns 200 with criticalRisksTracked: null
// rather than failing the Admin Console's health check.
router.get('/', async (req, res) => {
  let criticalRisksTracked = null
  try {
    const { count, error } = await supabase
      .from('knowledge_assets')
      .select('*', { count: 'exact', head: true })
      .eq('criticality', 'critical')
    if (!error) criticalRisksTracked = count
  } catch (_) {}

  res.json({
    module: 'M21',
    name: 'Executive Avatar Intelligence',
    status: 'active',
    mounted: true,
    description: 'Conversational executive interface to the Organizational Brain.',
    capabilities: ['gate-check', 'escalation', 'conversational-briefing'],
    criticalRisksTracked,
  })
})

// GET /api/avatar/escalations — all escalation logs
router.get('/escalations', async (req, res) => {
  const { data, error } = await supabase
    .from('escalation_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/avatar/escalations/critical — only critical escalations
router.get('/escalations/critical', async (req, res) => {
  const { data, error } = await supabase
    .from('escalation_logs')
    .select('*')
    .eq('severity', 'critical')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// GET /api/avatar/escalations/summary — counts by severity and status
router.get('/escalations/summary', async (req, res) => {
  const { data, error } = await supabase
    .from('escalation_logs')
    .select('*')

  if (error) return res.status(500).json({ error: error.message })

  const summary = {
    total: data.length,
    by_severity: {
      critical: data.filter(r => r.severity === 'critical').length,
      high: data.filter(r => r.severity === 'high').length,
      medium: data.filter(r => r.severity === 'medium').length,
      low: data.filter(r => r.severity === 'low').length,
    },
    by_status: {
      open: data.filter(r => r.status === 'open').length,
      acknowledged: data.filter(r => r.status === 'acknowledged').length,
      resolved: data.filter(r => r.status === 'resolved').length,
    }
  }

  res.json(summary)
})

// POST /api/avatar/check — gate check + auto-escalate if fails
router.post('/check', async (req, res) => {
  const { workflow_id } = req.body

  if (!workflow_id) {
    return res.status(400).json({ error: 'workflow_id is required' })
  }

  const gateResult = await checkGate(workflow_id)

  if (gateResult.can_act) {
    return res.json({
      workflow_id,
      can_act: true,
      message: 'Workflow cleared. Executive Avatar may proceed.',
      escalation: null
    })
  }

  const escalation = await escalate(gateResult)

  res.json({
    workflow_id,
    can_act: false,
    message: escalation.message,
    escalation
  })
})

module.exports = router