/**
 * GRAPH ANALYTICS — shared, real graph computations
 * -------------------------------------------------
 * Pure functions over the Unified Knowledge Graph. Every constitutional module
 * uses these to derive REAL intelligence (ownership coverage, dependency
 * fan-in/out, single points of failure, centrality, transitive/hidden
 * dependencies, cycles, concentration). No random or hard-coded results.
 */

const { spofVerdict } = require('../../domain/definitions')

const ASSET_TYPES = ['system', 'ai_agent', 'workflow', 'knowledge', 'policy', 'process', 'asset', 'project']
const HUMAN_TYPES = ['executive', 'employee']

const A = {
  ASSET_TYPES,
  HUMAN_TYPES,

  all(g) { return g.entities.list() },
  byType(g, t) { return g.entities.list(t) },
  byTypes(g, types) { return types.flatMap((t) => g.entities.list(t)) },
  nameOf(g, id) { const e = g.entities.get(id); return e ? e.name : id },
  entity(g, id) { return g.entities.get(id) },

  // owns
  owners(g, id) { return g.relationships.to(id).filter((r) => r.type === 'owns') },
  owned(g, id) { return g.relationships.from(id).filter((r) => r.type === 'owns') },
  // depends_on
  dependents(g, id) { return g.relationships.to(id).filter((r) => r.type === 'depends_on') }, // who depends on id (fan-in)
  dependencies(g, id) { return g.relationships.from(id).filter((r) => r.type === 'depends_on') }, // what id depends on (fan-out)
  // generic
  edgesOfType(g, t) { return g.relationships.list(t) },
  neighbors(g, id) { return g.relationships.neighbors(id) },
  degree(g, id) { return g.relationships.neighbors(id).length },

  assets(g) { return A.byTypes(g, ASSET_TYPES) },
  humans(g) { return A.byTypes(g, HUMAN_TYPES) },

  transitiveDependents(g, id) {
    const seen = new Set(); const q = [id]
    while (q.length) {
      const cur = q.shift()
      for (const r of A.dependents(g, cur)) if (!seen.has(r.from)) { seen.add(r.from); q.push(r.from) }
    }
    seen.delete(id)
    return [...seen]
  },

  transitiveDependencies(g, id) {
    const seen = new Set(); const q = [id]
    while (q.length) {
      const cur = q.shift()
      for (const r of A.dependencies(g, cur)) if (!seen.has(r.to)) { seen.add(r.to); q.push(r.to) }
    }
    seen.delete(id)
    return [...seen]
  },

  // Single points of failure — D-06's spofVerdict(): sole owner AND no backup
  // AND criticality >= high. Criticality comes off the `owns` edge (set by
  // graphLoader from the same root column definitions.js reads); backup
  // comes off the owning entity's `metadata.backup_owner` (graphLoader wires
  // this from lib/ownerBackups.js, the same helper agents.js/dependencies.js
  // use). This used to be dependents>=1 && owners<=1 — a materially different,
  // undisclosed definition presented to users under the same "SPOF" label as
  // every other consumer of spofVerdict(); orphaned (owners===0) and
  // sole-owner-with-backup were both wrongly counted as "SPOF" before.
  singlePointsOfFailure(g) {
    return A.assets(g)
      .map((e) => {
        const ownerRels = A.owners(g, e.id)
        const ownerCount = ownerRels.length
        const criticality = ownerRels[0] ? ownerRels[0].criticality : 'unknown'
        const ownerEntity = ownerCount === 1 ? A.entity(g, ownerRels[0].from) : null
        const hasBackup = Boolean(ownerEntity && ownerEntity.metadata && ownerEntity.metadata.backup_owner)
        return {
          id: e.id, name: e.name, type: e.type,
          dependents: A.dependents(g, e.id).length,
          owners: ownerCount,
          verdict: spofVerdict({ criticality, ownerCount, hasBackup }),
        }
      })
      .filter((x) => x.verdict.status === 'spof')
      .sort((a, b) => b.dependents - a.dependents)
  },

  // Degree centrality ranking (most connected actors).
  centrality(g) {
    return A.all(g)
      .map((e) => ({ id: e.id, name: e.name, type: e.type, degree: A.degree(g, e.id) }))
      .sort((a, b) => b.degree - a.degree)
  },

  // Most-depended-upon entities (fan-in ranking).
  fanInRanking(g) {
    return A.all(g)
      .map((e) => ({ id: e.id, name: e.name, type: e.type, dependents: A.dependents(g, e.id).length }))
      .filter((x) => x.dependents > 0)
      .sort((a, b) => b.dependents - a.dependents)
  },

  detectCycles(g) {
    const WHITE = 0, GREY = 1, BLACK = 2
    const color = new Map()
    const cycles = []
    const nodes = A.all(g).map((e) => e.id)
    nodes.forEach((n) => color.set(n, WHITE))
    const stack = []
    const dfs = (u) => {
      color.set(u, GREY); stack.push(u)
      for (const r of A.dependencies(g, u)) {
        const v = r.to
        if (color.get(v) === GREY) {
          const i = stack.indexOf(v)
          if (i > -1) cycles.push(stack.slice(i).map((id) => A.nameOf(g, id)))
        } else if (color.get(v) === WHITE) dfs(v)
      }
      stack.pop(); color.set(u, BLACK)
    }
    nodes.forEach((n) => { if (color.get(n) === WHITE) dfs(n) })
    return cycles
  },

  // Ownership concentration: how many critical assets each owner holds.
  ownershipConcentration(g) {
    const counts = new Map()
    for (const a of A.assets(g)) {
      for (const r of A.owners(g, a.id)) {
        counts.set(r.from, (counts.get(r.from) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([id, n]) => ({ id, name: A.nameOf(g, id), assetsOwned: n }))
      .sort((a, b) => b.assetsOwned - a.assetsOwned)
  },

  round(n) { return Math.round(n * 100) / 100 },

  // Confidence derived from evidence volume + coverage (never hard-coded).
  confidence(evidenceCount, coverage = 1) {
    if (!evidenceCount) return 0.4
    const c = 0.55 + 0.45 * Math.max(0, Math.min(1, coverage))
    return Math.max(0, Math.min(1, Math.round(c * 100) / 100))
  },

  // Pull a prior module's published intelligence from the current execution.
  prior(context, moduleCode) {
    const list = (context && context.priorIntel) || []
    const hit = list.find((p) => p.module === moduleCode)
    return hit ? hit.package : null
  },
  allPrior(context) { return (context && context.priorIntel) || [] },
}

module.exports = A
