const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')

// GET /api/dependencies — full dependency graph with analysis
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('dependencies')
    .select(`
      id,
      source_id,
      target_id,
      source_type,
      target_type,
      dependency_type,
      strength,
      agent_source:agents!dependencies_agent_source_fkey (id, name, status, risk),
      agent_target:agents!dependencies_agent_target_fkey (id, name, status, risk)
    `)

  if (error) return res.status(500).json({ error: error.message })

  const critical = data.filter(d => d.dependency_type === 'critical')
  const high     = data.filter(d => d.dependency_type === 'high')

  // Hub detection: count how many dependencies each node has
  const nodeCounts = {}
  data.forEach(d => {
    const sourceKey = `${d.source_type}:${d.source_id}`
    const targetKey = `${d.target_type}:${d.target_id}`
    nodeCounts[sourceKey] = (nodeCounts[sourceKey] || 0) + 1
    nodeCounts[targetKey] = (nodeCounts[targetKey] || 0) + 1
  })

  const hubs = Object.entries(nodeCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [type, id] = key.split(':')
      return { type, id: parseInt(id), connectionCount: count }
    })

  res.json({
    total:    data.length,
    critical: critical.length,
    high:     high.length,
    hubs,
    dependencies: data
  })
})

/*
 * GET /api/dependencies/agent-spofs — agent-level single-point-of-failure list.
 *
 * Server-side home of what used to be frontend/lib/graph.ts's getSPOFs() +
 * getDownstream(), used by both the Dependency Map and Risk pages — same
 * algorithm, ported unchanged: an agent is a SPOF if >= 3 agents downstream of
 * it (via BFS over agent-to-agent dependencies) would be affected by its
 * failure, it has no backup_owner, and its criticality is high or critical.
 */
router.get('/agent-spofs', async (req, res) => {
  try {
    const [agentsRes, depsRes, backupByEmployee] = await Promise.all([
      supabase.from('agents').select('id, name, risk, owner_id'),
      supabase.from('dependencies').select('source_id, target_id').eq('source_type', 'agent').eq('target_type', 'agent'),
      // "backup coverage" belongs to the agent's owner, not the agent — see
      // ownership.js's header comment. Same derivation as agents.js.
      loadOwnerBackupByEmployee(),
    ])
    if (agentsRes.error) return res.status(500).json({ error: agentsRes.error.message })
    if (depsRes.error) return res.status(500).json({ error: depsRes.error.message })

    const agents = (agentsRes.data || []).map((a) => ({
      ...a,
      backup_owner: a.owner_id != null ? (backupByEmployee[a.owner_id] ?? null) : null,
    }))
    const deps = depsRes.data || []

    const adj = {}
    for (const d of deps) {
      if (!adj[d.source_id]) adj[d.source_id] = []
      adj[d.source_id].push(d.target_id)
    }

    function getDownstream(startId) {
      const visited = new Set()
      const queue = [startId]
      while (queue.length > 0) {
        const curr = queue.shift()
        for (const neighbor of adj[curr] || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }
      return visited
    }

    const spofs = []
    let maxCascadeRisk = 0

    for (const agent of agents) {
      const victims = getDownstream(agent.id)
      if (victims.size > maxCascadeRisk) maxCascadeRisk = victims.size

      if (victims.size >= 3 && !agent.backup_owner && (agent.risk === 'high' || agent.risk === 'critical')) {
        spofs.push({ agentId: agent.id, name: agent.name, victimsCount: victims.size })
      }
    }

    res.json({ spofs, spofCount: spofs.length, maxCascadeRisk })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router