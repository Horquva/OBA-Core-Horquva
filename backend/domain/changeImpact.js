/**
 * AI-6 — Change → Impact: a before/after diff over the existing engine.
 *
 * When something real changes in the organization — an agent's owner, a
 * person's backup, a tool's backup, an agent's platform, a platform's vendor —
 * this answers "what did that do to risk?" by running the EXISTING risk/SPOF
 * calculation before the change and again after it, and reporting the
 * difference. That diff is the whole mechanism. There is deliberately no rule
 * table saying what a given kind of change "means" (settled decision, handout
 * Section 7): if the engine does not price a field, the delta is honestly 0.
 *
 * This module only READS the engine. It imports derived.js, simulations.js
 * and definitions.js and calls them unmodified — the same shape
 * simulations.employeeLeaves() already uses (clone the roots, mutate the
 * clone, recount, recompute, compare), pointed at a real change instead of a
 * hypothetical one.
 *
 * It never requires ../supabase, so it loads and tests offline. Roots come in
 * from the caller (derived.loadRoots), the same as every other domain module.
 *
 * Public surface:
 *   applyChange(roots, change)      -> a mutated clone; `roots` is untouched
 *   diffChange(roots, change)       -> before / after / delta, named
 *   detectChanges(prev, next)       -> the tracked changes between two snapshots
 *   diffSnapshots(prev, next)       -> detectChanges + diffChange for each one
 */

const derived = require('./derived')
const simulations = require('./simulations')
const { spofVerdict, entityCriticality } = require('./definitions')

// ─── Change types ────────────────────────────────────────────────────────────
//
//   owner_changed        { agentId, toOwnerId }            agents.owner_id
//   backup_removed       { employeeId }                    owners.backup_owner -> null
//   tool_backup_removed  { platformId }                    tool_backups rows dropped
//   model_swapped        { agentId, fromPlatformId, toPlatformId }  agent_platform.platform_id
//   vendor_changed       { platformId, toVendor }          ai_platforms.vendor
//
// `agents` has no model column; agent_platform is the nearest real fact for
// "which AI an agent runs on", so a model swap is modelled as that link moving.

const CHANGE_TYPES = [
  'owner_changed',
  'backup_removed',
  'tool_backup_removed',
  'model_swapped',
  'vendor_changed',
]

function fail(msg) {
  throw new Error(`changeImpact: ${msg}`)
}

/**
 * Apply one change to a clone of `roots`. The input is never mutated.
 * Throws on an unknown change type or a target that does not exist, so a
 * malformed change is loud rather than silently diffing to zero.
 */
function applyChange(roots, change) {
  if (!change || !CHANGE_TYPES.includes(change.type)) {
    fail(`unknown change type "${change && change.type}"`)
  }

  const next = simulations.cloneRoots(roots)

  switch (change.type) {
    case 'owner_changed': {
      const agent = (next.agents || []).find((a) => a.id === change.agentId)
      if (!agent) fail(`owner_changed: no agent with id ${change.agentId}`)
      agent.owner_id = change.toOwnerId == null ? null : change.toOwnerId
      break
    }

    case 'backup_removed': {
      const rows = (next.owners || []).filter((o) => o.employee_id === change.employeeId)
      if (!rows.length) fail(`backup_removed: no owners row for employee ${change.employeeId}`)
      for (const row of rows) row.backup_owner = null
      break
    }

    case 'tool_backup_removed': {
      const before = (next.tool_backups || []).length
      next.tool_backups = (next.tool_backups || []).filter((b) => b.primary_platform !== change.platformId)
      if (next.tool_backups.length === before) fail(`tool_backup_removed: no backup recorded for platform ${change.platformId}`)
      break
    }

    case 'model_swapped': {
      const link = (next.agent_platform || []).find(
        (ap) => ap.agent_id === change.agentId && ap.platform_id === change.fromPlatformId,
      )
      if (!link) fail(`model_swapped: agent ${change.agentId} is not on platform ${change.fromPlatformId}`)
      link.platform_id = change.toPlatformId
      break
    }

    case 'vendor_changed': {
      const platform = (next.ai_platforms || []).find((p) => p.id === change.platformId)
      if (!platform) fail(`vendor_changed: no platform with id ${change.platformId}`)
      platform.vendor = change.toVendor == null ? null : change.toVendor
      break
    }
  }

  return simulations.recount(next)
}

// ─── Measuring with the existing engine ──────────────────────────────────────

/**
 * employee_id -> hasBackup, from roots.owners. Same table, same column and
 * the same keying as derived.js's own owner-backup index and
 * lib/ownerBackups.js — it is a lookup, not a rule.
 */
function ownerBackupIndex(roots) {
  const index = new Map()
  for (const o of roots.owners || []) {
    if (o.employee_id == null) continue
    index.set(o.employee_id, index.get(o.employee_id) || Boolean(o.backup_owner))
  }
  return index
}

/**
 * SPOF status per agent via the canonical spofVerdict(), with its three inputs
 * derived exactly as routes/risks.js derives them. Built from roots here only
 * because the route's version reads the database.
 */
function spofByAgent(roots) {
  const backups = ownerBackupIndex(roots)
  const out = new Map()
  for (const agent of roots.agents || []) {
    const owned = agent.owner_id != null
    out.set(agent.id, spofVerdict({
      criticality: entityCriticality('agent', agent),
      ownerCount: owned ? 1 : 0,
      hasBackup: owned ? Boolean(backups.get(agent.owner_id)) : false,
    }).status)
  }
  return out
}

/** One snapshot of every number the diff compares. Pure over roots. */
function measure(roots) {
  const risk = derived.predictiveRisk(roots)
  const people = derived.humanDependencyRisk(roots)
  return {
    health: simulations.baselineHealthScore(roots),
    agents: new Map(risk.scores.map((s) => [s.agentId, s])),
    people: new Map(people.map((p) => [p.employeeId, p])),
    spof: spofByAgent(roots),
  }
}

/** A contributing factor's identity, whatever shape predictiveRisk gives it. */
function factorKey(f) {
  if (f == null) return null
  if (typeof f === 'string') return f
  return f.factor || f.key || f.type || f.name || f.id || JSON.stringify(f)
}

function factorSet(score) {
  const f = score.contributingFactors
  if (Array.isArray(f)) return new Set(f.map(factorKey).filter(Boolean))
  // predictiveRisk returns factors as an object keyed by factor name, with the
  // factor's contribution as the value; a factor counts only if it contributes.
  if (f && typeof f === 'object') return new Set(Object.keys(f).filter((k) => f[k]))
  return new Set()
}

/**
 * 'worse' | 'better' | 'unchanged' | 'unknown'.
 * `higherIsWorse` is true for risk scores, false for health.
 */
function direction(before, after, higherIsWorse) {
  if (before == null || after == null) return 'unknown'
  if (after === before) return 'unchanged'
  const rose = after > before
  return rose === higherIsWorse ? 'worse' : 'better'
}

// ─── Naming what changed ─────────────────────────────────────────────────────

function nameOf(rows, id, fallback) {
  const row = (rows || []).find((r) => r.id === id)
  return row && row.name ? row.name : fallback
}

function describeChange(roots, change) {
  const agent = (id) => nameOf(roots.agents, id, `agent ${id}`)
  const person = (id) => (id == null ? 'no one' : nameOf(roots.employees, id, `employee ${id}`))
  const platform = (id) => nameOf(roots.ai_platforms, id, `platform ${id}`)

  switch (change.type) {
    case 'owner_changed': {
      const current = (roots.agents || []).find((a) => a.id === change.agentId)
      const from = current ? current.owner_id : change.fromOwnerId
      return `Owner of ${agent(change.agentId)} changed from ${person(from)} to ${person(change.toOwnerId)}`
    }
    case 'backup_removed':
      return `${person(change.employeeId)} no longer has a backup owner`
    case 'tool_backup_removed':
      return `${platform(change.platformId)} no longer has a backup tool`
    case 'model_swapped':
      return `${agent(change.agentId)} moved from ${platform(change.fromPlatformId)} to ${platform(change.toPlatformId)}`
    case 'vendor_changed': {
      const current = (roots.ai_platforms || []).find((p) => p.id === change.platformId)
      const from = current && current.vendor ? current.vendor : 'unknown'
      return `Vendor of ${platform(change.platformId)} changed from ${from} to ${change.toVendor || 'unknown'}`
    }
    default:
      return change.type
  }
}

// ─── Downstream ──────────────────────────────────────────────────────────────

/** The agents a change lands on directly, before any cascade. */
function seedAgentIds(roots, change) {
  switch (change.type) {
    case 'owner_changed':
    case 'model_swapped':
      return [change.agentId]
    case 'backup_removed':
      return (roots.agents || []).filter((a) => a.owner_id === change.employeeId).map((a) => a.id)
    case 'tool_backup_removed':
    case 'vendor_changed':
      return (roots.agent_platform || []).filter((ap) => ap.platform_id === change.platformId).map((ap) => ap.agent_id)
    default:
      return []
  }
}

/**
 * Everything downstream of the change, via the existing cascade engine — the
 * same buildDependencyIndex / cascadeFrom / workflowsUsingAgents composition
 * simulations.employeeLeaves() uses. Read from the BEFORE snapshot: these are
 * the things that depended on what just changed.
 */
function downstreamOf(roots, change) {
  const seeds = seedAgentIds(roots, change)
  const index = simulations.buildDependencyIndex(roots)
  const agentIds = new Set(seeds)
  for (const id of seeds) {
    for (const hit of simulations.cascadeFrom('agent', id, index)) {
      if (hit.type === 'agent') agentIds.add(hit.id)
    }
  }
  const workflows = simulations.workflowsUsingAgents(agentIds, roots)
  return {
    agents: (roots.agents || []).filter((a) => agentIds.has(a.id)).map((a) => ({ id: a.id, name: a.name })),
    workflows: workflows.map((w) => ({ id: w.id, name: w.name })),
  }
}

// ─── The diff ────────────────────────────────────────────────────────────────

/**
 * Run the existing calculation before and after one change and report the
 * difference, naming every entity whose numbers moved.
 */
function diffChange(roots, change) {
  const after = applyChange(roots, change)
  const b = measure(roots)
  const a = measure(after)

  const health = {
    before: b.health,
    after: a.health,
    delta: b.health == null || a.health == null ? null : a.health - b.health,
    direction: direction(b.health, a.health, false),
  }

  const agents = []
  for (const [id, before] of b.agents) {
    const aft = a.agents.get(id)
    if (!aft) continue
    const spofBefore = b.spof.get(id)
    const spofAfter = a.spof.get(id)
    const delta = aft.predictedScore - before.predictedScore
    if (delta === 0 && before.threatLevel === aft.threatLevel && spofBefore === spofAfter) continue

    const fb = factorSet(before)
    const fa = factorSet(aft)
    agents.push({
      agentId: id,
      agentName: before.agentName,
      before: { score: before.predictedScore, threatLevel: before.threatLevel, spof: spofBefore },
      after: { score: aft.predictedScore, threatLevel: aft.threatLevel, spof: spofAfter },
      delta,
      direction: direction(before.predictedScore, aft.predictedScore, true),
      factorsAdded: [...fa].filter((f) => !fb.has(f)),
      factorsRemoved: [...fb].filter((f) => !fa.has(f)),
      becameSpof: spofBefore !== 'spof' && spofAfter === 'spof',
      stoppedBeingSpof: spofBefore === 'spof' && spofAfter !== 'spof',
    })
  }
  agents.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))

  const people = []
  for (const [id, before] of b.people) {
    const aft = a.people.get(id)
    if (!aft) continue
    const delta = aft.totalRiskScore - before.totalRiskScore
    if (delta === 0 && before.tier === aft.tier) continue
    people.push({
      employeeId: id,
      name: before.name,
      before: { score: before.totalRiskScore, tier: before.tier },
      after: { score: aft.totalRiskScore, tier: aft.tier },
      delta,
      direction: direction(before.totalRiskScore, aft.totalRiskScore, true),
    })
  }
  people.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))

  const healthMoved = health.delta != null && health.delta !== 0
  const priced = healthMoved || agents.length > 0 || people.length > 0

  return {
    change,
    description: describeChange(roots, change),
    priced,
    // Stated plainly rather than hidden: a zero is not a verdict that the
    // change was harmless, only that no existing calculation scores it.
    note: priced
      ? null
      : 'No existing risk or SPOF calculation changed as a result. The downstream entities listed are still affected by this change; the engine simply does not score it.',
    health,
    agents,
    people,
    // Any SPOF status change, not only into or out of 'spof' — 'orphaned' is
    // at least as serious, and not_evaluable -> not_spof is still news.
    spofChanges: agents
      .filter((x) => x.before.spof !== x.after.spof)
      .map((x) => ({ agentId: x.agentId, agentName: x.agentName, before: x.before.spof, after: x.after.spof })),
    downstream: downstreamOf(roots, change),
  }
}

// ─── Detecting real changes between two snapshots ────────────────────────────

function norm(v) {
  return v === undefined ? null : v
}

/**
 * The tracked changes between two roots snapshots. Pure: comparing two
 * bundles needs no database. Persisting the previous snapshot is a separate,
 * approved step (the schema design doc), not this function's concern.
 */
function detectChanges(prev, next) {
  const changes = []

  // Owner changes, including assigning or clearing an owner.
  const prevAgents = new Map((prev.agents || []).map((a) => [a.id, a]))
  for (const agent of next.agents || []) {
    const was = prevAgents.get(agent.id)
    if (!was) continue
    if (norm(was.owner_id) !== norm(agent.owner_id)) {
      changes.push({
        type: 'owner_changed',
        agentId: agent.id,
        fromOwnerId: norm(was.owner_id),
        toOwnerId: norm(agent.owner_id),
      })
    }
  }

  // A backup disappears: the owners row still exists, its backup does not.
  const prevBackup = ownerBackupIndex(prev)
  const nextBackup = ownerBackupIndex(next)
  for (const [employeeId, had] of prevBackup) {
    if (had && nextBackup.get(employeeId) === false) {
      changes.push({ type: 'backup_removed', employeeId })
    }
  }

  // A tool loses its backup tool.
  const nextBacked = new Set((next.tool_backups || []).map((b) => b.primary_platform))
  const seenPrevBacked = new Set()
  for (const b of prev.tool_backups || []) {
    if (seenPrevBacked.has(b.primary_platform)) continue
    seenPrevBacked.add(b.primary_platform)
    if (!nextBacked.has(b.primary_platform)) {
      changes.push({ type: 'tool_backup_removed', platformId: b.primary_platform })
    }
  }

  // An agent moves from one platform to another. Only an unambiguous
  // one-for-one move is reported as a swap; anything else is not guessed at.
  const platformsOf = (roots) => {
    const m = new Map()
    for (const ap of roots.agent_platform || []) {
      if (!m.has(ap.agent_id)) m.set(ap.agent_id, new Set())
      m.get(ap.agent_id).add(ap.platform_id)
    }
    return m
  }
  const prevLinks = platformsOf(prev)
  const nextLinks = platformsOf(next)
  for (const [agentId, before] of prevLinks) {
    const after = nextLinks.get(agentId) || new Set()
    const removed = [...before].filter((p) => !after.has(p))
    const added = [...after].filter((p) => !before.has(p))
    if (removed.length === 1 && added.length === 1) {
      changes.push({ type: 'model_swapped', agentId, fromPlatformId: removed[0], toPlatformId: added[0] })
    }
  }

  // A platform's vendor changes.
  const prevPlatforms = new Map((prev.ai_platforms || []).map((p) => [p.id, p]))
  for (const platform of next.ai_platforms || []) {
    const was = prevPlatforms.get(platform.id)
    if (!was) continue
    if (norm(was.vendor) !== norm(platform.vendor)) {
      changes.push({
        type: 'vendor_changed',
        platformId: platform.id,
        fromVendor: norm(was.vendor),
        toVendor: norm(platform.vendor),
      })
    }
  }

  return changes
}

/**
 * Every tracked change between two snapshots, each diffed on its own against
 * the earlier one. Applying each change separately to `prev` attributes impact
 * to the specific change that caused it, rather than blurring several
 * simultaneous changes into one number.
 */
function diffSnapshots(prev, next) {
  return detectChanges(prev, next).map((change) => diffChange(prev, change))
}

module.exports = {
  CHANGE_TYPES,
  applyChange,
  diffChange,
  detectChanges,
  diffSnapshots,
  describeChange,
}
