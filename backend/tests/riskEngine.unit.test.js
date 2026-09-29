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

// ── F-1 regression pins: blastRadius direction + normalization ──────────────
// The audit (docs/REVAMP_VALIDATION_AUDIT.md F-1) found blastRadius reading
// the CAUSE-direction walk: a zero-dependent leaf scored 100/100 while its
// hub scored lower, and unnormalized belief mass clamped everything at 100.
// The impact walk is now the TRANSPOSED graph with estate-share
// normalization. These pins are the assertions that were missing.
console.log('\nF-1 regression pins (blastRadius direction + normalization):')
{
	const rootsF1 = {
		employees: [{ id: 'e1', name: 'Dana' }, { id: 'e2', name: 'Lee' }],
		agents: [
			{ id: 'a1', name: 'Hub', risk: 'critical', status: 'active', owner_id: 'e1' },
			{ id: 'a2', name: 'Leaf', risk: 'low', status: 'active', owner_id: 'e2' },
		],
		owners: [{ employee_id: 'e1', backup_owner: null }, { employee_id: 'e2', backup_owner: 'Deputy' }],
		workflows: [{ id: 'w1', name: 'Flow', risk: 'high', status: 'active' }],
		workflow_runbooks: [], workflow_failures: [],
		dependencies: [
			{ source_type: 'agent', source_id: 'a2', target_type: 'agent', target_id: 'a1', dependency_type: 'critical', strength: 90 },
			{ source_type: 'workflow', source_id: 'w1', target_type: 'agent', target_id: 'a1', dependency_type: 'critical', strength: 95 },
		],
		knowledge_assets: [], tool_users: [], employee_agent: [], ai_platforms: [], tool_policies: [],
		policy_violations: [], tool_ownership: [], accountability_entities: [], accountability_links: [],
		truth_claims: [], decision_history: [], agent_platform: [], workflow_dependencies: [], tool_backups: [],
		workflow_steps: [], _counts: {},
	}
	const ctx = riskEngine.buildEngine(rootsF1)
	const hub = ctx.blastRadius('agent', 'a1')
	const leaf = ctx.blastRadius('agent', 'a2')
	check('the hub (2 dependents) outranks the zero-dependent leaf', hub > leaf, { hub, leaf })
	check('the zero-dependent leaf reads ~0 (its failure breaks nothing)', leaf < 5, leaf)
	check('hub blast radius is a bounded 0-100 number', hub > 0 && hub <= 100, hub)
	check('coupling sensitivity: weakening an edge’s strength moves the number', (() => {
		// lambdaOf prefers strength over dependency_type, so sensitivity is
		// exercised through strength (the authored coupling the data carries)
		const weak = riskEngine.buildEngine({
			...rootsF1,
			// weaken only the workflow edge — row normalization makes uniform
			// scaling invisible, so sensitivity must change RELATIVE coupling
			dependencies: rootsF1.dependencies.map((d) => d.source_id === 'w1' ? { ...d, strength: 10 } : d),
		})
		const before = hub
		const after = weak.blastRadius('agent', 'a1')
		return after !== before
	})())
	// estate-share normalization: mass is a SHARE of the other nodes' κ, so a
	// fully-saturated failure cannot exceed 100 and a half-reached estate
	// cannot read 100
	check('normalization: values stay in [0,100] without clamping everything to 100',
		[ctx.blastRadius('agent', 'a1'), ctx.blastRadius('agent', 'a2')].every((v) => v >= 0 && v <= 100))
}

// ── U exposure is invariant to unrelated failures ──────────────────────────
// Regression: eirwr L1-normalizes the seed, so reading raw r against fixed
// thresholds made a dependent of a failed agent read HighExposure with 1
// failure org-wide and Protected with 10.
console.log('\nU exposure — invariance to unrelated failures:')
{
	const exposureWith = (K) => {
		const deps = []
		const agents = []
		for (let k = 0; k < K; k++) {
			agents.push({ id: 'f' + k, status: 'failed' }, { id: 'd' + k, status: 'active' })
			deps.push({ source_type: 'agent', source_id: 'd' + k, target_type: 'agent', target_id: 'f' + k, dependency_type: 'critical' })
		}
		return riskEngine.buildEngine({ dependencies: deps, agents, workflows: [], ai_platforms: [] }).uState('agent', 'd0')
	}
	const readings = [1, 2, 5, 10, 20].map(exposureWith)
	check('dependent of a failed agent reads HighExposure (0) at every org-wide failure count', readings.every((u) => u === 0), readings)
}

// ── Blast radius scales with the number of dependents ───────────────────────
// Regression: the κ-weighted average alone gave a 20-dependent hub and a
// 1-dependent node the same reading.
console.log('\nBlast radius — reach:')
{
	const deps = []
	const agents = [{ id: 'hub' }, { id: 'solo' }, { id: 'lone' }]
	for (let i = 0; i < 20; i++) {
		agents.push({ id: 'n' + i })
		deps.push({ source_type: 'agent', source_id: 'n' + i, target_type: 'agent', target_id: 'hub', dependency_type: 'normal' })
	}
	deps.push({ source_type: 'agent', source_id: 'lone', target_type: 'agent', target_id: 'solo', dependency_type: 'normal' })
	const ctx = riskEngine.buildEngine({ dependencies: deps, agents, workflows: [], ai_platforms: [] })
	const hub = ctx.blastRadius('agent', 'hub')
	const solo = ctx.blastRadius('agent', 'solo')
	check('20-dependent hub reads strictly higher than a 1-dependent node', hub > solo, { hub, solo })
	check('a zero-dependent leaf reads 0', ctx.blastRadius('agent', 'n0') === 0, ctx.blastRadius('agent', 'n0'))
}

console.log(`\n========================================`)
console.log(`Result: ${passed} passed, ${failed} failed`)
console.log(`========================================\n`)

if (failed > 0) process.exit(1)
