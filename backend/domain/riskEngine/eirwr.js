/**
 * ENGINE A — Enhanced Iterative Random Walk with Restart (eIRWR).
 * ============================================================================
 *
 * Implements Algorithm 1 of Khan & Farea, "eIRWR: Enhanced Iterative Random
 * Walk with Restart for Scalable Root Cause Analysis in Microservices"
 * (arXiv:2608.08073), replacing the legacy unweighted BFS cascade
 * (derived.js cascadeReach / simulations.js cascadeFrom) as the *probability*
 * model: a failing dependency propagates a continuous amount of failure mass
 * to its dependents, damped by each node's resilience, instead of a binary
 * "everything downstream fails with P=1".
 *
 * Edge direction (the load-bearing convention): a dependencies row
 * `source depends_on target` maps to the paper's caller→callee edge, and the
 * update r ← M·r flows score FROM the failing dependency INTO its dependents —
 * exactly the blast-radius direction. Walking the transpose is the paper's
 * measured catastrophic case (MRR ≈ 0.01, Table 4).
 *
 * Parameters are the paper's defaults (§4.1). Where the paper is ambiguous the
 * decision is pinned in docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md
 * Part II §2.1 (ambiguities A1-A13) and marked [A#] below.
 *
 * Pure module: sparse rows as parallel arrays, no dependencies, no I/O.
 */

// Paper defaults (§4.1). μ (belief momentum, Eq. 11) is part of Algorithm 1;
// the original integration plan omitted it — see correction C1 in the plan.
const DEFAULTS = {
  alpha: 0.15,   // restart probability
  rBase: 0.1,    // baseline resilience R_base
  beta: 2.0,     // anomaly sensitivity of resilience
  rho: 0.3,      // backward-edge discount
  q: 2.0,        // teleportation sharpening exponent
  mu: 0.1,       // belief momentum
  eps: 1e-6,     // inner-loop L1 convergence tolerance
  nOuter: 2,     // [A6/A7] paper: 1 "suffices"; 2 with early exit as margin
  maxInner: 200, // [A4] paper gives no cap; ~65 observed at α=0.15
}

// λ fallback when a dependencies row carries no `strength`: the dependency's
// type maps to a coupling weight. NOTE the real edge vocabulary is
// critical/high/normal/low ('medium' occurs on entities, not edges — D-65);
// 'medium' is aliased to 'normal' here for safety, 'unknown'/missing → 1.
const TYPE_LAMBDA = { critical: 3.0, high: 2.0, normal: 1.0, medium: 1.0, low: 0.5 }

const keyOf = (type, id) => `${type}:${id}`

/**
 * Builds the walk engine from raw `dependencies` rows.
 * Edges: { source_type, source_id, target_type, target_id, dependency_type, strength }.
 *
 * Returns { nodes, indexByKey, run } — `run(seedMap)` takes a Map of
 * nodeKey → seed weight (or an array aligned to `nodes`) and returns the
 * steady-state score vector r (Float64Array, one entry per node).
 */
function build(edges, opts = {}) {
  const p = { ...DEFAULTS, ...opts }

  // ── Node collection & weighted adjacency (Eq. 1: row-normalized W) ──────
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

  const raw = [] // { from, to, lambda } — from depends_on to
  for (const e of edges || []) {
    if (e == null) continue
    const from = nodeOf(e.source_type, e.source_id)
    const to = nodeOf(e.target_type, e.target_id)
    raw.push({ from, to, lambda: lambdaOf(e) })
  }

  const N = nodes.length
  const rowIdx = Array.from({ length: N }, () => [])
  const rowVal = Array.from({ length: N }, () => [])
  const edgePairs = [] // for A_bwd's reverse-edge test [A1: built once]
  const forwardSet = new Set()
  for (const { from, to, lambda } of raw) {
    if (!forwardSet.has(from * N + to)) {
      rowIdx[from].push(to)
      rowVal[from].push(lambda)
      forwardSet.add(from * N + to)
    } else {
      // duplicate edge between the same pair: accumulate weight
      const k = rowIdx[from].indexOf(to)
      rowVal[from][k] += lambda
    }
    edgePairs.push([from, to])
  }
  // Row-normalize (Eq. 1). Zero rows (nodes with no outgoing dependency) stay
  // empty — sub-stochastic mass leak, documented [A5]; the α·v restart bounds
  // the total mass regardless.
  for (let i = 0; i < N; i++) {
    const sum = rowVal[i].reduce((a, b) => a + b, 0)
    if (sum > 0) for (let k = 0; k < rowVal[i].length; k++) rowVal[i][k] /= sum
  }

  /**
   * One eIRWR solve. `seed` = array of non-negative weights per node.
   * Returns r (Float64Array). Degenerate input (no positive seed) returns
   * zeros — the paper's divide-by-zero case, made an explicit rule [A13].
   */
  function run(seed) {
    const r = new Float64Array(N)
    if (N === 0) return r
    let seedSum = 0
    let seedMax = 0
    for (let i = 0; i < N; i++) {
      const v = seed[i] || 0
      if (v < 0) throw new Error('eirwr: seed weights must be non-negative')
      seedSum += v
      if (v > seedMax) seedMax = v
    }
    if (seedSum <= 0 || seedMax <= 0) return r // [A13]

    // s_obs: L1-normalize so the belief mixture (Eq. 11) keeps its stated
    // (1−μ):μ ratio regardless of the caller's seed scale [A8].
    const s = new Float64Array(N)
    for (let i = 0; i < N; i++) s[i] = (seed[i] || 0) / seedSum

    // Adaptive resilience (Eq. 4) and base matrix (Eq. 5): row i scaled by
    // (1 − R_i). Computed once — R depends only on s_obs [paper line 3].
    const rowScale = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      const shat = (seed[i] || 0) / seedMax
      rowScale[i] = 1 - p.rBase * Math.exp(-p.beta * shat)
    }
    const baseIdx = rowIdx
    const baseVal = rowVal.map((vals, i) => vals.map((v) => v * rowScale[i]))

    // A_bwd pairs: forward edges without a reverse edge [paper Eq. 6].
    const bwdPairs = edgePairs.filter(([from, to]) => !forwardSet.has(to * N + from))

    let rVec = Float64Array.from(s)
    let prevOuter = null

    for (let outer = 1; outer <= p.nOuter; outer++) {
      // [A8] L1-normalize r before mixing into the belief.
      let rSum = 0
      for (let i = 0; i < N; i++) rSum += rVec[i]
      if (rSum > 0) for (let i = 0; i < N; i++) rVec[i] /= rSum

      // Belief refinement (Eq. 11) and normalized belief C.
      const b = new Float64Array(N)
      let bMax = 0
      let bSum = 0
      for (let i = 0; i < N; i++) {
        b[i] = (1 - p.mu) * s[i] + p.mu * rVec[i]
        if (b[i] > bMax) bMax = b[i]
        bSum += b[i]
      }
      const C = new Float64Array(N)
      for (let i = 0; i < N; i++) C[i] = bMax > 0 ? b[i] / bMax : 0

      // Combined operator (Eq. 8): M = RowNorm(M_base·diag(C) + A_bwd + A_self).
      // diag(C) scales COLUMNS of the forward block [paper Eq. 8].
      const mIdx = Array.from({ length: N }, (_, i) => baseIdx[i].slice())
      const mVal = Array.from({ length: N }, (_, i) => baseVal[i].map((v, k) => v * C[baseIdx[i][k]]))
      const rowEntry = (i, j) => {
        const k = mIdx[i].indexOf(j)
        return k === -1 ? null : k
      }
      // [A1] A_bwd recomputed each outer round from the current C: entry
      // [callee row, caller col] so a potential source absorbs its victims' score.
      for (const [from, to] of bwdPairs) {
        const k = rowEntry(to, from)
        if (k === null) { mIdx[to].push(from); mVal[to].push(p.rho * C[from]) }
        else mVal[to][k] += p.rho * C[from]
      }
      // [A2/A3] A_self: threshold is the row max of the forward block only.
      for (let i = 0; i < N; i++) {
        let fMax = 0
        for (let k = 0; k < mIdx[i].length; k++) {
          const isForward = forwardSet.has(i * N + mIdx[i][k])
          if (isForward && mVal[i][k] > fMax) fMax = mVal[i][k]
        }
        const selfLoop = Math.max(0, C[i] - fMax)
        if (selfLoop > 0) {
          const k = rowEntry(i, i)
          if (k === null) { mIdx[i].push(i); mVal[i].push(selfLoop) }
          else mVal[i][k] += selfLoop
        }
      }
      // RowNorm last, on the sum [paper Eq. 8]. Zero rows left zero [A5].
      for (let i = 0; i < N; i++) {
        const sum = mVal[i].reduce((a, b2) => a + b2, 0)
        if (sum > 0) for (let k = 0; k < mVal[i].length; k++) mVal[i][k] /= sum
      }

      // Power-law teleportation sharpening (Eqs. 9-10).
      const bMean = bSum / N
      const sigma = bMean > 0 ? bMax / bMean : 0
      const qAdapt = 1 + (p.q - 1) * Math.min(1, Math.max(0, (sigma - 5) / 15))
      const v = new Float64Array(N)
      let vSum = 0
      for (let i = 0; i < N; i++) { v[i] = Math.pow(b[i], qAdapt); vSum += v[i] }
      if (vSum > 0) for (let i = 0; i < N; i++) v[i] /= vSum
      else { v[0] = 1 } // unreachable in practice (bMax > 0 ⇒ some b^q > 0)

      // Inner power iteration: r ← (1−α)·M·r + α·v, warm-started from the
      // current r [paper lines 10-14]. Contraction rate ≤ (1−α).
      let rIn = Float64Array.from(rVec)
      for (let iter = 1; iter <= p.maxInner; iter++) {
        const rPrev = rIn
        rIn = new Float64Array(N)
        for (let i = 0; i < N; i++) {
          let acc = 0
          for (let k = 0; k < mIdx[i].length; k++) acc += mVal[i][k] * rPrev[mIdx[i][k]]
          rIn[i] = (1 - p.alpha) * acc + p.alpha * v[i]
        }
        let diff = 0
        for (let i = 0; i < N; i++) diff += Math.abs(rIn[i] - rPrev[i])
        if (diff < p.eps) break
      }
      rVec = rIn

      // [A6] outer early exit.
      if (prevOuter) {
        let odiff = 0
        for (let i = 0; i < N; i++) odiff += Math.abs(rVec[i] - prevOuter[i])
        if (odiff < p.eps) break
      }
      prevOuter = Float64Array.from(rVec)
    }

    return rVec
  }

  return { nodes, indexByKey, run, params: p }
}

module.exports = { DEFAULTS, TYPE_LAMBDA, build, keyOf }
