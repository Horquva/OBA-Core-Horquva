/**
 * CONSTITUTIONAL MODULE IMPLEMENTATIONS (M01–M55) — REAL LOGIC, NO STUBS
 * ---------------------------------------------------------------------
 * Each implementation receives (runtime, context) and returns an intelligence
 * fragment { type, payload, confidence, evidence, recommendations,
 * relationships }. The binder wraps it into a validated Intelligence Package.
 *
 * Every function computes genuine results from the Unified Knowledge Graph
 * (runtime.graph) and, where constitutional, consumes prior modules'
 * intelligence via context.priorIntel (e.g. M48 is gated by M46; M55 fuses all).
 *
 * Ownership:
 *   Huzaifa  (reality)   — M01 M02 M03 M07 M08 M19 M20 M22 M28 M29 M31 M34 M35
 *   Kamran   (reasoning) — M04 M05 M06 M09 M10 M14 M18 M24 M25 M26 M27 M30 M36
 *                          M38 M39 M40 M46 M48 M50 M54 M55
 *   Tahir    (prediction)— M11 M12 M13 M17 M32 M33 M37 M41 M42 M43 M44 M45 M47 M49
 *   Anusha   (executive) — M15 M16 M21 M23 M51 M52 M53
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
 */

const A = require('./analytics')
const { atOrAbove } = require('../../domain/definitions')
const { propagateConfidence } = require('../knowledge/intelligenceExchange')
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

// M08 — Workflow Intelligence: how work flows; workflow deps + owners.
IMPL.M08 = (rt) => {
  const g = rt.graph
  const workflows = A.byType(g, 'workflow')
  const detail = workflows.map((w) => ({
    name: w.name, id: w.id,
    owners: A.owners(g, w.id).map((r) => A.nameOf(g, r.from)),
    dependsOn: A.dependencies(g, w.id).map((r) => ({ on: A.nameOf(g, r.to), criticality: r.criticality })),
  }))
  const evidence = workflows.map((w) => ev('entity', w.id, `workflow: ${w.name}`))
  const orphan = detail.filter((d) => d.owners.length === 0)
  return {
    type: 'workflow',
    payload: { workflowCount: workflows.length, workflows: detail, unownedWorkflows: orphan.map((d) => d.name) },
    confidence: A.confidence(evidence.length, workflows.length ? 1 : 0),
    evidence,
    recommendations: orphan.map((d) => `Workflow "${d.name}" has no owner — assign process accountability.`),
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

// M22 — Voice Intelligence: turn graph reality into a spoken executive summary.
IMPL.M22 = (rt, context) => {
  const g = rt.graph
  const stats = g.stats()
  const spofs = A.singlePointsOfFailure(g)
  const role = (context && context.role) || 'Executive'
  const spoken =
    `${role}, the organization currently has ${stats.entities} tracked entities and ` +
    `${stats.relationships} relationships. ` +
    (spofs.length
      ? `I have detected ${spofs.length} single point${spofs.length > 1 ? 's' : ''} of failure, the most critical being ${spofs[0].name}.`
      : `No single points of failure are currently detected.`)
  const evidence = [ev('graph', 'stats', `${stats.entities} entities / ${stats.relationships} relationships`)]
  return {
    type: 'generic',
    payload: { voiceResponse: spoken, addressableExecutives: A.byType(g, 'executive').length },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: [],
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

// M05 — What-If Simulation: remove the highest fan-in entity, measure cascade.
IMPL.M05 = (rt, context) => {
  const g = rt.graph
  const target = (context && context.simulateRemoveId) || (A.fanInRanking(g)[0] && A.fanInRanking(g)[0].id)
  if (!target) return { type: 'simulation', payload: { note: 'No entity available to simulate' }, confidence: 0.4, evidence: [] }
  const direct = A.dependents(g, target).map((r) => A.nameOf(g, r.from))
  const cascade = A.transitiveDependents(g, target).map((id) => A.nameOf(g, id))
  const evidence = [ev('entity', target, `simulate removal of ${A.nameOf(g, target)}`)]
  return {
    type: 'simulation',
    payload: {
      scenario: `Remove "${A.nameOf(g, target)}"`,
      directlyImpacted: direct,
      cascadeImpacted: cascade,
      totalImpacted: cascade.length,
      severity: cascade.length > 3 ? 'severe' : cascade.length > 0 ? 'moderate' : 'contained',
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: cascade.length ? [`Removing "${A.nameOf(g, target)}" would impact ${cascade.length} entities — build contingency.`] : [],
  }
}

// M06 — Human-Agent Dependency Map: how humans and AI/systems depend on each other.
IMPL.M06 = (rt) => {
  const g = rt.graph
  const humans = new Set(A.humans(g).map((e) => e.id))
  const agents = new Set(A.byTypes(g, ['ai_agent', 'system']).map((e) => e.id))
  const links = g.relationships.list().filter((r) =>
    (humans.has(r.from) && agents.has(r.to)) || (agents.has(r.from) && humans.has(r.to)))
  const evidence = links.map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} ${r.type} ${A.nameOf(g, r.to)}`))
  return {
    type: 'dependency',
    payload: {
      humanCount: humans.size,
      agentCount: agents.size,
      humanAgentLinks: links.map((r) => ({ from: A.nameOf(g, r.from), type: r.type, to: A.nameOf(g, r.to) })),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: [],
  }
}

// M09 — Knowledge Risk Intelligence: bus-factor on knowledge assets.
IMPL.M09 = (rt) => {
  const g = rt.graph
  const knowledge = A.byType(g, 'knowledge')
  const atRisk = knowledge.map((k) => ({
    name: k.name, id: k.id,
    owners: A.owners(g, k.id).map((r) => A.nameOf(g, r.from)),
    dependents: A.dependents(g, k.id).length,
  })).filter((k) => k.owners.length <= 1)
  const evidence = knowledge.map((k) => ev('entity', k.id, `knowledge: ${k.name}`))
  return {
    type: 'risk',
    payload: { knowledgeAssets: knowledge.length, atRisk, busFactorRisks: atRisk.filter((k) => k.owners.length === 1).map((k) => k.name) },
    confidence: A.confidence(evidence.length, knowledge.length ? 1 : 0.5),
    evidence,
    recommendations: atRisk.map((k) => `Knowledge "${k.name}" is held by ${k.owners.length || 'no'} person — document & cross-train.`),
  }
}

// M14 — Decision Intelligence: decision readiness from coverage + risk.
IMPL.M14 = (rt, context) => {
  const g = rt.graph
  const own = A.prior(context, 'M01')
  const risk = A.prior(context, 'M03')
  const ownershipCoverage = own ? own.payload.ownershipCoverage : (A.assets(g).length ? 1 : 0)
  const riskScore = risk ? risk.payload.riskScore : A.round(A.singlePointsOfFailure(g).length / Math.max(1, A.assets(g).length))
  const readiness = A.round(Math.max(0, Math.min(1, ownershipCoverage * 0.6 + (1 - riskScore) * 0.4)))
  const evidence = [
    own ? ev('module', 'M01', 'ownership coverage') : ev('graph', 'assets', 'ownership coverage (direct)'),
    risk ? ev('module', 'M03', 'risk score') : ev('graph', 'spof', 'risk score (direct)'),
  ]
  return {
    type: 'decision',
    payload: {
      decisionReadiness: readiness,
      quality: readiness > 0.66 ? 'high' : readiness > 0.33 ? 'moderate' : 'low',
      basis: { ownershipCoverage, riskScore },
    },
    confidence: A.confidence(evidence.length, readiness),
    evidence,
    recommendations: readiness < 0.66 ? ['Improve ownership coverage and reduce risk before high-stakes decisions.'] : [],
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

// M24 — Decision Support: evidence-backed support (gated by Truth if present).
IMPL.M24 = (rt, context) => {
  const g = rt.graph
  const truth = A.prior(context, 'M46')
  const risk = A.prior(context, 'M03')
  const own = A.prior(context, 'M01')
  const supported = truth ? truth.payload.verified : true
  const evidence = [own, risk, truth].filter(Boolean).map((p) => ev('module', p.sourceModule, `${p.type} conf ${p.confidence}`))
  const findings = []
  if (own) findings.push(`Ownership coverage ${Math.round(own.payload.ownershipCoverage * 100)}%`)
  if (risk) findings.push(`Risk level ${risk.payload.riskLevel}`)
  return {
    type: 'decision',
    payload: {
      question: (context && context.question) || 'General decision support',
      verifiedForDecision: supported,
      keyFindings: findings,
      supportingModules: evidence.map((e) => e.ref),
    },
    confidence: A.confidence(evidence.length, supported ? 1 : 0.5),
    evidence,
    recommendations: supported ? [] : ['Truth verification incomplete — treat this decision support as provisional.'],
  }
}

// M25 — Organizational Health: composite health index.
IMPL.M25 = (rt, context) => {
  const g = rt.graph
  const assets = A.assets(g)
  const unowned = assets.filter((a) => A.owners(g, a.id).length === 0).length
  const spofs = A.singlePointsOfFailure(g).length
  const governs = new Set(A.edgesOfType(g, 'governs').map((r) => r.to)).size
  const ownershipCoverage = assets.length ? (assets.length - unowned) / assets.length : 1
  const governanceCoverage = assets.length ? governs / assets.length : 1
  const riskPenalty = Math.min(1, spofs / Math.max(1, assets.length))
  const health = A.round(Math.max(0, Math.min(1, ownershipCoverage * 0.4 + governanceCoverage * 0.3 + (1 - riskPenalty) * 0.3)))
  const evidence = [ev('graph', 'ownership', `${Math.round(ownershipCoverage * 100)}%`), ev('graph', 'governance', `${Math.round(governanceCoverage * 100)}%`)]
  return {
    type: 'health',
    payload: {
      healthScore: health,
      grade: health > 0.8 ? 'A' : health > 0.6 ? 'B' : health > 0.4 ? 'C' : 'D',
      dimensions: { ownershipCoverage: A.round(ownershipCoverage), governanceCoverage: A.round(governanceCoverage), spofCount: spofs },
    },
    confidence: A.confidence(evidence.length, health),
    evidence,
    recommendations: health < 0.6 ? ['Improve ownership + governance coverage and reduce single points of failure.'] : [],
  }
}

// M26 — Executive Memory: what an executive should remember (their footprint).
IMPL.M26 = (rt, context) => {
  const g = rt.graph
  const execs = A.byType(g, 'executive')
  const memory = execs.map((x) => ({
    executive: x.name,
    owns: A.owned(g, x.id).map((r) => A.nameOf(g, r.to)),
    manages: g.relationships.from(x.id).filter((r) => r.type === 'manages').map((r) => A.nameOf(g, r.to)),
    supportedBy: g.relationships.to(x.id).filter((r) => r.type === 'supports').map((r) => A.nameOf(g, r.from)),
  }))
  const evidence = execs.map((x) => ev('entity', x.id, `executive: ${x.name}`))
  return {
    type: 'generic',
    payload: { executives: memory.length, memory },
    confidence: A.confidence(evidence.length, execs.length ? 1 : 0.5),
    evidence,
    recommendations: [],
  }
}

// M27 — Executive Context: assemble context for the requesting role.
IMPL.M27 = (rt, context) => {
  const g = rt.graph
  const role = (context && context.role) || null
  const exec = role ? A.byType(g, 'executive').find((e) => (e.metadata && e.metadata.role === role) || e.name.toLowerCase().includes(String(role).toLowerCase())) : A.byType(g, 'executive')[0]
  const ctx = exec ? {
    executive: exec.name,
    scope: A.owned(g, exec.id).map((r) => A.nameOf(g, r.to)),
    reports: g.relationships.to(exec.id).filter((r) => r.type === 'reports_to').map((r) => A.nameOf(g, r.from)),
  } : { note: 'No matching executive found' }
  const evidence = exec ? [ev('entity', exec.id, `context for ${exec.name}`)] : []
  return {
    type: 'generic',
    payload: { requestedRole: role, context: ctx },
    confidence: A.confidence(evidence.length, exec ? 1 : 0.4),
    evidence,
    recommendations: [],
  }
}

// M30 — Knowledge Concentration: where ownership is dangerously concentrated.
IMPL.M30 = (rt) => {
  const g = rt.graph
  const conc = A.ownershipConcentration(g)
  const total = A.assets(g).length
  const top = conc[0]
  const concentrationRatio = top && total ? A.round(top.assetsOwned / total) : 0
  const evidence = conc.map((c) => ev('entity', c.id, `${c.name} owns ${c.assetsOwned} assets`))
  return {
    type: 'risk',
    payload: {
      concentration: conc,
      mostConcentratedOwner: top ? top.name : null,
      concentrationRatio,
      dangerous: concentrationRatio > 0.4,
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: concentrationRatio > 0.4 && top ? [`"${top.name}" owns ${Math.round(concentrationRatio * 100)}% of critical assets — distribute ownership.`] : [],
  }
}

// M36 — Signal Intelligence: surface the signals that matter (anomalies).
IMPL.M36 = (rt) => {
  const g = rt.graph
  const signals = []
  A.assets(g).filter((a) => A.owners(g, a.id).length === 0).forEach((a) => signals.push({ level: 'warning', signal: `Unowned asset: ${a.name}` }))
  A.singlePointsOfFailure(g).forEach((s) => signals.push({ level: 'critical', signal: `Single point of failure: ${s.name}` }))
  A.all(g).filter((e) => A.degree(g, e.id) === 0).forEach((e) => signals.push({ level: 'info', signal: `Isolated entity: ${e.name}` }))
  const evidence = signals.map((s, i) => ev('signal', String(i), s.signal))
  return {
    type: 'generic',
    payload: { signalCount: signals.length, signals, critical: signals.filter((s) => s.level === 'critical').length },
    confidence: A.confidence(evidence.length || 1, 1),
    evidence,
    recommendations: signals.filter((s) => s.level === 'critical').map((s) => `Act on critical signal: ${s.signal}`),
  }
}

// M38 — Opportunity Intelligence: underused capacity + collaboration openings.
IMPL.M38 = (rt) => {
  const g = rt.graph
  const underused = A.byTypes(g, ['system', 'ai_agent']).filter((s) => A.dependents(g, s.id).length === 0)
  const opportunities = underused.map((s) => ({ opportunity: `Leverage under-utilized "${s.name}"`, type: s.type }))
  const evidence = underused.map((s) => ev('entity', s.id, `underused: ${s.name}`))
  return {
    type: 'recommendation',
    payload: { opportunityCount: opportunities.length, opportunities },
    confidence: A.confidence(evidence.length || 1, 0.8),
    evidence,
    recommendations: opportunities.map((o) => o.opportunity),
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

// M46 — Truth Intelligence: verify prior intelligence; GATES M48.
IMPL.M46 = (rt, context) => {
  const g = rt.graph
  const prior = A.allPrior(context).map((p) => p.package)
  const graphValid = g.validate().valid
  const withEvidence = prior.filter((p) => p.evidence && p.evidence.length > 0).length
  const avgConfidence = prior.length ? prior.reduce((s, p) => s + p.confidence, 0) / prior.length : (graphValid ? 0.7 : 0.4)
  const truthScore = A.round(Math.max(0, Math.min(1,
    (graphValid ? 0.4 : 0) + 0.3 * (prior.length ? withEvidence / prior.length : 1) + 0.3 * avgConfidence)))
  const verified = truthScore >= 0.5 && graphValid
  const evidence = [ev('graph', 'validate', graphValid ? 'graph integrity valid' : 'graph integrity FAILED'), ev('bus', 'prior', `${prior.length} prior packages, ${withEvidence} with evidence`)]
  return {
    type: 'truth',
    payload: {
      verified,
      truthScore,
      graphIntegrity: graphValid,
      verifiedPackages: withEvidence,
      totalPackages: prior.length,
      gate: 'M48',
    },
    confidence: truthScore,
    evidence,
    recommendations: verified ? [] : ['Truth threshold not met — downstream autonomous advice will be withheld.'],
  }
}

// M48 — Autonomous Advisor: GATED BY M46. Only advises on verified truth.
IMPL.M48 = (rt, context) => {
  const truth = A.prior(context, 'M46')
  const verified = truth ? truth.payload.verified : false
  const truthScore = truth ? truth.payload.truthScore : 0
  if (!verified) {
    return {
      type: 'recommendation',
      payload: { advised: false, reason: 'Constitutional gate: Truth (M46) not verified', truthScore },
      confidence: A.round(Math.min(0.4, truthScore)),
      evidence: [ev('module', 'M46', 'truth gate closed')],
      recommendations: ['Autonomous advice withheld until Truth Intelligence (M46) verifies organizational reality.'],
    }
  }
  // Verified — synthesize advice from recommendation-bearing prior modules.
  const advice = []
  for (const p of A.allPrior(context).map((x) => x.package)) {
    for (const r of (p.recommendations || [])) advice.push({ from: p.sourceModule, advice: r })
  }
  const deduped = advice.filter((a, i) => advice.findIndex((b) => b.advice === a.advice) === i)
  return {
    type: 'recommendation',
    payload: { advised: true, truthScore, adviceCount: deduped.length, advice: deduped },
    confidence: A.round(Math.min(1, 0.5 + truthScore * 0.5)),
    evidence: [ev('module', 'M46', `truth verified @ ${truthScore}`)],
    recommendations: deduped.slice(0, 8).map((a) => a.advice),
  }
}

// M50 — Brain Core Logic: the coherent reasoning model of the whole run.
IMPL.M50 = (rt, context) => {
  const prior = A.allPrior(context).map((p) => p.package)
  const byType = {}
  for (const p of prior) (byType[p.type] = byType[p.type] || []).push(p.sourceModule)
  const findings = prior.flatMap((p) => (p.recommendations || []).slice(0, 1).map((r) => ({ from: p.sourceModule, finding: r })))
  const evidence = prior.map((p) => ev('module', p.sourceModule, `${p.type} @ ${p.confidence}`))
  return {
    type: 'decision',
    payload: {
      reasoningInputs: prior.length,
      intelligenceByType: byType,
      coreFindings: findings,
      graph: rt.graph.stats(),
    },
    confidence: A.confidence(evidence.length, 1),
    evidence,
    recommendations: [],
  }
}

// M54 — Simulation Universe: many what-if futures across top dependencies.
IMPL.M54 = (rt) => {
  const g = rt.graph
  const targets = A.fanInRanking(g).slice(0, 5)
  const scenarios = targets.map((t) => {
    const cascade = A.transitiveDependents(g, t.id)
    return { remove: t.name, impacted: cascade.length, severity: cascade.length > 3 ? 'severe' : cascade.length > 0 ? 'moderate' : 'contained' }
  })
  const worst = scenarios.slice().sort((a, b) => b.impacted - a.impacted)[0]
  const evidence = targets.map((t) => ev('entity', t.id, `scenario: remove ${t.name}`))
  return {
    type: 'simulation',
    payload: { scenarioCount: scenarios.length, scenarios, worstCase: worst || null },
    confidence: A.confidence(evidence.length || 1, 1),
    evidence,
    recommendations: worst && worst.impacted ? [`Worst-case failure "${worst.remove}" impacts ${worst.impacted} entities — prioritize its resilience.`] : [],
  }
}

// M55 — Meta-Brain Orchestrator: fuse ALL intelligence into one answer (LAST).
IMPL.M55 = (rt, context) => {
  const prior = A.allPrior(context).map((p) => p.package)
  const truth = prior.find((p) => p.sourceModule === 'M46')
  const health = prior.find((p) => p.sourceModule === 'M25')
  const risk = prior.find((p) => p.sourceModule === 'M03')
  const advisor = prior.find((p) => p.sourceModule === 'M48')
  // Uses the same weakest-link/average fusion (propagateConfidence, 0.6/0.4) that
  // ExecutionEngine applies to its own top-level fusedConfidence — M55 is supposed
  // to be the authoritative fusion, so it must not compute that number differently
  // from the engine that reports it to the caller.
  const fusedConfidence = prior.length ? A.round(propagateConfidence(prior)) : 0.5
  const keyRecommendations = [...new Set(prior.flatMap((p) => p.recommendations || []))].slice(0, 10)
  const evidence = prior.map((p) => ev('module', p.sourceModule, `${p.type}`))
  return {
    type: 'decision',
    payload: {
      question: (context && context.question) || null,
      modulesFused: prior.length,
      verifiedTruth: truth ? truth.payload.verified : null,
      organizationalHealth: health ? health.payload.healthScore : null,
      riskLevel: risk ? risk.payload.riskLevel : null,
      autonomousAdvice: advisor ? advisor.payload.advice : null,
      fusedConfidence,
      executiveSummary:
        `Fused ${prior.length} constitutional modules. ` +
        (health ? `Health ${Math.round(health.payload.healthScore * 100)}%. ` : '') +
        (risk ? `Risk ${risk.payload.riskLevel}. ` : '') +
        (truth ? `Truth ${truth.payload.verified ? 'verified' : 'unverified'}.` : ''),
      keyRecommendations,
    },
    confidence: fusedConfidence,
    evidence,
    recommendations: keyRecommendations,
  }
}

// ══════════ TAHIR — PREDICTION, LEARNING & ORGANIZATIONAL SCIENCE LAYER ══════════
// Real graph-derived foresight: prediction consumes reality (M01/M02/M03/M30),
// learning consumes recorded intelligence, science profiles the organization,
// and the Digital Twin (M49) mirrors live graph state for simulation.

// M11 — Predictive Risk: forecast which current risks are likely to materialize.
IMPL.M11 = (rt, context) => {
  const g = rt.graph
  const priorRisk = A.prior(context, 'M03')
  const spofs = A.singlePointsOfFailure(g)
  const conc = A.ownershipConcentration(g)
  const topOwner = conc[0]
  const predicted = spofs.map((s) => {
    const cascade = A.transitiveDependents(g, s.id).length
    const likelihood = A.round(Math.min(1, 0.35 + s.dependents * 0.12 + cascade * 0.05 + (s.owners === 0 ? 0.2 : 0)))
    return {
      risk: s.name,
      likelihood,
      severity: cascade > 3 ? 'severe' : cascade > 0 ? 'moderate' : 'low',
      cascadeReach: cascade,
      earlyWarning: likelihood > 0.6 ? 'imminent' : likelihood > 0.4 ? 'watch' : 'stable',
      basis: `${s.dependents} dependents, ${s.owners} owner, cascade ${cascade}`,
    }
  }).sort((a, b) => b.likelihood - a.likelihood)
  if (topOwner && topOwner.assetsOwned >= 3) {
    predicted.push({ risk: `Ownership concentration on ${topOwner.name}`, likelihood: A.round(Math.min(1, 0.3 + topOwner.assetsOwned * 0.1)), severity: 'moderate', cascadeReach: topOwner.assetsOwned, earlyWarning: 'watch', basis: `${topOwner.name} owns ${topOwner.assetsOwned} assets` })
  }
  const evidence = [
    ...spofs.map((s) => ev('entity', s.id, `predictive risk: ${s.name}`)),
    ...(priorRisk ? [ev('module', 'M03', `current risk level ${priorRisk.payload.riskLevel}`)] : []),
  ]
  return {
    type: 'prediction',
    payload: {
      predictedRiskCount: predicted.length,
      predictedRisks: predicted,
      imminentRisks: predicted.filter((p) => p.earlyWarning === 'imminent').map((p) => p.risk),
      basedOnCurrentRisk: priorRisk ? priorRisk.payload.riskLevel : 'n/a',
      method: 'dependency-cascade + ownership-exposure probability model',
    },
    confidence: A.confidence(evidence.length || 1, priorRisk ? 1 : 0.8),
    evidence,
    recommendations: predicted.filter((p) => p.likelihood > 0.6).map((p) => `High-likelihood risk "${p.risk}" (${Math.round(p.likelihood * 100)}%) — pre-empt before it materializes.`),
  }
}

// M13 — Human-AI Collaboration: measure & optimize how people and AI work together.
IMPL.M13 = (rt) => {
  const g = rt.graph
  const humansArr = A.humans(g)
  const humans = new Set(humansArr.map((e) => e.id))
  const agents = new Set(A.byTypes(g, ['ai_agent', 'system']).map((e) => e.id))
  const links = g.relationships.list().filter((r) => (humans.has(r.from) && agents.has(r.to)) || (agents.has(r.from) && humans.has(r.to)))
  const ratio = humans.size ? A.round(links.length / humans.size) : 0
  const collaborators = new Set(links.flatMap((r) => [r.from, r.to].filter((id) => humans.has(id))))
  const disconnected = humansArr.filter((h) => !collaborators.has(h.id))
  return {
    type: 'prediction',
    payload: {
      collaborationLinks: links.length,
      humanCount: humans.size,
      aiSystemCount: agents.size,
      collaborationRatio: ratio,
      quality: ratio > 1 ? 'strong' : ratio > 0 ? 'emerging' : 'none',
      humansWithoutAiSupport: disconnected.map((h) => h.name),
    },
    confidence: A.confidence(links.length || 1, 0.75),
    evidence: links.map((r) => ev('relationship', r.id, `${A.nameOf(g, r.from)} ${r.type} ${A.nameOf(g, r.to)}`)),
    recommendations: disconnected.slice(0, 5).map((h) => `Pair "${h.name}" with an AI tool/system to raise collaboration leverage.`),
  }
}

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

// M33 — Dependency Evolution: how the dependency structure is trending.
IMPL.M33 = (rt) => {
  const g = rt.graph
  const deps = A.edgesOfType(g, 'depends_on')
  const byCriticality = deps.reduce((o, r) => { const k = r.criticality || 'unspecified'; o[k] = (o[k] || 0) + 1; return o }, {})
  const highShare = deps.length ? A.round((byCriticality.high || 0) / deps.length) : 0
  const cycles = A.detectCycles(g)
  return {
    type: 'dependency',
    payload: {
      currentDependencies: deps.length,
      criticalityDistribution: byCriticality,
      highCriticalityShare: highShare,
      cyclesForming: cycles.length,
      trend: highShare > 0.4 ? 'tightening (rising critical coupling)' : cycles.length ? 'looping (cycles present)' : 'stable',
    },
    confidence: A.confidence(deps.length || 1, 0.7),
    evidence: [ev('graph', 'depends_on', `${deps.length} edges`), ...(cycles.length ? [ev('inference', 'cycle', cycles[0].join(' → '))] : [])],
    recommendations: highShare > 0.4 ? ['Critical coupling is rising — decouple high-criticality dependencies to keep the org adaptable.'] : [],
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

// ══════════ ANUSHA — EXECUTIVE EXPERIENCE & AUTONOMOUS OPERATIONS LAYER ══════════
// Turns constitutional intelligence into role-aware executive experience:
// verification, workflow orchestration, avatar/briefings, and the autonomous
// self-healing / governance / continuity runtimes.

// M15 — Verification Intelligence: did what we planned actually happen?
IMPL.M15 = (rt, context) => {
  const g = rt.graph
  const validation = g.validate()
  const assets = A.assets(g)
  // Execution evidence: an asset is 'executed/operational' when it has an owner
  // and all of its declared dependencies actually exist in the graph.
  const checks = assets.map((a) => {
    const hasOwner = A.owners(g, a.id).length > 0
    const deps = A.dependencies(g, a.id)
    const brokenDeps = deps.filter((r) => !g.entities.get(r.to))
    const verified = hasOwner && brokenDeps.length === 0
    return { asset: a.name, verified, hasOwner, brokenDependencies: brokenDeps.length }
  })
  const verifiedCount = checks.filter((c) => c.verified).length
  const rate = assets.length ? A.round(verifiedCount / assets.length) : 1
  return {
    type: 'truth',
    payload: {
      graphValid: validation.valid,
      verificationRate: rate,
      verifiedAssets: verifiedCount,
      totalAssets: assets.length,
      failedVerification: checks.filter((c) => !c.verified).map((c) => c.asset),
      integrityErrors: validation.entities.errors.concat(validation.relationships.errors),
    },
    confidence: validation.valid ? A.confidence(assets.length || 1, rate) : 0.4,
    evidence: [ev('graph', 'validate', validation.valid ? 'graph integrity valid' : 'graph integrity FAILED'), ev('graph', 'verification', `${verifiedCount}/${assets.length} assets verified`)],
    recommendations: checks.filter((c) => !c.verified).slice(0, 5).map((c) => `Verification failed for "${c.asset}" — ${c.hasOwner ? 'fix broken dependency' : 'assign an owner'}.`),
  }
}

// M16 — Workflow Orchestration: coordinate execution order across work.
IMPL.M16 = (rt) => {
  const g = rt.graph
  const workflows = A.byType(g, 'workflow')
  const detail = workflows.map((w) => {
    const dependsOn = A.dependencies(g, w.id).map((r) => A.nameOf(g, r.to))
    const owners = A.owners(g, w.id).map((r) => A.nameOf(g, r.from))
    return {
      workflow: w.name,
      dependsOn,
      owners,
      stage: dependsOn.length === 0 ? 'ready' : 'waiting-on-dependencies',
      blocked: owners.length === 0,
    }
  }).sort((a, b) => a.dependsOn.length - b.dependsOn.length)
  const bottlenecks = detail.filter((d) => d.blocked || d.dependsOn.length > 2)
  return {
    type: 'workflow',
    payload: {
      workflowCount: workflows.length,
      orchestrationOrder: detail,
      readyToRun: detail.filter((d) => d.stage === 'ready' && !d.blocked).map((d) => d.workflow),
      bottlenecks: bottlenecks.map((d) => d.workflow),
    },
    confidence: A.confidence(workflows.length || 1, 1),
    evidence: workflows.map((w) => ev('entity', w.id, w.name)),
    recommendations: bottlenecks.map((d) => `Unblock workflow "${d.workflow}"${d.blocked ? ' (assign an owner)' : ' (reduce dependencies)'}.`),
  }
}

// M21 — Executive Avatar: the personalized executive interface persona.
IMPL.M21 = (rt, context) => {
  const g = rt.graph
  const requestedRole = context && context.role
  const execs = A.byType(g, 'executive').map((x) => {
    const role = (x.metadata && x.metadata.role) || 'Executive'
    return {
      name: x.name,
      role,
      scope: A.owned(g, x.id).map((r) => A.nameOf(g, r.to)),
      opensWith: `Welcome ${x.name}. I understand you are the ${role}. Would you like today's Executive Briefing?`,
    }
  })
  const active = requestedRole
    ? execs.find((e) => e.role.toLowerCase().includes(String(requestedRole).toLowerCase())) || execs[0]
    : execs[0]
  return {
    type: 'generic',
    payload: { avatarCount: execs.length, avatars: execs, activeAvatar: active || null, requestedRole: requestedRole || null },
    confidence: A.confidence(execs.length || 1, execs.length ? 1 : 0.4),
    evidence: execs.map((e, i) => ev('avatar', String(i), `${e.name} (${e.role})`)),
    recommendations: [],
  }
}

// M23 — Executive Briefing: the right intelligence, at the right time, per role.
IMPL.M23 = (rt, context) => {
  const g = rt.graph
  const role = (context && context.role) || 'Executive'
  const health = A.prior(context, 'M25')
  const risk = A.prior(context, 'M03')
  const advisor = A.prior(context, 'M48')
  const prediction = A.prior(context, 'M11')
  const spofs = A.singlePointsOfFailure(g)
  const unowned = A.assets(g).filter((a) => A.owners(g, a.id).length === 0)
  const brief = []
  if (health) brief.push(`Organizational health is ${Math.round(health.payload.healthScore * 100)}% (grade ${health.payload.grade}).`)
  if (risk) brief.push(`Current risk level: ${risk.payload.riskLevel}.`)
  if (prediction && prediction.payload.imminentRisks && prediction.payload.imminentRisks.length) brief.push(`Imminent predicted risks: ${prediction.payload.imminentRisks.join(', ')}.`)
  if (spofs.length) brief.push(`${spofs.length} single point(s) of failure — top: ${spofs[0].name}.`)
  if (unowned.length) brief.push(`${unowned.length} unowned critical asset(s).`)
  if (!brief.length) brief.push('No critical issues detected; the organization is stable.')
  const priorities = advisor && advisor.payload.advice ? advisor.payload.advice.slice(0, 3).map((a) => a.advice) : []
  return {
    type: 'decision',
    payload: {
      generatedFor: role,
      briefing: brief,
      recommendedPriorities: priorities,
      sources: A.allPrior(context).map((p) => p.module),
    },
    confidence: A.confidence(brief.length, health || risk ? 1 : 0.7),
    evidence: [ev('graph', 'scan', 'executive briefing scan'), ...A.allPrior(context).slice(0, 6).map((p) => ev('module', p.module, 'briefing input'))],
    recommendations: priorities.length ? priorities : brief,
  }
}

// M51 — Self-Healing Organization: detect operational issues and heal them.
IMPL.M51 = (rt) => {
  const g = rt.graph
  const issues = []
  A.assets(g).filter((a) => A.owners(g, a.id).length === 0).forEach((a) => issues.push({ severity: 'medium', issue: `Unowned asset: ${a.name}`, action: `Auto-assign an interim owner to "${a.name}"`, auto: true }))
  A.singlePointsOfFailure(g).forEach((s) => issues.push({ severity: 'high', issue: `Single point of failure: ${s.name}`, action: `Provision a standby/backup owner for "${s.name}"`, auto: false }))
  A.byType(g, 'workflow').filter((w) => A.owners(g, w.id).length === 0).forEach((w) => issues.push({ severity: 'medium', issue: `Unowned workflow: ${w.name}`, action: `Reassign workflow "${w.name}" to an accountable owner`, auto: true }))
  A.all(g).filter((e) => A.degree(g, e.id) === 0).forEach((e) => issues.push({ severity: 'low', issue: `Isolated entity: ${e.name}`, action: `Reconnect "${e.name}" or archive it`, auto: false }))
  return {
    type: 'recommendation',
    payload: {
      detectedIssues: issues.length,
      autoHealable: issues.filter((i) => i.auto).length,
      healingActions: issues,
    },
    confidence: A.confidence(issues.length || 1, 1),
    evidence: issues.map((x, i) => ev('issue', String(i), x.issue)),
    recommendations: issues.map((x) => x.action),
  }
}

// M52 — Autonomous Governance: enforce policy coverage continuously.
IMPL.M52 = (rt, context) => {
  const g = rt.graph
  const governed = new Set(A.edgesOfType(g, 'governs').map((r) => r.to))
  const assets = A.assets(g).filter((a) => a.type !== 'policy')
  const gaps = assets.filter((a) => !governed.has(a.id))
  const compliance = assets.length ? A.round((assets.length - gaps.length) / assets.length) : 1
  return {
    type: 'governance',
    payload: {
      complianceRate: compliance,
      compliant: compliance >= 0.8,
      governanceGaps: gaps.map((a) => a.name),
      autoEnforceActions: gaps.map((a) => `Attach default governance policy to "${a.name}"`),
    },
    confidence: A.confidence(A.edgesOfType(g, 'governs').length || 1, compliance || 0.5),
    evidence: gaps.map((a) => ev('entity', a.id, `governance gap: ${a.name}`)),
    recommendations: gaps.map((a) => `Automate a governance policy for "${a.name}".`),
  }
}

// M53 — Autonomous Continuity: keep the org operational during disruption.
// continuityScore comes from M18 (its declared dependsOn) rather than being
// recomputed here — the two modules independently ran the identical
// `1 - spofs/assets` formula until this fix, with nothing to stop them
// drifting apart if it ever changed in only one place.
IMPL.M53 = (rt, context) => {
  const g = rt.graph
  const spofs = A.singlePointsOfFailure(g)
  const assets = A.assets(g)
  const continuity = A.prior(context, 'M18')
  const continuityScore = continuity ? continuity.payload.continuityScore : A.round(1 - Math.min(1, spofs.length / Math.max(1, assets.length)))
  const plans = spofs.map((s) => ({
    asset: s.name,
    dependents: s.dependents,
    priority: s.dependents > 3 ? 'critical' : s.dependents > 1 ? 'high' : 'medium',
    recoveryAction: `Failover + backup owner for "${s.name}"`,
  })).sort((a, b) => b.dependents - a.dependents)
  return {
    type: 'health',
    payload: {
      continuityScore,
      resilience: continuityScore > 0.66 ? 'resilient' : continuityScore > 0.33 ? 'fragile' : 'critical',
      recoveryPlanCount: plans.length,
      recoveryPlans: plans,
    },
    confidence: A.confidence(plans.length || 1, continuityScore || 0.5),
    evidence: spofs.map((s) => ev('entity', s.id, `continuity risk: ${s.name}`)),
    recommendations: plans.map((p) => p.recoveryAction),
  }
}

module.exports = IMPL
