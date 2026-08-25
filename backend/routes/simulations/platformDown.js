const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// Base list — which platforms can be simulated
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_platforms')
      .select('id, name, type, status')
    if (error) return res.status(500).json({ error: error.message })
    res.json({
      scenario: 'platform-down',
      hint: 'Call /api/simulations/platform-down/{name} to run a scenario',
      available: data || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params

    // Get platform
    const { data: plat, error: platErr } = await supabase
      .from('ai_platforms')
      .select('id, name, type, status')
      .ilike('name', platform)
      .maybeSingle()
    if (platErr) return res.status(500).json({ error: platErr.message })
    if (!plat) return res.status(404).json({ error: 'Platform not found' })

    // Get agents on this platform
    const { data: agentLinks, error: agentErr } = await supabase
      .from('agent_platform')
      .select('agents(id, name, status, risk)')
      .eq('platform_id', plat.id)
    if (agentErr) return res.status(500).json({ error: agentErr.message })

    const impactedAgents = (agentLinks || []).map(l => l.agents)

    // Get workflows for those agents. A platform with zero agents on it is
    // the normal case for an unused/legacy entry, not an edge case — an empty
    // .in() list is rejected by PostgREST, so it has to be skipped rather
    // than queried.
    const agentIds = impactedAgents.map(a => a.id)
    const { data: wfLinks, error: wfErr } = agentIds.length
      ? await supabase.from('workflow_dependencies').select('workflows(id, name, status, risk)').in('agent_id', agentIds)
      : { data: [], error: null }
    if (wfErr) return res.status(500).json({ error: wfErr.message })

    const impactedWorkflows = [...new Map(
      (wfLinks || []).map(w => [w.workflows.id, w.workflows])
    ).values()]

    const riskLevel = impactedAgents.length >= 3 ? 'critical' : 'high'

    res.json({
      scenario:         `If ${plat.name} goes down`,
      impactedAgents,
      impactedWorkflows,
      impactedPeople:   [],
      healthBefore:     'stable',
      healthAfter:      'degraded',
      riskLevel
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router