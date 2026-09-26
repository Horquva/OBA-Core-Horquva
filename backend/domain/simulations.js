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
const { entityCriticality, atOrAbove, spofVerdict } = require('./definitions')

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

/**
 * Public name for healthScore() — the current, unmutated org health score.
 * Routes use this alongside healthDelta to show a before/after pair without
 * a second health formula: simulatedHealthScore = baselineHealthScore - healthDelta.
 */
function baselineHealthScore(roots) {
  return healthScore(roots)
}

/** Positive = health drops after the mutation. Null if either side lacks evidence. */
function healthDelta(baselineRoots, mutatedRoots) {
  const before = healthScore(baselineRoots)
  const after = healthScore(mutatedRoots)
  if (before == null || after == null) return null
  return before - after
}

/**
 * Bands a health index into the same STABLE/WARNING/CRITICAL thresholds
 * orgHealth() itself uses (>=70 / >=45 / below), lowercased to match this
 * module's existing scenario vocabulary. Every simulation route used to
 * hardcode `healthBefore: 'stable'` regardless of the org's real state, and
 * derived `healthAfter` from cascade blast-radius severity -- a different
 * axis entirely, not a health status. Both now go through this one function
 * so before/after describe the same real health score the rest of the app
 * shows, not two unrelated fabrications.
 */
function healthStatusFor(healthIndex) {
  if (healthIndex == null) return null
  return healthIndex >= 70 ? 'stable' : healthIndex >= 45 ? 'warning' : 'critical'
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

function impactedEntitiesFor(agentIds, workflows) {
  return [
    ...[...agentIds].map((id) => ({ type: 'agent', id })),
    ...workflows.map((w) => ({ type: 'workflow', id: w.id })),
  ]
}

function resolveCriticality(entities, roots) {
  const agentsById = new Map(roots.agents.map((a) => [a.id, a]))
  const workflowsById = new Map(roots.workflows.map((w) => [w.id, w]))
  return entities.map((e) => ({
    ...e,
    criticality: e.type === 'agent'
      ? entityCriticality('agent', agentsById.get(e.id))
      : entityCriticality('workflow', workflowsById.get(e.id)),
  }))
}

function employeeLeaves(employeeId, roots) {
  const employee = roots.employees.find((e) => e.id === employeeId)
  if (!employee) return null

  const ownedAgents = roots.agents.filter((a) => a.owner_id === employeeId)
  const index = buildDependencyIndex(roots)

  const impactedAgentIds = new Set(ownedAgents.map((a) => a.id))
  for (const agent of ownedAgents) {
    for (const hit of cascadeFrom('agent', agent.id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  mutated.employees = mutated.employees.filter((e) => e.id !== employeeId)
  mutated.agents = mutated.agents.map((a) => (a.owner_id === employeeId ? { ...a, owner_id: null } : a))
  // Anyone who named the departing employee as a backup loses that coverage
  // -- owners.backup_owner is a name string (see backupIndex()'s own
  // comment), not an employee_id, so this is a name match. The employee's
  // OWN owners row is kept, not deleted: same reasoning as agentFails()
  // (owner decision, 2026-09-18) -- deleting it used to shrink both the
  // numerator and denominator of continuityScore's pct(ownersWithBackup,
  // owners.length) at once (the row disappearing removed it from
  // owners.length, and if it had no backup_owner it also wasn't in the
  // ownersWithBackup count), which could make an unbacked owner leaving
  // score as an IMPROVEMENT. The role stays in the population -- whatever
  // backup coverage it already had (or didn't) still counts -- until
  // something reassigns it; only the person disappears (mutated.employees
  // above), not the ownership slot itself.
  mutated.owners = mutated.owners
    .map((o) => (o.backup_owner === employee.name ? { ...o, backup_owner: null } : o))
  recount(mutated)

  return {
    scenario: `If ${employee.name} leaves`,
    targetType: 'employee',
    targetId: employeeId,
    targetName: employee.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [employee],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}

/**
 * Succession: employeeId leaves, successorId inherits their agents and
 * workflow ownership. Unlike employeeLeaves(), nothing is orphaned — but
 * per D-70, coverage does NOT ride along with the transfer:
 *
 *   - agents.owner_id and workflow_runbooks.owner_id move to successorId.
 *   - documentation (knowledge_assets.is_documented / workflow_runbooks.
 *     is_documented) is untouched either way — it was never owner-linked.
 *   - the departing employee's own `owners` row (and therefore their
 *     backup_owner) is removed, same as employeeLeaves().
 *   - any OTHER owners row whose backup_owner named the departing employee
 *     is cleared — a backup pointing at someone who just left is not real
 *     coverage and must not be carried forward silently.
 *   - the successor's own backup_owner is left exactly as it was. It is
 *     NOT inherited from the departing employee — the successor's coverage
 *     is whatever they already had, nothing more.
 *
 * TODO(D-70): the rules above are written per the plan's stated intent but
 * are pending explicit sign-off. Confirm before this ships.
 */
function employeeLeavesWithSuccessor(employeeId, successorId, roots) {
  const employee = roots.employees.find((e) => e.id === employeeId)
  const successor = roots.employees.find((e) => e.id === successorId)
  if (!employee || !successor) return null

  const ownedAgents = roots.agents.filter((a) => a.owner_id === employeeId)
  const ownedRunbooks = roots.workflow_runbooks.filter((r) => r.owner_id === employeeId)
  const index = buildDependencyIndex(roots)

  const impactedAgentIds = new Set(ownedAgents.map((a) => a.id))
  for (const agent of ownedAgents) {
    for (const hit of cascadeFrom('agent', agent.id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  // ── Mutation: reassign, don't orphan ────────────────────────────────────
  const mutated = cloneRoots(roots)

  mutated.agents = mutated.agents.map((a) =>
    a.owner_id === employeeId ? { ...a, owner_id: successorId } : a)

  mutated.workflow_runbooks = mutated.workflow_runbooks.map((r) =>
    r.owner_id === employeeId ? { ...r, owner_id: successorId } : r)

  mutated.employees = mutated.employees.filter((e) => e.id !== employeeId)

  mutated.owners = mutated.owners
    .filter((o) => o.employee_id !== employeeId) // their own backup slot leaves with them
    .map((o) => (o.backup_owner === employee.name ? { ...o, backup_owner: null } : o)) // stale backups pointing at them are cleared

  recount(mutated)

  // ── Residual risk on the successor, post-transfer ───────────────────────
  const successorAgentsAfter = mutated.agents.filter((a) => a.owner_id === successorId)
  const successorRunbooksAfter = mutated.workflow_runbooks.filter((r) => r.owner_id === successorId)
  const successorConcentrationAfter = successorAgentsAfter.length + successorRunbooksAfter.length

  // Local, not derived.backupIndex() — that helper isn't part of derived.js's
  // exported surface, so this mirrors its one-line lookup rather than
  // reaching into another module's internals.
  const successorOwnerRow = mutated.owners.find((o) => o.employee_id === successorId)
  const successorHasBackup = Boolean(successorOwnerRow?.backup_owner)

  const assetsWithoutBackup = successorHasBackup ? 0 : successorConcentrationAfter

  const transferredAgentIds = new Set(ownedAgents.map((a) => a.id))
  const transferredWorkflowIds = new Set(ownedRunbooks.map((r) => r.workflow_id))
  const undocumentedTransferredAgents = roots.knowledge_assets.filter(
    (ka) => ka.asset_type === 'agent' && transferredAgentIds.has(ka.asset_id) && !ka.is_documented,
  ).length
  const undocumentedTransferredWorkflows = ownedRunbooks.filter((r) => !r.is_documented).length
  const assetsUndocumented = undocumentedTransferredAgents + undocumentedTransferredWorkflows

  const successorBecomesSpof = [...successorAgentsAfter].some((a) => {
    const criticality = entityCriticality('agent', a)
    return spofVerdict({ criticality, ownerCount: 1, hasBackup: successorHasBackup }).status === 'spof'
  }) || [...successorRunbooksAfter].some((r) => {
    const workflow = roots.workflows.find((w) => w.id === r.workflow_id)
    const criticality = workflow ? entityCriticality('workflow', workflow) : 'unknown'
    return spofVerdict({ criticality, ownerCount: 1, hasBackup: successorHasBackup }).status === 'spof'
  })

  const noSuccessor = employeeLeaves(employeeId, roots)

  return {
    scenario: `If ${employee.name} leaves and ${successor.name} takes over`,
    targetType: 'employee',
    targetId: employeeId,
    targetName: employee.name,
    successorId,
    successorName: successor.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [employee],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
    residualRisk: {
      assetsWithoutBackup,
      assetsUndocumented,
      successorConcentrationAfter,
      successorBecomesSpof,
    },
    comparedToNoSuccessor: {
      healthDelta: noSuccessor ? noSuccessor.healthDelta : null,
      severity: noSuccessor ? noSuccessor.severity : null,
    },
  }
}

function agentFails(agentId, roots) {
  const agent = roots.agents.find((a) => a.id === agentId)
  if (!agent) return null

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set()
  for (const hit of cascadeFrom('agent', agentId, index)) {
    if (hit.type === 'agent') impactedAgentIds.add(hit.id)
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(new Set([agentId, ...impactedAgentIds]), roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  // A failed agent is still counted in the org -- it doesn't cease to exist --
  // so ownershipSpreadScore's per-owner counts and criticalSafetyScore's
  // agents.length denominator don't shrink. Removing it from the array used
  // to make both drop out of the population at once (numerator AND
  // denominator), which could make a CRITICAL agent failing look like an
  // IMPROVEMENT (0 critical / fewer agents can score better than 1 critical /
  // more agents). Marking it `status: 'failed'` instead feeds
  // predictiveRisk()'s existing STATUS_FAILED factor (see its header
  // comment: "an already-failing agent is not a risk, it is an incident, and
  // should outrank anything merely fragile") -- the population stays the
  // same size, and the failure itself is what raises the threat level, not a
  // shrinking denominator. Owner decision, 2026-09-18.
  const mutated = cloneRoots(roots)
  mutated.agents = mutated.agents.map((a) => (a.id === agentId ? { ...a, status: 'failed' } : a))
  recount(mutated)

  return {
    scenario: `If ${agent.name} fails`,
    targetType: 'agent',
    targetId: agentId,
    targetName: agent.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}

function platformDown(platformId, roots) {
  const platform = roots.ai_platforms.find((p) => p.id === platformId)
  if (!platform) return null

  const directAgentIds = new Set(
    roots.agent_platform.filter((ap) => ap.platform_id === platformId).map((ap) => ap.agent_id),
  )

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set(directAgentIds)
  for (const id of directAgentIds) {
    for (const hit of cascadeFrom('agent', id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const impactedWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  // A platform going down is still a platform the org has to account for --
  // it doesn't cease to exist -- so ai_platforms.length (continuityScore's
  // pct(platformsWithBackup, ai_platforms.length) denominator) doesn't
  // shrink. platformsWithBackup comes from tool_backups, an entirely
  // separate table this mutation never touches, so removing the platform
  // from the array only ever shrank the denominator, never the numerator --
  // taking an UNBACKED platform down always inflated continuityScore, the
  // same shrinking-population failure mode agentFails() was fixed for.
  // Marking it down instead keeps the population the same size; only an
  // actual backup relationship should move this ratio. Owner decision,
  // 2026-09-18.
  const mutated = cloneRoots(roots)
  mutated.ai_platforms = mutated.ai_platforms.map((p) => (p.id === platformId ? { ...p, status: 'down' } : p))
  recount(mutated)

  return {
    scenario: `If ${platform.name} goes down`,
    targetType: 'platform',
    targetId: platformId,
    targetName: platform.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}

function workflowDisruption(workflowId, roots) {
  const workflow = roots.workflows.find((w) => w.id === workflowId)
  if (!workflow) return null

  const directAgentIds = new Set(
    roots.workflow_dependencies.filter((wd) => wd.workflow_id === workflowId).map((wd) => wd.agent_id),
  )

  const index = buildDependencyIndex(roots)
  const impactedAgentIds = new Set(directAgentIds)
  for (const id of directAgentIds) {
    for (const hit of cascadeFrom('agent', id, index)) {
      if (hit.type === 'agent') impactedAgentIds.add(hit.id)
    }
  }

  const impactedAgents = roots.agents.filter((a) => impactedAgentIds.has(a.id))
  const siblingWorkflows = workflowsUsingAgents(impactedAgentIds, roots)
  const impactedWorkflows = [
    workflow,
    ...siblingWorkflows.filter((w) => w.id !== workflowId),
  ]
  const entities = resolveCriticality(impactedEntitiesFor(impactedAgentIds, impactedWorkflows), roots)

  // A disrupted workflow is still a workflow the org has to account for --
  // it doesn't cease to exist -- so workflows.length (continuityScore's
  // pct(documentedRunbooks, workflows.length) denominator, and
  // incidentLoadScore's failuresPerWorkflow denominator) doesn't shrink.
  // documentedRunbooks comes from workflow_runbooks and failuresPerWorkflow's
  // numerator from workflow_failures -- both entirely separate tables this
  // mutation never touches, so removing the workflow from the array only
  // ever shrank the denominator, never the numerator -- disrupting an
  // UNDOCUMENTED workflow always inflated continuityScore, the same
  // shrinking-population failure mode agentFails() was fixed for. Marking it
  // disrupted instead keeps the population the same size; only an actual
  // runbook/failure record should move these ratios. Owner decision,
  // 2026-09-18.
  const mutated = cloneRoots(roots)
  mutated.workflows = mutated.workflows.map((w) => (w.id === workflowId ? { ...w, status: 'disrupted' } : w))
  recount(mutated)

  return {
    scenario: `If ${workflow.name} is disrupted`,
    targetType: 'workflow',
    targetId: workflowId,
    targetName: workflow.name,
    impactedAgents,
    impactedWorkflows,
    impactedPeople: [],
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}

// ─── Compound (multi-node) scenario ─────────────────────────────────────────

const SINGLE_SCENARIO_BY_TYPE = {
  employee: employeeLeaves,
  agent: agentFails,
  platform: platformDown,
  workflow: workflowDisruption,
}

/** Applies ONE removal to an already-cloned roots bundle — the same mutation each single-node scenario makes. */
function applyRemoval(mutated, type, id) {
  if (type === 'employee') {
    mutated.employees = mutated.employees.filter((e) => e.id !== id)
    mutated.agents = mutated.agents.map((a) => (a.owner_id === id ? { ...a, owner_id: null } : a))
  } else if (type === 'agent') {
    mutated.agents = mutated.agents.filter((a) => a.id !== id)
  } else if (type === 'platform') {
    mutated.ai_platforms = mutated.ai_platforms.filter((p) => p.id !== id)
  } else if (type === 'workflow') {
    mutated.workflows = mutated.workflows.filter((w) => w.id !== id)
  }
}

/**
 * Several nodes removed at the same time, e.g. "Ahmed leaves AND this agent
 * fails". `removals` is an array of { type, id } where type is one of
 * 'employee' | 'agent' | 'platform' | 'workflow'.
 *
 * Reach is the union of each removal's own cascade — forward reachability from
 * a set of start nodes is exactly the union of reachability from each one, so
 * this reuses the existing single-node traversal rather than a second one.
 * A node reached by two removals is counted once.
 *
 * Health is NOT the sum of the individual deltas: all removals are applied to
 * one mutated snapshot and orgHealth() is computed once on that, because
 * removing two things together is not the same as removing each in turn.
 *
 * Returns null if `removals` is empty or any target is unknown, matching the
 * single-node functions' not-found convention. Duplicate removals are ignored.
 */
function compoundScenario(removals, roots) {
  if (!Array.isArray(removals) || removals.length === 0) return null

  const seenTargets = new Set()
  const singles = []
  for (const r of removals) {
    const run = r && SINGLE_SCENARIO_BY_TYPE[r.type]
    if (!run) return null
    const key = `${r.type}:${r.id}`
    if (seenTargets.has(key)) continue
    seenTargets.add(key)
    const single = run(r.id, roots)
    if (!single) return null
    singles.push({ removal: { type: r.type, id: r.id }, single })
  }

  const agentIds = new Set()
  const workflowIds = new Set()
  const peopleIds = new Set()
  for (const { single } of singles) {
    for (const a of single.impactedAgents) agentIds.add(a.id)
    for (const w of single.impactedWorkflows) workflowIds.add(w.id)
    for (const p of single.impactedPeople) peopleIds.add(p.id)
  }

  const impactedAgents = roots.agents.filter((a) => agentIds.has(a.id))
  const impactedWorkflows = roots.workflows.filter((w) => workflowIds.has(w.id))
  const impactedPeople = roots.employees.filter((e) => peopleIds.has(e.id))
  const entities = resolveCriticality(impactedEntitiesFor(agentIds, impactedWorkflows), roots)

  const mutated = cloneRoots(roots)
  for (const { removal } of singles) applyRemoval(mutated, removal.type, removal.id)
  recount(mutated)

  return {
    scenario: 'If ' + singles.map(({ single }) => single.scenario.replace(/^If /, '')).join(' and '),
    targetType: 'compound',
    targetId: null,
    targetName: singles.map(({ single }) => single.targetName).join(' + '),
    targets: singles.map(({ removal, single }) => ({
      type: removal.type,
      id: removal.id,
      name: single.targetName,
      severity: single.severity,
      healthDelta: single.healthDelta,
    })),
    impactedAgents,
    impactedWorkflows,
    impactedPeople,
    severity: severityFor(entities),
    healthDelta: healthDelta(roots, mutated),
  }
}

/**
 * Every employee, every high/critical-criticality agent, and every
 * high/critical-criticality tool (ai_platforms row), ranked worst-first by
 * health impact. Criticality is entityCriticality() — never the raw,
 * disputed agents.risk column read directly.
 */
function rankAllScenarios(roots) {
  const results = []

  for (const employee of roots.employees) {
    const r = employeeLeaves(employee.id, roots)
    if (r) results.push(r)
  }

  for (const agent of roots.agents) {
    if (!atOrAbove(entityCriticality('agent', agent), 'high')) continue
    const r = agentFails(agent.id, roots)
    if (r) results.push(r)
  }

  for (const platform of roots.ai_platforms) {
    const criticality = entityCriticality('platform', platform, { knowledgeAssets: roots.knowledge_assets })
    if (!atOrAbove(criticality, 'high')) continue
    const r = platformDown(platform.id, roots)
    if (r) results.push(r)
  }

  results.sort((a, b) => (b.healthDelta ?? -Infinity) - (a.healthDelta ?? -Infinity))
  return results
}

module.exports = {
  buildDependencyIndex,
  cascadeFrom,
  workflowsUsingAgents,
  severityFor,
  cloneRoots,
  recount,
  healthDelta,
  baselineHealthScore,
  healthStatusFor,
  employeeLeaves,
  employeeLeavesWithSuccessor,
  agentFails,
  platformDown,
  workflowDisruption,
  compoundScenario,
  rankAllScenarios,
}
