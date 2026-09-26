/*
 * OBA Core — Risk Engine Unit Test (Two-Engine Core: bayes.js & eirwr.js).
 * ============================================================================
 *
 * Asserts the mathematical axioms, boundary anchors, attribution monotonicity,
 * and eIRWR power-iteration convergence properties specified in
 * docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md.
 *
 * Run from backend/:  node tests/riskEngine.unit.test.js
 */

const riskEngine = require('../domain/riskEngine')
const bayes = require('../domain/riskEngine/bayes')
const eirwr = require('../domain/riskEngine/eirwr')

let passed = 0
let failed = 0
function check(name, cond, detail) {
  if (cond) {
    passed++
    console.log('  ✓', name)
  } else {
    failed++
    console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '')
  }
}

console.log('\n=== OBA Core — Risk Engine Unit Test ===\n')

// ── 1. CPT Tensor Axioms (SPEC-2) ───────────────────────────────────────────
console.log('Engine B: Bayesian Network CPT Tensor Axioms:')
{
  const tensor = bayes.buildTensor()
  check('tensor length is exactly 81 * 3 = 243', tensor.length === 243)

  let maxColSumErr = 0
  let allNonNegative = true
  for (let i = 0; i < 81; i++) {
    const pN = tensor[i * 3]
    const pE = tensor[i * 3 + 1]
    const pC = tensor[i * 3 + 2]
    if (pN < 0 || pE < 0 || pC < 0) allNonNegative = false
    const sum = pN + pE + pC
    maxColSumErr = Math.max(maxColSumErr, Math.abs(sum - 1.0))
  }
  check('all CPT probabilities are non-negative', allNonNegative)
  check('all 81 CPT column triples sum to 1.0 (max err < 1e-12)', maxColSumErr < 1e-12, maxColSumErr)
}

// ── 2. Boundary & Compound Anchors (SPEC-2.2) ────────────────────────────────
console.log('\nEngine B: Boundary & Compound Anchors (Verified Numerically):')
{
  const getPosterior = (o, d, s, u) => {
    const tensor = bayes.buildTensor()
    const idx = bayes.tensorIndex(o, d, s, u)
    return {
      pN: tensor[idx * 3],
      pE: tensor[idx * 3 + 1],
      pC: tensor[idx * 3 + 2],
    }
  }

  // Anchor 1: All-best (2, 2, 2, 2)
  const a1 = getPosterior(2, 2, 2, 2)
  check('Anchor (2,2,2,2) P(Nominal) ≈ 0.9600', Math.abs(a1.pN - 0.9600) < 0.001, a1.pN)
  check('Anchor (2,2,2,2) P(Elevated) ≈ 0.0350', Math.abs(a1.pE - 0.0350) < 0.001, a1.pE)
  check('Anchor (2,2,2,2) P(Critical) ≈ 0.0050', Math.abs(a1.pC - 0.0050) < 0.001, a1.pC)
  const scoreA1 = riskEngine.scoreAgent({ ownership: 2, documentation: 2, runtime_state: 2, cascade_exposure: 2 })
  check('Anchor (2,2,2,2) predictedScore === 2 (floor risk)', scoreA1.predictedScore === 2, scoreA1.predictedScore)
  check('Anchor (2,2,2,2) threatLevel === "LOW"', scoreA1.threatLevel === 'LOW', scoreA1.threatLevel)

  // Anchor 2: All-worst (0, 0, 0, 0)
  const a2 = getPosterior(0, 0, 0, 0)
  check('Anchor (0,0,0,0) P(Nominal) ≈ 0.0010', Math.abs(a2.pN - 0.0010) < 0.001, a2.pN)
  check('Anchor (0,0,0,0) P(Elevated) ≈ 0.0090', Math.abs(a2.pE - 0.0090) < 0.001, a2.pE)
  check('Anchor (0,0,0,0) P(Critical) ≈ 0.9900', Math.abs(a2.pC - 0.9900) < 0.001, a2.pC)
  const scoreA2 = riskEngine.scoreAgent({ ownership: 0, documentation: 0, runtime_state: 0, cascade_exposure: 0 })
  check('Anchor (0,0,0,0) predictedScore === 99', scoreA2.predictedScore === 99, scoreA2.predictedScore)
  check('Anchor (0,0,0,0) threatLevel === "CRITICAL"', scoreA2.threatLevel === 'CRITICAL', scoreA2.threatLevel)

  // Anchor 3: Unowned + Documented (0, 2, 2, 2)
  const a3 = getPosterior(0, 2, 2, 2)
  check('Anchor (0,2,2,2) P(Critical) ≈ 0.4500', Math.abs(a3.pC - 0.4500) < 0.002, a3.pC)
  const scoreA3 = riskEngine.scoreAgent({ ownership: 0, documentation: 2, runtime_state: 2, cascade_exposure: 2 })
  check('Anchor (0,2,2,2) predictedScore === 54', scoreA3.predictedScore === 54, scoreA3.predictedScore)
  check('Anchor (0,2,2,2) threatLevel === "MEDIUM"', scoreA3.threatLevel === 'MEDIUM', scoreA3.threatLevel)

  // Anchor 4: Unowned + Undocumented (0, 0, 2, 2) -> Compound Non-Linearity
  const a4 = getPosterior(0, 0, 2, 2)
  check('Anchor (0,0,2,2) P(Critical) ≈ 0.8800', Math.abs(a4.pC - 0.8800) < 0.002, a4.pC)
  const scoreA4 = riskEngine.scoreAgent({ ownership: 0, documentation: 0, runtime_state: 2, cascade_exposure: 2 })
  check('Anchor (0,0,2,2) predictedScore === 92', scoreA4.predictedScore === 92, scoreA4.predictedScore)
  check('Anchor (0,0,2,2) threatLevel === "CRITICAL"', scoreA4.threatLevel === 'CRITICAL', scoreA4.threatLevel)
  check('Documentation loss compounds critical probability from 0.45 to 0.88', a4.pC > a3.pC * 1.9)
}

// ── 3. Glass-Box Attribution & Monotonicity (SPEC-3.2) ──────────────────────
console.log('\nEngine B: Glass-Box Attribution & Monotonicity:')
{
  const s = riskEngine.scoreAgent({ ownership: 1, documentation: 0, runtime_state: 2, cascade_exposure: 2 })
  check('attribution has all four keys', 'ownership' in s.attribution && 'documentation' in s.attribution && 'runtime_state' in s.attribution && 'cascade_exposure' in s.attribution)
  check('documentation attribution is strictly positive for state 0', s.attribution.documentation > 0, s.attribution.documentation)
  check('ownership attribution is strictly positive for state 1', s.attribution.ownership > 0, s.attribution.ownership)
  check('optimal factors shed zero score (runtime_state === 2 -> attr 0)', s.attribution.runtime_state === 0, s.attribution.runtime_state)
  check('optimal factors shed zero score (cascade_exposure === 2 -> attr 0)', s.attribution.cascade_exposure === 0, s.attribution.cascade_exposure)
  check('all attributions are bounded by predictedScore', Object.values(s.attribution).every((v) => v <= s.predictedScore))
}

// ── 4. Engine A: eIRWR Power-Iteration & Cascade (SPEC-4) ────────────────────
console.log('\nEngine A: eIRWR Sparse Power-Iteration on Dependency Graph:')
{
  // 4-node chain: 4 -> 3 -> 2 -> 1 (4 depends on 3, 3 depends on 2, 2 depends on 1)
  const edges = [
    { source_type: 'agent', source_id: 4, target_type: 'agent', target_id: 3, dependency_type: 'critical', strength: 90 },
    { source_type: 'agent', source_id: 3, target_type: 'agent', target_id: 2, dependency_type: 'high', strength: 75 },
    { source_type: 'agent', source_id: 2, target_type: 'agent', target_id: 1, dependency_type: 'normal', strength: 50 },
  ]
  const engine = eirwr.build(edges)
  check('graph registers all 4 nodes', engine.nodes.length === 4)

  const seed = new Float64Array(4)
  const idx1 = engine.indexByKey.get('agent:1')
  seed[idx1] = 1.0

  const r = engine.run(seed)
  check('result vector r has length 4', r.length === 4)

  const idx2 = engine.indexByKey.get('agent:2')
  const idx3 = engine.indexByKey.get('agent:3')
  const idx4 = engine.indexByKey.get('agent:4')

  check('direct dependent (agent:2) absorbs significant mass', r[idx2] > 0.05, r[idx2])
  check('transitive dependent (agent:3) receives mass', r[idx3] > 0, r[idx3])
  check('cascade attenuates monotonically along the chain (r2 > r3 > r4)', r[idx2] > r[idx3] && r[idx3] > r[idx4], {
    r2: r[idx2],
    r3: r[idx3],
    r4: r[idx4],
  })
}

// ── 5. Degenerate Zero-Seed Handling (SPEC-1.5 / Ambiguity A13) ──────────────
console.log('\nEngine Context: Degenerate Zero-Seed Handling:')
{
  const rootsClean = {
    dependencies: [
      { source_type: 'agent', source_id: 2, target_type: 'agent', target_id: 1, dependency_type: 'critical' },
    ],
    agents: [
      { id: 1, name: 'A1', status: 'active', owner_id: 10 },
      { id: 2, name: 'A2', status: 'active', owner_id: 11 },
    ],
    workflows: [],
    workflow_failures: [],
    owners: [],
    employees: [],
    knowledge_assets: [],
  }
  const ctx = riskEngine.buildEngine(rootsClean)
  check('degenerate seed produces null orgScanR without throwing', ctx.orgScanR === null)
  check('uState returns 2 (Protected) for all nodes on zero seed', ctx.uState('agent', 1) === 2 && ctx.uState('agent', 2) === 2)
  check('blastRadius calculates correctly for root dependency', ctx.blastRadius('agent', 1) > 0, ctx.blastRadius('agent', 1))
}

console.log(`\n========================================`)
console.log(`Result: ${passed} passed, ${failed} failed`)
console.log(`========================================\n`)

if (failed > 0) process.exit(1)
