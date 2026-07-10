/**
 * routes/simulations/agentFails.js  (UPGRADED — reads from Digital Twin)
 * ─────────────────────────────────────────────
 * Simulates what happens when a named AI agent fails.
 * Reads blast radius from twin_entity_state + graph_edges instead of
 * raw table queries.  Logs a simulation_runs row and wraps the response
 * in packageIntelligence().  Fires 'simulation.completed' via eventBus.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const { packageIntelligence } = require('../../services/intelligenceExchange')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Get the latest twin snapshot, triggering sync internally if it's stale (>1 hour) */
async function getOrRefreshTwinSnapshot() {
  const { data: latest } = await supabase
    .from('twin_snapshots')
    .select('id, computed_at, org_health_index, critical_risk_count, spof_count, summary')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return null

  const ageMs  = Date.now() - new Date(latest.computed_at).getTime()
  const oneHour = 60 * 60 * 1000

  if (ageMs > oneHour) {
    // Snapshot is stale — trigger a fresh sync via internal fetch
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
      return latest  // fall back to cached if sync fails
    }
  }

  return latest
}

/** Fetch graph neighbors for a node using twin_entity_state + graph_edges */
async function getTwinNeighborEntities(agentNodeId) {
  // Outgoing: this node → others
  const { data: outEdges } = await supabase
    .from('graph_edges')
    .select('target_node_id, relationship_type, weight, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_name, properties)')
    .eq('source_node_id', agentNodeId)

  // Incoming: others → this node
  const { data: inEdges } = await supabase
    .from('graph_edges')
    .select('source_node_id, relationship_type, weight, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_name, properties)')
    .eq('target_node_id', agentNodeId)

  return { outEdges: outEdges || [], inEdges: inEdges || [] }
}

/** Look up twin_entity_state for a given node_id */
async function getTwinEntityState(nodeId) {
  const { data } = await supabase
    .from('twin_entity_state')
    .select('entity_name, entity_type, current_state, risk_level')
    .eq('node_id', nodeId)
    .single()
  return data
}

// ─────────────────────────────────────────────
// GET /api/simulations/agent-fails/:agent
// ─────────────────────────────────────────────
router.get('/:agent', async (req, res) => {
  try {
    const { agent } = req.params

    // 1. Get target agent from raw table
    const { data: targetAgent, error: agentErr } = await supabase
      .from('agents')
      .select('id, name, status, risk')
      .ilike('name', agent)
      .single()

    if (agentErr || !targetAgent) return res.status(404).json({ error: 'Agent not found' })

    // 2. Get (or refresh) the latest Digital Twin snapshot
    const twinSnapshot = await getOrRefreshTwinSnapshot()

    // 3. Find this agent's graph node via twin_entity_state
    const { data: agentNode } = await supabase
      .from('graph_nodes')
      .select('id')
      .eq('node_type', 'agent')
      .eq('entity_id', targetAgent.id)
      .single()

    // 4. Compute blast radius from graph_edges
    let impactedAgents    = []
    let impactedWorkflows = []
    let dependencyCount   = 0

    if (agentNode) {
      const { outEdges, inEdges } = await getTwinNeighborEntities(agentNode.id)

      // Nodes that depend ON this agent (incoming edges where they use/depend_on it)
      const dependentNodes = inEdges.filter(e =>
        ['depends_on', 'uses'].includes(e.relationship_type)
      )
      dependencyCount = dependentNodes.length

      for (const edge of dependentNodes) {
        const n = edge.graph_nodes
        if (!n) continue
        if (n.node_type === 'workflow') {
          impactedWorkflows.push({ id: n.id, name: n.entity_name, nodeType: 'workflow', weight: edge.weight })
        } else if (n.node_type === 'agent') {
          impactedAgents.push({ id: n.id, name: n.entity_name, nodeType: 'agent', weight: edge.weight })
        }
      }

      // Workflows this agent is part of (outgoing from agent perspective)
      for (const edge of outEdges) {
        const n = edge.graph_nodes
        if (!n) continue
        if (n.node_type === 'workflow' && !impactedWorkflows.find(w => w.id === n.id)) {
          impactedWorkflows.push({ id: n.id, name: n.entity_name, nodeType: 'workflow', weight: edge.weight })
        }
      }
    } else {
      // Fallback to raw tables if graph not populated
      const { data: wfLinks } = await supabase
        .from('workflow_dependencies')
        .select('workflows(id, name, status, risk), is_critical')
        .eq('agent_id', targetAgent.id)
      impactedWorkflows = (wfLinks || []).map(w => ({ ...w.workflows, is_critical: w.is_critical }))
    }

    // 5. Compute impact score
    const criticalWorkflows = impactedWorkflows.filter(w => w.weight >= 1.0 || w.is_critical)
    const hasCritical       = criticalWorkflows.length > 0
    const impactScore = Math.min(100, 30 + (impactedAgents.length * 10) + (criticalWorkflows.length * 20))
    const severity    = hasCritical ? 'critical' : impactedAgents.length > 2 ? 'high' : 'medium'
    const twinHealthIndex = twinSnapshot?.org_health_index ?? 0

    const narrative = `Simulating failure of ${targetAgent.name}: ${impactedAgents.length} dependent agent(s) and ` +
      `${impactedWorkflows.length} workflow(s) affected. Current org health index: ${twinHealthIndex}. ` +
      `${hasCritical ? 'CRITICAL impact — immediate executive action required.' : 'Impact is manageable with backup activation.'}`

    // 6. Log simulation_runs row
    const affectedEntities = {
      agents:    impactedAgents.map(a => a.name),
      workflows: impactedWorkflows.map(w => w.name)
    }

    const { data: runRow } = await supabase
      .from('simulation_runs')
      .insert({
        simulation_type:  'agent_fails',
        target_entity:    targetAgent.name,
        twin_snapshot_id: twinSnapshot?.id ?? null,
        input_params:     { agentName: agent, agentId: targetAgent.id },
        affected_entities: affectedEntities,
        impact_score:     impactScore,
        severity,
        narrative
      })
      .select('id')
      .single()

    // 7. Publish simulation.completed event
    await eventBus.publish('simulation.completed', 'simulationAgentFails', 'all', {
      simulationType:   'agent_fails',
      targetEntity:     targetAgent.name,
      simulationRunId:  runRow?.id ?? null,
      twinSnapshotId:   twinSnapshot?.id ?? null,
      affectedEntities,
      severity,
      impactScore
    }, 0.95)

    // 8. Return IEP-wrapped response
    res.json(packageIntelligence({
      sourceModule:    'simulationAgentFails',
      capability:      'agent_failure_blast_radius',
      findings: {
        scenario:          `If ${targetAgent.name} fails`,
        targetAgent:       { name: targetAgent.name, status: targetAgent.status, risk: targetAgent.risk },
        twinSnapshotId:    twinSnapshot?.id,
        twinHealthIndex,
        impactedAgents,
        impactedWorkflows,
        impactScore,
        severity,
        healthBefore:      twinHealthIndex >= 60 ? 'stable' : 'strained',
        healthAfter:       hasCritical ? 'critical' : 'degraded',
        simulationRunId:   runRow?.id ?? null
      },
      confidence:      hasCritical ? 0.95 : 0.85,
      evidence: [
        `${dependencyCount} nodes directly depend on ${targetAgent.name} in the knowledge graph`,
        `${criticalWorkflows.length} critical workflow(s) would be disrupted`,
        `Current org health index: ${twinHealthIndex}/100`
      ],
      recommendations: [
        hasCritical
          ? `Immediately designate a backup for ${targetAgent.name} — ${criticalWorkflows.length} critical workflows at risk`
          : `Assign a backup owner for ${targetAgent.name} to prevent future disruption`,
        impactedWorkflows.length > 0
          ? `Review runbooks for affected workflows: ${impactedWorkflows.slice(0, 3).map(w => w.name).join(', ')}`
          : 'No workflow disruption expected — monitor agent health proactively'
      ],
      graphRefs: agentNode
        ? [{ nodeType: 'agent', entityId: targetAgent.id, entityName: targetAgent.name }]
        : []
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router