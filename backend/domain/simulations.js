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

  const mutated = cloneRoots(roots)
  mutated.agents = mutated.agents.filter((a) => a.id !== agentId)
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

  const mutated = cloneRoots(roots)
  mutated.ai_platforms = mutated.ai_platforms.filter((p) => p.id !== platformId)
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

  const mutated = cloneRoots(roots)
  mutated.workflows = mutated.workflows.filter((w) => w.id !== workflowId)
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
  employeeLeaves,
  agentFails,
  platformDown,
  workflowDisruption,
  rankAllScenarios,
}
