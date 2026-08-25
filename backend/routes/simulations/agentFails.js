const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// Base list — which agents can be simulated
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, status, risk')
    if (error) return res.status(500).json({ error: error.message })
    res.json({
      scenario: 'agent-fails',
      hint: 'Call /api/simulations/agent-fails/{name} to run a scenario',
      available: data || [],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:agent', async (req, res) => {
  try {
    const { agent } = req.params

    // Get the agent
    const { data: targetAgent, error: agentErr } = await supabase
      .from('agents')
      .select('id, name, status, risk')
      .ilike('name', agent)
      .maybeSingle()
    if (agentErr) return res.status(500).json({ error: agentErr.message })
    if (!targetAgent) return res.status(404).json({ error: 'Agent not found' })

    // F-I: agent_source/agent_target duplicate source_id/target_id whenever
    // both ends are agents (byte-identical, confirmed against seed data) and
    // are NULL otherwise -- kept here deliberately rather than migrated to the
    // polymorphic source_id/target_id pair, because the FK-embedding is
    // exactly what these two columns exist for and correctness can't drift
    // (no write path touches `dependencies`, D-04). Migrating this to
    // source_id/target_id would cost a second round-trip for a purely
    // architectural preference with no behavior change.
    // Get agents that depend on this agent
    const { data: depLinks, error: depErr } = await supabase
      .from('dependencies')
      .select('dependent:agent_source(id, name, status, risk), dependency_type')
      .eq('agent_target', targetAgent.id)
    if (depErr) return res.status(500).json({ error: depErr.message })

    const impactedAgents = (depLinks || []).map(d => ({
      ...d.dependent,
      dependency_type: d.dependency_type
    }))

    // Get workflows using this agent
    const { data: wfLinks, error: wfErr } = await supabase
      .from('workflow_dependencies')
      .select('workflows(id, name, status, risk), is_critical')
      .eq('agent_id', targetAgent.id)
    if (wfErr) return res.status(500).json({ error: wfErr.message })

    const impactedWorkflows = (wfLinks || []).map(w => ({
      ...w.workflows,
      is_critical: w.is_critical
    }))

    const hasCritical = (depLinks || []).some(d => d.dependency_type === 'critical')
    const riskLevel   = hasCritical ? 'critical' : impactedAgents.length > 2 ? 'high' : 'medium'

    res.json({
      scenario:         `If ${targetAgent.name} fails`,
      impactedAgents,
      impactedWorkflows,
      impactedPeople:   [],
      healthBefore:     'stable',
      healthAfter:      hasCritical ? 'critical' : 'degraded',
      riskLevel
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router