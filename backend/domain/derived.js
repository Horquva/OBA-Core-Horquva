/**
 * DERIVED INTELLIGENCE — the summaries, computed instead of remembered
 * ====================================================================
 *
 * Six products used to live as rows in tables nothing ever wrote:
 *
 *   accountability_summary · collaboration_scores · collaboration_summary
 *   predictive_risk_scores · executive_memory_items · intelligence_results
 *
 * Every one was seeded once by SQL and read forever after as though current.
 * This module computes all six on demand, so the numbers a user sees are
 * answers to the database's present state rather than a memory of its past.
 *
 * ── The rule that shapes this file ──────────────────────────────────────────
 *
 * COMPUTE FROM ROOTS, NEVER FROM ANOTHER DERIVED TABLE.
 *
 * The database contains a second tier of tables that also look like inputs —
 * `governance_assessments`, `continuity_assessments`, `failure_patterns`,
 * `incident_patterns`, `hero_dependencies`, `accountability_scores` — and every
 * one of them is itself computed-and-never-refreshed. Deriving a summary from
 * those would produce something that looks live, recomputes on every request,
 * and is still stale, which is strictly worse than the frozen table it replaced
 * because the staleness would no longer be visible anywhere.
 *
 * So the inputs here are only tables that hold facts somebody or something
 * outside this codebase actually maintains:
 *
 *   employees · agents · owners · workflows · workflow_failures
 *   workflow_runbooks · dependencies · knowledge_assets · tool_users
 *   employee_agent · ai_platforms · tool_policies · policy_violations
 *   tool_ownership · accountability_entities · accountability_links
 *   truth_claims · decision_history
 *
 * `loadRoots()` reads exactly that list and nothing else. If a future analysis
 * needs something not in it, the honest move is to add a root — not to reach
 * for a convenient pre-aggregated table.
 *
 * ── About the formulas ──────────────────────────────────────────────────────
 *
 * The seeded rows carried scores with no definition anywhere in the repository:
 * `intelligence_results` claimed GI=62, MI=55, DI=68 against source data whose
 * live averages are nothing like those numbers. Recomputing therefore required
 * DEFINING these measures, not rediscovering them.
 *
 * Every such definition is written out in the comment above the function that
 * implements it, in prose, with its weights named as constants. They are
 * deliberately simple and auditable rather than clever: an executive metric
 * whose derivation cannot be explained in a paragraph is not worth the trust
 * placed in it. Expect to tune the weights — that is a product conversation,
 * and this file is written so it can happen in one place.
 *
 * ── Provenance ──────────────────────────────────────────────────────────────
 *
 * Every function returns `computedAt`, `source: 'live'` and an `inputs` map of
 * which root tables it read and how many rows each contributed. Callers should
 * pass that through to the client. The point is not decoration: it is that a
 * consumer can tell a computed answer from a remembered one without knowing
 * anything about this file.
 */

const { atOrAbove, evidenceGate, combineEvidence, entityCriticality } = require('./definitions')

const ROOT_TABLES = [
  'employees', 'agents', 'owners', 'workflows', 'workflow_failures',
  'workflow_runbooks', 'dependencies', 'knowledge_assets', 'tool_users',
  'employee_agent', 'ai_platforms', 'tool_policies', 'policy_violations',
  'tool_ownership', 'accountability_entities', 'accountability_links',
  'truth_claims', 'decision_history', 'agent_platform', 'workflow_dependencies',
  'tool_backups',
]

// ─── Small shared helpers ────────────────────────────────────────────────────

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n) => Math.round(n)
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const pct = (part, whole) => (whole ? (part / whole) * 100 : 0)

/** Bands a 0-100 score onto a four-step label. Used by every score here so the
 *  word attached to a number means the same thing across the whole product. */
function band(score, labels = ['CRITICAL', 'WEAK', 'PARTIAL', 'STRONG']) {
  if (score >= 85) return labels[3]
  if (score >= 65) return labels[2]
  if (score >= 40) return labels[1]
  return labels[0]
}

function provenance(inputs) {
  return { computedAt: new Date().toISOString(), source: 'live', inputs }
}

// ─── Root loading ────────────────────────────────────────────────────────────

/**
 * Reads every root table once, in parallel, and hands back a plain bundle.
 *
 * One load per request serves all six analyses. Computing them separately would
 * mean re-reading `employees` and `agents` six times; more importantly it would
 * let two summaries in the same response disagree because they read the database
 * a few milliseconds apart.
 *
 * A failed table read is fatal here rather than silently empty. A summary
 * computed over zero rows does not look broken — it looks like a healthy
 * organization with nothing in it, which is the most dangerous possible
 * failure mode for this particular product.
 */
async function loadRoots(supabase) {
  const results = await Promise.all(
    ROOT_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw new Error(`derived: could not read root table "${table}" — ${error.message}`)
      return [table, data || []]
    }),
  )
  const roots = Object.fromEntries(results)
  roots._counts = Object.fromEntries(results.map(([t, rows]) => [t, rows.length]))
  return roots
}

// ─── Shared derivations several analyses need ────────────────────────────────

/** employee_id -> { hasBackup, backupOwner, ownerRow } for people in `owners`. */
function backupIndex(roots) {
  const byEmployee = new Map()
  for (const o of roots.owners) {
    if (o.employee_id == null) continue
    byEmployee.set(o.employee_id, {
      hasBackup: Boolean(o.backup_owner),
      backupOwner: o.backup_owner || null,
      ownerRow: o,
    })
  }
  return byEmployee
}

/**
 * Dependency adjacency. An edge means `source depends_on target` (the same
 * reading graphLoader.js uses when it builds the Knowledge Graph), so the
 * things that BREAK when X fails are the sources pointing at X.
 */
function dependencyIndex(roots) {
  const dependentsOf = new Map() // "type:id" -> [{type,id,dependency_type}]
  const key = (type, id) => `${type}:${id}`
  for (const d of roots.dependencies) {
    const k = key(d.target_type, d.target_id)
    if (!dependentsOf.has(k)) dependentsOf.set(k, [])
    dependentsOf.get(k).push({ type: d.source_type, id: d.source_id, dependency_type: d.dependency_type })
  }
  return { dependentsOf, key }
}

/** Transitive count of everything that fails downstream of one node. */
function cascadeReach(startType, startId, { dependentsOf, key }) {
  const seen = new Set()
  const queue = [[startType, startId]]
  while (queue.length) {
    const [t, id] = queue.shift()
    for (const dep of dependentsOf.get(key(t, id)) || []) {
      const k = key(dep.type, dep.id)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push([dep.type, dep.id])
    }
  }
  return seen.size
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ACCOUNTABILITY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces the `accountability_summary` row.
 *
 * DEFINITION. Accountability is scored per entity from its RACI links, then
 * averaged. An entity scores:
 *
 *   100  it has a Responsible and an Accountable, and they are different people
 *    60  it has both, but one person holds each — work and answerability are
 *        not separated, which is the specific failure RACI exists to prevent
 *    40  it has one of the two
 *     0  it has neither
 *
 * Consulted and Informed links are recorded but do not score: being kept in the
 * loop is not accountability, and counting it would let an entity with nobody
 * responsible look well governed.
 *
 * Roots: accountability_entities, accountability_links.
 * NOT used: accountability_scores — it is a frozen pre-aggregate of this.
 */
const RACI_BOTH_SEPARATE = 100
const RACI_BOTH_SAME_PERSON = 60
const RACI_ONE_ONLY = 40

function accountability(roots) {
  const linksByEntity = new Map()
  for (const l of roots.accountability_links) {
    if (!linksByEntity.has(l.entity_id)) linksByEntity.set(l.entity_id, [])
    linksByEntity.get(l.entity_id).push(l)
  }

  let sameRandA = 0
  let entitiesWithLinks = 0
  const perEntity = []

  for (const entity of roots.accountability_entities) {
    const links = linksByEntity.get(entity.id) || []
    if (links.length) entitiesWithLinks++

    const responsible = links.filter((l) => l.raci_role === 'Responsible').map((l) => l.person_name)
    const accountable = links.filter((l) => l.raci_role === 'Accountable').map((l) => l.person_name)
    const overlap = responsible.some((p) => accountable.includes(p))

    let score
    if (responsible.length && accountable.length) {
      score = overlap ? RACI_BOTH_SAME_PERSON : RACI_BOTH_SEPARATE
      if (overlap) sameRandA++
    } else if (responsible.length || accountable.length) {
      score = RACI_ONE_ONLY
    } else {
      score = 0
    }

    perEntity.push({
      entityId: entity.id,
      entityName: entity.entity_name,
      entityType: entity.entity_type,
      department: entity.department,
      score,
      status: band(score),
      responsible,
      accountable,
      sameResponsibleAndAccountable: overlap,
      missingResponsible: responsible.length === 0,
      missingAccountable: accountable.length === 0,
    })
  }

  const accountabilityScore = round(mean(perEntity.map((e) => e.score)))
  const uniquePeople = new Set(roots.accountability_links.map((l) => l.person_name))

  const evidence = evidenceGate(roots.accountability_entities, (e) => (linksByEntity.get(e.id) || []).length > 0)

  return {
    accountabilityScore: evidence.sufficient ? accountabilityScore : null,
    status: evidence.sufficient ? band(accountabilityScore) : null,
    totalEntities: roots.accountability_entities.length,
    entitiesWithLinks,
    sameRandACount: sameRandA,
    uniquePeopleCount: uniquePeople.size,
    perEntity,
    evidence,
    ...provenance({
      accountability_entities: roots._counts.accountability_entities,
      accountability_links: roots._counts.accountability_links,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. COLLABORATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces both `collaboration_scores` (per employee) and the
 * `collaboration_summary` row.
 *
 * The frozen table documented its own inputs in its column names —
 * ai_tools_used, ai_agents_used, critical_agents_owned, has_backup — so the
 * counting is recovered rather than invented. The three SCORES are definitions:
 *
 *   ADOPTION (0-100). How much AI this person actually works with, weighted by
 *   how heavily they use it. A platform used at `power` level counts for more
 *   than one touched `rare`ly, because a rarely-touched licence is a cost line,
 *   not adoption. Agents count double: being assigned to an agent is a working
 *   relationship, not a login.
 *
 *   DEPENDENCY (0-100). How badly the ORGANIZATION depends on this one person.
 *   This is a risk measure, not a compliment: it rises with each critical asset
 *   they own and jumps when nobody is named as their backup. A high dependency
 *   score is a continuity problem, and the person is usually its victim.
 *
 *   COLLABORATION (0-100). Adoption is good, concentration is not, so this
 *   blends high adoption with LOW dependency. Someone who uses everything and
 *   is also the only one who can is not collaborating — they are a bottleneck.
 *
 * Roots: employees, tool_users, employee_agent, agents, owners.
 */
const USAGE_WEIGHT = { power: 3, regular: 2, occasional: 1, rare: 0.5 }
const AGENT_ENGAGEMENT_WEIGHT = 2
const ADOPTION_SATURATION = 10 // engagement points that count as fully adopted
const DEPENDENCY_PER_CRITICAL_ASSET = 25
const DEPENDENCY_NO_BACKUP = 30
const COLLABORATION_ADOPTION_WEIGHT = 0.6
const COLLABORATION_INDEPENDENCE_WEIGHT = 0.4

function collaboration(roots) {
  const backups = backupIndex(roots)

  const toolsByEmployee = new Map()
  for (const tu of roots.tool_users) {
    if (!toolsByEmployee.has(tu.employee_id)) toolsByEmployee.set(tu.employee_id, [])
    toolsByEmployee.get(tu.employee_id).push(tu)
  }

  const agentsByEmployee = new Map()
  for (const ea of roots.employee_agent) {
    if (!agentsByEmployee.has(ea.employee_id)) agentsByEmployee.set(ea.employee_id, [])
    agentsByEmployee.get(ea.employee_id).push(ea)
  }

  // agents.owner_id IS an employees.id directly, not an owners.id (see
  // routes/ownership.js's header comment for the id-space trap this avoids).
  const criticalOwnedByEmployee = new Map()
  for (const a of roots.agents) {
    if (a.owner_id == null) continue
    if (!atOrAbove(a.risk, 'high')) continue
    criticalOwnedByEmployee.set(a.owner_id, (criticalOwnedByEmployee.get(a.owner_id) || 0) + 1)
  }

  // Only people who actually touch AI get a row. Scoring the other ~12
  // employees as zero-adoption would drag the organizational average down to
  // describe something real ("most staff use no AI") using a metric meant to
  // describe something else ("how well do AI users work with it").
  const perEmployee = []
  for (const emp of roots.employees) {
    const tools = toolsByEmployee.get(emp.id) || []
    const agentLinks = agentsByEmployee.get(emp.id) || []
    if (!tools.length && !agentLinks.length) continue

    const engagement =
      tools.reduce((sum, t) => sum + (USAGE_WEIGHT[t.usage_level] ?? 1), 0) +
      agentLinks.length * AGENT_ENGAGEMENT_WEIGHT

    const adoptionScore = clamp(round(pct(engagement, ADOPTION_SATURATION)))

    const criticalOwned = criticalOwnedByEmployee.get(emp.id) || 0
    const backup = backups.get(emp.id)
    const isNamedOwner = backup !== undefined
    const hasBackup = backup ? backup.hasBackup : false

    let dependencyScore = criticalOwned * DEPENDENCY_PER_CRITICAL_ASSET
    if (criticalOwned > 0 && !hasBackup) dependencyScore += DEPENDENCY_NO_BACKUP
    dependencyScore = clamp(round(dependencyScore))

    const collaborationScore = clamp(round(
      COLLABORATION_ADOPTION_WEIGHT * adoptionScore +
      COLLABORATION_INDEPENDENCE_WEIGHT * (100 - dependencyScore),
    ))

    perEmployee.push({
      employeeId: emp.id,
      name: emp.name,
      department: emp.department,
      adoptionScore,
      dependencyScore,
      collaborationScore,
      aiToolsUsed: tools.length,
      aiAgentsUsed: agentLinks.length,
      criticalAgentsOwned: criticalOwned,
      hasBackup,
      isNamedOwner,
    })
  }

  const highest = perEmployee.reduce(
    (top, e) => (top === null || e.dependencyScore > top.dependencyScore ? e : top),
    null,
  )

  const aiAdoptionScore = round(mean(perEmployee.map((e) => e.adoptionScore)))
  const collaborationScore = round(mean(perEmployee.map((e) => e.collaborationScore)))

  // The organization's dependency exposure is its WORST bottleneck, not its
  // average one. Averaging hides exactly what this measure exists to find: with
  // most staff owning nothing critical, the mean sits near 5 and reports "no
  // concentration risk" for an organization that would still lose two critical
  // agents if one specific person resigned. The mean is kept alongside, because
  // the gap between the two is itself the interesting number.
  const humanDependencyScore = perEmployee.length
    ? Math.max(...perEmployee.map((e) => e.dependencyScore))
    : 0
  const meanDependencyScore = round(mean(perEmployee.map((e) => e.dependencyScore)))

  const evidence = evidenceGate(roots.employees, () => true)

  return {
    perEmployee,
    summary: {
      aiAdoptionScore: evidence.sufficient ? aiAdoptionScore : null,
      adoptionLevel: evidence.sufficient ? band(aiAdoptionScore, ['MINIMAL', 'LOW', 'MODERATE', 'HIGH']) : null,
      humanDependencyScore: evidence.sufficient ? humanDependencyScore : null,
      meanDependencyScore: evidence.sufficient ? meanDependencyScore : null,
      // Deliberately inverted: a HIGH dependency score is a BAD outcome, so the
      // reassuring label has to sit at the low end or the word and the number
      // would tell opposite stories.
      dependencyLevel: evidence.sufficient ? band(100 - humanDependencyScore, ['SEVERE', 'HIGH', 'MODERATE', 'LOW']) : null,
      highestDependencyEmployee: highest ? highest.name : null,
      highestDependencyScore: highest ? highest.dependencyScore : null,
      collaborationScore: evidence.sufficient ? collaborationScore : null,
      collaborationLevel: evidence.sufficient ? band(collaborationScore, ['POOR', 'FAIR', 'GOOD', 'STRONG']) : null,
      peopleScored: perEmployee.length,
      peopleTotal: roots.employees.length,
      evidence,
    },
    ...provenance({
      employees: roots._counts.employees,
      tool_users: roots._counts.tool_users,
      employee_agent: roots._counts.employee_agent,
      agents: roots._counts.agents,
      owners: roots._counts.owners,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. PREDICTIVE RISK
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces the 15 `predictive_risk_scores` rows.
 *
 * DEFINITION. Each agent accumulates penalty points from independently
 * observable conditions; the total is its predicted score. The factor names and
 * the {name -> points} shape are kept from the frozen table's
 * `contributing_factors` JSON so existing consumers keep working.
 *
 * The factors, and why each is weighted where it is:
 *
 *   single_owner (30)          one named owner, no backup. The largest single
 *                              factor because it is the only one where the
 *                              organization loses the asset outright.
 *   high_dependency_count (25) three or more things break with it (12 for one
 *                              or two). Blast radius, not fragility.
 *   critical_workflow (27)     a workflow rated high or critical depends on it.
 *   undocumented (18)          its knowledge assets are not written down, so
 *                              recovery depends on a person being reachable.
 *   unstable (25/10)           status `failed` / `inactive`. Observed, not
 *                              predicted — an already-failing agent is not a
 *                              risk, it is an incident, and should outrank
 *                              anything merely fragile.
 *   intrinsic_risk (20/12)     the risk level already recorded on the agent.
 *
 * `isEmergingThreat` means the computed score lands in a HIGHER band than the
 * agent's own recorded `risk` label — i.e. the data has moved and the label has
 * not. That makes the flag say something the score alone doesn't, which is the
 * only reason to keep a boolean next to a number.
 *
 * Roots: agents, owners, dependencies, workflows, knowledge_assets.
 */
const RISK_FACTORS = {
  NO_OWNER: 35,
  SINGLE_OWNER: 30,
  DEPENDENTS_MANY: 25,
  DEPENDENTS_FEW: 12,
  CRITICAL_WORKFLOW: 27,
  UNDOCUMENTED: 18,
  STATUS_FAILED: 25,
  STATUS_INACTIVE: 10,
  INTRINSIC_CRITICAL: 20,
  INTRINSIC_HIGH: 12,
}
const MANY_DEPENDENTS = 3

function threatLevel(score) {
  if (score >= 75) return 'CRITICAL'
  if (score >= 55) return 'HIGH'
  if (score >= 35) return 'MEDIUM'
  return 'LOW'
}

const THREAT_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
const RECORDED_RISK_AS_THREAT = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' }

function predictiveRisk(roots) {
  const depIndex = dependencyIndex(roots)
  const backups = backupIndex(roots)
  // agents.owner_id references employees.id directly, NOT owners.id (see
  // routes/ownership.js's header comment — both id spaces start at 1, so a
  // join on the wrong one never errors, it silently returns a different,
  // plausible person). owners is a small subset of employees carrying
  // role/backup/risk, so a declared-owner row is looked up by employee_id,
  // falling back to the employees table for the name when no such row exists
  // (7 of 15 seeded agents are owned by employees absent from owners).
  const ownerRowByEmployeeId = new Map(roots.owners.filter((o) => o.employee_id != null).map((o) => [o.employee_id, o]))
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  const workflowById = new Map(roots.workflows.map((w) => [w.id, w]))

  const docByAgent = new Map()
  for (const ka of roots.knowledge_assets) {
    if (ka.asset_type !== 'agent') continue
    const current = docByAgent.get(ka.asset_id) || { total: 0, documented: 0 }
    current.total++
    if (ka.is_documented) current.documented++
    docByAgent.set(ka.asset_id, current)
  }

  const scores = roots.agents.map((agent) => {
    const factors = {}
    const reasons = []

    const ownerEmployee = agent.owner_id != null ? employeeById.get(agent.owner_id) : null
    const ownerBackup = agent.owner_id != null ? backups.get(agent.owner_id) : null
    const ownerName = ownerEmployee ? ownerEmployee.name : (ownerRowByEmployeeId.get(agent.owner_id) || {}).name
    // No owner at all is a worse condition than an owner with no backup — there
    // is no single point of failure to name, there is no coverage whatsoever —
    // so it must not score lower on this dimension than the owned-and-unbacked
    // case just because the `owner &&` guard made it fall through to nothing.
    if (agent.owner_id == null) {
      factors.single_owner = RISK_FACTORS.NO_OWNER
      reasons.push('has no named owner at all')
    } else if (!(ownerBackup && ownerBackup.hasBackup)) {
      factors.single_owner = RISK_FACTORS.SINGLE_OWNER
      reasons.push(`${ownerName || 'the owner'} is the only named owner and has no backup`)
    }

    const directDependents = (depIndex.dependentsOf.get(depIndex.key('agent', agent.id)) || [])
    if (directDependents.length >= MANY_DEPENDENTS) {
      factors.high_dependency_count = RISK_FACTORS.DEPENDENTS_MANY
      reasons.push(`${directDependents.length} things depend on it directly`)
    } else if (directDependents.length > 0) {
      factors.high_dependency_count = RISK_FACTORS.DEPENDENTS_FEW
      reasons.push(`${directDependents.length} thing(s) depend on it directly`)
    }

    const criticalWorkflows = directDependents
      .filter((d) => d.type === 'workflow')
      .map((d) => workflowById.get(d.id))
      .filter((w) => w && atOrAbove(w.risk, 'high'))
    if (criticalWorkflows.length) {
      factors.critical_workflow = RISK_FACTORS.CRITICAL_WORKFLOW
      reasons.push(`supports ${criticalWorkflows.length} high-risk workflow(s): ${criticalWorkflows.map((w) => w.name).join(', ')}`)
    }

    const docs = docByAgent.get(agent.id)
    if (docs && docs.documented < docs.total) {
      factors.undocumented = RISK_FACTORS.UNDOCUMENTED
      reasons.push(`${docs.total - docs.documented} of ${docs.total} knowledge asset(s) undocumented`)
    }

    if (agent.status === 'failed') {
      factors.unstable = RISK_FACTORS.STATUS_FAILED
      reasons.push('currently in a failed state')
    } else if (agent.status === 'inactive') {
      factors.unstable = RISK_FACTORS.STATUS_INACTIVE
      reasons.push('currently inactive')
    }

    if (agent.risk === 'critical') {
      factors.intrinsic_risk = RISK_FACTORS.INTRINSIC_CRITICAL
      reasons.push('recorded risk level is critical')
    } else if (agent.risk === 'high') {
      factors.intrinsic_risk = RISK_FACTORS.INTRINSIC_HIGH
      reasons.push('recorded risk level is high')
    }

    const predictedScore = clamp(Object.values(factors).reduce((a, b) => a + b, 0))
    const level = threatLevel(predictedScore)
    const recorded = RECORDED_RISK_AS_THREAT[agent.risk] || 'LOW'

    return {
      agentId: agent.id,
      agentName: agent.name,
      predictedScore,
      threatLevel: level,
      recordedRisk: agent.risk,
      // The data has outrun the label.
      isEmergingThreat: THREAT_ORDER[level] > THREAT_ORDER[recorded],
      contributingFactors: factors,
      reasons,
      cascadeReach: cascadeReach('agent', agent.id, depIndex),
    }
  })

  scores.sort((a, b) => b.predictedScore - a.predictedScore)

  return {
    scores,
    emergingThreats: scores.filter((s) => s.isEmergingThreat),
    ...provenance({
      agents: roots._counts.agents,
      owners: roots._counts.owners,
      dependencies: roots._counts.dependencies,
      workflows: roots._counts.workflows,
      knowledge_assets: roots._counts.knowledge_assets,
    }),
  }
}

/**
 * Per-employee aggregate exposure across everything they own (agents,
 * workflows, tools) -- was independently computed by two frontend
 * components (HumanDependencyRisks.tsx, DependencyPipeline.tsx) with two
 * different, invented sets of point weights (12/8/10, and a raw 4/3/2/1
 * tier-count sum), neither grounded in anything. This reuses RISK_FACTORS'
 * existing scale instead of inventing new numbers, and threatLevel()'s
 * existing 35/55/75 bands instead of a third tier scheme (the frontend used
 * 50/25/10).
 *
 * agentRisk (mean of predictiveRisk()'s real predictedScore over owned
 * agents) is the dominant term. Workflow backup coverage is deliberately
 * NOT counted as its own factor: a workflow's backup_owner is resolved from
 * its owner's OWN backup_owner row (see routes/workflows/index.js), the same
 * fact predictiveRisk()'s SINGLE_OWNER factor for their agents already
 * prices in -- counting it twice would double-weight one signal, not add a
 * second one. Critical-workflow load and tool-backup coverage ARE
 * independent real facts, so they contribute as a fraction of owned
 * workflows/tools (not a raw count, so one person having many workflows
 * doesn't mechanically inflate the score) times the matching existing
 * RISK_FACTORS weight.
 *
 * Roots: employees, agents, workflows, workflow_runbooks, ai_platforms,
 * tool_ownership, tool_backups (plus predictiveRisk()'s own roots).
 */
function humanDependencyRisk(roots) {
  const risk = predictiveRisk(roots)
  const scoreByAgentId = new Map(risk.scores.map((s) => [s.agentId, s.predictedScore]))
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  const backedPlatformIds = new Set(roots.tool_backups.map((b) => b.primary_platform))

  const employeeIds = new Set([
    ...roots.agents.map((a) => a.owner_id),
    ...roots.workflow_runbooks.map((r) => r.owner_id),
    ...roots.tool_ownership.map((t) => t.employee_id),
  ].filter((id) => id != null))

  const workflowById = new Map(roots.workflows.map((w) => [w.id, w]))
  const platformById = new Map(roots.ai_platforms.map((p) => [p.id, p]))

  const profiles = [...employeeIds].map((employeeId) => {
    const employee = employeeById.get(employeeId)
    const ownedAgents = roots.agents.filter((a) => a.owner_id === employeeId)
    const ownedWorkflows = roots.workflow_runbooks
      .filter((r) => r.owner_id === employeeId)
      .map((r) => workflowById.get(r.workflow_id))
      .filter(Boolean)
    const ownedTools = roots.tool_ownership
      .filter((t) => t.employee_id === employeeId)
      .map((t) => platformById.get(t.platform_id))
      .filter(Boolean)

    const agentRisk = mean(ownedAgents.map((a) => scoreByAgentId.get(a.id) ?? 0))

    const criticalWorkflows = ownedWorkflows.filter((w) => atOrAbove(w.risk, 'high')).length
    const workflowExposure = ownedWorkflows.length
      ? pct(criticalWorkflows, ownedWorkflows.length) / 100 * RISK_FACTORS.CRITICAL_WORKFLOW
      : 0

    const unbackedTools = ownedTools.filter((p) => !backedPlatformIds.has(p.id)).length
    const toolExposure = ownedTools.length
      ? pct(unbackedTools, ownedTools.length) / 100 * RISK_FACTORS.SINGLE_OWNER
      : 0

    const totalRiskScore = clamp(round(agentRisk + workflowExposure + toolExposure))

    return {
      employeeId,
      name: employee ? employee.name : null,
      ownedAgentCount: ownedAgents.length,
      ownedWorkflowCount: ownedWorkflows.length,
      criticalWorkflowCount: criticalWorkflows,
      ownedToolCount: ownedTools.length,
      unbackedToolCount: unbackedTools,
      totalRiskScore,
      tier: threatLevel(totalRiskScore),
    }
  })

  profiles.sort((a, b) => b.totalRiskScore - a.totalRiskScore)
  return profiles
}

/**
 * Per-employee knowledge CONCENTRATION -- criticality-weighted share of
 * org-wide assets (agents + workflows + tools) one person owns. Was
 * frontend/lib/knowledgeRisk.ts's concentrationScore, computed client-side.
 * Ported verbatim (same weight table, same tier bands) rather than
 * redesigned -- this migration is about WHERE it runs, not what it outputs.
 *
 * Deliberately distinct from routes/knowledge/intelligence.js's
 * knowledgeRiskScore, which is an ABSOLUTE score over one person's own
 * knowledge_assets holdings, not normalized against org totals -- see that
 * route's own header comment. Two genuinely different questions that
 * happened to collide under one misleading name before this session's
 * earlier rename (D-07 era duplication sweep).
 *
 * Criticality is resolved via definitions.js's entityCriticality() -- the
 * canonical per-type resolver (agent/workflow via their own `risk` column,
 * platform via its knowledge_assets rows) -- rather than each asset type
 * reading a differently-named raw field, which is what the frontend version
 * did.
 */
const CONCENTRATION_WEIGHT = { critical: 4, high: 2, medium: 1, low: 0.5, unknown: 1 }

function concentrationTier(score) {
  if (score >= 90) return 'CRITICAL'
  if (score >= 55) return 'HIGH'
  if (score >= 30) return 'MEDIUM'
  return 'LOW'
}

function knowledgeConcentration(roots) {
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  const workflowById = new Map(roots.workflows.map((w) => [w.id, w]))
  const platformById = new Map(roots.ai_platforms.map((p) => [p.id, p]))

  const weightByEmployee = new Map()
  let totalWeight = 0
  const add = (employeeId, weight) => {
    if (employeeId == null) return
    totalWeight += weight
    weightByEmployee.set(employeeId, (weightByEmployee.get(employeeId) || 0) + weight)
  }

  for (const a of roots.agents) {
    add(a.owner_id, CONCENTRATION_WEIGHT[entityCriticality('agent', a)] ?? 1)
  }
  for (const r of roots.workflow_runbooks) {
    const w = workflowById.get(r.workflow_id)
    if (!w) continue
    add(r.owner_id, CONCENTRATION_WEIGHT[entityCriticality('workflow', w)] ?? 1)
  }
  for (const t of roots.tool_ownership) {
    const p = platformById.get(t.platform_id)
    if (!p) continue
    add(t.employee_id, CONCENTRATION_WEIGHT[entityCriticality('platform', p, { knowledgeAssets: roots.knowledge_assets })] ?? 1)
  }

  const profiles = [...weightByEmployee.entries()].map(([employeeId, weight]) => {
    const employee = employeeById.get(employeeId)
    const concentrationScore = totalWeight > 0 ? round((weight / totalWeight) * 100) : 0
    return {
      employeeId,
      name: employee ? employee.name : null,
      concentrationScore,
      tier: concentrationTier(concentrationScore),
    }
  })

  profiles.sort((a, b) => b.concentrationScore - a.concentrationScore)
  return profiles
}

/**
 * Institutional memory status per asset (agent/workflow/tool) and per owner
 * ("carrier"), plus an org-wide Institutional Memory Health Score (IMHS).
 * Was frontend/lib/orgMemory.ts's computeOrgMemory(), computed client-side --
 * the live formula behind the /memory page today.
 *
 * D-60 (owner decision, 2026-08-26): `routes/memory/memory.js` already had its
 * own same-named `computeMemoryStatus()`/IMHS -- but a DIFFERENT formula (undocumented
 * + high/critical criticality, ignoring backup_owner entirely) that nothing
 * actually consumed for data (only a health pinger touched `/health`; `/map`
 * and `/employee/:name` had zero callers). The owner picked the frontend's
 * formula as canonical -- it's the one actually live today, and it matches
 * this module's own "memory carrier" framing (would this survive the owner
 * leaving?) rather than a general risk-exposure question mislabeled as
 * memory status. Ported verbatim: same 4-status rules, same carrier-tier
 * weights (undocumented*2 + noBackup), same IMHS weights (1.0/0.5/0.25/0).
 *
 * Two deliberate departures from a byte-for-byte port, both display-only
 * fields that never feed the status/tier logic above:
 *   - criticality resolved via definitions.js's entityCriticality() (real
 *     'unknown' sentinel) instead of the frontend's resolveCriticality()
 *     (silently defaults unassessed to 'low' -- a separate, already-flagged
 *     issue this doesn't fix, just doesn't propagate into new code).
 *   - "documented" for agents/tools is a conjunction across every matching
 *     knowledge_assets row (one undocumented row means not fully documented),
 *     matching tools.js's own fix for the same "last write wins" bug class
 *     (F-K) rather than routes/agents.js's older order-dependent version.
 *
 * Roots: employees, agents, workflows, workflow_runbooks, ai_platforms,
 * tool_ownership, tool_backups, tool_users, knowledge_assets, owners.
 */
function memoryStatus(hasOwner, isDocumented, hasBackup) {
  if (!hasOwner && !isDocumented) return 'LOST'
  if (isDocumented && hasBackup) return 'PRESERVED'
  if (!isDocumented && hasBackup) return 'AT_RISK'
  return 'VULNERABLE'
}

function memoryCarrierTier(undocumentedCount, noBackupCount) {
  const riskWeight = undocumentedCount * 2 + noBackupCount
  if (riskWeight >= 10 || (undocumentedCount >= 5 && noBackupCount >= 5)) return 'CRITICAL'
  if (riskWeight >= 5 || (undocumentedCount >= 3 && noBackupCount >= 3)) return 'HIGH'
  if (riskWeight >= 2 || undocumentedCount >= 2) return 'MEDIUM'
  return 'LOW'
}

function calcIMHS(preserved, vulnerable, atRisk, total) {
  return round(((preserved * 1.0 + vulnerable * 0.5 + atRisk * 0.25) / total) * 100)
}

/**
 * The per-asset base list (agent + workflow + tool) shared by every
 * derived.js analysis that classifies owner/backup/documented/criticality/
 * department -- orgMemory() below, and assetContinuity() (D-61). Each of
 * those four signals already had its own resolution logic duplicated once
 * per consumer before this; factored out so "how do we resolve a workflow's
 * backup owner" has exactly one answer, not one per caller.
 *
 * Carries no status/tier field of its own -- callers classify on top of
 * `hasOwner`/`documented`/`backup_owner` however their own formula defines
 * that (memoryStatus() here, survivalStatus()/governanceScore() in
 * assetContinuity()).
 */
function ownedAssetBase(roots) {
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  const platformById = new Map(roots.ai_platforms.map((p) => [p.id, p]))
  const backups = backupIndex(roots)
  const ownerName = (employeeId) => (employeeId != null ? employeeById.get(employeeId)?.name ?? null : null)
  const ownerDept = (employeeId) => (employeeId != null ? employeeById.get(employeeId)?.department ?? 'Unassigned' : 'Unassigned')

  // Conjunction across every knowledge_assets row for a given asset --
  // one undocumented row means the asset isn't fully documented. No matching
  // row at all -> false (mirrors normalizeAgent()'s `Boolean(documented ?? false)`
  // coercion of "unassessed" into "not documented", the behavior the live
  // frontend formula already applies).
  const documentedByAsset = { agent: new Map(), platform: new Map() }
  for (const ka of roots.knowledge_assets) {
    const bucket = documentedByAsset[ka.asset_type]
    if (!bucket) continue
    const prev = bucket.has(ka.asset_id) ? bucket.get(ka.asset_id) : true
    bucket.set(ka.asset_id, prev && Boolean(ka.is_documented))
  }

  const runbookByWorkflow = new Map(roots.workflow_runbooks.map((r) => [r.workflow_id, r]))
  const platformOwnerEmployeeId = new Map(roots.tool_ownership.map((t) => [t.platform_id, t.employee_id]))
  const platformBackupName = new Map(
    roots.tool_backups.map((b) => [b.primary_platform, platformById.get(b.backup_platform)?.name ?? null]),
  )
  const platformDepts = new Map()
  for (const u of roots.tool_users) {
    const dept = employeeById.get(u.employee_id)?.department
    if (!dept) continue
    if (!platformDepts.has(u.platform_id)) platformDepts.set(u.platform_id, dept)
  }

  const assets = []

  for (const a of roots.agents) {
    const hasOwner = a.owner_id != null
    const ownerBackup = hasOwner ? backups.get(a.owner_id) : null
    assets.push({
      id: a.id, name: a.name, type: 'agent',
      ownerEmployeeId: hasOwner ? a.owner_id : null,
      owner: ownerName(a.owner_id),
      backup_owner: ownerBackup?.backupOwner ?? null,
      criticality: entityCriticality('agent', a),
      department: ownerDept(a.owner_id),
      documented: documentedByAsset.agent.get(a.id) ?? false,
    })
  }

  for (const w of roots.workflows) {
    const rb = runbookByWorkflow.get(w.id)
    const hasOwner = rb?.owner_id != null
    const ownerBackup = hasOwner ? backups.get(rb.owner_id) : null
    assets.push({
      id: w.id, name: w.name, type: 'workflow',
      ownerEmployeeId: hasOwner ? rb.owner_id : null,
      owner: hasOwner ? ownerName(rb.owner_id) : null,
      backup_owner: ownerBackup?.backupOwner ?? null,
      criticality: entityCriticality('workflow', w),
      department: w.department || 'Unassigned',
      documented: rb ? Boolean(rb.is_documented) : false,
    })
  }

  for (const p of roots.ai_platforms) {
    const ownerEmployeeId = platformOwnerEmployeeId.get(p.id) ?? null
    assets.push({
      id: p.id, name: p.name, type: 'tool',
      ownerEmployeeId,
      owner: ownerName(ownerEmployeeId),
      backup_owner: platformBackupName.get(p.id) ?? null,
      criticality: entityCriticality('platform', p, { knowledgeAssets: roots.knowledge_assets }),
      department: platformDepts.get(p.id) || 'General',
      documented: documentedByAsset.platform.get(p.id) ?? false,
    })
  }

  return assets
}

function orgMemory(roots) {
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  const ownerName = (employeeId) => (employeeId != null ? employeeById.get(employeeId)?.name ?? null : null)

  const assets = ownedAssetBase(roots).map((a) => ({
    ...a,
    memoryStatus: memoryStatus(a.ownerEmployeeId != null, a.documented, Boolean(a.backup_owner)),
  }))

  const preserved = assets.filter((a) => a.memoryStatus === 'PRESERVED')
  const atRisk = assets.filter((a) => a.memoryStatus === 'AT_RISK')
  const vulnerable = assets.filter((a) => a.memoryStatus === 'VULNERABLE')
  const lost = assets.filter((a) => a.memoryStatus === 'LOST')

  const evidence = evidenceGate(assets, () => true)
  const imhs = evidence.sufficient ? calcIMHS(preserved.length, vulnerable.length, atRisk.length, assets.length) : null
  const imhsVerdict = !evidence.sufficient ? null : imhs >= 75 ? 'HEALTHY' : imhs >= 45 ? 'AT_RISK' : 'CRITICAL'

  const ownerIds = new Set(assets.map((a) => a.ownerEmployeeId).filter((id) => id != null))
  const carriers = [...ownerIds].map((employeeId) => {
    const owned = assets.filter((a) => a.ownerEmployeeId === employeeId)
    const undocumented = owned.filter((a) => !a.documented)
    const noBackup = owned.filter((a) => !a.backup_owner)
    const undocumentedCount = undocumented.length
    const noBackupCount = noBackup.length

    const preservedCount = owned.filter((a) => a.memoryStatus === 'PRESERVED').length
    const vulnerableCount = owned.filter((a) => a.memoryStatus === 'VULNERABLE').length
    const atRiskCount = owned.filter((a) => a.memoryStatus === 'AT_RISK').length
    const lostCount = owned.filter((a) => a.memoryStatus === 'LOST').length

    return {
      employeeId,
      name: ownerName(employeeId),
      totalOwned: owned.length,
      preservedCount,
      vulnerableCount,
      atRiskCount,
      lostCount,
      undocumentedCount,
      noBackupCount,
      assets: owned,
      tier: memoryCarrierTier(undocumentedCount, noBackupCount),
      // Same IMHS formula as the org-wide score, scoped to just this person's
      // holdings -- the number routes/memory/memory.js's per-employee route
      // needs and used to recompute with its own (wrong, D-60) formula.
      healthScore: owned.length ? calcIMHS(preservedCount, vulnerableCount, atRiskCount, owned.length) : null,
      isCriticalCarrier: undocumented.some((a) => !a.backup_owner),
    }
  })

  const tierOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  carriers.sort((a, b) =>
    tierOrder[a.tier] !== tierOrder[b.tier] ? tierOrder[a.tier] - tierOrder[b.tier] : b.undocumentedCount - a.undocumentedCount,
  )

  return {
    assets,
    preserved,
    atRisk,
    vulnerable,
    lost,
    carriers,
    criticalCarriers: carriers.filter((c) => c.tier === 'CRITICAL'),
    highCarriers: carriers.filter((c) => c.tier === 'HIGH'),
    imhs,
    imhsVerdict,
    evidence,
    totalAssets: assets.length,
    ...provenance({
      employees: roots._counts.employees,
      agents: roots._counts.agents,
      workflows: roots._counts.workflows,
      workflow_runbooks: roots._counts.workflow_runbooks,
      ai_platforms: roots._counts.ai_platforms,
      tool_ownership: roots._counts.tool_ownership,
      tool_backups: roots._counts.tool_backups,
      tool_users: roots._counts.tool_users,
      knowledge_assets: roots._counts.knowledge_assets,
      owners: roots._counts.owners,
    }),
  }
}

/**
 * Per-asset disruption survival status + governance score/compliance-violation
 * count, plus org and department rollups. Was frontend/lib/continuityRisk.ts's
 * computeContinuityRisk(), computed client-side.
 *
 * D-61: genuinely missing backend-side, unlike D-57 through D-60. M18/M19
 * (`GET /api/intelligence/continuity` / `/governance`) are real brain-module
 * outputs, but org/department AGGREGATES over a different formula (see
 * `orgHealth()`'s own `continuityScore` above, and its D-21 header comment) --
 * not a per-asset survival/governance answer. The `/continuity` page already
 * labels this heuristic "Estimated ... not M18/M19" rather than claiming it
 * was either module, so this migration doesn't reconcile two disagreeing
 * formulas the way D-60 did -- it just moves the one that exists off the
 * client.
 *
 * Ported verbatim: same four-way survival rule, same governance deductions
 * (-40 no owner / -25 no backup / -20 undocumented), same complianceViolations
 * count, same must-protect/worst-offenders selection (top 10 each).
 *
 * One departure, consistent with D-59/D-60's same call: criticality is
 * resolved via entityCriticality() (real 'unknown' sentinel) instead of the
 * frontend's resolveCriticality() (defaults unassessed to 'low' before it
 * even reaches this formula) / this file's own `|| 'medium'` display fallback
 * (dead code in practice, since resolveCriticality already never returns
 * empty). Behavior-preserving: `atOrAbove('unknown', 'high')` is false the
 * same way `atOrAbove('low', 'high')` was, so highStakes/mustProtect's boolean
 * is unchanged -- only the previously-fabricated displayed label changes, to
 * an honest "we don't know."
 *
 * Reuses ownedAssetBase(roots) (factored out alongside this function) for
 * owner/backup/documented/criticality/department resolution instead of a
 * fifth reimplementation of the same four signals orgMemory() already
 * resolves one way.
 */
const SURVIVAL_VALUE = { LOST: 0, FAILS: 30, DEGRADED: 70, SURVIVES: 100 }

function survivalStatus(hasOwner, hasBackup, documented, highStakes) {
  if (!hasOwner) return highStakes ? 'LOST' : 'DEGRADED'
  if (!hasBackup) return highStakes ? 'FAILS' : 'DEGRADED'
  if (!documented) return 'DEGRADED'
  return 'SURVIVES'
}

function continuityGovernanceScore(hasOwner, hasBackup, documented) {
  let score = 100
  if (!hasOwner) score -= 40
  if (!hasBackup) score -= 25
  if (!documented) score -= 20
  return Math.max(0, score)
}

function assetContinuity(roots) {
  const assets = ownedAssetBase(roots).map((a) => {
    const hasOwner = a.ownerEmployeeId != null
    const hasBackup = Boolean(a.backup_owner)
    const highStakes = atOrAbove(a.criticality, 'high')
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      department: a.department,
      owner: a.owner ?? 'None',
      criticality: a.criticality,
      documented: a.documented,
      backup_owner: a.backup_owner,
      survivalStatus: survivalStatus(hasOwner, hasBackup, a.documented, highStakes),
      governanceScore: continuityGovernanceScore(hasOwner, hasBackup, a.documented),
      complianceViolations: [!hasOwner, !hasBackup, !a.documented].filter(Boolean).length,
    }
  })

  const deptContinuity = {}
  const deptGovernance = {}
  let totalSurvScore = 0
  let totalGovScore = 0

  for (const a of assets) {
    const survVal = SURVIVAL_VALUE[a.survivalStatus]
    totalSurvScore += survVal
    totalGovScore += a.governanceScore

    if (!deptContinuity[a.department]) deptContinuity[a.department] = { total: 0, survives: 0, fails: 0, scoreTotal: 0 }
    const dc = deptContinuity[a.department]
    dc.total++
    if (a.survivalStatus === 'SURVIVES') dc.survives++
    if (a.survivalStatus === 'FAILS' || a.survivalStatus === 'LOST') dc.fails++
    dc.scoreTotal += survVal

    if (!deptGovernance[a.department]) deptGovernance[a.department] = { total: 0, healthy: 0, atRisk: 0, scoreTotal: 0 }
    const dg = deptGovernance[a.department]
    dg.total++
    dg.scoreTotal += a.governanceScore
    if (a.governanceScore >= 80) dg.healthy++
    if (a.governanceScore < 60) dg.atRisk++
  }

  for (const d of Object.values(deptContinuity)) { d.score = round(d.scoreTotal / d.total); delete d.scoreTotal }
  for (const d of Object.values(deptGovernance)) { d.score = round(d.scoreTotal / d.total); delete d.scoreTotal }

  // Zero assets is insufficient evidence, not a fabricated 0 -- same call
  // calcIMHS's own header comment already made for org memory (D-24).
  const evidence = evidenceGate(assets, () => true)
  const orgSurvivalScore = evidence.sufficient ? round(totalSurvScore / assets.length) : null
  const orgGovernanceScore = evidence.sufficient ? round(totalGovScore / assets.length) : null

  const mustProtect = assets
    .filter((a) => atOrAbove(a.criticality, 'high') && (a.survivalStatus === 'FAILS' || a.survivalStatus === 'LOST'))
    .sort((a, b) => b.complianceViolations - a.complianceViolations)
    .slice(0, 10)

  const worstOffenders = assets
    .filter((a) => a.governanceScore < 70)
    .sort((a, b) => a.governanceScore - b.governanceScore)
    .slice(0, 10)

  return {
    assets,
    orgSurvivalScore,
    orgGovernanceScore,
    mustProtect,
    worstOffenders,
    deptContinuity,
    deptGovernance,
    evidence,
    ...provenance({
      employees: roots._counts.employees,
      agents: roots._counts.agents,
      workflows: roots._counts.workflows,
      workflow_runbooks: roots._counts.workflow_runbooks,
      ai_platforms: roots._counts.ai_platforms,
      tool_ownership: roots._counts.tool_ownership,
      tool_backups: roots._counts.tool_backups,
      tool_users: roots._counts.tool_users,
      knowledge_assets: roots._counts.knowledge_assets,
      owners: roots._counts.owners,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. EXECUTIVE MEMORY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces the 10 `executive_memory_items` rows.
 *
 * The frozen table's four `memory_type` values each have a root that can
 * produce them, so this is a projection rather than an invention:
 *
 *   repeat_offender  a workflow that has failed more than once
 *   lesson           a failure MODE seen across two or more workflows — the
 *                    pattern is the lesson; a one-off is just an incident
 *   hero_risk        a person carrying two or more critical assets with nobody
 *                    named as their backup
 *   bad_decision     a decision recorded as negative, or flagged for revisit
 *
 * `relevanceScore` is 0-1 and ranks within the whole set so a caller can take
 * a top-N without knowing what the types mean.
 *
 * Roots: workflows, workflow_failures, agents, owners, employees, decision_history.
 * NOT used: failure_patterns, incident_patterns, hero_dependencies — all three
 * are frozen pre-aggregates of exactly these questions.
 */
const HERO_CRITICAL_ASSET_THRESHOLD = 2
const SEVERITY_RANK = { critical: 1, high: 0.8, medium: 0.55, low: 0.3 }

function executiveMemory(roots) {
  const items = []
  const workflowById = new Map(roots.workflows.map((w) => [w.id, w]))

  // ── repeat offenders ──────────────────────────────────────────────────────
  const failuresByWorkflow = new Map()
  for (const f of roots.workflow_failures) {
    if (!failuresByWorkflow.has(f.workflow_id)) failuresByWorkflow.set(f.workflow_id, [])
    failuresByWorkflow.get(f.workflow_id).push(f)
  }
  for (const [workflowId, failures] of failuresByWorkflow) {
    if (failures.length < 2) continue
    const workflow = workflowById.get(workflowId)
    if (!workflow) continue
    const worst = failures.map((f) => SEVERITY_RANK[f.severity] ?? 0.3).sort((a, b) => b - a)[0]
    items.push({
      memoryType: 'repeat_offender',
      title: `${workflow.name} has failed ${failures.length} times`,
      description: `Failure modes recorded: ${[...new Set(failures.map((f) => f.failure_type))].join(', ')}.`,
      entityName: workflow.name,
      severity: failures.some((f) => f.severity === 'critical') ? 'critical' : 'high',
      isRecurring: true,
      sourceModule: 'derived.executiveMemory',
      relevanceRaw: worst * failures.length,
      evidence: { workflowId, failureCount: failures.length },
    })
  }

  // ── lessons: failure modes that recur ACROSS workflows ────────────────────
  const byType = new Map()
  for (const f of roots.workflow_failures) {
    if (!byType.has(f.failure_type)) byType.set(f.failure_type, new Set())
    byType.get(f.failure_type).add(f.workflow_id)
  }
  for (const [failureType, workflowIds] of byType) {
    if (workflowIds.size < 2) continue
    const names = [...workflowIds].map((id) => workflowById.get(id)).filter(Boolean).map((w) => w.name)
    items.push({
      memoryType: 'lesson',
      title: `"${failureType}" has affected ${workflowIds.size} different workflows`,
      description: `A recurring organizational failure mode rather than an isolated incident. Affected: ${names.join(', ')}.`,
      entityName: failureType,
      severity: workflowIds.size >= 3 ? 'high' : 'medium',
      isRecurring: true,
      sourceModule: 'derived.executiveMemory',
      relevanceRaw: workflowIds.size * 0.8,
      evidence: { failureType, workflowCount: workflowIds.size, affectedEntities: names },
    })
  }

  // ── hero risks ────────────────────────────────────────────────────────────
  const backups = backupIndex(roots)
  const employeeById = new Map(roots.employees.map((e) => [e.id, e]))
  // agents.owner_id IS an employees.id directly, not an owners.id (see
  // routes/ownership.js's header comment for the id-space trap this avoids).
  const criticalOwned = new Map()
  for (const a of roots.agents) {
    if (a.owner_id == null || !atOrAbove(a.risk, 'high')) continue
    const employeeId = a.owner_id
    if (!criticalOwned.has(employeeId)) criticalOwned.set(employeeId, [])
    criticalOwned.get(employeeId).push(a.name)
  }
  for (const [employeeId, assets] of criticalOwned) {
    if (assets.length < HERO_CRITICAL_ASSET_THRESHOLD) continue
    const backup = backups.get(employeeId)
    if (backup && backup.hasBackup) continue
    const employee = employeeById.get(employeeId)
    if (!employee) continue
    items.push({
      memoryType: 'hero_risk',
      title: `${employee.name} carries ${assets.length} critical assets with no backup`,
      description: `Owns ${assets.join(', ')}. No backup owner is named, so their absence removes all of it at once.`,
      entityName: employee.name,
      severity: assets.length >= 3 ? 'critical' : 'high',
      isRecurring: false,
      sourceModule: 'derived.executiveMemory',
      relevanceRaw: assets.length * 1.2,
      // `department` and `criticalAssetCount` are carried explicitly because
      // consumers display them. The frozen table also offered a
      // `resolution_count` ("N incidents resolved"); nothing in the schema
      // records incident resolutions, so that number was never derivable and is
      // deliberately not reproduced here.
      evidence: {
        employeeId,
        assets,
        criticalAssetCount: assets.length,
        department: employee.department || null,
      },
    })
  }

  // ── bad decisions ─────────────────────────────────────────────────────────
  for (const d of roots.decision_history) {
    const negative = d.outcome === 'negative'
    if (!negative && !d.should_revisit) continue
    items.push({
      memoryType: 'bad_decision',
      title: d.title,
      description: negative
        ? (d.description || 'Recorded with a negative outcome.')
        : (d.revisit_reason || 'Flagged for revisit.'),
      entityName: d.title,
      severity: negative ? 'high' : 'medium',
      isRecurring: false,
      sourceModule: 'derived.executiveMemory',
      relevanceRaw: negative ? 1.0 : 0.6,
      evidence: { decisionId: d.id, outcome: d.outcome, shouldRevisit: d.should_revisit },
    })
  }

  // Normalise relevance across the whole set, then drop the raw score.
  const maxRaw = Math.max(1, ...items.map((i) => i.relevanceRaw))
  const scored = items
    .map(({ relevanceRaw, ...rest }) => ({
      ...rest,
      relevanceScore: Math.round((relevanceRaw / maxRaw) * 100) / 100,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  return {
    items: scored,
    byType: scored.reduce((acc, i) => {
      acc[i.memoryType] = (acc[i.memoryType] || 0) + 1
      return acc
    }, {}),
    ...provenance({
      workflows: roots._counts.workflows,
      workflow_failures: roots._counts.workflow_failures,
      agents: roots._counts.agents,
      owners: roots._counts.owners,
      employees: roots._counts.employees,
      decision_history: roots._counts.decision_history,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. PILLARS  (GI / MI / DI / org_score)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces the four `intelligence_results` rows.
 *
 * ⚠ READ THIS BEFORE TRUSTING THESE NUMBERS.
 *
 * The other four analyses in this file recover a definition that the data or
 * the column names already implied. These three do not. The seeded rows
 * asserted GI=62, MI=55, DI=68 with no derivation recorded anywhere in the
 * repository, and none of the three matches any aggregate of the live source
 * tables (live governance averages 46, continuity 50, documentation 48).
 *
 * So the definitions below are AUTHORED, not recovered. They are a considered
 * proposal, not a restoration of intent:
 *
 *   GI — Governance Intelligence. Are the rules written down and followed?
 *        Equal thirds: runbook coverage (documented / all workflows), policy
 *        coverage (platforms under an active policy / all platforms), and a
 *        violation penalty (100 minus weighted open violations).
 *
 *   MI — Management Intelligence. Is it clear who answers for what?
 *        Equal thirds: the accountability score above, backup coverage (named
 *        owners with a backup / all named owners), and ownership coverage
 *        (knowledge assets with an owner / all knowledge assets).
 *
 *   DI — Data Intelligence. Can the organization trust what it knows?
 *        Equal thirds: documentation coverage (documented / all knowledge
 *        assets), verification rate (VERIFIED / all truth claims), and a
 *        contradiction penalty (100 minus the contradicted share, tripled,
 *        because a contradicted claim is far worse than a merely unverified
 *        one — it means two parts of the organization disagree on a fact).
 *
 *   org_score — weighted mean, GOVERNANCE 0.35 / MANAGEMENT 0.35 / DATA 0.30.
 *        Data is weighted slightly lower only because its inputs are the
 *        thinnest; raise it once truth_claims covers more of the estate.
 *
 * Each pillar returns its components, so a reader can see which third dragged
 * it down rather than being handed a bare number. If these weights are wrong
 * for the business, this is the one place to change them.
 */
const PILLAR_WEIGHTS = { GI: 0.35, MI: 0.35, DI: 0.30 }
const VIOLATION_SEVERITY_PENALTY = { critical: 25, high: 15, medium: 8, low: 3 }
const CONTRADICTION_PENALTY_MULTIPLIER = 3

function pillars(roots, accountabilityResult) {
  // ── GI ────────────────────────────────────────────────────────────────────
  const documentedRunbooks = roots.workflow_runbooks.filter((r) => r.is_documented).length
  const runbookCoverage = clamp(round(pct(documentedRunbooks, roots.workflows.length)))

  const platformsUnderPolicy = new Set(
    roots.tool_policies.filter((p) => p.status === 'active').map((p) => p.platform_id),
  ).size
  const policyCoverage = clamp(round(pct(platformsUnderPolicy, roots.ai_platforms.length)))

  // Per platform, not absolute. A flat total would mean five violations score
  // the same whether the estate is twelve platforms or twelve hundred, so the
  // measure would degrade into a headcount of incidents and every growing
  // organization would look like it was getting worse at governance.
  const violationWeight = roots.policy_violations.reduce(
    (sum, v) => sum + (VIOLATION_SEVERITY_PENALTY[v.severity] ?? 5), 0,
  )
  const violationScore = clamp(round(
    100 - (roots.ai_platforms.length ? violationWeight / roots.ai_platforms.length : 0),
  ))

  const GI = round(mean([runbookCoverage, policyCoverage, violationScore]))

  const giEvidence = combineEvidence({
    workflows: evidenceGate(roots.workflows, (w) => roots.workflow_runbooks.some((r) => r.workflow_id === w.id)),
    platforms: evidenceGate(roots.ai_platforms, (p) => roots.tool_policies.some((tp) => tp.platform_id === p.id)),
  })

  // ── MI ────────────────────────────────────────────────────────────────────
  const namedOwners = roots.owners.length
  const ownersWithBackup = roots.owners.filter((o) => o.backup_owner).length
  const backupCoverage = clamp(round(pct(ownersWithBackup, namedOwners)))

  const assetsWithOwner = roots.knowledge_assets.filter((k) => k.owner_id != null).length
  const ownershipCoverage = clamp(round(pct(assetsWithOwner, roots.knowledge_assets.length)))

  const MI = round(mean([accountabilityResult.accountabilityScore, backupCoverage, ownershipCoverage]))

  const miEvidence = combineEvidence({
    accountability: accountabilityResult.evidence,
    owners: evidenceGate(roots.owners, () => true),
    knowledgeAssets: evidenceGate(roots.knowledge_assets, () => true),
  })

  // ── DI ────────────────────────────────────────────────────────────────────
  const documentedAssets = roots.knowledge_assets.filter((k) => k.is_documented).length
  const documentationCoverage = clamp(round(pct(documentedAssets, roots.knowledge_assets.length)))

  const claims = roots.truth_claims
  const verified = claims.filter((c) => c.verdict === 'VERIFIED').length
  const verificationRate = clamp(round(pct(verified, claims.length)))

  const contradicted = claims.filter((c) => c.is_contradicted).length
  // pct() reads an empty table as 0% everywhere else in this file (same
  // convention as documentationCoverage/ownershipCoverage above). Computing
  // this one as 100 minus a penalty inverts that same "no data" condition
  // into the opposite verdict from verificationRate right next to it — an
  // org with zero truth_claims would show 0% verified but 100% trustworthy
  // in the same breath. Read "no data" as 0 here too, consistently.
  const contradictionScore = claims.length
    ? clamp(100 - round(pct(contradicted, claims.length) * CONTRADICTION_PENALTY_MULTIPLIER))
    : 0

  const DI = round(mean([documentationCoverage, verificationRate, contradictionScore]))

  const diEvidence = combineEvidence({
    knowledgeAssets: evidenceGate(roots.knowledge_assets, () => true),
    truthClaims: evidenceGate(roots.truth_claims, () => true),
  })

  const orgScore = round(GI * PILLAR_WEIGHTS.GI + MI * PILLAR_WEIGHTS.MI + DI * PILLAR_WEIGHTS.DI)
  const orgScoreEvidence = combineEvidence({ GI: giEvidence, MI: miEvidence, DI: diEvidence })

  const shape = (key, score, components, evidence) => ({
    resultType: 'pillar',
    resultKey: key,
    score: evidence.sufficient ? score : null,
    rating: evidence.sufficient ? band(score) : null,
    components,
    strengths: evidence.sufficient ? Object.entries(components).filter(([, v]) => v >= 70).map(([k]) => k) : [],
    weaknesses: evidence.sufficient ? Object.entries(components).filter(([, v]) => v < 50).map(([k]) => k) : [],
    evidence,
  })

  return {
    pillars: [
      shape('GI', GI, { runbookCoverage, policyCoverage, violationScore }, giEvidence),
      shape('MI', MI, {
        accountability: accountabilityResult.accountabilityScore,
        backupCoverage,
        ownershipCoverage,
      }, miEvidence),
      shape('DI', DI, { documentationCoverage, verificationRate, contradictionScore }, diEvidence),
    ],
    orgScore: {
      resultType: 'overall',
      resultKey: 'org_score',
      score: orgScoreEvidence.sufficient ? orgScore : null,
      rating: orgScoreEvidence.sufficient ? band(orgScore) : null,
      weights: PILLAR_WEIGHTS,
      evidence: orgScoreEvidence,
    },
    // Named loudly so nobody mistakes an authored metric for a measured one.
    definitionsAreAuthored: true,
    ...provenance({
      workflows: roots._counts.workflows,
      workflow_runbooks: roots._counts.workflow_runbooks,
      ai_platforms: roots._counts.ai_platforms,
      tool_policies: roots._counts.tool_policies,
      policy_violations: roots._counts.policy_violations,
      owners: roots._counts.owners,
      knowledge_assets: roots._counts.knowledge_assets,
      truth_claims: roots._counts.truth_claims,
      accountability_links: roots._counts.accountability_links,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5b. DECISION QUALITY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * The share of recorded decisions that did not turn out badly.
 *
 * `decision_history` is a log of things that happened, so unlike the summaries
 * above there was never a frozen aggregate to replace — brainCore already
 * computed this inline. It lives here so every signal that route consumes comes
 * from one consistent read of the roots instead of nine plus a stray query.
 *
 * Decisions still awaiting an outcome are excluded rather than counted as
 * successes; a pending decision is not evidence of good judgement.
 */
function decisionQuality(roots) {
  const decided = roots.decision_history.filter((d) => d.outcome)
  const negative = decided.filter((d) => d.outcome === 'negative').length
  const evidence = evidenceGate(roots.decision_history, (d) => d.outcome != null)
  const score = decided.length ? clamp(round(pct(decided.length - negative, decided.length))) : 50

  return {
    score: evidence.sufficient ? score : null,
    rating: evidence.sufficient ? band(score) : null,
    decisionsRecorded: roots.decision_history.length,
    decisionsWithOutcome: decided.length,
    negativeOutcomes: negative,
    flaggedForRevisit: roots.decision_history.filter((d) => d.should_revisit).length,
    evidence,
    ...provenance({ decision_history: roots._counts.decision_history }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. ORGANIZATIONAL HEALTH — the current month
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Produces one row shaped like `org_health_snapshots`, for THIS month.
 *
 * Unlike everything above, this is not a replacement — it is the missing write.
 * `org_health_snapshots` is a monthly time series, and history cannot be
 * recomputed: the Knowledge Graph has no time dimension (see domain/index.js),
 * so there is no way to ask what documentation coverage was in March. The six
 * existing months are seed data and stay exactly as they are.
 *
 * The five sub-scores match the table's existing columns so the series remains
 * one series rather than becoming two incompatible halves.
 */
// One failure per workflow per period costs 25 points. Chosen so a healthy
// estate (well under one failure each) stays in the 80s and a struggling one
// (two apiece) lands near 50, rather than pinning at either extreme.
const INCIDENT_LOAD_PENALTY_PER_FAILURE = 25

function orgHealth(roots, { accountability: acc, predictiveRisk: risk }) {
  const documentedAssets = roots.knowledge_assets.filter((k) => k.is_documented).length
  const documentationScore = clamp(round(pct(documentedAssets, roots.knowledge_assets.length)))

  const documentedRunbooks = roots.workflow_runbooks.filter((r) => r.is_documented).length
  const ownersWithBackup = roots.owners.filter((o) => o.backup_owner).length
  const continuityScore = clamp(round(mean([
    pct(documentedRunbooks, roots.workflows.length),
    pct(ownersWithBackup, roots.owners.length),
  ])))

  // Ownership SPREAD, not coverage: concentration is the risk. One person
  // holding many assets scores worse than the same assets spread thin.
  const perOwner = new Map()
  for (const a of roots.agents) {
    if (a.owner_id == null) continue
    perOwner.set(a.owner_id, (perOwner.get(a.owner_id) || 0) + 1)
  }
  const ownedAgents = [...perOwner.values()].reduce((a, b) => a + b, 0)
  const idealPerOwner = perOwner.size ? ownedAgents / perOwner.size : 0
  const worstConcentration = perOwner.size ? Math.max(...perOwner.values()) : 0
  // No agent has an owner at all (perOwner.size === 0) is a different failure
  // than "one person holds everything" — it means there is no concentration
  // to measure, not that concentration is maximal. Reading it as 0 (worst)
  // conflated "no signal" with "severe problem"; the fact that nothing is
  // owned is a real issue, but it is a different one, already captured by
  // ownershipCoverage in the MI pillar above.
  const ownershipSpreadScore = perOwner.size
    ? clamp(round(idealPerOwner ? 100 * (idealPerOwner / worstConcentration) : 0))
    : 100

  const criticalThreats = risk.scores.filter((s) => s.threatLevel === 'CRITICAL').length
  const criticalSafetyScore = clamp(round(100 - pct(criticalThreats, roots.agents.length) * 1.5))

  // Failures per workflow, not failures as a percentage of workflows. The
  // ratio here is naturally around 1 (11 failures across 10 workflows), so
  // scaling a percentage would saturate this to zero permanently and the score
  // would carry no information at all.
  const failuresPerWorkflow = roots.workflows.length
    ? roots.workflow_failures.length / roots.workflows.length
    : 0
  const incidentLoadScore = clamp(round(100 - failuresPerWorkflow * INCIDENT_LOAD_PENALTY_PER_FAILURE))

  const documentationEvidence = evidenceGate(roots.knowledge_assets, () => true)
  const continuityEvidence = combineEvidence({
    workflows: evidenceGate(roots.workflows, () => true),
    owners: evidenceGate(roots.owners, () => true),
  })
  const ownershipSpreadEvidence = evidenceGate(roots.agents, (a) => a.owner_id != null)
  const criticalSafetyEvidence = evidenceGate(roots.agents, () => true)
  const incidentLoadEvidence = evidenceGate(roots.workflows, () => true)

  const evidence = combineEvidence({
    documentation: documentationEvidence,
    continuity: continuityEvidence,
    ownershipSpread: ownershipSpreadEvidence,
    criticalSafety: criticalSafetyEvidence,
    incidentLoad: incidentLoadEvidence,
  })

  const healthIndex = evidence.sufficient ? round(mean([
    documentationScore, continuityScore, ownershipSpreadScore,
    criticalSafetyScore, incidentLoadScore,
  ])) : null

  const now = new Date()
  const snapshotMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  return {
    snapshotMonth,
    healthIndex,
    healthStatus: !evidence.sufficient ? null : (healthIndex >= 70 ? 'STABLE' : healthIndex >= 45 ? 'WARNING' : 'CRITICAL'),
    documentationScore: documentationEvidence.sufficient ? documentationScore : null,
    continuityScore: continuityEvidence.sufficient ? continuityScore : null,
    ownershipSpreadScore: ownershipSpreadEvidence.sufficient ? ownershipSpreadScore : null,
    criticalSafetyScore: criticalSafetyEvidence.sufficient ? criticalSafetyScore : null,
    incidentLoadScore: incidentLoadEvidence.sufficient ? incidentLoadScore : null,
    accountabilityScore: acc.accountabilityScore,
    evidence,
    ...provenance({
      knowledge_assets: roots._counts.knowledge_assets,
      workflow_runbooks: roots._counts.workflow_runbooks,
      workflows: roots._counts.workflows,
      owners: roots._counts.owners,
      agents: roots._counts.agents,
      workflow_failures: roots._counts.workflow_failures,
    }),
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. ORG HEALTH BY DEPARTMENT — same definition as §6, narrower population
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces `dept_health_scores` (D-09 DROP list; consumed by health.js /departments).
 *
 * Reuses orgHealth()'s exact five-dimension formula, once per department — not a
 * new definition, the same one over a filtered roots bundle. A department is any
 * value present in employees.department; an entity belongs to a department by:
 *
 *   workflows            -> workflows.department directly
 *   agents                -> owner_id -> employees.department directly (owner_id
 *                            IS an employees.id, not an owners.id -- see
 *                            routes/ownership.js's header comment)
 *   knowledge_assets      -> owner_id -> employees.department directly
 *   accountability_entities -> its own .department column
 *
 * A department with no employees at all cannot appear (there is nothing to key
 * it by); a department with employees but no agents/workflows/assets still gets
 * a row, scored on whatever it does have — orgHealth()'s own pct()/mean() helpers
 * already treat an empty population as 0, not as an omission.
 */
function filterRootsByDepartment(roots, department) {
	const employees = roots.employees.filter((e) => e.department === department)
	const employeeIds = new Set(employees.map((e) => e.id))

	const owners = roots.owners.filter((o) => employeeIds.has(o.employee_id))
	const agents = roots.agents.filter((a) => employeeIds.has(a.owner_id))
	const workflows = roots.workflows.filter((w) => w.department === department)
	const workflowIds = new Set(workflows.map((w) => w.id))

	const workflow_runbooks = roots.workflow_runbooks.filter((r) => workflowIds.has(r.workflow_id))
	const workflow_failures = roots.workflow_failures.filter((f) => workflowIds.has(f.workflow_id))
	const knowledge_assets = roots.knowledge_assets.filter((k) => employeeIds.has(k.owner_id))
	const accountability_entities = roots.accountability_entities.filter((e) => e.department === department)
	const entityIds = new Set(accountability_entities.map((e) => e.id))
	const accountability_links = roots.accountability_links.filter((l) => entityIds.has(l.entity_id))

	const filtered = {
		...roots,
		employees, owners, agents, workflows, workflow_runbooks, workflow_failures,
		knowledge_assets, accountability_entities, accountability_links,
	}
	filtered._counts = Object.fromEntries(ROOT_TABLES.map((t) => [t, filtered[t].length]))
	return filtered
}

function orgHealthByDepartment(roots) {
	const departments = [...new Set(roots.employees.map((e) => e.department).filter(Boolean))]

	const rows = departments.map((department) => {
		const deptRoots = filterRootsByDepartment(roots, department)
		const h = orgHealth(deptRoots, {
			accountability: accountability(deptRoots),
			predictiveRisk: predictiveRisk(deptRoots),
		})
		return {
			department,
			healthIndex: h.healthIndex,
			healthStatus: h.healthStatus,
			documentationScore: h.documentationScore,
			continuityScore: h.continuityScore,
			ownershipSpreadScore: h.ownershipSpreadScore,
			criticalSafetyScore: h.criticalSafetyScore,
			incidentLoadScore: h.incidentLoadScore,
		}
	})

	return {
		departments: rows,
		...provenance({ employees: roots._counts.employees, departments: departments.length }),
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. DEPARTMENT EXPOSURE — a different question from continuityScore (D-21)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replaces `department_exposure` (uncatalogued in the decision log; consumed by
 * learning.js /incidents and /departments).
 *
 * DEFINITION, AUTHORED — this is not a recovery of an existing formula (the
 * frozen table's seed rows carry no derivation), and it is deliberately NOT
 * orgHealthByDepartment's continuityScore under a new name: it answers "how
 * exposed is this department to disruption", not "how healthy is it overall".
 * Equal thirds: documentation coverage, backup coverage, and an incident-free
 * score scoped to THIS department's workflow failures (not the org-wide
 * failuresPerWorkflow orgHealth.incidentLoadScore uses).
 *
 * incidentRiskLevel bands the inverse of the exposure score — SEVERE means
 * highly exposed, LOW means well-covered — using the same 40/65/85 boundaries
 * band() uses everywhere else, so the vocabulary means the same thing here as
 * it does in every other score in the product.
 */
const DEPT_EXPOSURE_INCIDENT_PENALTY_PER_FAILURE = 30

function departmentExposure(roots) {
	const departments = [...new Set(roots.employees.map((e) => e.department).filter(Boolean))]
	const employeesByDept = new Map(departments.map((dep) => [dep, roots.employees.filter((e) => e.department === dep)]))

	const rows = departments.map((department) => {
		const employees = employeesByDept.get(department)
		const employeeIds = new Set(employees.map((e) => e.id))
		const owners = roots.owners.filter((o) => employeeIds.has(o.employee_id))
		const workflows = roots.workflows.filter((w) => w.department === department)
		const workflowIds = new Set(workflows.map((w) => w.id))
		const failures = roots.workflow_failures.filter((f) => workflowIds.has(f.workflow_id))
		const assets = roots.knowledge_assets.filter((k) => employeeIds.has(k.owner_id))

		const documentationCoverage = clamp(round(pct(assets.filter((a) => a.is_documented).length, assets.length)))
		const backupCoverage = clamp(round(pct(owners.filter((o) => o.backup_owner).length, owners.length)))

		const failuresPerWorkflow = workflows.length ? failures.length / workflows.length : 0
		const incidentFreeScore = clamp(round(100 - failuresPerWorkflow * DEPT_EXPOSURE_INCIDENT_PENALTY_PER_FAILURE))

		const incidentExposureScore = clamp(round(mean([documentationCoverage, backupCoverage, incidentFreeScore])))
		const incidentRiskLevel = band(100 - incidentExposureScore, ['LOW', 'MODERATE', 'HIGH', 'SEVERE'])

		const evidence = combineEvidence({
			knowledgeAssets: evidenceGate(assets, () => true),
			owners: evidenceGate(owners, () => true),
		})

		return {
			department,
			documentationCoverage: evidence.sufficient ? documentationCoverage : null,
			backupCoverage: evidence.sufficient ? backupCoverage : null,
			incidentExposureScore: evidence.sufficient ? incidentExposureScore : null,
			incidentRiskLevel: evidence.sufficient ? incidentRiskLevel : null,
			evidence,
		}
	})

	return {
		departments: rows,
		...provenance({ employees: roots._counts.employees, departments: departments.length }),
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// Orchestration
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Computes every derived product from a single consistent read of the roots.
 *
 * Ordering matters in exactly two places: `pillars` consumes the accountability
 * score, and `orgHealth` consumes both accountability and predictive risk.
 * Neither recomputes them, so MI and the health index cannot drift from the
 * accountability figure shown elsewhere in the same response.
 */
async function computeAll(supabase) {
  const roots = await loadRoots(supabase)

  const accountabilityResult = accountability(roots)
  const collaborationResult = collaboration(roots)
  const predictiveRiskResult = predictiveRisk(roots)
  const executiveMemoryResult = executiveMemory(roots)
  const pillarsResult = pillars(roots, accountabilityResult)
  const decisionQualityResult = decisionQuality(roots)
  const orgHealthResult = orgHealth(roots, {
    accountability: accountabilityResult,
    predictiveRisk: predictiveRiskResult,
  })

  return {
    accountability: accountabilityResult,
    collaboration: collaborationResult,
    predictiveRisk: predictiveRiskResult,
    executiveMemory: executiveMemoryResult,
    pillars: pillarsResult,
    decisionQuality: decisionQualityResult,
    orgHealth: orgHealthResult,
    orgHealthByDepartment: orgHealthByDepartment(roots),
    departmentExposure: departmentExposure(roots),
    // Added so dashboard.js/ownership.js/continuity.js/knowledge/intelligence.js
    // (and memory.js) can go through computeAllCached()'s 30-second memo
    // instead of each calling loadRoots() + their own compute function
    // directly -- a dashboard mounting several of these at once used to cost
    // one full 18-query root read per component instead of one shared read.
    // All four are pure functions of `roots` alone, same as everything above.
    humanDependencyRisk: humanDependencyRisk(roots),
    knowledgeConcentration: knowledgeConcentration(roots),
    orgMemory: orgMemory(roots),
    assetContinuity: assetContinuity(roots),
    computedAt: new Date().toISOString(),
    source: 'live',
    rootCounts: roots._counts,
  }
}

// ─── Short-lived memo ────────────────────────────────────────────────────────

/**
 * `computeAll` issues 18 parallel reads. A dashboard mounting ten components
 * that each want a summary would otherwise cost 180 round trips per page.
 *
 * This memo is NOT the frozen-table pattern returning under a new name, and the
 * difference is worth being precise about. A persisted snapshot survives process
 * restarts and deploys, so it can be arbitrarily old and nothing in the system
 * knows. This lives in process memory, expires in seconds, and reports the
 * genuine `computedAt` of the computation it holds. The worst case is an answer
 * a few seconds behind the database; the worst case of the tables this replaced
 * was an answer fourteen days behind it with no way to tell.
 */
const MEMO_TTL_MS = 30_000
let memo = null

async function computeAllCached(supabase, { force = false } = {}) {
  const now = Date.now()
  if (!force && memo && now - memo.at < MEMO_TTL_MS) {
    return { ...memo.value, fromMemo: true }
  }
  const value = await computeAll(supabase)
  memo = { at: now, value }
  return { ...value, fromMemo: false }
}

/** Drops the memo. Called after any write that changes the roots. */
function invalidate() {
  memo = null
}

module.exports = {
  ROOT_TABLES,
  loadRoots,
  dependencyIndex,
  cascadeReach,
  computeAllCached,
  invalidate,
  MEMO_TTL_MS,
  accountability,
  collaboration,
  predictiveRisk,
  humanDependencyRisk,
  knowledgeConcentration,
  orgMemory,
  assetContinuity,
  executiveMemory,
  pillars,
  decisionQuality,
  orgHealth,
  orgHealthByDepartment,
  departmentExposure,
  computeAll,
  // Exported so tests can assert against the definitions rather than
  // hard-coding the same magic numbers a second time.
  constants: {
    RACI_BOTH_SEPARATE, RACI_BOTH_SAME_PERSON, RACI_ONE_ONLY,
    USAGE_WEIGHT, AGENT_ENGAGEMENT_WEIGHT, ADOPTION_SATURATION,
    DEPENDENCY_PER_CRITICAL_ASSET, DEPENDENCY_NO_BACKUP,
    RISK_FACTORS, MANY_DEPENDENTS,
    HERO_CRITICAL_ASSET_THRESHOLD,
    PILLAR_WEIGHTS, VIOLATION_SEVERITY_PENALTY,
  },
}
