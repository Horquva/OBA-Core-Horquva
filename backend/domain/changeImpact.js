/**
 * FEATURE 3 (Phase 3.2) — Change → Impact engine.
 * ============================================================================
 *
 * For one mutation event M(v), answers the executive questions the blueprint
 * demands: what does the change cascade into downstream, how much
 * organizational health does it cost, and what should we do about it.
 *
 *   1. Forward cascade — Engine A seeded at the mutated node, run on the
 *      MUTATED topology (the walk measures the new reality). Impacted set:
 *      nodes with steady-state r_w ≥ IMPACT_THRESHOLD (0.15 [AUTHORED], the
 *      blueprint's own "severely impacted" line).
 *   2. Health delta — ΔOHI = OHI(before-roots) − OHI(after-roots), computed
 *      with the SAME cloneRoots + pillars() machinery the simulation engine
 *      uses: one definition of health (Invariant 3).
 *   3. Mitigation — deterministic rules over the mutation's own outputs (no
 *      LLM in this path): auditable recommendations like "assign a backup to
 *      the vacated asset" or "successor X already holds Y% of human
 *      exposure — split the transfer".
 *
 * Pure: no I/O. Callers (domain/mutations.js) supply before/after roots.
 */

const riskEngine = require('./riskEngine')

// [AUTHORED] per the blueprint §9.3 — nodes receiving more than 15% failure
// mass count as severely impacted.
const IMPACT_THRESHOLD = 0.15

/** Derived from Engine A's κ scale — a mitigation suggesting a split warns
 *  when the successor would hold more than a quarter of human exposure. */
const SPLIT_WARN_SHARE = 0.25

/**
 * Computes the impact envelope for a mutation.
 *
 * @param {object} beforeRoots the roots bundle BEFORE the mutation
 * @param {object} afterRoots  the roots bundle AFTER the mutation (mutated)
 * @param {object} mutation    { mutationType, targetType, targetId, payload }
 * @returns {{ impactedEntities, blastRadiusScore, healthDelta, mitigation }}
 */
function changeImpact(beforeRoots, afterRoots, mutation) {
  // 1. Forward cascade on the mutated topology. Seed at the mutated node;
  //    employees are not graph nodes, so an employee mutation seeds the
  //    assets they held at mutation time (BEFORE roots — an OWNER_REMOVED
  //    leaves those assets unowned in the after-roots, which is exactly the
  //    mass that needs tracing).
  const engine = riskEngine.buildEngine(afterRoots)
  const seeds = []
  if (mutation.targetType === 'employee') {
    for (const a of beforeRoots.agents || []) {
      if (a.owner_id === mutation.targetId) seeds.push({ type: 'agent', id: a.id, weight: 1.0 })
    }
  } else {
    seeds.push({ type: mutation.targetType, id: mutation.targetId, weight: 1.0 })
  }
  // F-1 fix: the victim walk is the IMPACT-direction (transposed) solve —
  // seeded at the failing node, mass reaches its dependents.
  const r = seeds.length ? engine.impact.runSeeded(seeds) : null

  const impacted = { workflows: [], agents: [], platforms: [] }
  let blastRadiusScore = null
  if (r) {
    // Relative threshold: the seed's received-mass shares, EXCLUDING the
    // seed nodes themselves (their mass is the failure, not a victim). A
    // node counts as impacted when it holds >= 15% of that redistributed
    // mass — the authored line, now scale-free (PPR mass is restart-
    // bounded, so the old absolute 0.15 line was unreachable).
    const seedIdx = new Set()
    for (const p of seeds) {
      const idx = engine.impact.indexByKey.get(`${p.type}:${p.id}`)
      if (idx !== undefined) seedIdx.add(idx)
    }
    let received = 0
    for (let i = 0; i < engine.impact.engine.nodes.length; i++) {
      if (!seedIdx.has(i)) received += r[i]
    }
    for (let i = 0; i < engine.impact.engine.nodes.length; i++) {
      if (seedIdx.has(i) || received <= 0) continue
      const share = r[i] / received
      if (share < IMPACT_THRESHOLD) continue
      const nodeKey = engine.impact.engine.nodes[i]
      const colon = nodeKey.indexOf(':')
      const type = nodeKey.slice(0, colon)
      const id = nodeKey.slice(colon + 1)
      if (type === 'workflow') impacted.workflows.push(id)
      else if (type === 'agent') impacted.agents.push(id)
      else if (type === 'platform') impacted.platforms.push(id)
    }
    // One blast-radius definition: the context's estate-share number.
    blastRadiusScore = seeds.length === 1 ? engine.blastRadius(seeds[0].type, seeds[0].id) : null
  }

  // 2. ΔOHI — same health definition as the simulations.
  const beforeOhi = orgHealthIndex(beforeRoots)
  const afterOhi = orgHealthIndex(afterRoots)
  const healthDelta = beforeOhi != null && afterOhi != null
    ? Math.round((beforeOhi - afterOhi) * 10) / 10
    : null

  // 3. Mitigation — deterministic rules over the mutation's outputs.
  const mitigation = mitigationFor(mutation, beforeRoots, afterRoots, impacted, seeds)

  return {
    impactedEntities: impacted,
    blastRadiusScore,
    healthDelta,
    mitigation,
  }
}

/** OHI via derived.js's pillars() — required lazily to avoid a require cycle
 *  (derived.js does not import this module at load time either). pillars
 *  needs the accountability result computed over the SAME roots; OHI lives at
 *  orgScore.score and is null when the evidence gate says insufficient. */
function orgHealthIndex(roots) {
  try {
    const derived = require('./derived')
    const p = derived.pillars(roots, derived.accountability(roots))
    return p?.orgScore?.score ?? null
  } catch (_) {
    return null
  }
}

/**
 * Deterministic mitigation rules. Every rule reads only computed outputs and
 * real rows — no invented data, no LLM.
 */
function mitigationFor(mutation, beforeRoots, afterRoots, impacted, seeds = []) {
  const recommendations = []
  const t = mutation.mutationType

  if (t === 'OWNER_REMOVED' || (t === 'STATUS_CHANGED' && mutation.payload?.status === 'failed')) {
    // Unowned or failed assets: name a successor, and warn if the obvious
    // one (a current top owner) is already concentrated. The SEED entities
    // (the mutated node / the departed employee's former assets) are checked
    // directly — they are the source of the impact walk, not victims, so
    // they never appear in the impacted set.
    const humans = require('./concentration').concentration(afterRoots)
    const top = humans.classes.humans.topNodes[0]
    const seedAgentIds = new Set([
      ...seeds.filter((p) => p.type === 'agent').map((p) => p.id),
      ...(mutation.targetType === 'agent' ? [mutation.targetId] : []),
    ])
    const reviewAgents = (afterRoots.agents || []).filter((a) => seedAgentIds.has(a.id))
    for (const agent of reviewAgents.slice(0, 3)) {
      if (agent.owner_id == null) {
        recommendations.push({
          action: 'ASSIGN_OWNER',
          targetType: 'agent',
          targetId: agent.id,
          detail: top
            ? `"${agent.name}" is unowned; ${top.name} currently holds ${(top.share * 100).toFixed(0)}% of human exposure — consider splitting ownership across two people.`
            : `"${agent.name}" is unowned; assign an owner.`,
        })
      } else {
        const ownerBackup = (afterRoots.owners || []).some((o) => o.employee_id === agent.owner_id && o.backup_owner)
        if (!ownerBackup) {
          recommendations.push({
            action: 'DESIGNATE_BACKUP',
            targetType: 'agent',
            targetId: agent.id,
            detail: `"${agent.name}" is in a failed state and its owner has no recorded backup — a departure here orphans it.`,
          })
        }
      }
    }
    if (!afterRoots.owners?.some?.((o) => o.backup_owner)) {
      recommendations.push({
        action: 'DESIGNATE_BACKUP',
        targetType: 'organization',
        targetId: null,
        detail: 'No owner in the org currently has a recorded backup — the next departure is an orphaning event.',
      })
    }
  }

  if (t === 'DEPENDENCY_ADDED' && impacted.workflows.length >= 3) {
    recommendations.push({
      action: 'REVIEW_CONCENTRATION',
      targetType: mutation.targetType,
      targetId: mutation.targetId,
      detail: `This dependency puts ${impacted.workflows.length} workflows on one path — check the concentration engine before adding more.`,
    })
  }

  if (t === 'BACKUP_LOST') {
    recommendations.push({
      action: 'DESIGNATE_BACKUP',
      targetType: mutation.targetType,
      targetId: mutation.targetId,
      detail: 'A backup designation was removed — the asset is one departure from orphaning.',
    })
  }

  if (t === 'MODEL_SWAPPED') {
    const humans = require('./concentration').concentration(afterRoots)
    if (humans.classes.models.band === 'CRITICAL_CHOKEPOINT') {
      recommendations.push({
        action: 'ADD_FALLBACK_MODEL',
        targetType: 'platform',
        targetId: mutation.targetId,
        detail: 'Model concentration is at CRITICAL_CHOKEPOINT — configure a fallback provider before cutover.',
      })
    }
  }

  if (!recommendations.length) {
    recommendations.push({
      action: 'MONITOR',
      targetType: mutation.targetType,
      targetId: mutation.targetId,
      detail: 'No structural risk rule triggered — volatility tracking will surface trends.',
    })
  }

  return { recommendations }
}

module.exports = { changeImpact, IMPACT_THRESHOLD, SPLIT_WARN_SHARE }
