/**
 * routes/digitalTwin/digitalTwin.js
 * ─────────────────────────────────────────────
 * Digital Twin — continuously-synced snapshot model of the organisation's
 * current state.  A live structured mirror built from graph_nodes/graph_edges
 * plus current scores from health, risk, and governance modules.
 *
 * Endpoints
 *   POST /api/digital-twin/sync             — pull current state → write twin_snapshots + twin_entity_state
 *   GET  /api/digital-twin/current          — latest snapshot + all entity states
 *   GET  /api/digital-twin/entity/:nodeId   — single entity state + graph neighbours
 *   GET  /api/digital-twin/drift            — compare two most-recent snapshots to show what changed
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Determine risk_level string for a graph node given live data lookups.
 * Checks predictive_risk_scores for agents, falls back to node properties.
 */
function deriveRiskLevel(node, riskLookup) {
  const key = `${node.node_type}:${node.entity_id}`
  if (riskLookup[key]) return riskLookup[key]

  const props = node.properties || {}
  const risk  = (props.risk || props.status || '').toLowerCase()
  if (risk === 'critical') return 'critical'
  if (risk === 'high')     return 'high'
  if (risk === 'medium')   return 'medium'
  if (['failed','inactive','deprecated'].includes(risk)) return 'high'
  return 'low'
}

/**
 * Reuse graph.js neighbour logic inline (do NOT re-import graph router —
 * just duplicate the lightweight Supabase query needed here).
 * Returns { outgoing, incoming } neighbour arrays for a given nodeId.
 */
async function fetchNeighbours(nodeId) {
  const [outRes, inRes] = await Promise.all([
    supabase
      .from('graph_edges')
      .select('id, target_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
      .eq('source_node_id', nodeId),
    supabase
      .from('graph_edges')
      .select('id, source_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
      .eq('target_node_id', nodeId)
  ])

  const outgoing = (outRes.data || []).map(e => ({
    edgeId:           e.id,
    direction:        'outgoing',
    relationshipType: e.relationship_type,
    weight:           e.weight,
    neighbor: {
      id:         e.graph_nodes?.id,
      nodeType:   e.graph_nodes?.node_type,
      entityId:   e.graph_nodes?.entity_id,
      entityName: e.graph_nodes?.entity_name,
      properties: e.graph_nodes?.properties
    }
  }))

  const incoming = (inRes.data || []).map(e => ({
    edgeId:           e.id,
    direction:        'incoming',
    relationshipType: e.relationship_type,
    weight:           e.weight,
    neighbor: {
      id:         e.graph_nodes?.id,
      nodeType:   e.graph_nodes?.node_type,
      entityId:   e.graph_nodes?.entity_id,
      entityName: e.graph_nodes?.entity_name,
      properties: e.graph_nodes?.properties
    }
  }))

  return { outgoing, incoming }
}

// ─────────────────────────────────────────────
// POST /api/digital-twin/sync
// Pulls current state, writes twin_snapshots + twin_entity_state for every node
// Fires 'twin.synced' event via eventBus
// ─────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  try {
    const snapshotType = req.body?.snapshotType || 'full'

    // ── 1. Ensure graph is fresh — call graph /sync only if graph_nodes is empty
    const { data: nodeCheck } = await supabase
      .from('graph_nodes')
      .select('id')
      .limit(1)

    if (!nodeCheck || nodeCheck.length === 0) {
      // Graph is empty — trigger internal sync (fire-and-forget via HTTP would
      // require self-referencing the server, so we call the sync logic directly)
      console.log('[DigitalTwin] graph_nodes is empty — run POST /api/graph/sync first')
      return res.status(400).json({
        error: 'graph_nodes is empty. Run POST /api/graph/sync first to populate the knowledge graph before syncing the Digital Twin.'
      })
    }

    // ── 2. Fetch all graph nodes and edges
    const [{ data: nodes, error: nodeErr }, { data: edges, error: edgeErr }] = await Promise.all([
      supabase.from('graph_nodes').select('id, node_type, entity_id, entity_name, properties'),
      supabase.from('graph_edges').select('id, source_node_id, target_node_id, relationship_type, weight')
    ])
    if (nodeErr) throw new Error(nodeErr.message)
    if (edgeErr) throw new Error(edgeErr.message)

    // ── 3. Pull current scores from other modules in parallel
    const [
      { data: riskScores },
      { data: healthSnapshot },
      { data: govAssessments },
      { data: spofData }
    ] = await Promise.all([
      supabase
        .from('predictive_risk_scores')
        .select('agent_id, threat_level, predicted_score, reasons'),
      supabase
        .from('org_health_snapshots')
        .select('health_index, health_status, critical_safety_score, continuity_score')
        .order('snapshot_month', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('governance_assessments')
        .select('asset_name, asset_type, governance_score, governance_status, criticality'),
      supabase
        .from('workflow_failures')
        .select('workflow_id, failure_type, severity')
        .eq('failure_type', 'human_spof')
    ])

    // ── 4. Build risk lookup map: "agent:<entity_id>" → threatLevel
    const riskLookup = {}
    ;(riskScores || []).forEach(r => {
      riskLookup[`agent:${r.agent_id}`] = (r.threat_level || 'LOW').toLowerCase()
    })

    // ── 5. Build governance lookup: assetName → governance_status
    const govLookup = {}
    ;(govAssessments || []).forEach(g => {
      govLookup[g.asset_name?.toLowerCase()] = g
    })

    // ── 6. Compute aggregate stats for this snapshot
    const criticalRiskCount = (riskScores || []).filter(r => r.threat_level === 'CRITICAL').length
    const spofCount         = (spofData || []).length
    const orgHealthIndex    = healthSnapshot?.health_index ?? 0

    // ── 7. Write twin_snapshot row
    const summaryPayload = {
      nodeTypes: (nodes || []).reduce((acc, n) => {
        acc[n.node_type] = (acc[n.node_type] || 0) + 1
        return acc
      }, {}),
      healthStatus:       healthSnapshot?.health_status ?? 'UNKNOWN',
      criticalSafetyScore: healthSnapshot?.critical_safety_score ?? 0,
      continuityScore:    healthSnapshot?.continuity_score ?? 0,
      topRisks: (riskScores || [])
        .filter(r => r.threat_level === 'CRITICAL')
        .slice(0, 5)
        .map(r => ({ agentId: r.agent_id, predictedScore: r.predicted_score }))
    }

    const { data: twinSnapshot, error: snapErr } = await supabase
      .from('twin_snapshots')
      .insert({
        snapshot_type:       snapshotType,
        node_count:          (nodes || []).length,
        edge_count:          (edges || []).length,
        org_health_index:    orgHealthIndex,
        critical_risk_count: criticalRiskCount,
        spof_count:          spofCount,
        summary:             summaryPayload
      })
      .select()
      .single()

    if (snapErr) throw new Error(snapErr.message)

    // ── 8. Upsert twin_entity_state for every graph node
    const entityStateRows = (nodes || []).map(node => ({
      node_id:       node.id,
      entity_type:   node.node_type,
      entity_name:   node.entity_name,
      current_state: {
        ...(node.properties || {}),
        entityId:        node.entity_id,
        snapshotId:      twinSnapshot.id,
        // Attach governance data if we have it for this entity
        governance:      govLookup[node.entity_name?.toLowerCase()] ?? null
      },
      risk_level:    deriveRiskLevel(node, riskLookup),
      last_synced:   new Date().toISOString()
    }))

    // Upsert in batches of 50 to avoid payload limits
    const batchSize = 50
    for (let i = 0; i < entityStateRows.length; i += batchSize) {
      const batch = entityStateRows.slice(i, i + batchSize)
      const { error: upsertErr } = await supabase
        .from('twin_entity_state')
        .upsert(batch, { onConflict: 'node_id' })
      if (upsertErr) throw new Error(`Entity state upsert failed: ${upsertErr.message}`)
    }

    // ── 9. Publish twin.synced event via eventBus
    await eventBus.publish('twin.synced', 'digitalTwin', 'all', {
      snapshotId:         twinSnapshot.id,
      snapshotType,
      nodeCount:          (nodes || []).length,
      edgeCount:          (edges || []).length,
      orgHealthIndex,
      criticalRiskCount,
      spofCount
    }, 1.0)

    res.json({
      success:         true,
      snapshotId:      twinSnapshot.id,
      snapshotType,
      computedAt:      twinSnapshot.computed_at,
      nodeCount:       (nodes || []).length,
      edgeCount:       (edges || []).length,
      orgHealthIndex,
      criticalRiskCount,
      spofCount,
      entitiesUpdated: entityStateRows.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/digital-twin/current
// Latest twin_snapshots row + full twin_entity_state list
// ─────────────────────────────────────────────
router.get('/current', async (req, res) => {
  try {
    const [{ data: latestSnap, error: snapErr }, { data: entityStates, error: stateErr }] = await Promise.all([
      supabase
        .from('twin_snapshots')
        .select('*')
        .order('computed_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('twin_entity_state')
        .select('id, node_id, entity_type, entity_name, current_state, risk_level, last_synced')
        .order('entity_type')
        .order('entity_name')
    ])

    if (snapErr && snapErr.code !== 'PGRST116') return res.status(500).json({ error: snapErr.message })
    if (stateErr) return res.status(500).json({ error: stateErr.message })

    if (!latestSnap) {
      return res.status(404).json({ error: 'No digital twin snapshot found. Run POST /api/digital-twin/sync first.' })
    }

    const riskBreakdown = (entityStates || []).reduce((acc, e) => {
      const lvl = e.risk_level || 'unknown'
      acc[lvl] = (acc[lvl] || 0) + 1
      return acc
    }, {})

    res.json({
      snapshot: {
        id:               latestSnap.id,
        snapshotType:     latestSnap.snapshot_type,
        nodeCount:        latestSnap.node_count,
        edgeCount:        latestSnap.edge_count,
        orgHealthIndex:   latestSnap.org_health_index,
        criticalRiskCount: latestSnap.critical_risk_count,
        spofCount:        latestSnap.spof_count,
        summary:          latestSnap.summary,
        computedAt:       latestSnap.computed_at
      },
      entityCount:    (entityStates || []).length,
      riskBreakdown,
      entities: (entityStates || []).map(e => ({
        id:           e.id,
        nodeId:       e.node_id,
        entityType:   e.entity_type,
        entityName:   e.entity_name,
        riskLevel:    e.risk_level,
        currentState: e.current_state,
        lastSynced:   e.last_synced
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/digital-twin/entity/:nodeId
// Single entity current synced state + its graph neighbours
// ─────────────────────────────────────────────
router.get('/entity/:nodeId', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.nodeId, 10)
    if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid nodeId' })

    const [{ data: entityState, error: stateErr }, { data: graphNode, error: nodeErr }, neighbours] = await Promise.all([
      supabase
        .from('twin_entity_state')
        .select('*')
        .eq('node_id', nodeId)
        .single(),
      supabase
        .from('graph_nodes')
        .select('id, node_type, entity_id, entity_name, properties, created_at')
        .eq('id', nodeId)
        .single(),
      fetchNeighbours(nodeId)
    ])

    if (stateErr || !entityState) {
      return res.status(404).json({ error: `No Digital Twin entity state found for node ${nodeId}. Run POST /api/digital-twin/sync first.` })
    }
    if (nodeErr) return res.status(500).json({ error: nodeErr.message })

    res.json({
      entityState: {
        id:           entityState.id,
        nodeId:       entityState.node_id,
        entityType:   entityState.entity_type,
        entityName:   entityState.entity_name,
        riskLevel:    entityState.risk_level,
        currentState: entityState.current_state,
        lastSynced:   entityState.last_synced
      },
      graphNode: graphNode ? {
        id:         graphNode.id,
        nodeType:   graphNode.node_type,
        entityId:   graphNode.entity_id,
        entityName: graphNode.entity_name,
        properties: graphNode.properties,
        createdAt:  graphNode.created_at
      } : null,
      totalNeighbours:  neighbours.outgoing.length + neighbours.incoming.length,
      outgoingNeighbours: neighbours.outgoing,
      incomingNeighbours: neighbours.incoming
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/digital-twin/drift
// Compare the two most-recent twin_snapshots to show what changed
// ─────────────────────────────────────────────
router.get('/drift', async (req, res) => {
  try {
    // Fetch the two most recent snapshots
    const { data: snapshots, error: snapErr } = await supabase
      .from('twin_snapshots')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(2)

    if (snapErr) return res.status(500).json({ error: snapErr.message })

    if (!snapshots || snapshots.length < 2) {
      return res.status(404).json({
        error: 'Need at least 2 snapshots to compute drift. Run POST /api/digital-twin/sync twice.'
      })
    }

    const [latest, previous] = snapshots  // newest first

    // ── Structural diffs
    const nodeCountDelta      = latest.node_count          - previous.node_count
    const edgeCountDelta      = latest.edge_count          - previous.edge_count
    const healthIndexDelta    = latest.org_health_index    - previous.org_health_index
    const criticalRiskDelta   = latest.critical_risk_count - previous.critical_risk_count
    const spofDelta           = latest.spof_count          - previous.spof_count

    // ── Entity-level drift: find entities whose risk_level changed between syncs
    // We approximate this by looking at twin_entity_state last_synced timestamps
    const latestSynced    = latest.computed_at
    const previousSynced  = previous.computed_at

    // Entities synced MORE RECENTLY than the previous snapshot = changed or new
    const { data: recentEntities, error: entityErr } = await supabase
      .from('twin_entity_state')
      .select('node_id, entity_type, entity_name, risk_level, last_synced')
      .gte('last_synced', previousSynced)

    if (entityErr) return res.status(500).json({ error: entityErr.message })

    // Break down by risk level to highlight new/worsened entities
    const riskLevelDist = (recentEntities || []).reduce((acc, e) => {
      acc[e.risk_level] = (acc[e.risk_level] || 0) + 1
      return acc
    }, {})

    const newCritical = (recentEntities || []).filter(e => e.risk_level === 'critical')
    const newHigh     = (recentEntities || []).filter(e => e.risk_level === 'high')

    // ── Build drift signals
    const driftSignals = []

    if (criticalRiskDelta > 0) {
      driftSignals.push({ type: 'risk_increase',   severity: 'critical', message: `Critical risk count increased by ${criticalRiskDelta} since last snapshot` })
    } else if (criticalRiskDelta < 0) {
      driftSignals.push({ type: 'risk_resolved',   severity: 'positive', message: `${Math.abs(criticalRiskDelta)} critical risk(s) resolved since last snapshot` })
    }

    if (healthIndexDelta < -5) {
      driftSignals.push({ type: 'health_decline',  severity: 'warning',  message: `Org health index dropped ${Math.abs(healthIndexDelta)} points (${previous.org_health_index} → ${latest.org_health_index})` })
    } else if (healthIndexDelta > 5) {
      driftSignals.push({ type: 'health_improved', severity: 'positive', message: `Org health index improved ${healthIndexDelta} points (${previous.org_health_index} → ${latest.org_health_index})` })
    }

    if (spofDelta > 0) {
      driftSignals.push({ type: 'spof_increase',   severity: 'warning',  message: `${spofDelta} new SPOF(s) detected` })
    } else if (spofDelta < 0) {
      driftSignals.push({ type: 'spof_resolved',   severity: 'positive', message: `${Math.abs(spofDelta)} SPOF(s) resolved` })
    }

    if (nodeCountDelta !== 0) {
      driftSignals.push({ type: 'graph_change',    severity: 'info',     message: `Graph node count changed by ${nodeCountDelta > 0 ? '+' : ''}${nodeCountDelta}` })
    }
    if (edgeCountDelta !== 0) {
      driftSignals.push({ type: 'graph_change',    severity: 'info',     message: `Graph edge count changed by ${edgeCountDelta > 0 ? '+' : ''}${edgeCountDelta}` })
    }

    if (driftSignals.length === 0) {
      driftSignals.push({ type: 'no_change', severity: 'stable', message: 'No significant drift detected between the last two snapshots' })
    }

    res.json({
      latestSnapshot: {
        id:               latest.id,
        computedAt:       latest.computed_at,
        nodeCount:        latest.node_count,
        edgeCount:        latest.edge_count,
        orgHealthIndex:   latest.org_health_index,
        criticalRiskCount: latest.critical_risk_count,
        spofCount:        latest.spof_count
      },
      previousSnapshot: {
        id:               previous.id,
        computedAt:       previous.computed_at,
        nodeCount:        previous.node_count,
        edgeCount:        previous.edge_count,
        orgHealthIndex:   previous.org_health_index,
        criticalRiskCount: previous.critical_risk_count,
        spofCount:        previous.spof_count
      },
      deltas: {
        nodeCount:          nodeCountDelta,
        edgeCount:          edgeCountDelta,
        orgHealthIndex:     healthIndexDelta,
        criticalRiskCount:  criticalRiskDelta,
        spofCount:          spofDelta
      },
      entityDrift: {
        entitiesChangedSinceLastSync: (recentEntities || []).length,
        riskDistribution: riskLevelDist,
        newCriticalEntities: newCritical.map(e => ({ nodeId: e.node_id, entityType: e.entity_type, entityName: e.entity_name })),
        newHighRiskEntities: newHigh.slice(0, 10).map(e => ({ nodeId: e.node_id, entityType: e.entity_type, entityName: e.entity_name }))
      },
      driftSignals
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
