const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { applyOrgScope } = require('../lib/tenant')
const { loadOwnerBackupByEmployee } = require('../lib/ownerBackups')
const { spofVerdict } = require('../domain/definitions')
const { dependencyIndex, cascadeReach } = require('../domain/derived')
const riskEngine = require('../domain/riskEngine')
const domain = require('../domain')

// GET /api/dependencies — full dependency graph with analysis
router.get('/', async (req, res) => {
  // F-I: agent_source/agent_target used to be embedded here via PostgREST's FK
  // syntax to attach each edge's agent detail inline, but nothing ever read
  // .agent_source/.agent_target from this response (confirmed: zero references
  // anywhere in frontend/). source_id/target_id + the type columns are the
  // canonical edge representation (derived.js, graphLoader.js, network.js,
  // risks.js, export-company.js all already use only these) -- the embed was
  // computing a join, sending it over the wire, and being discarded.
  const { data, error } = await applyOrgScope(supabase
    .from('dependencies')
    .select(`
      id,
      source_id,
      target_id,
      source_type,
      target_type,
      dependency_type,
      strength
    `))

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
      // ids are opaque strings (uuid since sql/19_uuid_primary_keys.sql) —
      // never coerce to a number, the type prefix is the namespace.
      return { type, id, connectionCount: count }
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
 * getDownstream(), used by both the Dependency Map and Risk pages.
 *
 * SPOF status now comes from the canonical spofVerdict() (D-06: sole owner
 * AND no backup AND criticality >= high) rather than this route's own former
 * rule, which also required >=3 downstream victims — conflating "is this
 * fragile" with "how big would the blast radius be," which D-06 explicitly
 * says not to do (an incomplete dependency graph must not hide a real SPOF
 * just because no dependent happens to be recorded yet). victimsCount is
 * still reported per agent, as informational blast-radius context, not as
 * part of the SPOF gate.
 *
 * victimsCount/maxCascadeRisk come from derived.js's dependencyIndex() +
 * cascadeReach() over the agent–agent edge subset — a COUNT is a different
 * (still true) statement than a probability, and the Dependency Map's
 * "largest downstream chain" label reads it as a count. The PROBABILISTIC
 * blast radius (Phase 1.4) comes from the two-engine pipeline's Engine A:
 * riskEngine.buildEngine(roots) — the eIRWR walk (arXiv:2608.08073) over the
 * FULL dependency graph, weighted by edge criticality with attenuation and
 * anomaly damping — served per agent as `blastRadius` (0–100, continuous),
 * replacing this route's former unweighted-BFS-only view. The engine is
 * built once per request from the tenant-scoped roots bundle; each per-agent
 * radius is one seeded solve, memoized inside the engine.
 */
router.get('/agent-spofs', async (req, res) => {
  try {
    const [roots, backupByEmployee] = await Promise.all([
      domain.intelligence.compute.loadRoots(),
      // "backup coverage" belongs to the agent's owner, not the agent — see
      // ownership.js's header comment. Same derivation as agents.js.
      loadOwnerBackupByEmployee(),
    ])

    const engine = riskEngine.buildEngine(roots)
    const agentDeps = roots.dependencies.filter((d) => d.source_type === 'agent' && d.target_type === 'agent')
    const index = dependencyIndex({ dependencies: agentDeps })

    const spofs = []
    let maxCascadeRisk = 0
    let maxBlastRadius = 0

    for (const agent of roots.agents) {
      const victimsCount = cascadeReach('agent', agent.id, index)
      if (victimsCount > maxCascadeRisk) maxCascadeRisk = victimsCount

      const blastRadius = engine.blastRadius('agent', agent.id)
      if (blastRadius > maxBlastRadius) maxBlastRadius = blastRadius

      const verdict = spofVerdict({
        criticality: agent.risk,
        ownerCount: agent.owner_id != null ? 1 : 0,
        hasBackup: agent.owner_id != null ? Boolean(backupByEmployee[agent.owner_id]) : false,
      })
      if (verdict.status === 'spof') {
        spofs.push({
          agentId: agent.id,
          name: agent.name,
          victimsCount,
          blastRadius,
          blastRadiusProvenance: {
            engine: 'eirwr',
            seed: { type: 'agent', id: agent.id },
            criticalityWeight: engine.kappaOf('agent', agent.id),
          },
        })
      }
    }

    res.json({ spofs, spofCount: spofs.length, maxCascadeRisk, maxBlastRadius })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router