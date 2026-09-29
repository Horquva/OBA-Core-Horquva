/**
 * FEATURE 2 (Phase 2.2) — Unified Dependency Concentration Intelligence.
 * ============================================================================
 *
 * Answers the executive question "where does too much of the enterprise
 * depend on too few entities?" with one engine over three entity classes:
 *
 *   humans   — employees. Exposure E = Σ κ(asset) over everything they own
 *              (agents via owner_id, workflows via runbook owner_id, tools
 *              via tool_ownership). Owning an asset is full coupling (λ = 1):
 *              its failure is their problem.
 *   models   — ai_platforms. E = criticality-weighted in-degree over every
 *              real usage edge: Engine A dependency-graph in-neighbors
 *              (κ(source)·λ(edge), λ from the same TYPE_LAMBDA the walk uses)
 *              plus agent_platform holders (κ(agent)) and
 *              workflow_tool_dependencies users (κ(workflow)·(critical ? 1 :
 *              0.5) [AUTHORED]).
 *   vendors  — external_entities of kind 'vendor'. E = Σ E(platform) over
 *              the platforms they supply (external_entity_supplies): a vendor
 *              inherits the exposure of what it supplies.
 *
 * Per class, the standard instruments over the exposure distribution
 * E(v) with shares s(v) = E(v)/ΣE:
 *
 *   HHI    = Σ (100·s(v))²   [DOJ/FTC Horizontal Merger Guidelines banding:
 *                           < 1500 DISTRIBUTED, 1500–2500 MODERATE,
 *                           > 2500 CRITICAL_CHOKEPOINT]
 *   Gini   — spread of the same distribution (HHI is top-share dominated;
 *           Gini sees broad inequality HHI misses)
 *   Entropy — Shannon entropy in bits, normalized to [0,1] against log2(N):
 *           1 = perfectly spread, 0 = everything on one node
 *
 * Chokepoint alerts: a node holding more than ALERT_SHARE (25% [AUTHORED],
 * DOJ's conventional "significant concentration" line for a single firm) of
 * its class exposure AND having no fallback:
 *   humans  — no owners.backup_owner row          → KEY_PERSON
 *   models  — no hot backup in tool_backups        → MODEL_CHOKEPOINT
 *   vendors — supplies ≥ 1 unbacked platform       → VENDOR_CHOKEPOINT
 * Every alert carries evidence rows (source table + ids).
 *
 * This engine absorbs the fragmented silos:
 *   - routes/ownership.js's `agentCount >= 4 → 'high'` (raw count, no
 *     criticality) → concentrationRisk now reads the humans-class share;
 *   - routes/decisionIntelligence.js's PENALTY_CONCENTRATION trigger
 *     (`owner has 5+ agents`) now uses the same 25%-share line;
 *   - routes/knowledge/intelligence.js's inline HHI arithmetic → the shared
 *     hhiOf() below (one implementation of the math; that route keeps its
 *     own knowledge-holdings population and tier vocabulary).
 * routes/ownership.js's isHumanSpof is deliberately NOT absorbed: it is a
 * different, agent-count-scoped question consumed by the frontend with that
 * documented meaning.
 *
 * Pure module: no I/O. `context` is the shared riskEngine.buildEngine(roots)
 * context (κ + Engine A graph); built here when absent.
 */

const riskEngine = require('./riskEngine')
const { TYPE_LAMBDA } = require('./riskEngine/eirwr')

// [AUTHORED] thresholds, documented per the honesty rule.
const ALERT_SHARE = 0.25           // single-node share that constitutes a chokepoint
const CRITICAL_USAGE_WEIGHT = 0.5  // non-critical workflow→tool usage weight vs critical (1.0)

const HHI_BANDS = { DISTRIBUTED: 1500, MODERATE: 2500 } // below = distributed; between = moderate; above = critical

function hhiBandFor(hhi) {
  if (hhi > HHI_BANDS.MODERATE) return 'CRITICAL_CHOKEPOINT'
  if (hhi >= HHI_BANDS.DISTRIBUTED) return 'MODERATE'
  return 'DISTRIBUTED'
}

/** HHI over 0-100 shares. Single node → 10000; N uniform nodes → 10000/N. */
function hhiOf(shares100) {
  return shares100.reduce((sum, s) => sum + s * s, 0)
}

/** Gini coefficient over non-negative exposures (0 = equal, → 1 = concentrated). */
function giniOf(exposures) {
  const xs = exposures.filter((x) => x >= 0).sort((a, b) => a - b)
  const n = xs.length
  if (n === 0) return 0
  const total = xs.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  let cumulative = 0
  for (let i = 0; i < n; i++) cumulative += (i + 1) * xs[i]
  return (2 * cumulative) / (n * total) - (n + 1) / n
}

/** Shannon entropy of the share distribution, normalized against log2(N). */
function entropyOf(exposures) {
  const total = exposures.reduce((a, b) => a + b, 0)
  const n = exposures.length
  if (n <= 1 || total === 0) return 0
  let h = 0
  for (const x of exposures) {
    if (x <= 0) continue
    const p = x / total
    h -= p * Math.log2(p)
  }
  return h / Math.log2(n)
}

// ── Class exposure builders ─────────────────────────────────────────────────

function humansClass(roots, context) {
  const κ = context.kappaOf
  const backupByEmployee = new Map((roots.owners || []).map((o) => [o.employee_id, Boolean(o.backup_owner)]))
  const employeeById = new Map((roots.employees || []).map((e) => [e.id, e]))
  const platformById = new Map((roots.ai_platforms || []).map((p) => [p.id, p]))
  const workflowById = new Map((roots.workflows || []).map((w) => [w.id, w]))

  const exposure = new Map() // employee_id -> { e, parts: [{type, id, weight}] }
  const add = (employeeId, type, row) => {
    if (employeeId == null || !row) return
    const weight = κ(type, row.id)
    const cur = exposure.get(employeeId) || { e: 0, parts: [] }
    cur.e += weight
    cur.parts.push({ type, id: row.id, weight })
    exposure.set(employeeId, cur)
  }

  for (const a of roots.agents || []) add(a.owner_id, 'agent', a)
  for (const r of roots.workflow_runbooks || []) add(r.owner_id, 'workflow', workflowById.get(r.workflow_id))
  for (const t of roots.tool_ownership || []) add(t.employee_id, 'platform', platformById.get(t.platform_id))

  const nodes = [...exposure.entries()].map(([id, { e, parts }]) => {
    const employee = employeeById.get(id)
    const hasBackup = backupByEmployee.get(id) ?? false
    return {
      id,
      name: employee ? employee.name : `employee:${id}`,
      e: Math.round(e * 100) / 100,
      hasBackup,
      parts,
    }
  })
  return { nodes, alertKind: 'KEY_PERSON', fallbackField: 'hasBackup' }
}

function modelsClass(roots, context) {
  const κ = context.kappaOf
  const platforms = roots.ai_platforms || []
  const byId = new Map(platforms.map((p) => [p.id, p]))
  const backedPlatformIds = new Set((roots.tool_backups || []).filter((b) => b.backup_platform != null).map((b) => b.primary_platform))

  // λ from the same edge vocabulary Engine A's walk uses (TYPE_LAMBDA maps
  // dependency_type → coupling; unknown/missing reads 1).
  const lambdaOf = (dependencyType) => TYPE_LAMBDA[dependencyType] ?? 1
  const exposure = new Map(platforms.map((p) => [p.id, { e: 0, parts: [] }]))
  const add = (platformId, sourceType, sourceRow, lambda, sourceTable) => {
    if (!platformId || !byId.has(platformId) || !sourceRow) return
    const weight = κ(sourceType, sourceRow.id) * lambda
    const cur = exposure.get(platformId)
    cur.e += weight
    cur.parts.push({ type: sourceType, id: sourceRow.id, weight, lambda, sourceTable })
  }

  const agentById = new Map((roots.agents || []).map((a) => [a.id, a]))
  const workflowById = new Map((roots.workflows || []).map((w) => [w.id, w]))

  // Engine A dependency-graph in-neighbors (agent→platform, workflow→platform…)
  for (const d of roots.dependencies || []) {
    if (d.target_type !== 'platform') continue
    const source = d.source_type === 'agent'
      ? agentById.get(d.source_id)
      : d.source_type === 'workflow'
        ? workflowById.get(d.source_id)
        : null
    add(d.target_id, d.source_type, source, lambdaOf(d.dependency_type), 'dependencies')
  }
  // agent_platform holders
  for (const ap of roots.agent_platform || []) {
    add(ap.platform_id, 'agent', agentById.get(ap.agent_id), 1, 'agent_platform')
  }
  // workflow_tool_dependencies users
  for (const wtd of roots.workflow_tool_dependencies || []) {
    add(wtd.platform_id, 'workflow', workflowById.get(wtd.workflow_id), wtd.is_critical ? 1 : CRITICAL_USAGE_WEIGHT, 'workflow_tool_dependencies')
  }

  const nodes = platforms.map((p) => {
    const { e, parts } = exposure.get(p.id)
    return {
      id: p.id,
      name: p.name,
      e: Math.round(e * 100) / 100,
      hasBackup: backedPlatformIds.has(p.id),
      parts,
    }
  })
  return { nodes, alertKind: 'MODEL_CHOKEPOINT', fallbackField: 'hasBackup' }
}

function vendorsClass(roots, modelsResult) {
  const modelById = new Map(modelsResult.nodes.map((n) => [n.id, n]))
  const vendors = (roots.external_entities || []).filter((x) => x.kind === 'vendor')
  const suppliedBy = new Map()
  for (const s of roots.external_entity_supplies || []) {
    if (!suppliedBy.has(s.external_entity_id)) suppliedBy.set(s.external_entity_id, [])
    suppliedBy.get(s.external_entity_id).push(s.platform_id)
  }
  const nodes = vendors.map((v) => {
    const supplied = (suppliedBy.get(v.id) || []).map((pid) => modelById.get(pid)).filter(Boolean)
    const e = supplied.reduce((sum, m) => sum + m.e, 0)
    return {
      id: v.id,
      name: v.name,
      e: Math.round(e * 100) / 100,
      hasBackup: supplied.every((m) => m.hasBackup) && supplied.length > 0,
      suppliedPlatforms: supplied.map((m) => m.id),
      parts: supplied.map((m) => ({ type: 'platform', id: m.id, weight: m.e })),
    }
  })
  return { nodes, alertKind: 'VENDOR_CHOKEPOINT', fallbackField: 'hasBackup' }
}

// ── Class metrics ────────────────────────────────────────────────────────────

function classMetrics(cls) {
  const { nodes, alertKind, fallbackField } = cls
  const total = nodes.reduce((sum, n) => sum + n.e, 0)
  const shares = nodes.map((n) => (total > 0 ? n.e / total : 0))
  const shares100 = shares.map((s) => s * 100)
  const hhi = Math.round(hhiOf(shares100))
  const gini = Math.round(giniOf(nodes.map((n) => n.e)) * 1000) / 1000
  const entropy = Math.round(entropyOf(nodes.map((n) => n.e)) * 1000) / 1000

  const ranked = nodes
    .map((n, i) => ({ ...n, share: Math.round(shares[i] * 1000) / 1000 }))
    .sort((a, b) => b.e - a.e)

  const alerts = ranked
    .filter((n) => total > 0 && n.share > ALERT_SHARE && !n[fallbackField])
    .map((n) => ({
      kind: alertKind,
      nodeId: n.id,
      name: n.name,
      share: n.share,
      exposure: n.e,
      evidence: [
        { fact: `holds ${(n.share * 100).toFixed(1)}% of its class's criticality-weighted exposure`, sourceTable: alertKind === 'KEY_PERSON' ? 'owners' : alertKind === 'MODEL_CHOKEPOINT' ? 'ai_platforms' : 'external_entities', rowId: n.id },
        { fact: 'no recorded fallback (backup owner / hot backup platform)', sourceTable: alertKind === 'KEY_PERSON' ? 'owners' : 'tool_backups', rowId: n.id },
        ...n.parts.slice(0, 5).map((p) => ({ fact: `exposure component: ${p.type} weight ${p.weight}`, sourceTable: p.sourceTable || 'ownership', rowId: p.id })),
      ],
    }))

  return {
    population: nodes.length,
    totalExposure: Math.round(total * 100) / 100,
    hhi,
    band: hhiBandFor(hhi),
    gini,
    entropy,
    // Full ranked list — callers like ownership.js flag EVERY person, not
    // just the top five; the API-facing topNodes below stays a slice.
    nodes: ranked,
    topNodes: ranked.slice(0, 5).map((n) => ({ id: n.id, name: n.name, exposure: n.e, share: n.share, hasBackup: n.hasBackup })),
    alerts,
  }
}

// ── Engine ───────────────────────────────────────────────────────────────────

function concentration(roots, context) {
  const engine = context || riskEngine.buildEngine(roots)
  const humans = humansClass(roots, engine)
  const models = modelsClass(roots, engine)
  const vendors = vendorsClass(roots, models)

  const classes = {
    humans: classMetrics(humans),
    models: classMetrics(models),
    vendors: classMetrics(vendors),
  }

  const allAlerts = [
    ...classes.humans.alerts,
    ...classes.models.alerts,
    ...classes.vendors.alerts,
  ].sort((a, b) => b.share - a.share)

  return {
    classes,
    alerts: allAlerts,
    population: {
      chokepoints: allAlerts.length,
      criticalClasses: Object.values(classes).filter((c) => c.band === 'CRITICAL_CHOKEPOINT').length,
    },
    constants: { ALERT_SHARE, CRITICAL_USAGE_WEIGHT, HHI_BANDS },
  }
}

/** Share → the three-step risk label ownership.js renders. 'high' means the
 *  person crosses the chokepoint share line, 'medium' half of it. */
function shareToRisk(share) {
  if (share > ALERT_SHARE) return 'high'
  if (share > ALERT_SHARE / 2) return 'medium'
  return 'low'
}

/** Per-node humans-class share, for callers (ownership.js) that flag people
 *  individually. Prefer computing concentration once via computeAllFromRoots
 *  and reading shareToRisk(class.nodes) — this helper builds an engine. */
function humanConcentrationRisk(roots, context, employeeId) {
  const engine = context || riskEngine.buildEngine(roots)
  const cls = humansClass(roots, engine)
  const total = cls.nodes.reduce((sum, n) => sum + n.e, 0)
  const node = cls.nodes.find((n) => n.id === employeeId)
  if (!node || total === 0) return 'low'
  return shareToRisk(node.e / total)
}

module.exports = {
  concentration,
  humanConcentrationRisk,
  shareToRisk,
  hhiOf,
  giniOf,
  entropyOf,
  hhiBandFor,
  ALERT_SHARE,
  HHI_BANDS,
  CRITICAL_USAGE_WEIGHT,
}
