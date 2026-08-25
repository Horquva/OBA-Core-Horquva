/**
 * SIMULATION — cascade reach, severity, and health impact, in one place
 * -----------------------------------------------------------------------
 * Before this file, "what happens if X leaves/fails/goes down/is disrupted"
 * was answered four different ways in backend/routes/simulations/*.js (each
 * doing a single-hop query with its own severity thresholds) and a fifth way
 * client-side in frontend/lib/simulation.ts. This is the one shared core.
 *
 * Severity reuses definitions.js's criticality vocabulary rather than
 * inventing a sixth bucket scheme. Health impact reuses derived.js's real
 * orgHealth() on a mutated roots snapshot rather than inventing a new
 * "simulated health" formula — see the W-I design doc §2.4.
 */

const derived = require('./derived')
const { entityCriticality, atOrAbove } = require('./definitions')

// ─── Cascade ─────────────────────────────────────────────────────────────────

function buildDependencyIndex(roots) {
  return derived.dependencyIndex(roots)
}

/** Everything that transitively fails downstream of one node, as entities not just a count. */
function cascadeFrom(startType, startId, index) {
  const seen = new Set()
  const impacted = []
  const queue = [[startType, startId]]
  seen.add(index.key(startType, startId))
  while (queue.length) {
    const [t, id] = queue.shift()
    for (const dep of index.dependentsOf.get(index.key(t, id)) || []) {
      const k = index.key(dep.type, dep.id)
      if (seen.has(k)) continue
      seen.add(k)
      impacted.push({ type: dep.type, id: dep.id })
      queue.push([dep.type, dep.id])
    }
  }
  return impacted
}

/** Workflows that use any of the given agent ids, via workflow_dependencies. */
function workflowsUsingAgents(agentIds, roots) {
  const workflowIds = new Set()
  for (const wd of roots.workflow_dependencies) {
    if (agentIds.has(wd.agent_id)) workflowIds.add(wd.workflow_id)
  }
  return roots.workflows.filter((w) => workflowIds.has(w.id))
}

// ─── Severity ────────────────────────────────────────────────────────────────

/**
 * One shared severity rule, built on definitions.js's LEVELS/atOrAbove rather
 * than a new bucket scheme. `impacted` is an array of { criticality } —
 * already-resolved via entityCriticality(), not raw rows.
 */
function severityFor(impacted) {
  const count = impacted.length
  const hasCritical = impacted.some((e) => atOrAbove(e.criticality, 'critical'))
  const hasHigh = impacted.some((e) => atOrAbove(e.criticality, 'high'))
  if (hasCritical || count >= 5) return 'critical'
  if (hasHigh || count >= 2) return 'high'
  if (count >= 1) return 'medium'
  return 'low'
}

// ─── Health delta ────────────────────────────────────────────────────────────

/** Deep-enough clone: every root table array gets fresh row objects. */
function cloneRoots(roots) {
  const clone = {}
  for (const key of Object.keys(roots)) {
    clone[key] = key === '_counts' ? { ...roots[key] } : roots[key].map((row) => ({ ...row }))
  }
  return clone
}

function recount(roots) {
  const counts = {}
  for (const t of derived.ROOT_TABLES) counts[t] = (roots[t] || []).length
  roots._counts = counts
  return roots
}

function healthScore(roots) {
  const acc = derived.accountability(roots)
  const risk = derived.predictiveRisk(roots)
  return derived.orgHealth(roots, { accountability: acc, predictiveRisk: risk }).healthIndex
}

/** Positive = health drops after the mutation. Null if either side lacks evidence. */
function healthDelta(baselineRoots, mutatedRoots) {
  const before = healthScore(baselineRoots)
  const after = healthScore(mutatedRoots)
  if (before == null || after == null) return null
  return before - after
}

module.exports = {
  buildDependencyIndex,
  cascadeFrom,
  workflowsUsingAgents,
  severityFor,
  cloneRoots,
  recount,
  healthDelta,
}
