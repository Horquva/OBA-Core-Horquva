/**
 * routes/simulations/employeeLeaves.js  (UPGRADED — reads from Digital Twin)
 * ─────────────────────────────────────────────
 * Simulates what happens when a named employee leaves.
 * Reads agent ownership and knowledge impact from twin_entity_state + graph_edges.
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
// GET /api/simulations/employee-leaves/:employee
// ─────────────────────────────────────────────
router.get('/:employee', async (req, res) => {
  try {
    const { employee } = req.params

    // 1. Get employee
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id, name, role, department, risk')
      .ilike('name', employee)
      .single()

    if (empErr || !emp) return res.status(404).json({ error: 'Employee not found' })

    // 2. Get Digital Twin snapshot
    const twinSnapshot = await getOrRefreshTwinSnapshot()

    // 3. Find this employee's graph node
    const { data: empNode } = await supabase
      .from('graph_nodes')
      .select('id')
      .eq('node_type', 'employee')
      .eq('entity_id', emp.id)
      .single()

    let impactedAgents    = []
    let impactedWorkflows = []
    let ownedPlatforms    = []
    let knowledgeAssets   = []

    if (empNode) {
      // Outgoing edges from employee: owns agents, owns platforms, documents knowledge
      const { data: outEdges } = await supabase
        .from('graph_edges')
        .select('target_node_id, relationship_type, weight, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
        .eq('source_node_id', empNode.id)

      for (const edge of (outEdges || [])) {
        const n = edge.graph_nodes
        if (!n) continue
        if (n.node_type === 'agent' && edge.relationship_type === 'owns') {
          // Pull live twin state for this agent
          const { data: twinState } = await supabase
            .from('twin_entity_state')
            .select('risk_level, current_state')
            .eq('node_id', n.id)
            .single()
          impactedAgents.push({
            name:      n.entity_name,
            entityId:  n.entity_id,
            riskLevel: twinState?.risk_level ?? (n.properties?.risk ?? 'unknown'),
            weight:    edge.weight
          })
        } else if (n.node_type === 'platform' && edge.relationship_type === 'owns') {
          ownedPlatforms.push({ name: n.entity_name, entityId: n.entity_id, weight: edge.weight })
        }
      }

      // Get workflows via agent→workflow edges for owned agents
      const agentNodeIds = impactedAgents.map(a => a.entityId)
      if (agentNodeIds.length > 0) {
        const { data: wfDeps } = await supabase
          .from('workflow_dependencies')
          .select('workflows(id, name, status, risk), is_critical')
          .in('agent_id', agentNodeIds)

        const seen = new Set()
        for (const wd of (wfDeps || [])) {
          if (!seen.has(wd.workflows?.id)) {
            seen.add(wd.workflows?.id)
            impactedWorkflows.push({ ...wd.workflows, is_critical: wd.is_critical })
          }
        }
      }
    } else {
      // Fallback to raw tables
      const { data: agentLinks } = await supabase
        .from('employee_agent')
        .select('agent_id, agents(id, name, status, risk)')
        .eq('employee_id', emp.id)
      impactedAgents = (agentLinks || []).map(l => ({ ...l.agents, weight: 1.0 }))

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

    // 4. Knowledge assets owned by this employee
    const { data: kaData } = await supabase
      .from('knowledge_assets')
      .select('id, topic, criticality, is_documented, asset_type')
      .eq('owner_id', emp.id)
    knowledgeAssets = (kaData || []).filter(k => !k.is_documented || k.criticality === 'critical')

    // 5. Compute impact score
    const criticalAgents  = impactedAgents.filter(a => ['critical', 'high'].includes(a.riskLevel))
    const impactScore = Math.min(100,
      30 +
      (impactedAgents.length * 8) +
      (criticalAgents.length * 12) +
      (knowledgeAssets.length * 5)
    )
    const severity    = impactedAgents.length >= 4 ? 'critical'
                      : impactedAgents.length >= 2 ? 'high'
                      : 'medium'
    const twinHealthIndex = twinSnapshot?.org_health_index ?? 0

    const narrative = `If ${emp.name} (${emp.role}, ${emp.department}) leaves: ` +
      `${impactedAgents.length} agent(s) at risk of orphanhood, ` +
      `${impactedWorkflows.length} workflow(s) disrupted, ` +
      `${knowledgeAssets.length} undocumented/critical knowledge assets. ` +
      `Org health index: ${twinHealthIndex}.`

    // 6. Log simulation run
    const affectedEntities = {
      agents:          impactedAgents.map(a => a.name),
      workflows:       impactedWorkflows.map(w => w.name),
      platforms:       ownedPlatforms.map(p => p.name),
      knowledgeAssets: knowledgeAssets.map(k => k.topic)
    }

    const { data: runRow } = await supabase
      .from('simulation_runs')
      .insert({
        simulation_type:   'employee_leaves',
        target_entity:     emp.name,
        twin_snapshot_id:  twinSnapshot?.id ?? null,
        input_params:      { employeeName: employee, employeeId: emp.id, role: emp.role, department: emp.department },
        affected_entities: affectedEntities,
        impact_score:      impactScore,
        severity,
        narrative
      })
      .select('id')
      .single()

    // 7. Publish simulation.completed event
    await eventBus.publish('simulation.completed', 'simulationEmployeeLeaves', 'all', {
      simulationType:   'employee_leaves',
      targetEntity:     emp.name,
      simulationRunId:  runRow?.id ?? null,
      twinSnapshotId:   twinSnapshot?.id ?? null,
      affectedEntities,
      severity,
      impactScore
    }, 0.92)

    // 8. IEP response
    res.json(packageIntelligence({
      sourceModule:    'simulationEmployeeLeaves',
      capability:      'employee_departure_impact',
      findings: {
        scenario:          `If ${emp.name} leaves`,
        targetEmployee:    { name: emp.name, role: emp.role, department: emp.department, risk: emp.risk },
        twinSnapshotId:    twinSnapshot?.id,
        twinHealthIndex,
        impactedAgents,
        impactedWorkflows,
        ownedPlatforms,
        knowledgeAssets,
        impactScore,
        severity,
        healthBefore:      twinHealthIndex >= 60 ? 'stable' : 'strained',
        healthAfter:       severity === 'critical' ? 'critical' : 'degraded',
        simulationRunId:   runRow?.id ?? null
      },
      confidence:      0.90,
      evidence: [
        `${emp.name} owns ${impactedAgents.length} agent(s): ${impactedAgents.slice(0, 3).map(a => a.name).join(', ')}`,
        `${impactedWorkflows.length} workflow(s) depend on those agents`,
        `${knowledgeAssets.length} undocumented or critical knowledge assets would be at risk`,
        `Current org health index: ${twinHealthIndex}/100`
      ],
      recommendations: [
        `Immediately appoint a backup owner for ${emp.name}'s ${impactedAgents.length} agent(s)`,
        knowledgeAssets.length > 0
          ? `Conduct knowledge transfer for ${knowledgeAssets.length} critical/undocumented asset(s) before departure`
          : 'Knowledge transfer risk is low — all assets are documented',
        ownedPlatforms.length > 0
          ? `Reassign platform ownership for: ${ownedPlatforms.map(p => p.name).join(', ')}`
          : 'No platform ownership transfer needed'
      ],
      graphRefs: empNode
        ? [{ nodeType: 'employee', entityId: emp.id, entityName: emp.name }]
        : []
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router