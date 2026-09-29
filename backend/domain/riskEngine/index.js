/**
 * RISK ENGINE — context builder and evidence extraction for the two-engine
 * predictive risk pipeline (Engine A: eirwr.js, Engine B: bayes.js).
 * ============================================================================
 *
 * `buildEngine(roots)` constructs everything that is invariant under the
 * root-table mutations the rest of the system performs (simulations mutate
 * ownership/status, never the dependency topology):
 *
 *   - the weighted dependency graph for Engine A,
 *   - the per-node criticality weights κ (via definitions.entityCriticality),
 *   - the org-scan run: one distress-seeded solve whose steady-state r feeds
 *     every agent's U (upstream cascading exposure) evidence,
 *   - memoized per-agent blast radii (one seeded solve each, cached).
 *
 * Evidence EXTRACTION (O/D/S) is deliberately NOT cached here — it reads the
 * roots bundle passed to predictiveRisk, so a mutated roots snapshot (an
 * owner removed, an agent marked failed) re-extracts honestly while reusing
 * the expensive graph work. The one accepted staleness: agentFails() marks an
 * agent failed after the org scan ran, so its own U is not inflated by its
 * new self-distress — harmless, because S=0 already dominates that agent's
 * posterior (documented in the expanded plan, SPEC-1).
 *
 * Seeds come from OBSERVED state only (failed/inactive agents, high-failure
 * workflows) — never from Engine B's output. That is what keeps the pipeline
 * acyclic: cascade exposure cannot feed the scores that define distress.
 *
 * Provenance: the DAG shape follows arXiv:0906.3968 / arXiv:2505.06281; all
 * thresholds, weights and seeds here are authored design values (see
 * docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md).
 */

const { entityCriticality } = require('../definitions')
const bayes = require('./bayes')
const eirwr = require('./eirwr')
const impactPagerank = require('./impactPagerank')

// ─── Evidence extraction (SPEC-1) ────────────────────────────────────────────

// agents.owner_id references employees.id directly, NOT owners.id (see
// routes/ownership.js's header comment). owners is keyed by employee_id for
// the backup check — same reading as derived.js's backupIndex(), replicated
// here rather than imported to keep this module cycle-free (the precedent is
// simulations.js's successorBackup lookup).
function ownerBackupMap(roots) {
  const byEmployee = new Map()
  for (const o of roots.owners || []) {
    if (o.employee_id == null) continue
    byEmployee.set(o.employee_id, Boolean(o.backup_owner))
  }
  return byEmployee
}

function agentDocumentation(roots, agentId) {
  let total = 0
  let documented = 0
  for (const ka of roots.knowledge_assets || []) {
    if (ka.asset_type !== 'agent' || ka.asset_id !== agentId) continue
    total++
    if (ka.is_documented) documented++
  }
  // No rows at all ⇒ Undocumented (0): the same conjunction rule
  // ownedAssetBase() applies ("one undocumented row means not documented"),
  // extended to the empty set. This deliberately unifies the two readings the
  // legacy code disagreed on (expanded plan P17).
  if (total === 0 || documented === 0) return { state: 0, total, documented }
  if (documented === total) return { state: 2, total, documented }
  return { state: 1, total, documented }
}

/**
 * Extracts the O/D/S evidence for one agent from the roots bundle.
 * Returns { ownership, documentation, runtime_state, ownerName, docTotal,
 * docDocumented } — U (cascade_exposure) is added by the caller from the
 * engine context, keeping this function engine-free.
 */
function agentEvidence(roots, agent, precomputed = {}) {
  const backups = precomputed.ownerBackup || ownerBackupMap(roots)
  const employees = precomputed.employeeById
    || new Map((roots.employees || []).map((e) => [e.id, e]))

  const hasOwner = agent.owner_id != null
  const ownership = !hasOwner ? 0 : (backups.get(agent.owner_id) ? 2 : 1)
  const ownerName = hasOwner ? (employees.get(agent.owner_id)?.name ?? null) : null

  const docs = agentDocumentation(roots, agent.id)

  let runtimeState = 2
  if (agent.status === 'failed') runtimeState = 0
  else if (agent.status === 'inactive') runtimeState = 1

  return {
    ownership,
    documentation: docs.state,
    runtime_state: runtimeState,
    ownerName,
    docTotal: docs.total,
    docDocumented: docs.documented,
  }
}

// ─── Employee portfolio scoring (Phase 1.5) ─────────────────────────────────

// Portfolio evidence aggregation thresholds. [AUTHORED, same footing as the
// CPT coefficients — see the honesty note in bayes.js.]
//   O/D: a portfolio reads as fully resilient (2) only when EVERY asset in
//   the relevant dimension is resilient; a majority-fragile portfolio reads
//   as 0; anything in between as 1. Majority, not any-single-asset, so one
//   weak asset among many solid ones does not dominate the whole tuple (S
//   below already carries the worst-case runtime signal).
const PORTFOLIO_MAJORITY = 0.5

/**
 * Engine B evaluated at the PERSON level: one employee's owned portfolio
 * (agents + workflow runbooks + tool ownership) is aggregated into a single
 * O/D/S/U evidence tuple and pushed through the SAME 81-configuration CPT
 * used per asset — no second authored model, no linear scale factors. This
 * replaces derived.js's humanDependencyRisk constants (27/30), which summed
 * a calibrated posterior with two crude ratios.
 *
 * Aggregation rules (documented, authored):
 *   O — fragile share of the portfolio (agent unowned-or-unbacked, tool
 *       without a hot backup, workflow whose runbook owner lacks a backup);
 *       >50% fragile → 0, any fragile → 1, none → 2.
 *   D — documented share over doc-able assets (agents via knowledge_assets,
 *       workflows via runbooks); all-documented → 2, partial → 1, none → 0.
 *       A portfolio with nothing doc-able reads 2 (vacuous, not failing).
 *   S — worst observed runtime state across the portfolio (0 failed, 1
 *       inactive, 2 active).
 *   U — mean Engine A upstream exposure across the portfolio's graph nodes
 *       (assets absent from the dependency graph contribute nothing);
 *       mean keeps one hot node from erasing a well-spread portfolio —
 *       worst-case already lives in S.
 *
 * Pure: no I/O. `context` is the shared buildEngine(roots) context.
 */
function scoreEmployee(roots, context, employeeId) {
  const backups = ownerBackupMap(roots)
  const employees = new Map((roots.employees || []).map((e) => [e.id, e]))

  const ownedAgents = (roots.agents || []).filter((a) => a.owner_id === employeeId)
  const workflowById = new Map((roots.workflows || []).map((w) => [w.id, w]))
  const ownedWorkflows = (roots.workflow_runbooks || [])
    .filter((r) => r.owner_id === employeeId)
    .map((r) => workflowById.get(r.workflow_id))
    .filter(Boolean)
  const backedPlatformIds = new Set((roots.tool_backups || []).map((b) => b.primary_platform))
  const ownedTools = (roots.tool_ownership || [])
    .filter((t) => t.employee_id === employeeId)
    .map((t) => (roots.ai_platforms || []).find((p) => p.id === t.platform_id))
    .filter(Boolean)

  const total = ownedAgents.length + ownedWorkflows.length + ownedTools.length
  if (total === 0) return null

  // O — ownership resilience across the portfolio. Workflows ride on the
  // runbook owner (this person): fragile iff this person has no backup —
  // the same fact the agent term reads, so it is priced once per asset,
  // not double-weighted (the legacy code's guard, kept).
  const personHasBackup = backups.get(employeeId) ?? false
  const fragileAgents = personHasBackup ? 0 : ownedAgents.filter((a) => a.owner_id != null).length
  const fragileTools = ownedTools.filter((p) => !backedPlatformIds.has(p.id)).length
  const fragileWorkflows = personHasBackup ? 0 : ownedWorkflows.length
  const fragileShare = (fragileAgents + fragileTools + fragileWorkflows) / total
  const ownership = fragileShare > PORTFOLIO_MAJORITY ? 0 : fragileShare > 0 ? 1 : 2

  // D — documentation coverage over the doc-able assets (platforms carry no
  // knowledge rows and are excluded from the denominator, not counted as
  // undocumented).
  const docByAgentId = new Map()
  for (const ka of roots.knowledge_assets || []) {
    if (ka.asset_type !== 'agent') continue
    const cur = docByAgentId.get(ka.asset_id) || { total: 0, documented: 0 }
    cur.total++
    if (ka.is_documented) cur.documented++
    docByAgentId.set(ka.asset_id, cur)
  }
  const runbookByWorkflowId = new Map((roots.workflow_runbooks || []).map((r) => [r.workflow_id, r]))
  let docTotal = 0
  let docDocumented = 0
  for (const a of ownedAgents) {
    const d = docByAgentId.get(a.id)
    if (!d) { docTotal += 1; continue } // no knowledge rows reads as undocumented — P17 conjunction rule
    docTotal += d.total
    docDocumented += d.documented
  }
  for (const w of ownedWorkflows) {
    const r = runbookByWorkflowId.get(w.id)
    if (!r) continue
    docTotal++
    if (r.is_documented) docDocumented++
  }
  const documentedShare = docTotal === 0 ? 0 : docDocumented / docTotal
  const documentation = docTotal === 0
    ? 2 // nothing doc-able: the dimension is vacuous, not failing
    : documentedShare >= 1 ? 2 : documentedShare > 0 ? 1 : 0

  // S — worst observed runtime state across the portfolio.
  let runtime_state = 2
  for (const a of ownedAgents) {
    if (a.status === 'failed') runtime_state = 0
    else if (a.status === 'inactive' && runtime_state > 0) runtime_state = 1
  }
  for (const w of ownedWorkflows) {
    if (w.status === 'failed') runtime_state = 0
    else if (w.status === 'inactive' && runtime_state > 0) runtime_state = 1
  }
  for (const p of ownedTools) {
    if (p.status === 'failed') runtime_state = 0
    else if (p.status === 'inactive' && runtime_state > 0) runtime_state = 1
  }

  // U — upstream cascade exposure, averaged over the portfolio's Engine A
  // nodes (assets absent from the dependency graph contribute nothing; a
  // portfolio with no graph presence reads as protected).
  let uSum = 0
  let uCount = 0
  for (const a of ownedAgents) { uSum += context.uState('agent', a.id); uCount++ }
  for (const w of ownedWorkflows) { uSum += context.uState('workflow', w.id); uCount++ }
  const cascade_exposure = uCount === 0 ? 2 : Math.max(0, Math.min(2, Math.round(uSum / uCount)))

  const ev = { ownership, documentation, runtime_state, cascade_exposure }
  const posterior = bayes.scoreAgent(ev)

  return {
    evidence: ev,
    pNominal: posterior.pNominal,
    pElevated: posterior.pElevated,
    pCritical: posterior.pCritical,
    predictedScore: posterior.predictedScore,
    threatLevel: posterior.threatLevel,
    attribution: posterior.attribution,
    reasons: bayes.reasonsFor(ev),
    portfolio: {
      ownedAgents: ownedAgents.length,
      ownedWorkflows: ownedWorkflows.length,
      ownedTools: ownedTools.length,
      fragileAgents,
      fragileTools,
      fragileWorkflows,
      fragileShare,
      unbackedTools: fragileTools,
      docTotal,
      docDocumented,
      criticalWorkflows: ownedWorkflows.filter((w) => w.risk === 'critical' || w.risk === 'high').length,
    },
    employeeName: employees.get(employeeId)?.name ?? null,
  }
}

// ─── Org-scan distress seeds (SPEC-1) ────────────────────────────────────────

// Observed-state distress weights. Only things that HAVE ALREADY failed or
// degraded seed the scan — this is a measurement, not a prediction, so the
// BBN's posterior never feeds back into it.
const DISTRESS_FAILED = 1.0
const DISTRESS_INACTIVE = 0.5
const DISTRESS_WORKFLOW_FAILURES = 2 // ≥ this many recorded failures seeds the workflow
const DISTRESS_WORKFLOW = 0.7

function orgScanSeeds(engine, roots) {
  const seed = new Float64Array(engine.nodes.length)
  let any = false
  for (const a of roots.agents || []) {
    if (a.status !== 'failed' && a.status !== 'inactive') continue
    const idx = engine.indexByKey.get(eirwr.keyOf('agent', a.id))
    if (idx === undefined) continue
    seed[idx] = a.status === 'failed' ? DISTRESS_FAILED : DISTRESS_INACTIVE
    any = true
  }
  if (roots.workflows?.length && roots.workflow_failures?.length) {
    const failuresByWorkflow = new Map()
    for (const f of roots.workflow_failures) {
      failuresByWorkflow.set(f.workflow_id, (failuresByWorkflow.get(f.workflow_id) || 0) + 1)
    }
    for (const [workflowId, count] of failuresByWorkflow) {
      if (count < DISTRESS_WORKFLOW_FAILURES) continue
      const idx = engine.indexByKey.get(eirwr.keyOf('workflow', workflowId))
      if (idx === undefined) continue
      seed[idx] = Math.max(seed[idx], DISTRESS_WORKFLOW)
      any = true
    }
  }
  return any ? seed : null // null = degenerate: no observed distress anywhere
}

// ─── κ criticality weights (SPEC-4.5) ────────────────────────────────────────

// Impact weight per affected node for the continuous blast radius and the
// simulation severity mass. [AUTHORED] — maps definitions.js's canonical
// criticality vocabulary onto the plan's [0.2, 1.0] range; 'unknown' reads as
// unmeasured-but-present (0.4), never as zero.
const KAPPA = { critical: 1.0, high: 0.7, normal: 0.4, medium: 0.4, low: 0.2, unknown: 0.4 }

// Blast-radius reach factor (see blastRadius below). [AUTHORED] — 3
// dependents reach ~63% of full magnitude; a node needs ~10 dependents
// before its reading approaches its severity. EPS separates "reached by the
// walk" from floating-point residue.
const BLAST_REACH_SCALE = 3
const BLAST_REACH_EPS = 1e-9

function kappaFor(roots) {
  // Node keys come from eirwr's `type:<id>` strings, entity rows carry the
  // raw id (a uuid since sql/19_uuid_primary_keys.sql). Keying the maps on
  // String(id) keeps the lookup correct for both representations — and means
  // no caller may coerce an entity id through Number(), which would turn a
  // uuid into NaN and silently drop every weight to KAPPA.unknown.
  const agentsById = new Map((roots.agents || []).map((a) => [String(a.id), a]))
  const workflowsById = new Map((roots.workflows || []).map((w) => [String(w.id), w]))
  const platformsById = new Map((roots.ai_platforms || []).map((p) => [String(p.id), p]))
  return (type, id) => {
    let level = 'unknown'
    if (type === 'agent') {
      const row = agentsById.get(String(id))
      if (row) level = entityCriticality('agent', row)
    } else if (type === 'workflow') {
      const row = workflowsById.get(String(id))
      if (row) level = entityCriticality('workflow', row)
    } else if (type === 'platform') {
      const row = platformsById.get(String(id))
      if (row) level = entityCriticality('platform', row, { knowledgeAssets: roots.knowledge_assets || [] })
    }
    return KAPPA[level] ?? KAPPA.unknown
  }
}

// ─── Engine context ──────────────────────────────────────────────────────────

/**
 * Builds the engine context for one roots bundle. Pure: no I/O, and cheap
 * enough to call per computeAllFromRoots / per rankAllScenarios run.
 *
 * Exposes:
 *   runSeeded(pairs)      — solve with a seed given as [{type,id,weight}]
 *   uState(type, id)      — Engine-B U evidence 0/1/2 for a node
 *   blastRadius(type, id) — continuous 0-100 impact of losing one node (memoized)
 *   kappaOf(type, id)     — impact weight for severity mass
 *   orgScanR / seeds      — the org-scan solve, for tests and inspection
 */
function buildEngine(roots) {
  const engine = eirwr.build(roots.dependencies || [])
  const kappa = kappaFor(roots)
  const kappaArr = new Float64Array(engine.nodes.length)
  for (let i = 0; i < engine.nodes.length; i++) {
    const [type, id] = engine.nodes[i].split(':')
    kappaArr[i] = kappa(type, id)
  }

  const seedArr = orgScanSeeds(engine, roots)
  const orgScanR = seedArr ? engine.run(seedArr) : null
  // eirwr.run L1-normalizes the seed, so the scan's r is a SHARE of the org's
  // total distress: with K independent failures each one's neighborhood
  // receives ~1/K of the mass it would alone. Read against the fixed
  // U_THRESHOLDS that made exposure fall as failures rose (1 failed agent →
  // its dependent HighExposure; 10 → the same dependent Protected, and so
  // were the failed agents themselves). Scaling r back by the total seed mass
  // expresses it in distress units (DISTRESS_FAILED = 1) — invariant to
  // unrelated failures elsewhere, and identical to the old reading for a
  // single failed seed, so the thresholds keep their calibration.
  const seedMass = seedArr ? seedArr.reduce((sum, w) => sum + w, 0) : 0

  // ── IMPACT ENGINE (audit finding F-1) ──────────────────────────────────────
  // The eIRWR walk is root-cause direction by design: seeded at a symptom, it
  // accumulates mass at the cascade SOURCE (the paper's own words; backward
  // edges and the belief-C column scaling exist precisely to pull mass
  // upstream). That is what U-evidence wants. It is the OPPOSITE of what
  // "blast radius" means: seeded at a failing node, the impact walk must
  // reach the node's DEPENDENTS (what breaks). Reusing eirwr for this — even
  // transposed and with backward edges disabled — collapses, because the
  // belief-C column scaling kills transitions toward any node that does not
  // look like a cause (observed: hub 0, leaf 76, in both configurations).
  //
  // The impact side therefore uses its own, deliberately simpler instrument:
  // Personalized PageRank with restart on the TRANSPOSED row-normalized
  // graph (impactPagerank.js) — the standard downstream-impact construction.
  // Same node set and κ as the cause engine; its own node order and cache.
  // impactPagerank takes the ORIGINAL dependency rows and performs the
  // transposition itself (dependency → dependents) — pre-swapping here would
  // double-transpose back into the cause direction.
  const impactEngine = impactPagerank.build(roots.dependencies || [])
  const impactKappaArr = new Float64Array(impactEngine.nodes.length)
  for (let i = 0; i < impactEngine.nodes.length; i++) {
    const [type, id] = impactEngine.nodes[i].split(':')
    impactKappaArr[i] = kappa(type, id)
  }

  const idxOf = (type, id) => engine.indexByKey.get(eirwr.keyOf(type, id))
  const impactIdxOf = (type, id) => impactEngine.indexByKey.get(impactPagerank.keyOf(type, id))

  const blastCache = new Map()
  function blastRadius(type, id) {
    const idx = impactIdxOf(type, id)
    if (idx === undefined) return 0 // not in the dependency graph → no downstream estate
    const cached = blastCache.get(idx)
    if (cached !== undefined) return cached
    const r = impactEngine.solve([[impactEngine.nodes[idx], 1]])
    // Blast-radius reading: the failure-mass-weighted average criticality of
    // the downstream estate — Σ r_j·κ_j / Σ r_j over non-seed nodes, ×100.
    // PPR mass is restart-bounded (α keeps most of it at the seed), so raw
    // Σ r·κ would read 1-2% even for a hub breaking five critical dependents;
    // normalizing by received mass asks the intended question directly: "how
    // critical is what breaks, weighted by how hard it is hit". A
    // zero-dependent leaf receives nothing → 0; a hub whose many dependents
    // are all critical → ~100.
    //
    // That average alone is blind to HOW MUCH breaks: a hub with twenty
    // normal-criticality dependents and a node with one read the same 40. The
    // severity is therefore scaled by a saturating reach factor over the
    // number of dependents the walk actually reaches,
    //   1 − exp(−reached / BLAST_REACH_SCALE)
    // (1 dependent → 0.28, 3 → 0.63, 5 → 0.81, 10 → 0.96), so the reading is
    // "how critical is what breaks × how much of it there is".
    let mass = 0
    let received = 0
    let reached = 0
    for (let j = 0; j < impactEngine.nodes.length; j++) {
      if (j === idx) continue
      if (r[j] > BLAST_REACH_EPS) reached++
      received += r[j]
      mass += r[j] * impactKappaArr[j]
    }
    const severity = received > 0 ? mass / received : 0
    const reach = 1 - Math.exp(-reached / BLAST_REACH_SCALE)
    const value = Math.min(100, Math.round(100 * severity * reach))
    blastCache.set(idx, value)
    return value
  }

  function uState(type, id) {
    if (!orgScanR) return 2 // no observed distress anywhere → Protected
    const idx = idxOf(type, id)
    if (idx === undefined) return 2
    return bayes.exposureState(orgScanR[idx] * seedMass)
  }

  function runSeeded(pairs) {
    const seed = new Float64Array(engine.nodes.length)
    for (const p of pairs || []) {
      const idx = idxOf(p.type, p.id)
      if (idx === undefined) continue
      seed[idx] += p.weight
    }
    return engine.run(seed)
  }

  // Downstream (impact-direction) solve — what simulations' severity mass and
  // changeImpact's victim walk consume. Seeds at failing nodes, reads the
  // dependents they break. Was previously the upstream walk misread as
  // impact (same defect class as F-1).
  function runImpact(pairs) {
    const seedEntries = []
    for (const p of pairs || []) {
      if (impactIdxOf(p.type, p.id) === undefined) continue
      seedEntries.push([impactPagerank.keyOf(p.type, p.id), p.weight])
    }
    return impactEngine.solve(seedEntries)
  }

  return {
    engine,
    impact: { engine: impactEngine, kappaArr: impactKappaArr, indexByKey: impactEngine.indexByKey, runSeeded: runImpact },
    orgScanR,
    orgScanSeeds: seedArr,
    runSeeded,
    uState,
    blastRadius,
    kappaOf: kappa,
    kappaArr,
  }
}

module.exports = {
  buildEngine,
  agentEvidence,
  ownerBackupMap,
  agentDocumentation,
  orgScanSeeds,
  scoreEmployee,
  PORTFOLIO_MAJORITY,
  KAPPA,
  BLAST_REACH_SCALE,
  DISTRESS_FAILED,
  DISTRESS_INACTIVE,
  DISTRESS_WORKFLOW,
  DISTRESS_WORKFLOW_FAILURES,
  // ── Re-exports from bayes.js (SPEC-3 & SPEC-5) ─────────────────────────────
  scoreAgent: bayes.scoreAgent,
  reasonsFor: bayes.reasonsFor,
  threatLevelFor: bayes.threatLevelFor,
  buildTensor: bayes.buildTensor,
  tensorIndex: bayes.tensorIndex,
  exposureState: bayes.exposureState,
  CPT_COEFFS: bayes.CPT_COEFFS,
  THREAT_BANDS: bayes.THREAT_BANDS,
  U_THRESHOLDS: bayes.U_THRESHOLDS,
  constants: {
    ...bayes.CPT_COEFFS,
    ...bayes.THREAT_BANDS,
    ...bayes.U_THRESHOLDS,
    eirwrDefaults: eirwr.DEFAULTS,
  },
  // ── Re-exports from eirwr.js ───────────────────────────────────────────────
  keyOf: eirwr.keyOf,
  eirwrBuild: eirwr.build,
  eirwrDefaults: eirwr.DEFAULTS,
}

