/**
 * FEATURE 1 (Phase 2.1) — Replaceability Intelligence.
 * ============================================================================
 *
 * For every organizational asset (agents, workflows, platforms), answers the
 * executive question "if this disappears, can it be replaced?" with a single
 * K_i index and the evidence behind every component:
 *
 *     K_i = 0.40·S_doc + 0.30·S_alt + 0.30·S_bench      (Blueprint §9.1)
 *
 * Components, each normalized 0-100:
 *
 *   S_doc — documentation completeness. Agents: share of documented
 *     knowledge_assets rows (no rows = 0, the P17 conjunction rule).
 *     Workflows: runbook documented = 100, runbook exists but undocumented
 *     = 50, no runbook = 0. Platforms: documented platform knowledge rows.
 *
 *   S_alt — drop-in alternative availability. Platforms: a hot backup row in
 *     tool_backups (100) or none (0) — binary, it is the only real signal.
 *     Agents: reads the platform they run on (agent_platform) — a backed
 *     platform implies a swappable serving layer (60), an unbacked one is a
 *     proprietary dependency (20), no platform (0). Workflows: automation
 *     posture from workflow_steps.actor_type — all steps machine-acted (100),
 *     mixed (60), all human (20), no steps recorded (0).
 *
 *   S_bench — bench depth behind the current owner, following the blueprint's
 *     formula min(100, 50·N_backupOwners + 25·N_crossTrainedPeers), where the
 *     backup signal is the owner's own owners.backup_owner row and
 *     cross-trained peers are OTHER employees currently owning at least one
 *     asset of the same type (same-type ownership as the skill-overlap proxy).
 *     An asset with NO owner reads bench 0 — the peer proxy only means
 *     something when there is an accountable owner to hand over from.
 *     The minimal-knowledge-holder framing follows the bus-factor literature
 *     (arXiv:2202.01523, arXiv:2403.08038, arXiv:2508.09828 — BF is NP-hard
 *     under the standard formalization; same-type ownership overlap is our
 *     tractable heuristic for "someone else could hold this").
 *
 * Banding (authored): EASY ≥ 70, MODERATE ≥ 45, DIFFICULT ≥ 20, else
 * IRREPLACEABLE. The 2×2 quadrant (Feature 1's output) crosses K_i with
 * Engine A's blast radius: high criticality = blastRadius ≥ 60, high
 * replaceability = K_i ≥ 50 → VULNERABLE_CORE / REPLACEABLE_CRITICALITY /
 * NICHE_DEPENDENCY / COMMODITY_UTILITY.
 *
 * Pure module: no I/O. `context` is the shared riskEngine.buildEngine(roots)
 * context (blast radius + κ) — callers holding one pass it in.
 */

// [AUTHORED] weights per the blueprint; thresholds per this module's header.
const WEIGHTS = { doc: 0.4, alt: 0.3, bench: 0.3 }
const BANDS = { EASY: 70, MODERATE: 45, DIFFICULT: 20 }
const ALT_SCORES = { backed: 100, agentOnBackedPlatform: 60, workflowMixed: 60, agentOnUnbackedPlatform: 20, workflowHuman: 20, none: 0 }
const QUADRANT = { HIGH_CRITICALITY: 60, HIGH_REPLACEABILITY: 50 }

function bandFor(K) {
  if (K >= BANDS.EASY) return 'EASY'
  if (K >= BANDS.MODERATE) return 'MODERATE'
  if (K >= BANDS.DIFFICULT) return 'DIFFICULT'
  return 'IRREPLACEABLE'
}

function quadrantFor(blastRadius, K) {
  const highCrit = blastRadius >= QUADRANT.HIGH_CRITICALITY
  const highRepl = K >= QUADRANT.HIGH_REPLACEABILITY
  if (highCrit && !highRepl) return 'VULNERABLE_CORE'
  if (highCrit && highRepl) return 'REPLACEABLE_CRITICALITY'
  if (!highCrit && !highRepl) return 'NICHE_DEPENDENCY'
  return 'COMMODITY_UTILITY'
}

// ── Component scorers ────────────────────────────────────────────────────────

function docScoreAgent(knowledge_assets, agentId) {
  let total = 0
  let documented = 0
  for (const ka of knowledge_assets) {
    if (ka.asset_type !== 'agent' || ka.asset_id !== agentId) continue
    total++
    if (ka.is_documented) documented++
  }
  const share = total === 0 ? 0 : documented / total
  return { score: Math.round(100 * share), total, documented }
}

function docScorePlatform(knowledge_assets, platformId) {
  let total = 0
  let documented = 0
  for (const ka of knowledge_assets) {
    if (ka.asset_type !== 'platform' || ka.asset_id !== platformId) continue
    total++
    if (ka.is_documented) documented++
  }
  const share = total === 0 ? 0 : documented / total
  return { score: Math.round(100 * share), total, documented }
}

function docScoreWorkflow(runbook) {
  if (!runbook) return { score: 0, runbook: false, documented: false }
  return runbook.is_documented
    ? { score: 100, runbook: true, documented: true }
    : { score: 50, runbook: true, documented: false }
}

function altScorePlatform(tool_backups, platformId) {
  const backed = tool_backups.some((b) => b.primary_platform === platformId && b.backup_platform != null)
  return { score: backed ? ALT_SCORES.backed : ALT_SCORES.none, hotBackup: backed }
}

function altScoreAgent(agentPlatformIds, backedPlatformIdSet) {
  if (agentPlatformIds.length === 0) return { score: ALT_SCORES.none, via: 'no-platform' }
  const anyBacked = agentPlatformIds.some((id) => backedPlatformIdSet.has(id))
  return anyBacked
    ? { score: ALT_SCORES.agentOnBackedPlatform, via: 'backed-platform' }
    : { score: ALT_SCORES.agentOnUnbackedPlatform, via: 'unbacked-platform' }
}

function altScoreWorkflow(steps) {
  if (!steps || steps.length === 0) return { score: ALT_SCORES.none, via: 'no-steps' }
  const humanSteps = steps.filter((s) => s.actor_type === 'human' || s.actor_type === 'person' || s.actor_type === 'employee').length
  if (humanSteps === 0) return { score: 100, via: 'fully-automated' }
  if (humanSteps === steps.length) return { score: ALT_SCORES.workflowHuman, via: 'fully-manual' }
  return { score: ALT_SCORES.workflowMixed, via: 'mixed-automation' }
}

function benchScore(hasBackupOwner, crossTrainedPeers) {
  return Math.min(100, 50 * (hasBackupOwner ? 1 : 0) + 25 * Math.max(0, crossTrainedPeers))
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Scores every agent, workflow and platform in the roots bundle.
 * `context` — optional shared riskEngine.buildEngine(roots) context; built
 * here when absent. Returns { entities, quadrants, constants } where entities
 * is worst-first by K_i (hardest to replace first).
 */
function replaceability(roots, context) {
  const engine = context || require('./riskEngine').buildEngine(roots)

  const knowledgeAssets = roots.knowledge_assets || []
  const toolBackups = roots.tool_backups || []
  const backedPlatformIdSet = new Set(
    toolBackups.filter((b) => b.backup_platform != null).map((b) => b.primary_platform),
  )
  const runbookByWorkflow = new Map((roots.workflow_runbooks || []).map((r) => [r.workflow_id, r]))
  const platformsById = new Map((roots.ai_platforms || []).map((p) => [p.id, p]))
  const stepsByWorkflow = new Map()
  for (const s of roots.workflow_steps || []) {
    if (!stepsByWorkflow.has(s.workflow_id)) stepsByWorkflow.set(s.workflow_id, [])
    stepsByWorkflow.get(s.workflow_id).push(s)
  }
  const agentPlatforms = new Map()
  for (const ap of roots.agent_platform || []) {
    if (!agentPlatforms.has(ap.agent_id)) agentPlatforms.set(ap.agent_id, [])
    agentPlatforms.get(ap.agent_id).push(ap.platform_id)
  }

  // Bench: per-type sets of employees who currently own at least one asset
  // of that type (cross-training proxy, see header).
  const backupByEmployee = new Map((roots.owners || []).map((o) => [o.employee_id, Boolean(o.backup_owner)]))
  const agentOwners = new Set((roots.agents || []).map((a) => a.owner_id).filter((id) => id != null))
  const runbookOwners = new Set((roots.workflow_runbooks || []).map((r) => r.owner_id).filter((id) => id != null))
  const toolHolders = new Set((roots.tool_ownership || []).map((t) => t.employee_id).filter((id) => id != null))

  const entities = []

  for (const agent of roots.agents || []) {
    const owner = agent.owner_id
    const ownerHasBackup = owner != null ? Boolean(backupByEmployee.get(owner)) : false
    // peers of the same type, excluding the owner themself
    const crossTrained = owner != null ? agentOwners.size - (agentOwners.has(owner) ? 1 : 0) : 0
    const doc = docScoreAgent(knowledgeAssets, agent.id)
    const alt = altScoreAgent(agentPlatforms.get(agent.id) || [], backedPlatformIdSet)
    // No owner → no bench: the peers proxy only means something when there is
    // an accountable owner to hand over FROM. Without one, bench is 0, not
    // 25x every other owner in the org.
    const bench = owner == null ? 0 : benchScore(ownerHasBackup, crossTrained)
    const K = Math.round(WEIGHTS.doc * doc.score + WEIGHTS.alt * alt.score + WEIGHTS.bench * bench)
    const blastRadius = engine.blastRadius('agent', agent.id)
    entities.push({
      entityType: 'agent',
      entityId: agent.id,
      name: agent.name,
      ownerName: owner != null ? ((roots.employees || []).find((e) => e.id === owner) || {}).name ?? null : null,
      replaceability: K,
      band: bandFor(K),
      criticality: Math.round(blastRadius),
      quadrant: quadrantFor(blastRadius, K),
      components: {
        doc: { score: doc.score, knowledgeRows: doc.total, documented: doc.documented },
        alt: alt,
        bench: { score: bench, ownerHasBackup: ownerHasBackup, crossTrainedPeers: crossTrained },
      },
      weights: WEIGHTS,
    })
  }

  for (const workflow of roots.workflows || []) {
    const runbook = runbookByWorkflow.get(workflow.id)
    const owner = runbook ? runbook.owner_id : null
    const ownerHasBackup = owner != null ? Boolean(backupByEmployee.get(owner)) : false
    const crossTrained = owner != null ? runbookOwners.size - (runbookOwners.has(owner) ? 1 : 0) : 0
    const doc = docScoreWorkflow(runbook)
    const alt = altScoreWorkflow(stepsByWorkflow.get(workflow.id))
    const bench = owner == null ? 0 : benchScore(ownerHasBackup, crossTrained)
    const K = Math.round(WEIGHTS.doc * doc.score + WEIGHTS.alt * alt.score + WEIGHTS.bench * bench)
    const blastRadius = engine.blastRadius('workflow', workflow.id)
    entities.push({
      entityType: 'workflow',
      entityId: workflow.id,
      name: workflow.name,
      ownerName: owner != null ? ((roots.employees || []).find((e) => e.id === owner) || {}).name ?? null : null,
      replaceability: K,
      band: bandFor(K),
      criticality: Math.round(blastRadius),
      quadrant: quadrantFor(blastRadius, K),
      components: {
        doc: doc,
        alt: alt,
        bench: { score: bench, ownerHasBackup: ownerHasBackup, crossTrainedPeers: crossTrained },
      },
      weights: WEIGHTS,
    })
  }

  for (const platform of roots.ai_platforms || []) {
    const holders = (roots.tool_ownership || []).filter((t) => t.platform_id === platform.id).map((t) => t.employee_id)
    const owner = holders[0] ?? null
    const ownerHasBackup = owner != null ? Boolean(backupByEmployee.get(owner)) : false
    const crossTrained = owner != null ? Math.max(0, toolHolders.size - (toolHolders.has(owner) ? 1 : 0)) : 0
    const doc = docScorePlatform(knowledgeAssets, platform.id)
    const alt = altScorePlatform(toolBackups, platform.id)
    const bench = owner == null ? 0 : benchScore(ownerHasBackup, crossTrained)
    const K = Math.round(WEIGHTS.doc * doc.score + WEIGHTS.alt * alt.score + WEIGHTS.bench * bench)
    const blastRadius = engine.blastRadius('platform', platform.id)
    entities.push({
      entityType: 'platform',
      entityId: platform.id,
      name: platform.name,
      ownerName: owner != null ? ((roots.employees || []).find((e) => e.id === owner) || {}).name ?? null : null,
      replaceability: K,
      band: bandFor(K),
      criticality: Math.round(blastRadius),
      quadrant: quadrantFor(blastRadius, K),
      components: {
        doc: doc,
        alt: alt,
        bench: { score: bench, ownerHasBackup: ownerHasBackup, crossTrainedPeers: crossTrained },
      },
      weights: WEIGHTS,
    })
  }

  entities.sort((a, b) => a.replaceability - b.replaceability || b.criticality - a.criticality)

  const quadrants = { VULNERABLE_CORE: [], REPLACEABLE_CRITICALITY: [], NICHE_DEPENDENCY: [], COMMODITY_UTILITY: [] }
  for (const e of entities) quadrants[e.quadrant].push({ entityType: e.entityType, entityId: e.entityId, name: e.name })

  return {
    entities,
    quadrants,
    population: {
      total: entities.length,
      vulnerableCore: quadrants.VULNERABLE_CORE.length,
      irreplaceable: entities.filter((e) => e.band === 'IRREPLACEABLE').length,
      easy: entities.filter((e) => e.band === 'EASY').length,
    },
    constants: { WEIGHTS, BANDS, ALT_SCORES, QUADRANT },
  }
}

module.exports = { replaceability, bandFor, quadrantFor, benchScore, WEIGHTS, BANDS, ALT_SCORES, QUADRANT }
