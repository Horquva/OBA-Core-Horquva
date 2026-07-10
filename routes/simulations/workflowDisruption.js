/**
 * routes/simulations/workflowDisruption.js  (UPGRADED — reads from Digital Twin)
 * ─────────────────────────────────────────────
 * Simulates what happens when a named workflow is disrupted.
 * Reads agent dependencies from twin_entity_state + graph_edges.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const { packageIntelligence } = require('../../services/intelligenceExchange')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// HELPER — shared twin snapshot retrieval
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
// GET /api/simulations/workflow-disruption/:workflow
// ─────────────────────────────────────────────
router.get('/:workflow', async (req, res) => {
  try {
    const { workflow } = req.params

    // 1. Get workflow from raw table
    const { data: wf, error: wfErr } = await supabase
      .from('workflows')
      .select('id, name, status, risk, department, frequency')
      .ilike('name', workflow)
      .single()

    if (wfErr || !wf) return res.status(404).json({ error: 'Workflow not found' })

    // 2. Get Digital Twin snapshot
    const twinSnapshot = await getOrRefreshTwinSnapshot()
    const twinHealthIndex = twinSnapshot?.org_health_index ?? 0

    // 3. Find workflow's graph node
    const { data: wfNode } = await supabase
      .from('graph_nodes')
      .select('id')
      .eq('node_type', 'workflow')
      .eq('entity_id', wf.id)
      .single()

    let impactedAgents   = []
    let ownersAtRisk     = []
    let failureHistory   = []

    if (wfNode) {
      // Outgoing edges from workflow: depends_on agents
      const { data: outEdges } = await supabase
        .from('graph_edges')
        .select('target_node_id, relationship_type, weight, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
        .eq('source_node_id', wfNode.id)
        .in('relationship_type', ['depends_on', 'uses'])

      for (const edge of (outEdges || [])) {
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
            name:        n.entity_name,
            entityId:    n.entity_id,
            riskLevel:   twinState?.risk_level ?? 'unknown',
            is_critical: edge.weight >= 1.0,
            weight:      edge.weight
          })
        }
      }

      // Incoming edges to workflow: who owns or documents this workflow
      const { data: inEdges } = await supabase
        .from('graph_edges')
        .select('source_node_id, relationship_type, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_name)')
        .eq('target_node_id', wfNode.id)

      for (const edge of (inEdges || [])) {
        const n = edge.graph_nodes
        if (n?.node_type === 'employee') {
          ownersAtRisk.push({ name: n.entity_name, relationship: edge.relationship_type })
        }
      }
    } else {
      // Fallback to raw tables
      const { data: agentLinks } = await supabase
        .from('workflow_dependencies')
        .select('agents(id, name, status, risk), is_critical')
        .eq('workflow_id', wf.id)
      impactedAgents = (agentLinks || []).map(l => ({ ...l.agents, is_critical: l.is_critical, weight: l.is_critical ? 1.0 : 0.5, riskLevel: l.agents?.risk ?? 'unknown' }))
    }

    // 4. Get failure history for this workflow
    const { data: failures } = await supabase
      .from('workflow_failures')
      .select('failure_type, severity, description')
      .eq('workflow_id', wf.id)
    failureHistory = failures || []

    // 5. Compute impact score
    const criticalAgents  = impactedAgents.filter(a => a.is_critical)
    const hasCritical     = criticalAgents.length > 0
    const impactScore = Math.min(100,
      35 +
      (impactedAgents.length * 8) +
      (criticalAgents.length * 15) +
      (failureHistory.filter(f => f.severity === 'critical').length * 10)
    )
    const severity  = hasCritical ? 'critical' : 'high'

    const narrative = `Workflow disruption: ${wf.name} (${wf.department}, frequency: ${wf.frequency}) is disrupted. ` +
      `${impactedAgents.length} agent(s) depended upon, ${criticalAgents.length} critical. ` +
      `${failureHistory.length} known failure(s) in history. ` +
      `${ownersAtRisk.length} employee(s) at risk of knowledge/responsibility gap. ` +
      `Org health index at simulation time: ${twinHealthIndex}.`

    // 6. Log simulation run
    const affectedEntities = {
      workflow:    wf.name,
      agents:      impactedAgents.map(a => a.name),
      owners:      ownersAtRisk.map(o => o.name),
      failures:    failureHistory.map(f => f.failure_type)
    }

    const { data: runRow } = await supabase
      .from('simulation_runs')
      .insert({
        simulation_type:   'workflow_disruption',
        target_entity:     wf.name,
        twin_snapshot_id:  twinSnapshot?.id ?? null,
        input_params:      { workflowName: workflow, workflowId: wf.id, department: wf.department, frequency: wf.frequency },
        affected_entities: affectedEntities,
        impact_score:      impactScore,
        severity,
        narrative
      })
      .select('id')
      .single()

    // 7. Publish simulation.completed event
    await eventBus.publish('simulation.completed', 'simulationWorkflowDisruption', 'all', {
      simulationType:   'workflow_disruption',
      targetEntity:     wf.name,
      simulationRunId:  runRow?.id ?? null,
      twinSnapshotId:   twinSnapshot?.id ?? null,
      affectedEntities,
      severity,
      impactScore
    }, 0.90)

    // 8. IEP response
    res.json(packageIntelligence({
      sourceModule:    'simulationWorkflowDisruption',
      capability:      'workflow_disruption_impact',
      findings: {
        scenario:          `If ${wf.name} is disrupted`,
        targetWorkflow:    { name: wf.name, status: wf.status, risk: wf.risk, department: wf.department, frequency: wf.frequency },
        twinSnapshotId:    twinSnapshot?.id,
        twinHealthIndex,
        impactedAgents,
        impactedWorkflows: [wf],
        ownersAtRisk,
        failureHistory,
        impactScore,
        severity,
        healthBefore:      twinHealthIndex >= 60 ? 'stable' : 'strained',
        healthAfter:       hasCritical ? 'critical' : 'degraded',
        simulationRunId:   runRow?.id ?? null
      },
      confidence:      0.88,
      evidence: [
        `${impactedAgents.length} agent(s) listed as dependencies for ${wf.name}`,
        `${criticalAgents.length} are marked critical (weight >= 1.0)`,
        `${failureHistory.length} historical failure(s) on record for this workflow`,
        `Current org health index: ${twinHealthIndex}/100`
      ],
      recommendations: [
        hasCritical
          ? `Immediately provision backup agents for: ${criticalAgents.slice(0, 3).map(a => a.name).join(', ')}`
          : 'No critical agent backup required — standard contingency applies',
        failureHistory.length > 0
          ? `Review and update runbooks for ${wf.name} — ${failureHistory.length} past failure type(s): ${[...new Set(failureHistory.map(f => f.failure_type))].join(', ')}`
          : `Create a disruption runbook for ${wf.name} to reduce future response time`,
        ownersAtRisk.length === 0
          ? `Assign a named owner to ${wf.name} — no employee ownership currently in knowledge graph`
          : `Brief ${ownersAtRisk[0]?.name} on contingency procedures`
      ],
      graphRefs: wfNode
        ? [{ nodeType: 'workflow', entityId: wf.id, entityName: wf.name }]
        : []
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router