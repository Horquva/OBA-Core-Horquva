/**
 * CONSTITUTIONAL MODULE IMPLEMENTATIONS (M01–M55) — REAL LOGIC, NO STUBS
 * ---------------------------------------------------------------------
 * Each implementation receives (runtime, context) and returns an intelligence
 * fragment { type, payload, confidence, evidence, recommendations,
 * relationships }. The binder wraps it into a validated Intelligence Package.
 *
 * Every function computes genuine results from the Unified Knowledge Graph
 * (runtime.graph) and, where constitutional, consumes prior modules'
 * intelligence via context.priorIntel.
 *
 * Ownership (of the 23 modules remaining after the 2026-09-02 retirements —
 * see the note below):
 *   Huzaifa  (reality)   — M01 M02 M03 M07 M19 M20 M28 M29 M31 M34 M35
 *   Kamran   (reasoning) — M04 M18 M39 M40
 *   Tahir    (prediction)— M32 M37 M41 M42 M43 M44 M45 M49
 *
 * RESOLVED module-code overlap: until 2026-08-24, M39, M40, M46, M48 and M54
 * below were ALSO independently implemented in
 * backend/routes/intelligence/constitutional.js (via domain/dataset.js's
 * Supabase joins, not this file's knowledge graph) — two real, disagreeing
 * answers to the same catalog code. That file's analyses were renamed off the
 * M-numbers entirely (they compute a related but different question, e.g. its
 * "capability" is a per-department score, M39 here is capability counts), so
 * M01–M55 is now exclusively this file's namespace. See
 * docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
 *
 * RETIRED 2026-09-02 (27 modules, catalog 51 → 24): M05, M06, M08, M09, M11,
 * M13, M14, M15, M16, M21, M22, M23, M24, M25, M26, M27, M33, M36, M38, M46,
 * M48, M50, M51, M52, M53, M54, M55. Each was audited against the live SQL /
 * domain/derived.js system already answering the same-sounding question and
 * found redundant with something richer and already shipping — verified by
 * reading both implementations, not just matching names. Two findings from
 * that audit are worth keeping in mind:
 *   - M52/M53 duplicated other BRAIN modules (M19, M18), not just SQL — the
 *     catalog had internal duplication too.
 *   - M46→M48→M55 (Truth gates Advisor, Meta-Brain fuses last) is retired as
 *     a public-facing chain because all three stages already have richer live
 *     answers (truth.js's real claims-verification system, M04's 8-rule
 *     recommendation engine, and TWO existing fusion systems —
 *     orchestrator.js and brainCore.js) — not because verification/advice/
 *     fusion aren't real questions.
 * This is the same retirement M10/M12/M17/M47 already went through on
 * 2026-08-24, for the same reason: the question was already answered live,
 * by something else, better.
 *
 * RETIRED 2026-09-02, LATER THE SAME DAY (1 module, catalog 24 → 23): M30
 * Knowledge Concentration. Found while auditing the other 23 for live
 * wiring — its ownershipConcentration() (analytics.js) was a flat asset
 * count per owner; derived.js's knowledgeConcentration(), already live at
 * GET /api/knowledge/intelligence, is criticality-WEIGHTED and answers the
 * exact same constitutional question ("Where is knowledge dangerously
 * concentrated?") with a strictly richer signal. analytics.js's
 * ownershipConcentration() was deleted with it — no other caller.
 *
 * WIRED UP 2026-09-02: the retirement audit above also checked the other 23
 * modules for a live route, not just for SQL duplication. Five had neither —
 * M28, M29, M31, M34, M35 — and were exposed at
 * routes/intelligence/reality.js. A further five were found to compute real
 * content their nearest SQL analogue does not (each unifies MULTIPLE source
 * tables into one graph via graphLoader.js, where the SQL route reads only
 * one): M02 and M03's depends_on-derived rankings cover agent_platform/
 * workflow_tool_dependencies/system_dependencies/system_agent_usage, which
 * GET /api/dependencies and GET /api/risks (both single-table, agent-scoped)
 * do not; M07 exposes governedBy/dependsOn/supports detail per AI agent
 * (including automation agents, which GET /api/tool-intelligence never
 * covers — that route is ai_platforms/"tools" only); M32 ranks blast radius
 * across every entity type, not just agents (GET /api/dependencies/agent-
 * spofs's scope); M49 mirrors the full graph as one snapshot, which nothing
 * else returns in one call. M02/M03/M07 are in reality.js alongside
 * M28/M29/M31/M34/M35 (same owner/layer); M32/M49 are in prediction.js
 * (Tahir/prediction layer, alongside M37/M41-45).
 */

const A = require('./analytics')
const { atOrAbove } = require('../../domain/definitions')
const ev = (source, ref, note) => ({ source, ref, note })

const IMPL = {}

// ══════════════ HUZAIFA — REALITY LAYER ══════════════

// M01 — Ownership Intelligence: who owns what; find unowned/critical assets.
IMPL.M01 = (rt) => {
  const g = rt.graph
  const assets = A.assets(g)
  const map = assets.map((a) => ({
    entity: a.name, id: a.id, type: a.type,
    owners: A.owners(g, a.id).map((r) => A.nameOf(g, r.from)),
  }))
  const unowned = map.filter((m) => m.owners.length === 0)
  const evidence = A.edgesOfType(g, 'owns').map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} owns ${A.nameOf(g, r.to)}`))
  const coverage = assets.length ? (assets.length - unowned.length) / assets.length : 1
  return {
    type: 'ownership',
    payload: {
      totalAssets: assets.length,
      ownedAssets: assets.length - unowned.length,
      unownedAssets: unowned.map((u) => u.entity),
      ownershipCoverage: A.round(coverage),
      ownershipMap: map,
    },
    confidence: A.confidence(evidence.length, coverage),
    evidence,
    recommendations: unowned.map((u) => `Assign an accountable owner to "${u.entity}" (${u.type}).`),
  }
}

// M02 — Dependency Intelligence: what depends on what; fan-in ranking.
IMPL.M02 = (rt) => {
  const g = rt.graph
  const deps = A.edgesOfType(g, 'depends_on')
  const ranking = A.fanInRanking(g)
  const evidence = deps.map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} depends_on ${A.nameOf(g, r.to)} (${r.criticality})`))
  return {
    type: 'dependency',
    payload: {
      dependencyCount: deps.length,
      mostDependedUpon: ranking.slice(0, 5),
      criticalDependencies: deps.filter((r) => atOrAbove(r.criticality, 'high')).map((r) => ({
        from: A.nameOf(g, r.from), to: A.nameOf(g, r.to), failureImpact: r.failureImpact,
      })),
    },
    confidence: A.confidence(evidence.length, deps.length ? 1 : 0),
    evidence,
    recommendations: ranking.slice(0, 3).map((x) => `"${x.name}" is depended on by ${x.dependents} entities — protect it with redundancy.`),
  }
}

// M03 — Risk Intelligence: where is the org vulnerable? SPOF + critical deps.
IMPL.M03 = (rt) => {
  const g = rt.graph
  const spofs = A.singlePointsOfFailure(g)
  const criticalDeps = A.edgesOfType(g, 'depends_on').filter((r) => atOrAbove(r.criticality, 'high'))
  const assets = A.assets(g)
  const riskScore = A.round(Math.min(1, (spofs.length * 0.5 + criticalDeps.length * 0.3) / Math.max(1, assets.length)))
  const evidence = [
    ...spofs.map((s) => ev('entity', s.id, `SPOF: ${s.name} (${s.dependents} dependents, ${s.owners} owner)`)),
    ...criticalDeps.map((r) => ev('relationship', r.id, `critical dependency ${A.nameOf(g, r.from)}→${A.nameOf(g, r.to)}`)),
  ]
  return {
    type: 'risk',
    payload: {
      riskScore,
      riskLevel: riskScore > 0.66 ? 'high' : riskScore > 0.33 ? 'medium' : 'low',
      singlePointsOfFailure: spofs,
      criticalDependencyCount: criticalDeps.length,
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: spofs.slice(0, 5).map((s) => `Mitigate single point of failure "${s.name}": add a backup owner and redundancy.`),
  }
}

// M07 — AI Tool Intelligence: which AI agents exist and how governed.
IMPL.M07 = (rt) => {
  const g = rt.graph
  const agents = A.byType(g, 'ai_agent')
  const detail = agents.map((a) => ({
    name: a.name, id: a.id,
    owners: A.owners(g, a.id).map((r) => A.nameOf(g, r.from)),
    dependsOn: A.dependencies(g, a.id).map((r) => A.nameOf(g, r.to)),
    governedBy: g.relationships.to(a.id).filter((r) => r.type === 'governs').map((r) => A.nameOf(g, r.from)),
    supports: g.relationships.from(a.id).filter((r) => r.type === 'supports').map((r) => A.nameOf(g, r.to)),
  }))
  const ungoverned = detail.filter((d) => d.governedBy.length === 0)
  const evidence = agents.map((a) => ev('entity', a.id, `AI agent: ${a.name}`))
  return {
    type: 'governance',
    payload: { aiAgentCount: agents.length, agents: detail, ungovernedAgents: ungoverned.map((d) => d.name) },
    confidence: A.confidence(evidence.length, agents.length ? 1 : 0),
    evidence,
    recommendations: ungoverned.map((d) => `Bring AI agent "${d.name}" under an explicit governance policy.`),
  }
}

// M19 — Governance Intelligence: policies and what they govern; gaps.
IMPL.M19 = (rt) => {
  const g = rt.graph
  const policies = A.byType(g, 'policy')
  const governs = A.edgesOfType(g, 'governs')
  const governedIds = new Set(governs.map((r) => r.to))
  const ungovernedAssets = A.assets(g).filter((a) => a.type !== 'policy' && !governedIds.has(a.id))
  const evidence = governs.map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} governs ${A.nameOf(g, r.to)}`))
  const coverage = A.assets(g).length ? governedIds.size / A.assets(g).length : 1
  return {
    type: 'governance',
    payload: {
      policyCount: policies.length,
      governedEntities: [...governedIds].map((id) => A.nameOf(g, id)),
      ungovernedAssets: ungovernedAssets.map((a) => a.name),
      governanceCoverage: A.round(coverage),
    },
    confidence: A.confidence(evidence.length, coverage),
    evidence,
    recommendations: ungovernedAssets.slice(0, 5).map((a) => `Extend a governance policy to cover "${a.name}".`),
  }
}

// M20 — Accountability Intelligence: reporting chains; who is accountable.
IMPL.M20 = (rt) => {
  const g = rt.graph
  const reports = A.edgesOfType(g, 'reports_to')
  const chains = reports.map((r) => ({ who: A.nameOf(g, r.from), reportsTo: A.nameOf(g, r.to) }))
  const manages = A.edgesOfType(g, 'manages').map((r) => ({ manager: A.nameOf(g, r.from), manages: A.nameOf(g, r.to) }))
  const assetsNoAccountable = A.assets(g).filter((a) => A.owners(g, a.id).length === 0)
  const evidence = [
    ...reports.map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} reports_to ${A.nameOf(g, r.to)}`)),
    ...A.edgesOfType(g, 'manages').map((r) => ev('relationship', r.id, `manages`)),
  ]
  return {
    type: 'accountability',
    payload: { reportingChains: chains, managementLinks: manages, assetsWithoutAccountableOwner: assetsNoAccountable.map((a) => a.name) },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: assetsNoAccountable.map((a) => `No accountable owner for "${a.name}" — define accountability.`),
  }
}

// M28 — Universal Dependency Graph: full network + cycle detection + longest chain.
IMPL.M28 = (rt) => {
  const g = rt.graph
  const deps = A.edgesOfType(g, 'depends_on')
  const cycles = A.detectCycles(g)
  const adjacency = {}
  for (const r of deps) {
    const from = A.nameOf(g, r.from)
    ;(adjacency[from] = adjacency[from] || []).push(A.nameOf(g, r.to))
  }
  let longest = []
  for (const e of A.all(g)) {
    const chain = A.transitiveDependencies(g, e.id)
    if (chain.length > longest.length) longest = [e.id, ...chain]
  }
  const evidence = deps.map((r) => ev('relationship', r.id, 'dependency edge'))
  return {
    type: 'dependency',
    payload: {
      nodes: A.all(g).length,
      dependencyEdges: deps.length,
      cyclesDetected: cycles,
      hasCycles: cycles.length > 0,
      longestDependencyChain: longest.map((id) => A.nameOf(g, id)),
      adjacency,
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: cycles.length ? [`Circular dependency detected: ${cycles[0].join(' → ')} — break the cycle.`] : [],
  }
}

// M29 — Relationship Intelligence: relationship health + type distribution.
IMPL.M29 = (rt) => {
  const g = rt.graph
  const all = g.relationships.list()
  const dist = {}
  for (const r of all) dist[r.type] = (dist[r.type] || 0) + 1
  const collaborations = A.edgesOfType(g, 'collaborates_with')
  const isolated = A.all(g).filter((e) => A.degree(g, e.id) === 0)
  const evidence = all.slice(0, 20).map((r) => ev('relationship', r.id, r.type))
  return {
    type: 'relationship',
    payload: {
      totalRelationships: all.length,
      typeDistribution: dist,
      collaborationLinks: collaborations.length,
      isolatedEntities: isolated.map((e) => e.name),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: isolated.map((e) => `"${e.name}" has no relationships — verify it is correctly connected.`),
  }
}

// M31 — Ecosystem Intelligence: internal + external ecosystem.
IMPL.M31 = (rt) => {
  const g = rt.graph
  // Every entity type the ontology defines that ISN'T vendor/customer is
  // internal by construction (internal/external is a hard binary here, not a
  // third category) -- this list previously omitted organization, knowledge,
  // policy and decision, so an "internal ecosystem" of 157 real entities
  // counted only 89 of them.
  const internalTypes = ['department', 'team', 'employee', 'executive', 'system', 'ai_agent', 'workflow', 'process', 'organization', 'knowledge', 'policy', 'decision']
  const externalTypes = ['vendor', 'customer']
  const internal = A.byTypes(g, internalTypes)
  const external = A.byTypes(g, externalTypes)
  const evidence = [...internal, ...external].map((e) => ev('entity', e.id, `${e.type}: ${e.name}`))
  return {
    type: 'ecosystem',
    payload: {
      internalEntities: internal.length,
      externalEntities: external.length,
      externalActors: external.map((e) => ({ name: e.name, type: e.type })),
      composition: internalTypes.concat(externalTypes).reduce((o, t) => { o[t] = A.byType(g, t).length; return o }, {}),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: external.length === 0 ? ['No external vendors/customers modeled yet — import ecosystem data for full picture.'] : [],
  }
}

// M34 — Hidden Dependency Intelligence: transitive (indirect) dependencies.
IMPL.M34 = (rt) => {
  const g = rt.graph
  const hidden = []
  for (const e of A.all(g)) {
    const direct = new Set(A.dependencies(g, e.id).map((r) => r.to))
    for (const depId of A.transitiveDependencies(g, e.id)) {
      if (!direct.has(depId) && depId !== e.id) {
        hidden.push({ entity: e.name, hiddenDependency: A.nameOf(g, depId) })
      }
    }
  }
  const evidence = hidden.map((h) => ev('inference', `${h.entity}->${h.hiddenDependency}`, 'transitive dependency'))
  return {
    type: 'dependency',
    payload: { hiddenDependencyCount: hidden.length, hiddenDependencies: hidden },
    confidence: A.confidence(evidence.length, hidden.length ? 1 : 0.5),
    evidence,
    recommendations: hidden.slice(0, 5).map((h) => `"${h.entity}" indirectly depends on "${h.hiddenDependency}" — make this explicit.`),
  }
}

// M35 — Network Intelligence: central actors and information pathways.
IMPL.M35 = (rt) => {
  const g = rt.graph
  const centrality = A.centrality(g)
  const evidence = centrality.slice(0, 10).map((c) => ev('entity', c.id, `degree ${c.degree}`))
  return {
    type: 'network',
    payload: {
      centralActors: centrality.slice(0, 5),
      mostConnected: centrality[0] ? centrality[0].name : null,
      averageDegree: A.round(centrality.reduce((s, c) => s + c.degree, 0) / Math.max(1, centrality.length)),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: centrality[0] ? [`"${centrality[0].name}" is the most connected actor — a key hub to protect.`] : [],
  }
}

// ══════════════ KAMRAN — REASONING LAYER ══════════════

// M04 — Recommendation Engine: prioritized actions across ownership, backup
// coverage, documentation, concentration, tool governance, and dependency
// structure.
//
// D-62: previously covered 3 rule classes (unowned assets, SPOF redundancy,
// dependency cycles) against frontend/lib/recommendations.ts's 7 hand-authored
// rules (orphaned owner / no backup owner / owner concentration / undocumented,
// crossed over agents + workflows, plus tools without a backup). Expanded here
// to genuinely cover all 7, computed once from the same Knowledge Graph every
// other module reads instead of a second, client-side reimplementation. The
// pre-existing cycle-detection rule is kept -- real intelligence the frontend
// version never had, not something D-62 asks to remove.
//
// Backup-owner coverage for agents AND workflows is the SAME question this
// module already answered via A.singlePointsOfFailure() (D-06's spofVerdict:
// sole owner, no backup, criticality >= high) -- one pass covers both asset
// types rather than two near-identical loops. Tool governance is NOT folded
// into that call: a tool's "backup" is a fallback PLATFORM
// (ai_platforms.metadata.backupTool), not a backup human owner -- a genuinely
// different signal spofVerdict was never built to read (the same distinction
// domain/derived.js's orgMemory() draws for D-60).
//
// Criticality is read off each entity's OWN metadata -- agents/workflows carry
// their source row's `risk` column verbatim via graphLoader's rowMeta();
// platforms carry `assetCriticality` from knowledge_assets, since
// ai_platforms has no risk column of its own -- never off the `owns` edge,
// which tool-ownership edges never set and would silently exclude every tool
// from a criticality-gated rule.
const REC_PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
const REC_EFFORT_ORDER = { Quick: 0, Medium: 1, Strategic: 2 }
const CONCENTRATION_THRESHOLD = 4

IMPL.M04 = (rt, context) => {
  const g = rt.graph
  const recs = []
  let nextId = 0

  const priorityFor = (level) => (level === 'critical' ? 'CRITICAL' : level === 'high' ? 'HIGH' : 'MEDIUM')
  const kindOf = (id) => { const e = A.entity(g, id); return e && e.metadata ? e.metadata.kind : null }
  const push = (rec) => recs.push({ id: `rec_${++nextId}`, ...rec })

  // ── 1. Unowned assets ──
  const unowned = A.assets(g).filter((a) => A.owners(g, a.id).length === 0)
  unowned.forEach((a) => {
    const targetType = a.type === 'workflow' ? 'workflow' : kindOf(a.id) === 'ai-platform' ? 'tool' : kindOf(a.id) === 'automation-agent' ? 'agent' : a.type
    push({
      priority: 'HIGH', category: 'OWNERSHIP', effort: 'Quick',
      title: `Assign owner to "${a.name}"`,
      description: `"${a.name}" has no owner recorded in the ownership graph.`,
      impact: 'An unowned asset has no accountable person to recover, audit, or hand it off.',
      action: `Assign a primary owner (and a backup, if this asset is critical) for "${a.name}".`,
      rationale: 'Unowned critical asset',
      targetType, targetId: a.id, targetName: a.name,
    })
  })

  // ── 2 & 5. Sole-owned, no backup, criticality >= high (agents + workflows) ──
  A.singlePointsOfFailure(g).forEach((s) => {
    const kind = kindOf(s.id)
    const targetType = kind === 'ai-platform' ? 'tool' : s.type === 'workflow' ? 'workflow' : 'agent'
    push({
      priority: 'HIGH', category: 'OWNERSHIP', effort: 'Quick',
      title: `Add a backup owner for "${s.name}"`,
      description: `"${s.name}" is owned by a single person with no backup; ${s.dependents} thing(s) depend on it directly.`,
      impact: `If the sole owner of "${s.name}" is unavailable, there is no covered path to recovery.`,
      action: `Designate a backup owner for "${s.name}".`,
      rationale: `Sole-owned ${targetType} with no backup owner; ${s.dependents} thing(s) depend on it directly`,
      targetType, targetId: s.id, targetName: s.name,
    })
  })

  // ── 3. Owner concentration -- agents only, mirroring the frontend's own scope ──
  const agentOwnerLoad = new Map() // ownerId -> { name, agentIds: [] }
  A.byType(g, 'ai_agent').filter((e) => kindOf(e.id) === 'automation-agent').forEach((agent) => {
    A.owners(g, agent.id).forEach((r) => {
      const slot = agentOwnerLoad.get(r.from) || { name: A.nameOf(g, r.from), agentIds: [] }
      slot.agentIds.push(agent.id)
      agentOwnerLoad.set(r.from, slot)
    })
  })
  ;[...agentOwnerLoad.entries()]
    .filter(([, slot]) => slot.agentIds.length >= CONCENTRATION_THRESHOLD)
    .forEach(([ownerId, slot]) => {
      const n = slot.agentIds.length
      push({
        priority: n >= 5 ? 'CRITICAL' : 'HIGH', category: 'CONCENTRATION', effort: 'Strategic',
        title: `Redistribute ${slot.name}'s ${n} agents`,
        description: `${slot.name} owns ${n} agents -- the highest ownership concentration recorded.`,
        impact: `If ${slot.name} leaves, ${n} agents would lose their owner at once.`,
        action: `Redistribute some of ${slot.name}'s agents to other qualified owners.`,
        rationale: `Highest ownership concentration in the organization -- a single departure would orphan ${n} agents at once`,
        targetType: 'person', targetId: `person_${ownerId}`, targetName: slot.name,
      })
    })

  // ── 4. Undocumented agents, criticality >= high ──
  A.byType(g, 'ai_agent').filter((e) => kindOf(e.id) === 'automation-agent').forEach((agent) => {
    const level = agent.metadata.risk
    if (agent.metadata.documented !== true && atOrAbove(level, 'high')) {
      push({
        priority: priorityFor(level), category: 'DOCUMENTATION', effort: 'Medium',
        title: `Document "${agent.name}"`,
        description: `${level} agent with no documentation on record.`,
        impact: `"${agent.name}" cannot be handed off, recovered, or audited without documentation.`,
        action: `Write a runbook for "${agent.name}" covering purpose, inputs/outputs, and recovery steps.`,
        rationale: `${level} agent with no documentation -- cannot be handed off, recovered, or audited`,
        targetType: 'agent', targetId: agent.id, targetName: agent.name,
      })
    }
  })

  // ── 6. Tools with no backup platform, criticality >= high ──
  A.byType(g, 'ai_agent').filter((e) => kindOf(e.id) === 'ai-platform').forEach((tool) => {
    const level = tool.metadata.assetCriticality
    if (!tool.metadata.backupTool && atOrAbove(level, 'high')) {
      const agentsUsing = (tool.metadata.agentsUsing || []).length
      const workflowsUsing = (tool.metadata.workflowsUsing || []).length
      push({
        priority: priorityFor(level), category: 'TOOL_GOVERNANCE', effort: 'Strategic',
        title: `Establish a fallback for "${tool.name}"`,
        description: `${level} tool with no backup platform, powers ${agentsUsing} agent(s) and ${workflowsUsing} workflow(s).`,
        impact: `An outage of "${tool.name}" has no alternative pathway for its dependents.`,
        action: `Identify and document a backup platform for "${tool.name}".`,
        rationale: `${level} tool with no backup platform, powers ${agentsUsing} agent(s) and ${workflowsUsing} workflow(s)`,
        targetType: 'tool', targetId: tool.id, targetName: tool.name,
      })
    }
  })

  // ── 7. Undocumented CRITICAL workflows ──
  A.byType(g, 'workflow').forEach((wf) => {
    if (wf.metadata.documented !== true && wf.metadata.risk === 'critical') {
      push({
        priority: 'CRITICAL', category: 'DOCUMENTATION', effort: 'Medium',
        title: `Document critical workflow "${wf.name}"`,
        description: 'CRITICAL workflow with zero documentation on record.',
        impact: `Audit trail and continuity for "${wf.name}" are impossible without documentation.`,
        action: `Document "${wf.name}"'s steps, owner, and escalation path.`,
        rationale: 'CRITICAL workflow with zero documentation -- audit trail and continuity are impossible',
        targetType: 'workflow', targetId: wf.id, targetName: wf.name,
      })
    }
  })

  // ── Dependency cycles -- real intelligence beyond the frontend's 7 rules ──
  A.detectCycles(g).forEach((c) => push({
    priority: 'MEDIUM', category: 'DEPENDENCY', effort: 'Medium',
    title: 'Break a dependency cycle',
    description: `Circular dependency: ${c.join(' → ')}.`,
    impact: 'A cycle can cause unbounded cascade or re-trigger behavior in impact analysis.',
    action: `Remove or redirect one edge in the cycle ${c.join(' → ')}.`,
    rationale: 'Circular dependency',
    targetType: null, targetId: null, targetName: c[0] || null,
  }))

  recs.sort((a, b) =>
    (REC_PRIORITY_ORDER[a.priority] - REC_PRIORITY_ORDER[b.priority]) ||
    (REC_EFFORT_ORDER[a.effort] - REC_EFFORT_ORDER[b.effort]),
  )

  // Explicit summary fields, computed once here rather than left for a
  // frontend caller to re-derive by pattern-matching recommendation prose.
  const orphanedAgentCount = unowned.filter((a) => kindOf(a.id) === 'automation-agent').length
  const undocumentedCriticalAgentCount = recs.filter((r) => r.category === 'DOCUMENTATION' && r.targetType === 'agent').length
  const topConcentration = [...agentOwnerLoad.values()]
    .filter((slot) => slot.agentIds.length >= CONCENTRATION_THRESHOLD)
    .sort((a, b) => b.agentIds.length - a.agentIds.length)[0]
  const ownerConcentrationWarning = topConcentration
    ? { owner: topConcentration.name, agentCount: topConcentration.agentIds.length }
    : null

  const evidence = [
    ev('module', 'M01', 'ownership'),
    ev('module', 'M03', 'risk'),
    ev('graph', 'knowledge_assets', 'documentation'),
    ev('graph', 'tool_backups', 'tool governance'),
  ]
  return {
    type: 'recommendation',
    payload: {
      recommendationCount: recs.length,
      criticalCount: recs.filter((r) => r.priority === 'CRITICAL').length,
      highCount: recs.filter((r) => r.priority === 'HIGH').length,
      mediumCount: recs.filter((r) => r.priority === 'MEDIUM').length,
      orphanedAgentCount,
      undocumentedCriticalAgentCount,
      ownerConcentrationWarning,
      recommendations: recs,
    },
    confidence: A.confidence(recs.length, recs.length ? 1 : 0.5),
    evidence,
    recommendations: recs.map((r) => r.action),
  }
}

// M18 — Continuity Intelligence: can the org survive disruption?
IMPL.M18 = (rt) => {
  const g = rt.graph
  const spofs = A.singlePointsOfFailure(g)
  const assets = A.assets(g)
  const continuityScore = A.round(1 - Math.min(1, spofs.length / Math.max(1, assets.length)))
  const evidence = spofs.map((s) => ev('entity', s.id, `continuity risk: ${s.name}`))
  return {
    type: 'health',
    payload: {
      continuityScore,
      survivability: continuityScore > 0.66 ? 'resilient' : continuityScore > 0.33 ? 'fragile' : 'critical',
      threats: spofs.map((s) => s.name),
    },
    confidence: A.confidence(evidence.length || 1, continuityScore),
    evidence,
    recommendations: spofs.slice(0, 5).map((s) => `Create a continuity/recovery plan for "${s.name}".`),
  }
}

// M39 — Capability Intelligence: inventory of organizational capabilities.
// ⚠ `systemCapabilities` is empty because no Supabase table sources the `system`
// entity type — see graphLoader's header. That is "not modelled", not "none exist".
// A third field, brainConstitutionalCapabilities, used to report the capability
// registry's own size (always 55). It measured the machinery, not the
// organization, and went with the registry.
IMPL.M39 = (rt) => {
  const g = rt.graph
  const systems = A.byType(g, 'system')
  const workflows = A.byType(g, 'workflow')
  const evidence = [...systems, ...workflows].map((e) => ev('entity', e.id, e.name))
  return {
    type: 'generic',
    payload: {
      systemCapabilities: systems.map((s) => s.name),
      workflowCapabilities: workflows.map((w) => w.name),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: [],
  }
}

// M40 — Strategic Alignment: is execution aligned (coverage vs gaps)?
// This used to publish its result as `alignmentScore` -- the same word
// domain/analyses.js's alignmentChecklist() uses for a genuinely different
// computation (mean of workflow-documentation / decision-tracking /
// incident-lesson checks). Two unrelated numbers sharing the word
// "alignment" is exactly the confusion D-06/D-11-style consolidations exist
// to prevent. This module measures ownership coverage, not alignment to
// strategy (the "aligned to strategy" framing was an interpretive label on
// top of a coverage ratio, not a second signal) -- named for what it
// actually computes so alignmentChecklist() is the only thing that gets to
// call itself "alignment."
IMPL.M40 = (rt, context) => {
  const g = rt.graph
  const assets = A.assets(g)
  const covered = assets.filter((a) => A.owners(g, a.id).length > 0).length
  const coverage = A.round(assets.length ? covered / assets.length : 1)
  const evidence = [ev('graph', 'coverage', `${covered}/${assets.length} assets owned`)]
  return {
    type: 'decision',
    payload: {
      ownershipCoverageScore: coverage,
      covered: coverage > 0.7,
      gaps: assets.filter((a) => A.owners(g, a.id).length === 0).map((a) => a.name),
    },
    confidence: A.confidence(evidence.length, coverage),
    evidence,
    recommendations: coverage <= 0.7 ? ['Close ownership gaps across the asset estate.'] : [],
  }
}

// ══════════ TAHIR — PREDICTION, LEARNING & ORGANIZATIONAL SCIENCE LAYER ══════════
// Real graph-derived foresight: prediction consumes reality (M01/M02/M03/M30),
// science profiles the organization, and the Digital Twin (M49) mirrors live
// graph state for simulation.

// M32 — Dependency Impact: quantify the blast radius of each dependency.
IMPL.M32 = (rt) => {
  const g = rt.graph
  const impacts = A.fanInRanking(g).map((x) => {
    const cascade = A.transitiveDependents(g, x.id).length
    return {
      entity: x.name,
      directDependents: x.dependents,
      cascadeImpact: cascade,
      impactScore: A.round(Math.min(1, x.dependents * 0.15 + cascade * 0.1)),
      severity: cascade > 3 ? 'critical' : cascade > 1 ? 'high' : 'moderate',
    }
  }).sort((a, b) => b.impactScore - a.impactScore)
  return {
    type: 'dependency',
    payload: { impactCount: impacts.length, impacts, highestImpact: impacts[0] || null },
    confidence: A.confidence(impacts.length || 1, 1),
    evidence: impacts.map((i, idx) => ev('impact', String(idx), `${i.entity}: ${i.cascadeImpact} cascade`)),
    recommendations: impacts.filter((i) => i.cascadeImpact > 3).map((i) => `"${i.entity}" failure cascades to ${i.cascadeImpact} entities — isolate & add redundancy.`),
  }
}

// M37 — Pattern Intelligence: recurring structures, anomalies & emerging trends.
IMPL.M37 = (rt) => {
  const g = rt.graph
  const dist = {}
  for (const r of g.relationships.list()) dist[r.type] = (dist[r.type] || 0) + 1
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0]
  const isolated = A.all(g).filter((e) => A.degree(g, e.id) === 0)
  const hubs = A.centrality(g).filter((c) => c.degree >= 4)
  const anomalies = [
    ...isolated.map((e) => ({ type: 'isolated-entity', detail: e.name })),
    ...hubs.map((h) => ({ type: 'over-connected-hub', detail: `${h.name} (${h.degree} links)` })),
  ]
  return {
    type: 'prediction',
    payload: {
      patternDistribution: dist,
      dominantPattern: dominant ? { type: dominant[0], count: dominant[1] } : null,
      anomalyCount: anomalies.length,
      anomalies,
    },
    confidence: A.confidence(Object.keys(dist).length || 1, 1),
    evidence: sorted.map(([t, n]) => ev('pattern', t, String(n))),
    recommendations: anomalies.filter((a) => a.type === 'over-connected-hub').map((a) => `Hub anomaly: ${a.detail} — highly central node; monitor as a systemic risk.`),
  }
}

// M41 — Organizational DNA: the structural identity fingerprint of the org.
IMPL.M41 = (rt) => {
  const g = rt.graph
  const comp = {}
  for (const e of A.all(g)) comp[e.type] = (comp[e.type] || 0) + 1
  const total = A.all(g).length || 1
  const sorted = Object.entries(comp).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0]
  const humanShare = A.round(A.humans(g).length / total)
  const automationShare = A.round(A.byTypes(g, ['ai_agent', 'system']).length / total)
  return {
    type: 'generic',
    payload: {
      composition: comp,
      dnaSignature: dominant ? `${dominant[0]}-centric` : 'undetermined',
      humanShare,
      automationShare,
      orientation: automationShare > humanShare ? 'automation-led' : 'people-led',
    },
    confidence: A.confidence(Object.keys(comp).length || 1, 1),
    evidence: sorted.map(([t, n]) => ev('dna', t, String(n))),
    recommendations: [],
  }
}

// M42 — Culture Intelligence: collaboration behaviour as a culture signal.
//
// ⚠ A missing `collaborates_with` edge means "no shared-work record", NOT
// "this person works alone". graphLoader derives the edges from RACI links and
// workflow steps; anyone outside those two sources is simply unobserved. On the
// live dataset that is 16 of 40 people. BUILD_SPEC Part 0: "That may be a real
// finding or a coverage gap, and the data cannot tell you which." So this
// module reports its coverage and withholds the verdict, rather than naming the
// unobserved as siloed — which is what it used to do, and which rendered as a
// confident "all 40 people are siloed" on the Org Science page.
IMPL.M42 = (rt) => {
  const g = rt.graph
  const collab = A.edgesOfType(g, 'collaborates_with').length
  const humans = A.humans(g)
  const people = humans.length
  // Links PER PERSON — unbounded, not a fraction. Do not render as a percentage.
  const density = people ? A.round(collab / people) : 0

  const hasRecord = (h) => g.relationships.neighbors(h.id).some((r) => r.type === 'collaborates_with')
  const observed = humans.filter(hasRecord)
  const unobserved = humans.filter((h) => !hasRecord(h))
  const coverage = people ? A.round(observed.length / people) : 0

  // 'siloed' is deliberately unreachable. Earning it would mean observing
  // someone across a complete source and finding no partner; no source we have
  // supports that claim. No edges at all is NO_SIGNAL, not a finding.
  const cultureSignal =
    collab === 0 ? 'no_signal'
      : density > 0.5 ? 'collaborative'
        : 'transitional'

  return {
    type: 'generic',
    payload: {
      collaborationLinks: collab,
      people,
      collaborationDensity: density,
      peopleWithCollaborationRecord: observed.length,
      peopleWithoutRecord: unobserved.map((h) => h.name),
      collaborationCoverage: coverage,
      cultureSignal,
    },
    // Confidence is a coverage proxy (D2), so it has to fall when the sources
    // observe fewer people. The previous `A.confidence(collab || 1, 0.7)`
    // returned 0.87 for a graph holding no collaboration data whatsoever.
    confidence: A.confidence(collab, coverage),
    evidence: [ev('graph', 'collaborates_with', String(collab))],
    recommendations: unobserved.length
      ? [`${unobserved.length} of ${people} people appear in no shared-work record (RACI or workflow steps) — their collaboration is unknown, not absent. Extend coverage before drawing a conclusion.`]
      : [],
  }
}

// M43 — Organizational Maturity: how disciplined the organization is.
IMPL.M43 = (rt) => {
  const g = rt.graph
  const assets = A.assets(g)
  const owned = assets.filter((a) => A.owners(g, a.id).length > 0).length
  const governed = new Set(A.edgesOfType(g, 'governs').map((r) => r.to)).size
  const ownershipDim = assets.length ? owned / assets.length : 0
  const governanceDim = assets.length ? governed / assets.length : 0
  const maturity = A.round(ownershipDim * 0.5 + governanceDim * 0.5)
  const level = maturity > 0.75 ? 'optimized' : maturity > 0.5 ? 'managed' : maturity > 0.25 ? 'developing' : 'initial'
  return {
    type: 'health',
    payload: {
      maturityScore: maturity,
      level,
      dimensions: { ownership: A.round(ownershipDim), governance: A.round(governanceDim) },
      nextLevelGap: level === 'optimized' ? 0 : A.round((level === 'managed' ? 0.75 : level === 'developing' ? 0.5 : 0.25) - maturity),
    },
    confidence: A.confidence(assets.length || 1, maturity || 0.5),
    evidence: [ev('graph', 'ownership', `${owned}/${assets.length} owned`), ev('graph', 'governance', `${governed}/${assets.length} governed`)],
    recommendations: maturity < 0.75 ? [`Advance from "${level}": close ownership/governance gaps to reach the next maturity level.`] : [],
  }
}

// M44 — Organizational Behavior: what the org actually does (verb profile).
IMPL.M44 = (rt) => {
  const g = rt.graph
  const verbs = {}
  for (const r of g.relationships.list()) verbs[r.type] = (verbs[r.type] || 0) + 1
  const sorted = Object.entries(verbs).sort((a, b) => b[1] - a[1])
  const dominant = sorted[0]
  const dependencyHeavy = (verbs.depends_on || 0) > (verbs.collaborates_with || 0)
  return {
    type: 'generic',
    payload: {
      behaviorProfile: verbs,
      dominantBehavior: dominant ? dominant[0] : null,
      orientation: dependencyHeavy ? 'dependency-driven' : 'collaboration-driven',
    },
    confidence: A.confidence(Object.keys(verbs).length || 1, 1),
    evidence: sorted.map(([t, n]) => ev('behavior', t, String(n))),
    recommendations: dependencyHeavy ? ['Behaviour is dependency-driven — invest in collaboration to balance resilience.'] : [],
  }
}

// M45 — Benchmark Intelligence: measure the org against constitutional targets.
IMPL.M45 = (rt) => {
  const g = rt.graph
  const assets = A.assets(g)
  const ownership = assets.length ? assets.filter((a) => A.owners(g, a.id).length > 0).length / assets.length : 1
  const governed = new Set(A.edgesOfType(g, 'governs').map((r) => r.to)).size
  const governance = assets.length ? governed / assets.length : 1
  const spof = A.singlePointsOfFailure(g).length
  const isolated = A.all(g).filter((e) => A.degree(g, e.id) === 0).length
  const benchmarks = [
    { metric: 'ownershipCoverage', value: A.round(ownership), target: 0.9, pass: ownership >= 0.9 },
    { metric: 'governanceCoverage', value: A.round(governance), target: 0.8, pass: governance >= 0.8 },
    { metric: 'singlePointsOfFailure', value: spof, target: 0, pass: spof === 0 },
    { metric: 'isolatedEntities', value: isolated, target: 0, pass: isolated === 0 },
  ]
  const passing = benchmarks.filter((b) => b.pass).length
  return {
    type: 'generic',
    payload: { benchmarks, passing, total: benchmarks.length, benchmarkScore: A.round(passing / benchmarks.length) },
    confidence: A.confidence(benchmarks.length, 1),
    evidence: benchmarks.map((b) => ev('benchmark', b.metric, `${b.value} vs ${b.target}`)),
    recommendations: benchmarks.filter((b) => !b.pass).map((b) => `Improve ${b.metric} (${b.value}) toward target ${b.target}.`),
  }
}

// M49 — Digital Twin: a live, synchronized virtual model of the organization.
IMPL.M49 = (rt, context) => {
  const g = rt.graph
  const stats = g.stats()
  const twin = {
    syncedAt: new Date().toISOString(),
    entities: g.entities.list().map((e) => ({ id: e.id, type: e.type, name: e.name, status: e.status || 'active' })),
    relationships: g.relationships.list().map((r) => ({ from: r.from, type: r.type, to: r.to })),
    stats,
    layers: {
      structure: A.byTypes(g, ['department', 'team', 'executive', 'employee']).length,
      systems: A.byTypes(g, ['system', 'ai_agent']).length,
      workflows: A.byType(g, 'workflow').length,
      knowledge: A.byType(g, 'knowledge').length,
    },
  }
  return {
    type: 'simulation',
    payload: {
      digitalTwin: twin,
      synchronized: true,
      simulationReady: stats.entities > 0,
    },
    confidence: A.confidence(twin.entities.length || 1, 1),
    evidence: [ev('graph', 'snapshot', `${twin.entities.length} entities / ${twin.relationships.length} relationships mirrored`)],
    recommendations: [],
  }
}

module.exports = IMPL
