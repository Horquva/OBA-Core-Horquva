/**
 * IMPACT WALK — Personalized PageRank with restart on the TRANSPOSED
 * dependency graph (audit finding F-1).
 * ============================================================================
 *
 * A separate, deliberately simpler instrument from eirwr.js — and why:
 *
 * eIRWR answers the root-cause question: seeded at a SYMPTOM, mass must
 * accumulate at the cascade SOURCE. Its machinery is cause-specific — the
 * forward block is column-scaled by the belief C (mass only flows toward
 * plausible causes), sharpened by power-law teleportation, refined across
 * outer loops, and augmented with backward edges. Those features are exactly
 * wrong for the impact question ("this node fails — what breaks?"): seeding
 * the hub makes C[dependent]≈0, so the hub→dependent transitions collapse to
 * zero and the walk never leaves the seed (observed: hub 0, leaf 76).
 *
 * Impact is the mirror question with a standard instrument: PPR with restart
 * on the transposed, row-normalized weighted graph. Edges arrive as
 * {source depends_on target}; the transposed row for the dependency points
 * at its dependents, λ-weighted (TYPE_LAMBDA / strength), row-normalized.
 * One fixed point: r = (1−α)·M·r + α·e_seed, iterated to L1 tolerance.
 * Deterministic, monotone in downstream criticality, no belief machinery.
 *
 * r is a proper probability-like mass (α-teleportation bounds it), so the
 * caller's estate-share normalization (Σ r·κ over other nodes / Σκ) lands in
 * [0, 1] without saturation.
 *
 * Pure module. α = 0.15 (the same restart rate Engine A uses), ε = 1e-6.
 */

const TYPE_LAMBDA = { critical: 3.0, high: 2.0, normal: 1.0, medium: 1.0, low: 0.5 }
const ALPHA = 0.15
const EPS = 1e-6
const MAX_ITER = 200

const keyOf = (type, id) => `${type}:${id}`

/**
 * Builds the transposed walk from raw dependency rows.
 * Returns { nodes, indexByKey, solve(seedMap) } where seedMap is
 * nodeKey → weight; solve returns r aligned to nodes.
 */
function build(edges) {
  const indexByKey = new Map()
  const nodes = []
  const nodeOf = (type, id) => {
    const k = keyOf(type, id)
    let idx = indexByKey.get(k)
    if (idx === undefined) {
      idx = nodes.length
      nodes.push(k)
      indexByKey.set(k, idx)
    }
    return idx
  }

  const lambdaOf = (edge) => {
    if (edge.strength != null) return edge.strength / 100
    const t = typeof edge.dependency_type === 'string' ? edge.dependency_type.trim().toLowerCase() : null
    return (t && TYPE_LAMBDA[t] !== undefined) ? TYPE_LAMBDA[t] : 1.0
  }

  // Transposed rows: for "from depends_on to", the DEPENDENCY (to) sends mass
  // to its DEPENDENT (from) — the things that break when it fails.
  const rowIdx = []
  const rowVal = []
  for (const e of edges || []) {
    if (e == null) continue
    const dep = nodeOf(e.target_type, e.target_id) // the dependency
    const ent = nodeOf(e.source_type, e.source_id) // the dependent
    const lambda = lambdaOf(e)
    if (rowIdx[dep] === undefined) { rowIdx[dep] = []; rowVal[dep] = [] }
    const k = rowIdx[dep].indexOf(ent)
    if (k === -1) { rowIdx[dep].push(ent); rowVal[dep].push(lambda) }
    else rowVal[dep][k] += lambda
  }
  // Dense row list sized to the FULL node set — a node that never appears as
  // a row source (a pure leaf) must still get an empty row, or rowIdx.length
  // undershoots nodes.length and solve() reads its r vector out of bounds.
  const n = nodes.length
  for (let i = 0; i < n; i++) {
    if (rowIdx[i] === undefined) { rowIdx[i] = []; rowVal[i] = [] }
  }
    for (let i = 0; i < n; i++) {
    if (rowIdx[i] === undefined) { rowIdx[i] = []; rowVal[i] = [] }
    const sum = rowVal[i].reduce((a, b) => a + b, 0)
    if (sum > 0) for (let k = 0; k < rowVal[i].length; k++) rowVal[i][k] /= sum
  }

  function solve(seedWeights) {
    const r = new Float64Array(n)
    if (n === 0) return r
    const v = new Float64Array(n)
    let seedSum = 0
    for (const [key, w] of seedWeights || []) {
      const idx = indexByKey.get(key)
      if (idx !== undefined && w > 0) { v[idx] += w; seedSum += w }
    }
    if (seedSum <= 0) return r
    for (let i = 0; i < n; i++) v[i] /= seedSum

    // Only nodes reachable from the seed ever hold mass, and a blast-radius
    // solve (one per agent) usually reaches a small downstream set. The walk
    // therefore iterates over that ACTIVE set — kept in ascending index order
    // — instead of every node. Every skipped term is an exact +0, and the
    // remaining terms are summed in the same ascending order as a full sweep,
    // so the result is bit-identical to iterating all n nodes.
    const reached = new Uint8Array(n)
    let active = []
    for (let i = 0; i < n; i++) if (v[i] > 0) { reached[i] = 1; active.push(i) }

    let rIn = Float64Array.from(v)
    let next = new Float64Array(n)
    for (let iter = 0; iter < MAX_ITER; iter++) {
      // Column-oriented accumulation: node j RECEIVES (1−α)·Σ_i M[i][j]·r[i]
      // — mass flows along rows from i to its neighbors. (The row-oriented
      // form next[i] = Σ M[i][j]·r[j] would push mass FROM i, inverting the
      // walk — the same direction-bug class this module exists to fix.)
      for (const i of active) next[i] = 0
      let grew = false
      // Snapshot the length: nodes first reached this sweep hold no mass yet
      // (rIn is 0 there), so they only start pushing next sweep.
      const activeCount = active.length
      for (let a = 0; a < activeCount; a++) {
        const i = active[a]
        const outgoing = (1 - ALPHA) * rIn[i]
        const rowI = rowIdx[i]
        for (let k = 0; k < rowI.length; k++) {
          const j = rowI[k]
          if (!reached[j]) { reached[j] = 1; next[j] = 0; active.push(j); grew = true }
          next[j] += outgoing * rowVal[i][k]
        }
      }
      if (grew) active = active.sort((a, b) => a - b)
      let diff = 0
      for (const i of active) {
        next[i] += ALPHA * v[i]
        diff += Math.abs(next[i] - rIn[i])
      }
      const prev = rIn
      rIn = next
      next = prev
      if (diff < EPS) break
    }
    for (const i of active) r[i] = rIn[i]
    return r
  }

  return { nodes, indexByKey, solve }
}

module.exports = { build, keyOf, ALPHA, EPS, MAX_ITER, TYPE_LAMBDA }
