/**
 * routes/simulations/platformDown.js  (UPGRADED — reads from Digital Twin)
 * ─────────────────────────────────────────────
 * Simulates what happens when an AI platform goes down.
 * Reads agent and workflow impact from twin_entity_state + graph_edges.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const { packageIntelligence } = require('../../services/intelligenceExchange')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function getOrRefreshTwinSnapshot() {
  const { data: latest } = await supabase
    .from('twin_snapshots')
    .select('id, computed_at, org_health_index, critical_risk_count, spof_count, summary')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return null

  const ageMs   = Date.now() - new Date(latest.computed_at).getTime()
  const oneHour = 60 * 60 * 1000

  if (ageMs > oneHour) {
    try {
      await fetch(`http://localhost:${process.env.PORT || 3000}/api/digital-twin/sync`, { method: 'POST' })
      const { data: fresh } = await supabase
        .from('twin_snapshots')
        .select('id, computed_at, org_health_index, critical_risk_count, spof_count, summary')
        .order('computed_at', { ascending: false })
        .limit(1)
        .single()
      return fresh || latest
    } catch {
      return latest
    }
  }

  return latest
}

// ─────────────────────────────────────────────
// GET /api/simulations/platform-down/:platform
// ─────────────────────────────────────────────
router.get('/:platform', async (req, res) => {
  try {
    const { platform } = req.params

    // 1. Get platform from raw table
    const { data: plat, error: platErr } = await supabase
      .from('ai_platforms')
      .select('id, name, type, status')
      .ilike('name', platform)
      .single()

    if (platErr || !plat) return res.status(404).json({ error: 'Platform not found' })

    // 2. Get Digital Twin snapshot
    const twinSnapshot = await getOrRefreshTwinSnapshot()
    const twinHealthIndex = twinSnapshot?.org_health_index ?? 0

    // 3. Find platform's graph node
    const { data: platNode } = await supabase
      .from('graph_nodes')
      .select('id')
      .eq('node_type', 'platform')
      .eq('entity_id', plat.id)
      .single()

    let impactedAgents    = []
    let impactedWorkflows = []

    if (platNode) {
      // Incoming edges to platform node: agents that USE this platform
      const { data: inEdges } = await supabase
        .from('graph_edges')
        .select('source_node_id, relationship_type, weight, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
        .eq('target_node_id', platNode.id)
        .in('relationship_type', ['uses'])

      for (const edge of (inEdges || [])) {
        const n = edge.graph_nodes
        if (!n) continue

        if (n.node_type === 'agent') {
          // Get twin state for this agent
          const { data: twinState } = await supabase
            .from('twin_entity_state')
            .select('risk_level, current_state')
            .eq('node_id', n.id)
            .single()
          impactedAgents.push({
            name:      n.entity_name,
            entityId:  n.entity_id,
            riskLevel: twinState?.risk_level ?? 'unknown',
            weight:    edge.weight
          })
        } else if (n.node_type === 'workflow') {
          impactedWorkflows.push({
            name:      n.entity_name,
            entityId:  n.entity_id,
            weight:    edge.weight
          })
        }
      }

      // Also get workflows that have agents using this platform
      const agentEntityIds = impactedAgents.map(a => a.entityId)
      if (agentEntityIds.length > 0) {
        const { data: wfDeps } = await supabase
          .from('workflow_dependencies')
          .select('workflows(id, name, status, risk), is_critical')
          .in('agent_id', agentEntityIds)

        const seen = new Set(impactedWorkflows.map(w => w.entityId))
        for (const wd of (wfDeps || [])) {
          if (wd.workflows && !seen.has(wd.workflows.id)) {
            seen.add(wd.workflows.id)
            impactedWorkflows.push({ ...wd.workflows, is_critical: wd.is_critical })
          }
        }
      }
    } else {
      // Fallback to raw tables
      const { data: agentLinks } = await supabase
        .from('agent_platform')
        .select('agents(id, name, status, risk)')
        .eq('platform_id', plat.id)
      impactedAgents = (agentLinks || []).map(l => ({ ...l.agents, riskLevel: l.agents?.risk ?? 'unknown', weight: 1.0 }))

      const agentIds = impactedAgents.map(a => a.id)
      if (agentIds.length > 0) {
        const { data: wfLinks } = await supabase
          .from('workflow_dependencies')
          .select('workflows(id, name, status, risk)')
          .in('agent_id', agentIds)
        const seen = new Set()
        impactedWorkflows = (wfLinks || []).filter(w => !seen.has(w.workflows?.id) && seen.add(w.workflows?.id)).map(w => w.workflows)
      }
    }

    // 4. Compute impact score
    const criticalAgents  = impactedAgents.filter(a => ['critical', 'high'].includes(a.riskLevel))
    const impactScore = Math.min(100, 40 + (impactedAgents.length * 10) + (criticalAgents.length * 10))
    const severity    = impactedAgents.length >= 3 ? 'critical' : 'high'

    const narrative = `Platform outage: ${plat.name} (${plat.type}) goes down. ` +
      `${impactedAgents.length} agent(s) would be immediately affected, ` +
      `${impactedWorkflows.length} workflow(s) disrupted. ` +
      `Org health index at simulation time: ${twinHealthIndex}. ` +
      `${criticalAgents.length} CRITICAL/HIGH risk agent(s) losing platform access.`

    // 5. Log simulation run
    const affectedEntities = {
      agents:    impactedAgents.map(a => a.name),
      workflows: impactedWorkflows.map(w => w.name)
    }

    const { data: runRow } = await supabase
      .from('simulation_runs')
      .insert({
        simulation_type:   'platform_down',
        target_entity:     plat.name,
        twin_snapshot_id:  twinSnapshot?.id ?? null,
        input_params:      { platformName: platform, platformId: plat.id, platformType: plat.type },
        affected_entities: affectedEntities,
        impact_score:      impactScore,
        severity,
        narrative
      })
      .select('id')
      .single()

    // 6. Publish simulation.completed event
    await eventBus.publish('simulation.completed', 'simulationPlatformDown', 'all', {
      simulationType:   'platform_down',
      targetEntity:     plat.name,
      simulationRunId:  runRow?.id ?? null,
      twinSnapshotId:   twinSnapshot?.id ?? null,
      affectedEntities,
      severity,
      impactScore
    }, 0.95)

    // 7. IEP response
    res.json(packageIntelligence({
      sourceModule:    'simulationPlatformDown',
      capability:      'platform_outage_blast_radius',
      findings: {
        scenario:          `If ${plat.name} goes down`,
        targetPlatform:    { name: plat.name, type: plat.type, status: plat.status },
        twinSnapshotId:    twinSnapshot?.id,
        twinHealthIndex,
        impactedAgents,
        impactedWorkflows,
        impactScore,
        severity,
        healthBefore:      twinHealthIndex >= 60 ? 'stable' : 'strained',
        healthAfter:       'degraded',
        simulationRunId:   runRow?.id ?? null
      },
      confidence:      0.93,
      evidence: [
        `${impactedAgents.length} agent(s) use ${plat.name} as a primary platform`,
        `${criticalAgents.length} are rated CRITICAL or HIGH risk`,
        `${impactedWorkflows.length} workflow(s) would be disrupted`,
        `Current org health index: ${twinHealthIndex}/100`
      ],
      recommendations: [
        impactedAgents.length > 0
          ? `Establish failover platform for ${impactedAgents.length} agent(s) currently dependent on ${plat.name}`
          : 'No agent failover required',
        `Define platform outage runbooks for ${plat.name} covering ${impactedWorkflows.length} affected workflow(s)`,
        criticalAgents.length > 0
          ? `Priority: migrate CRITICAL/HIGH risk agents off single-platform dependency: ${criticalAgents.slice(0, 3).map(a => a.name).join(', ')}`
          : 'No critical agents on this platform'
      ],
      graphRefs: platNode
        ? [{ nodeType: 'platform', entityId: plat.id, entityName: plat.name }]
        : []
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router