const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Fetch all edges as { id, source_node_id, target_node_id, relationship_type, weight } */
async function fetchAllEdges() {
  const { data, error } = await supabase
    .from('graph_edges')
    .select('id, source_node_id, target_node_id, relationship_type, weight, properties')
  if (error) throw new Error(error.message)
  return data || []
}

/** Build an adjacency list from edges (undirected for BFS path-finding) */
function buildAdjacency(edges) {
  const adj = {}
  edges.forEach(e => {
    if (!adj[e.source_node_id]) adj[e.source_node_id] = []
    if (!adj[e.target_node_id]) adj[e.target_node_id] = []
    adj[e.source_node_id].push({ neighbor: e.target_node_id, edge: e })
    adj[e.target_node_id].push({ neighbor: e.source_node_id, edge: e })
  })
  return adj
}

/**
 * BFS shortest path between two node IDs.
 * Returns array of node IDs from source → target (inclusive), or null if not reachable.
 */
function bfsPath(adj, sourceId, targetId) {
  if (sourceId === targetId) return [sourceId]

  const visited = new Set([sourceId])
  const queue   = [[sourceId]]

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]

    for (const { neighbor } of (adj[current] || [])) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      const newPath = [...path, neighbor]
      if (neighbor === targetId) return newPath
      queue.push(newPath)
    }
  }

  return null  // no path found
}

/** Sync nodes for a given entity type: truncates and re-inserts from source table */
async function syncNodeType(nodeType, sourceTable, nameCol, extraProps) {
  // Fetch source rows
  const { data: rows, error: fetchErr } = await supabase
    .from(sourceTable)
    .select('*')
  if (fetchErr) throw new Error(`Failed to fetch ${sourceTable}: ${fetchErr.message}`)

  // Delete existing nodes of this type
  const { error: delErr } = await supabase
    .from('graph_nodes')
    .delete()
    .eq('node_type', nodeType)
  if (delErr) throw new Error(`Failed to delete ${nodeType} nodes: ${delErr.message}`)

  // Re-insert
  if (!rows || rows.length === 0) return 0

  const insertRows = rows.map(r => ({
    node_type:   nodeType,
    entity_id:   r.id,
    entity_name: r[nameCol],
    properties:  extraProps(r)
  }))

  const { error: insErr } = await supabase
    .from('graph_nodes')
    .insert(insertRows)
  if (insErr) throw new Error(`Failed to insert ${nodeType} nodes: ${insErr.message}`)

  return rows.length
}

// ─────────────────────────────────────────────
// GET /api/graph/nodes
// List nodes, filterable by node_type
// ─────────────────────────────────────────────
router.get('/nodes', async (req, res) => {
  try {
    const { node_type } = req.query

    let query = supabase
      .from('graph_nodes')
      .select('id, node_type, entity_id, entity_name, properties, created_at')
      .order('node_type')
      .order('entity_name')

    if (node_type) {
      query = query.eq('node_type', node_type)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    res.json({
      totalNodes: data.length,
      nodes: data.map(n => ({
        id:         n.id,
        nodeType:   n.node_type,
        entityId:   n.entity_id,
        entityName: n.entity_name,
        properties: n.properties,
        createdAt:  n.created_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/graph/nodes/:id/neighbors
// One-hop neighbors (both directions)
// ─────────────────────────────────────────────
router.get('/nodes/:id/neighbors', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id, 10)
    if (isNaN(nodeId)) return res.status(400).json({ error: 'Invalid node id' })

    // Fetch the node itself
    const { data: node, error: nodeErr } = await supabase
      .from('graph_nodes')
      .select('*')
      .eq('id', nodeId)
      .single()
    if (nodeErr || !node) return res.status(404).json({ error: 'Node not found' })

    // Outgoing edges (node is source)
    const { data: outEdges, error: outErr } = await supabase
      .from('graph_edges')
      .select('id, target_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
      .eq('source_node_id', nodeId)
    if (outErr) throw new Error(outErr.message)

    // Incoming edges (node is target)
    const { data: inEdges, error: inErr } = await supabase
      .from('graph_edges')
      .select('id, source_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_id, entity_name, properties)')
      .eq('target_node_id', nodeId)
    if (inErr) throw new Error(inErr.message)

    const outgoing = (outEdges || []).map(e => ({
      edgeId:           e.id,
      direction:        'outgoing',
      relationshipType: e.relationship_type,
      weight:           e.weight,
      edgeProperties:   e.properties,
      neighbor: {
        id:         e.graph_nodes?.id,
        nodeType:   e.graph_nodes?.node_type,
        entityId:   e.graph_nodes?.entity_id,
        entityName: e.graph_nodes?.entity_name,
        properties: e.graph_nodes?.properties
      }
    }))

    const incoming = (inEdges || []).map(e => ({
      edgeId:           e.id,
      direction:        'incoming',
      relationshipType: e.relationship_type,
      weight:           e.weight,
      edgeProperties:   e.properties,
      neighbor: {
        id:         e.graph_nodes?.id,
        nodeType:   e.graph_nodes?.node_type,
        entityId:   e.graph_nodes?.entity_id,
        entityName: e.graph_nodes?.entity_name,
        properties: e.graph_nodes?.properties
      }
    }))

    res.json({
      node: {
        id:         node.id,
        nodeType:   node.node_type,
        entityId:   node.entity_id,
        entityName: node.entity_name,
        properties: node.properties
      },
      totalNeighbors: outgoing.length + incoming.length,
      outgoing,
      incoming
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/graph/path/:sourceId/:targetId
// Shortest path between two nodes (BFS in JS)
// ─────────────────────────────────────────────
router.get('/path/:sourceId/:targetId', async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10)
    const targetId = parseInt(req.params.targetId, 10)
    if (isNaN(sourceId) || isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid node IDs' })
    }

    // Build adjacency from all edges
    const edges = await fetchAllEdges()
    const adj   = buildAdjacency(edges)
    const path  = bfsPath(adj, sourceId, targetId)

    if (!path) {
      return res.json({ connected: false, path: [], hops: 0, nodes: [] })
    }

    // Fetch node details for each node in path
    const { data: nodes, error: nodeErr } = await supabase
      .from('graph_nodes')
      .select('id, node_type, entity_id, entity_name, properties')
      .in('id', path)
    if (nodeErr) throw new Error(nodeErr.message)

    const nodeMap = {}
    ;(nodes || []).forEach(n => { nodeMap[n.id] = n })

    const pathNodes = path.map(id => {
      const n = nodeMap[id]
      return {
        id:         n?.id,
        nodeType:   n?.node_type,
        entityId:   n?.entity_id,
        entityName: n?.entity_name,
        properties: n?.properties
      }
    })

    // Annotate path segments with the edge relationship
    const edgeIndex = {}
    edges.forEach(e => {
      const keyFwd = `${e.source_node_id}-${e.target_node_id}`
      const keyRev = `${e.target_node_id}-${e.source_node_id}`
      if (!edgeIndex[keyFwd]) edgeIndex[keyFwd] = e
      if (!edgeIndex[keyRev]) edgeIndex[keyRev] = e
    })

    const segments = []
    for (let i = 0; i < path.length - 1; i++) {
      const key  = `${path[i]}-${path[i + 1]}`
      const edge = edgeIndex[key]
      segments.push({
        from:             pathNodes[i],
        to:               pathNodes[i + 1],
        relationshipType: edge?.relationship_type ?? 'connected',
        weight:           edge?.weight ?? 1.0
      })
    }

    res.json({
      connected: true,
      hops:      path.length - 1,
      path:      path,
      nodes:     pathNodes,
      segments
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/graph/entity/:type/:id
// Get the graph node + all connections for a real entity
// ─────────────────────────────────────────────
router.get('/entity/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params
    const entityId = parseInt(id, 10)
    if (isNaN(entityId)) return res.status(400).json({ error: 'Invalid entity id' })

    const { data: node, error: nodeErr } = await supabase
      .from('graph_nodes')
      .select('*')
      .eq('node_type', type)
      .eq('entity_id', entityId)
      .single()

    if (nodeErr || !node) {
      return res.status(404).json({ error: `No graph node found for ${type} with entity_id ${entityId}` })
    }

    // All edges (either direction)
    const { data: outEdges } = await supabase
      .from('graph_edges')
      .select('id, target_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_target_node_id_fkey(id, node_type, entity_id, entity_name)')
      .eq('source_node_id', node.id)

    const { data: inEdges } = await supabase
      .from('graph_edges')
      .select('id, source_node_id, relationship_type, weight, properties, graph_nodes!graph_edges_source_node_id_fkey(id, node_type, entity_id, entity_name)')
      .eq('target_node_id', node.id)

    res.json({
      node: {
        id:         node.id,
        nodeType:   node.node_type,
        entityId:   node.entity_id,
        entityName: node.entity_name,
        properties: node.properties
      },
      connections: {
        outgoing: (outEdges || []).map(e => ({
          edgeId:           e.id,
          relationshipType: e.relationship_type,
          weight:           e.weight,
          properties:       e.properties,
          targetNode: {
            id:         e.graph_nodes?.id,
            nodeType:   e.graph_nodes?.node_type,
            entityId:   e.graph_nodes?.entity_id,
            entityName: e.graph_nodes?.entity_name
          }
        })),
        incoming: (inEdges || []).map(e => ({
          edgeId:           e.id,
          relationshipType: e.relationship_type,
          weight:           e.weight,
          properties:       e.properties,
          sourceNode: {
            id:         e.graph_nodes?.id,
            nodeType:   e.graph_nodes?.node_type,
            entityId:   e.graph_nodes?.entity_id,
            entityName: e.graph_nodes?.entity_name
          }
        }))
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// POST /api/graph/sync
// Re-sync graph_nodes and graph_edges from source tables.
// This is the "graph synchronization" mechanism — call after data changes.
// ─────────────────────────────────────────────
router.post('/sync', async (req, res) => {
  try {
    const eventBus = require('../../services/eventBus')

    // ── 1. Sync nodes ──
    const employeeCount = await syncNodeType('employee', 'employees', 'name', r => ({
      role: r.role, department: r.department, risk: r.risk, workload: r.workload, tenure: r.tenure
    }))
    const agentCount = await syncNodeType('agent', 'agents', 'name', r => ({
      type: r.type, status: r.status, risk: r.risk, usage_count: r.usage_count, adoption_pct: r.adoption_pct, cost: r.cost
    }))
    const platformCount = await syncNodeType('platform', 'ai_platforms', 'name', r => ({
      type: r.type, status: r.status, cost_monthly: r.cost_monthly, adoption_pct: r.adoption_pct, usage_count: r.usage_count
    }))
    const workflowCount = await syncNodeType('workflow', 'workflows', 'name', r => ({
      status: r.status, risk: r.risk, department: r.department, frequency: r.frequency
    }))

    const nodesCount = employeeCount + agentCount + platformCount + workflowCount

    // ── 2. Rebuild all edges ──
    // Delete all edges (they'll be wrong after node IDs change)
    const { error: delEdgeErr } = await supabase.from('graph_edges').delete().neq('id', 0)
    if (delEdgeErr) throw new Error(`Failed to delete edges: ${delEdgeErr.message}`)

    // Re-fetch freshly inserted nodes for ID mapping
    const { data: freshNodes } = await supabase
      .from('graph_nodes')
      .select('id, node_type, entity_id')

    // Build lookup: nodeType+entityId → graph node id
    const nodeIdMap = {}
    ;(freshNodes || []).forEach(n => {
      nodeIdMap[`${n.node_type}:${n.entity_id}`] = n.id
    })

    const edgeInserts = []

    // employee_agent
    const { data: ea } = await supabase.from('employee_agent').select('employee_id, agent_id, role')
    ;(ea || []).forEach(r => {
      const s = nodeIdMap[`employee:${r.employee_id}`]
      const t = nodeIdMap[`agent:${r.agent_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'owns', weight: r.role === 'owner' ? 1.0 : 0.5, properties: { role: r.role } })
    })

    // agent_platform
    const { data: ap } = await supabase.from('agent_platform').select('agent_id, platform_id')
    ;(ap || []).forEach(r => {
      const s = nodeIdMap[`agent:${r.agent_id}`]
      const t = nodeIdMap[`platform:${r.platform_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'uses', weight: 1.0, properties: {} })
    })

    // agent→agent dependencies
    const { data: deps } = await supabase.from('dependencies').select('source_id, target_id, source_type, target_type, dependency_type, strength').eq('source_type', 'agent').eq('target_type', 'agent')
    ;(deps || []).forEach(r => {
      const s = nodeIdMap[`agent:${r.source_id}`]
      const t = nodeIdMap[`agent:${r.target_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'depends_on', weight: (r.strength || 50) / 100, properties: { dependency_type: r.dependency_type } })
    })

    // workflow_dependencies (workflow→agent)
    const { data: wd } = await supabase.from('workflow_dependencies').select('workflow_id, agent_id, is_critical')
    ;(wd || []).forEach(r => {
      const s = nodeIdMap[`workflow:${r.workflow_id}`]
      const t = nodeIdMap[`agent:${r.agent_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'depends_on', weight: r.is_critical ? 1.0 : 0.5, properties: { is_critical: r.is_critical } })
    })

    // workflow_tool_dependencies (workflow→platform)
    const { data: wtd } = await supabase.from('workflow_tool_dependencies').select('workflow_id, platform_id, is_critical')
    ;(wtd || []).forEach(r => {
      const s = nodeIdMap[`workflow:${r.workflow_id}`]
      const t = nodeIdMap[`platform:${r.platform_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'uses', weight: r.is_critical ? 1.0 : 0.5, properties: { is_critical: r.is_critical } })
    })

    // tool_ownership (employee→platform)
    const { data: to2 } = await supabase.from('tool_ownership').select('employee_id, platform_id')
    ;(to2 || []).forEach(r => {
      const s = nodeIdMap[`employee:${r.employee_id}`]
      const t = nodeIdMap[`platform:${r.platform_id}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'owns', weight: 1.0, properties: { role: 'platform_owner' } })
    })

    // manager hierarchy
    const { data: empList } = await supabase.from('employees').select('id, manager')
    const { data: empAll }  = await supabase.from('employees').select('id, name')
    const nameToId = {}
    ;(empAll || []).forEach(e => { nameToId[e.name] = e.id })
    ;(empList || []).forEach(e => {
      if (!e.manager) return
      const managerId = nameToId[e.manager]
      if (!managerId) return
      const s = nodeIdMap[`employee:${e.id}`]
      const t = nodeIdMap[`employee:${managerId}`]
      if (s && t) edgeInserts.push({ source_node_id: s, target_node_id: t, relationship_type: 'reports_to', weight: 0.8, properties: {} })
    })

    // Insert all edges in one batch
    let edgesCount = 0
    if (edgeInserts.length > 0) {
      const { error: edgeInsErr } = await supabase.from('graph_edges').insert(edgeInserts)
      if (edgeInsErr) throw new Error(`Failed to insert edges: ${edgeInsErr.message}`)
      edgesCount = edgeInserts.length
    }

    // Publish graph.synced event
    await eventBus.publish('graph.synced', 'graph', 'all', {
      nodesCount,
      edgesCount,
      breakdown: { employeeCount, agentCount, platformCount, workflowCount }
    }, 1.0)

    res.json({
      success: true,
      nodesCount,
      edgesCount,
      breakdown: {
        employees: employeeCount,
        agents:    agentCount,
        platforms: platformCount,
        workflows: workflowCount
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
