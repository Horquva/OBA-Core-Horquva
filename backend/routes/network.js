const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

/*
 * GET /api/network/centrality — people-centric ownership/dependency graph.
 *
 * This is the server-side home of what used to be frontend/lib/networkRisk.ts's
 * computeNetworkRisk(), ported unchanged (same algorithm, same "arbitrary"
 * bottleneck heuristic — consolidating WHERE it runs, not silently changing
 * WHAT it computes). Agent/workflow ids are namespaced ('agent_3'/'workflow_3')
 * before use as graph node keys, same reason as before: they're small integers
 * from separate tables and would otherwise collide.
 */
router.get('/centrality', async (req, res) => {
  try {
    const [agentsRes, workflowsRes, runbooksRes, depsRes] = await Promise.all([
      supabase.from('agents').select('id, employees ( name )'),
      supabase.from('workflows').select('id'),
      supabase.from('workflow_runbooks').select('workflow_id, employees ( name )'),
      supabase.from('dependencies').select('source_id, source_type, target_id, target_type'),
    ])

    if (agentsRes.error) return res.status(500).json({ error: agentsRes.error.message })
    if (workflowsRes.error) return res.status(500).json({ error: workflowsRes.error.message })
    if (runbooksRes.error) return res.status(500).json({ error: runbooksRes.error.message })
    if (depsRes.error) return res.status(500).json({ error: depsRes.error.message })

    const runbookOwnerByWorkflow = {}
    for (const r of runbooksRes.data || []) {
      if (r.employees?.name) runbookOwnerByWorkflow[r.workflow_id] = r.employees.name
    }

    // 1. Gather all unique people who own agents or workflows
    const people = new Set()
    const assetToOwner = {}

    for (const a of agentsRes.data || []) {
      const owner = a.employees?.name
      if (owner) {
        people.add(owner)
        assetToOwner[`agent_${a.id}`] = owner
      }
    }
    for (const w of workflowsRes.data || []) {
      const owner = runbookOwnerByWorkflow[w.id]
      if (owner) {
        people.add(owner)
        assetToOwner[`workflow_${w.id}`] = owner
      }
    }

    // 2. Build edges based on dependencies: if Agent A (owned by P1) depends on
    // Agent B (owned by P2) -> P1 depends on P2. source = P1, target = P2.
    const prefix = (type) => (type === 'workflow' ? 'workflow_' : 'agent_')
    const edgeMap = {}

    for (const dep of depsRes.data || []) {
      const fromKey = `${prefix(dep.source_type)}${dep.source_id}`
      const toKey = `${prefix(dep.target_type)}${dep.target_id}`
      const fromOwner = assetToOwner[fromKey]
      const toOwner = assetToOwner[toKey]
      if (fromOwner && toOwner && fromOwner !== toOwner) {
        const edgeId = `${fromOwner}->${toOwner}`
        edgeMap[edgeId] = (edgeMap[edgeId] || 0) + 1
      }
    }

    const edges = Object.entries(edgeMap).map(([id, weight]) => {
      const [source, target] = id.split('->')
      return { id, source, target, weight }
    })

    // 3. Compute node degrees
    const inMap = {}
    const outMap = {}
    for (const e of edges) {
      outMap[e.source] = (outMap[e.source] || 0) + e.weight
      inMap[e.target] = (inMap[e.target] || 0) + e.weight
    }

    const nodes = Array.from(people).map((name) => {
      const inD = inMap[name] || 0
      const outD = outMap[name] || 0
      const centralityScore = inD + outD
      return {
        id: name,
        name,
        inDegree: inD,
        outDegree: outD,
        centralityScore,
        isIsolated: centralityScore === 0,
        isBottleneck: false, // set below
      }
    })

    // Bottleneck heuristic — unchanged from the original client-side logic:
    // >= 6 total connections, or >= 75% of the max score (once the max is >= 4).
    nodes.sort((a, b) => b.centralityScore - a.centralityScore)
    const maxScore = nodes[0]?.centralityScore || 0
    for (const n of nodes) {
      if (!n.isIsolated && (n.centralityScore >= 6 || (maxScore >= 4 && n.centralityScore >= maxScore * 0.75))) {
        n.isBottleneck = true
      }
    }

    res.json({
      nodes,
      edges,
      maxCentralityHolder: nodes.length > 0 ? nodes[0] : null,
      bottleneckCount: nodes.filter((n) => n.isBottleneck).length,
      isolatedCount: nodes.filter((n) => n.isIsolated).length,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
