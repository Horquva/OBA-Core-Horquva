/**
 * GRAPH LOADER — real organizational reality, from Supabase
 * -----------------------------------------------------------
 * The one place organizational data enters the graph. Builds the Unified
 * Knowledge Graph (see ontology.js for the valid entity/relationship
 * vocabulary) from the real relational schema in backend/sql/. It replaced
 * graphSeeder.js's synthetic 16-entity demo organization, which was deleted
 * with the runtime — there is no stand-in data any more, and a failed load
 * means the analyses answer 503 rather than serving fiction.
 *
 * Executives vs employees: anyone with no `manager` (the 6 department heads)
 * or a VP/C-level/Head-of/Director title is modeled as `executive`; everyone
 * else as `employee`. Both `agents` and `ai_platforms` map to the ontology's
 * `ai_agent` type (its own definition is "an AI tool or agent"); metadata.kind
 * distinguishes which table an entity came from.
 *
 * ─── Ontology coverage: what's sourced, what still isn't ───
 * The ontology defines `system`, `team`, `customer`, `process` and `project`.
 * Three of the five now have real Supabase tables of their own: `system` from
 * `systems`/`system_dependencies`/`system_agent_usage`, `process` from
 * `accountability_entities` (entity_type='process', same source
 * export-company.js's outProcesses already derives from), and `vendor`/
 * `customer` from `external_entities`/`external_entity_supplies` (W-J,
 * done 2026-08-26 — this loader no longer reads `data/company.json` at all).
 * `team` and `project` have no data source anywhere in this codebase, seed or
 * hand-authored, so they remain genuinely empty — that absence must still not
 * be read as "this organization has none", and inventing data for them would
 * violate D-07 (never fabricate). `asset` and `capability` are also empty by
 * design, not omission: `asset` is a category label already satisfied by
 * analytics.js's ASSET_TYPES union, and `capability` describes the Brain's
 * own module catalog, not organizational data.
 *
 * `decision` is now wired from `decision_queue` (below) — real per-row
 * ownership and subject data existed the whole time, just never reached the
 * graph. `decision_history` (a second, separate decisions table, read only by
 * derived.js's decisionQuality() for its aggregate score) has no owner column
 * at all and stays out of the graph for that reason.
 *
 * `collaborates_with` IS derived here (never invented — R-1, metadata.source =
 * 'derived'), because BUILD_SPEC Part 0 records that its absence makes M42
 * report all 40 people as siloed: "a wrong answer, not a missing one". The two
 * sources below reproduce export-company.js's derivation exactly, so the graph
 * and data/company.json agree on 51 pairs covering 24 of 40 people. ⚠ The other
 * 16 appear in no shared-work record — that is NO_SIGNAL, not a finding, and
 * W6 still has to stop M42 rendering it as a flat "siloed" verdict.
 */

const supabase = require('../../supabase')
const { loadOwnerBackupByEmployee } = require('../../lib/ownerBackups')
const { deriveCollaborations } = require('../../lib/deriveCollaborations')

const EXEC_TITLE = /^(VP|COO|CFO|CEO|CTO|Head of|Chief|President|Director)/i

async function loadFromSupabase(graph) {
  const E = (spec) => graph.addEntity(spec)
  const R = (from, type, to, extra = {}) => {
    if (!from || !to) return null
    return graph.addRelationship({ from: from.id, to: to.id, type, ...extra })
  }

  /**
   * Carry the WHOLE source row into entity metadata.
   *
   * This loader used to keep a hand-picked four or five columns per entity and
   * silently drop the rest — `cost`, `usage_count`, `adoption_pct`, `last_used`,
   * `tenure`, `skills`, `workload` and every timestamp. That loss is why cost and
   * adoption questions could not be asked of the graph at all, and it is the
   * reason those pages are served by SQL instead. Nothing is dropped now.
   *
   * `id` and `name` are omitted because the entity already carries its own
   * identity and a second copy only invites drift; the row's primary key is kept
   * explicitly as `sourceId`, which is also what BUILD_SPEC W3 (stable ids across
   * graph and database) will need.
   *
   * ⚠ Carrying timestamps as fields is NOT a time dimension. The graph is still a
   * snapshot of now; recording what CHANGED is W5.
   */
  const rowMeta = (sourceTable, row, { omit = [], ...extra } = {}) => {
    const meta = { sourceTable, sourceId: row.id }
    for (const [k, v] of Object.entries(row)) {
      if (k === 'id' || k === 'name' || omit.includes(k)) continue
      meta[k] = v
    }
    return { ...meta, ...extra }
  }

  const [
    { data: employees, error: e1 },
    { data: agents, error: e2 },
    { data: platforms, error: e3 },
    { data: workflows, error: e4 },
    { data: workflowRunbooks, error: e5 },
    { data: dependencies, error: e6 },
    { data: toolOwnership, error: e7 },
    { data: toolUsers, error: e8 },
    { data: toolPolicies, error: e9 },
    { data: knowledgeAssets, error: e10 },
    { data: acctLinks, error: e11 },
    { data: acctEntities, error: e12 },
    { data: workflowSteps, error: e13 },
    { data: toolBackups, error: e15 },
    { data: agentPlatform, error: e16 },
    { data: workflowToolDeps, error: e17 },
    { data: systemsRows, error: e18 },
    { data: systemDeps, error: e19 },
    { data: systemAgentUsage, error: e20 },
    { data: externalEntities, error: e21 },
    { data: externalEntitySupplies, error: e22 },
    { data: decisionQueue, error: e23 },
  ] = await Promise.all([
    supabase.from('employees').select('*'),
    supabase.from('agents').select('*'),
    supabase.from('ai_platforms').select('*'),
    supabase.from('workflows').select('*'),
    supabase.from('workflow_runbooks').select('*'),
    supabase.from('dependencies').select('*'),
    supabase.from('tool_ownership').select('*'),
    supabase.from('tool_users').select('*'),
    supabase.from('tool_policies').select('*'),
    supabase.from('knowledge_assets').select('*'),
    supabase.from('accountability_links').select('*'),
    supabase.from('accountability_entities').select('*'),
    supabase.from('workflow_steps').select('*'),
    supabase.from('tool_backups').select('*'),
    supabase.from('agent_platform').select('*, agents ( name )'),
    supabase.from('workflow_tool_dependencies').select('*, workflows ( name )'),
    supabase.from('systems').select('*'),
    supabase.from('system_dependencies').select('*'),
    supabase.from('system_agent_usage').select('*'),
    supabase.from('external_entities').select('*'),
    supabase.from('external_entity_supplies').select('*'),
    supabase.from('decision_queue').select('*'),
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e15 || e16 || e17 || e18 || e19 || e20 || e21 || e22 || e23
  if (firstError) throw new Error(`graphLoader: ${firstError.message}`)

  // ─── Cross-cutting lookups ───
  // These carry facts that live on OTHER tables but describe an asset, and
  // that domain/dataset.js used to re-query for itself. Attaching them here is
  // what lets the dataset be derived from this graph instead of from a second
  // pass over Supabase.
  //
  // `agent_platform` and `workflow_tool_dependencies` are ALSO turned into real
  // `depends_on` edges below (not just metadata) — an agent or workflow that
  // depends on a platform is the same kind of dependency as agent->agent or
  // workflow->agent, and needs to count the same way in every cascade, SPOF
  // and centrality number the analyses produce. The metadata lookups here
  // (agentsUsing/workflowsUsing/backupTool) stay, since display code reads
  // them directly and they're harmless alongside the edges.
  // One join per concept: backup coverage is lib/ownerBackups.js's job, and
  // agents.js, dependencies.js and decisionIntelligence.js already use it.
  const backupByEmployee = await loadOwnerBackupByEmployee()

  const kaByAgent = {}, kaByWorkflow = {}, kaByPlatform = {}
  for (const k of knowledgeAssets || []) {
    if (k.asset_type === 'agent') kaByAgent[k.asset_id] = k
    else if (k.asset_type === 'workflow') kaByWorkflow[k.asset_id] = k
    else if (k.asset_type === 'platform') kaByPlatform[k.asset_id] = k
  }

  const platformNameById = Object.fromEntries((platforms || []).map((p) => [p.id, p.name]))
  const backupToolByPlatform = {}
  for (const b of toolBackups || []) backupToolByPlatform[b.primary_platform] = platformNameById[b.backup_platform] || null
  const agentsUsingByPlatform = {}
  for (const l of agentPlatform || []) {
    if (!l.agents?.name) continue
    ;(agentsUsingByPlatform[l.platform_id] ||= []).push(l.agents.name)
  }
  const workflowsUsingByPlatform = {}
  for (const l of workflowToolDeps || []) {
    if (!l.workflows?.name) continue
    ;(workflowsUsingByPlatform[l.platform_id] ||= []).push(l.workflows.name)
  }

  // ─── Organization + departments ───
  // No table stores the company's display name (data/company.json's is a
  // hand-authored placeholder, "Northwind Labs" — not queryable from Supabase).
  const org = E({ type: 'organization', name: 'Organization', metadata: { source: 'supabase' } })
  const departments = {}
  for (const dept of new Set(employees.map((e) => e.department).filter(Boolean))) {
    departments[dept] = E({ type: 'department', name: dept })
    // Departments compose the organization. Without this every department and
    // the organization itself sat at degree 0, and M37/M29/M45 duly reported
    // all seven as "isolated-entity" anomalies — an artifact of this loader,
    // not a finding about the company.
    R(departments[dept], 'supports', org, { metadata: { source: 'employees.department' } })
  }

  // ─── People ───
  const employeeEntities = {} // employees.id -> entity
  for (const emp of employees) {
    const isExec = !emp.manager || EXEC_TITLE.test(emp.role || '')
    employeeEntities[emp.id] = E({
      type: isExec ? 'executive' : 'employee',
      name: emp.name,
      metadata: rowMeta('employees', emp, { backup_owner: backupByEmployee[emp.id] ?? null }),
    })
  }
  const employeeByName = Object.fromEntries(employees.map((e) => [e.name, employeeEntities[e.id]]))

  // Each department's head — the one person in it with no manager — is its
  // accountable owner. `department` is not in analytics.js's ASSET_TYPES, so
  // these edges do not touch ownership-coverage or unowned-asset math; they
  // exist so the department is reachable and has a name against it. A
  // department with zero or several headless members is left unowned rather
  // than guessed at.
  for (const [dept, deptEntity] of Object.entries(departments)) {
    const heads = employees.filter((e) => e.department === dept && !e.manager)
    if (heads.length !== 1) continue
    R(employeeEntities[heads[0].id], 'owns', deptEntity, { metadata: { source: 'employees.department' } })
  }

  for (const emp of employees) {
    if (emp.manager && employeeByName[emp.manager]) {
      R(employeeEntities[emp.id], 'reports_to', employeeByName[emp.manager])
      // Inverse of reports_to, same source column. M20's managementLinks and
      // M26's per-executive `manages` list both read this edge type and were
      // silently always empty without it — the data was already here.
      R(employeeByName[emp.manager], 'manages', employeeEntities[emp.id], { metadata: { source: 'employees.manager' } })
    }
  }

  // ─── AI agents (both agents and ai_platforms map to ontology's ai_agent) ───
  const agentEntities = {} // agents.id -> entity
  for (const a of agents) {
    agentEntities[a.id] = E({
      type: 'ai_agent',
      name: a.name,
      // `type` is omitted and re-exposed as `agentType`: the row's type is
      // 'automation'/'analysis', which would read as the entity's own type.
      metadata: rowMeta('agents', a, {
        omit: ['type'], kind: 'automation-agent', agentType: a.type,
        documented: kaByAgent[a.id] ? kaByAgent[a.id].is_documented : null,
      }),
    })
    if (a.owner_id && employeeEntities[a.owner_id]) {
      R(employeeEntities[a.owner_id], 'owns', agentEntities[a.id], { criticality: a.risk || 'medium', metadata: { source: 'agents.owner_id' } })
    }
  }

  const platformEntities = {} // ai_platforms.id -> entity
  for (const p of platforms) {
    platformEntities[p.id] = E({
      type: 'ai_agent',
      name: p.name,
      metadata: rowMeta('ai_platforms', p, {
        omit: ['type'], kind: 'ai-platform', agentType: p.type,
        documented: kaByPlatform[p.id] ? kaByPlatform[p.id].is_documented : null,
        assetCriticality: kaByPlatform[p.id] ? kaByPlatform[p.id].criticality : null,
        backupTool: backupToolByPlatform[p.id] || null,
        agentsUsing: agentsUsingByPlatform[p.id] || [],
        workflowsUsing: workflowsUsingByPlatform[p.id] || [],
      }),
    })
  }
  for (const own of toolOwnership) {
    if (employeeEntities[own.employee_id] && platformEntities[own.platform_id]) {
      R(employeeEntities[own.employee_id], 'owns', platformEntities[own.platform_id], { metadata: { source: 'tool_ownership' } })
    }
  }
  for (const use of toolUsers) {
    if (employeeEntities[use.employee_id] && platformEntities[use.platform_id]) {
      R(employeeEntities[use.employee_id], 'uses', platformEntities[use.platform_id])
    }
  }

  // ─── Workflows (owner resolved via workflow_runbooks, same as backend/routes/workflows) ───
  const workflowEntities = {} // workflows.id -> entity
  const runbookByWorkflow = Object.fromEntries(workflowRunbooks.map((r) => [r.workflow_id, r]))
  for (const w of workflows) {
    const rbForMeta = runbookByWorkflow[w.id]
    workflowEntities[w.id] = E({
      type: 'workflow',
      name: w.name,
      metadata: rowMeta('workflows', w, {
        // A workflow's runbook is the authority on whether it is documented;
        // a knowledge_asset entry is the fallback. Same precedence
        // domain/dataset.js has always used.
        documented: rbForMeta ? rbForMeta.is_documented
          : (kaByWorkflow[w.id] ? kaByWorkflow[w.id].is_documented : null),
      }),
    })
    const rb = runbookByWorkflow[w.id]
    if (rb && employeeEntities[rb.owner_id]) {
      R(employeeEntities[rb.owner_id], 'owns', workflowEntities[w.id], { criticality: w.risk || 'medium', metadata: { source: 'workflow_runbooks' } })
    }
  }

  // ─── Dependencies (agent->agent and workflow->agent) ───
  const nodeFor = (type, id) => (type === 'workflow' ? workflowEntities[id] : agentEntities[id])
  for (const dep of dependencies) {
    const from = nodeFor(dep.source_type, dep.source_id)
    const to = nodeFor(dep.target_type, dep.target_id)
    if (from && to) {
      R(from, 'depends_on', to, { criticality: dep.dependency_type || 'medium' })
    }
  }

  // ─── Tool/platform dependencies (agent_platform, workflow_tool_dependencies) ───
  for (const l of agentPlatform || []) {
    const agent = agentEntities[l.agent_id]
    const platform = platformEntities[l.platform_id]
    if (agent && platform) R(agent, 'depends_on', platform, { metadata: { source: 'agent_platform' } })
  }
  for (const l of workflowToolDeps || []) {
    const workflow = workflowEntities[l.workflow_id]
    const platform = platformEntities[l.platform_id]
    if (workflow && platform) {
      R(workflow, 'depends_on', platform, {
        criticality: l.is_critical ? 'critical' : 'medium',
        metadata: { source: 'workflow_tool_dependencies' },
      })
    }
  }

  // ─── Policies (tool_policies -> platform) ───
  const policyEntities = {} // policy_name -> entity
  for (const pol of toolPolicies) {
    if (!platformEntities[pol.platform_id]) continue
    if (!policyEntities[pol.policy_name]) {
      policyEntities[pol.policy_name] = E({
        type: 'policy',
        name: pol.policy_name,
        metadata: rowMeta('tool_policies', pol, { omit: ['policy_name'] }),
      })
    }
    R(policyEntities[pol.policy_name], 'governs', platformEntities[pol.platform_id])
  }

  // ─── Knowledge (knowledge_assets -> its subject agent/platform/workflow) ───
  const subjectFor = (asset_type, asset_id) => {
    if (asset_type === 'agent') return agentEntities[asset_id]
    if (asset_type === 'platform') return platformEntities[asset_id]
    if (asset_type === 'workflow') return workflowEntities[asset_id]
    return null
  }
  for (const k of knowledgeAssets) {
    const knowledge = E({
      type: 'knowledge',
      name: k.topic,
      // `documented` is kept as an alias for is_documented — it is the name the
      // rest of the codebase uses for this concept.
      metadata: rowMeta('knowledge_assets', k, { omit: ['topic'], documented: k.is_documented }),
    })
    const subject = subjectFor(k.asset_type, k.asset_id)
    if (subject) R(knowledge, 'supports', subject)
    if (k.owner_id && employeeEntities[k.owner_id]) R(employeeEntities[k.owner_id], 'owns', knowledge, { metadata: { source: 'knowledge_assets' } })
  }

  // ─── Systems (systems / system_dependencies / system_agent_usage tables) ───
  const employeeById = Object.fromEntries(employees.map((e) => [e.id, employeeEntities[e.id]]))
  const systemEntities = {} // systems.id -> entity
  for (const s of systemsRows || []) {
    systemEntities[s.id] = E({
      type: 'system',
      name: s.name,
      metadata: {
        sourceTable: 'systems', sourceId: s.id, department: s.department,
        criticality: s.criticality, documented: s.documented, description: s.description,
      },
    })
    if (s.owner_id && employeeById[s.owner_id]) {
      R(employeeById[s.owner_id], 'owns', systemEntities[s.id], {
        criticality: s.criticality || 'medium', metadata: { source: 'systems' },
      })
    }
  }
  for (const sd of systemDeps || []) {
    if (systemEntities[sd.system_id] && systemEntities[sd.depends_on_system_id]) {
      R(systemEntities[sd.system_id], 'depends_on', systemEntities[sd.depends_on_system_id], { metadata: { source: 'systems' } })
    }
  }
  // Agents that actually run against/deploy to/monitor a system. Without this, no
  // agent ever depends_on a system, so a system's real usage is invisible to
  // fan-in — M38 (Opportunity Intelligence) then reads that as "underused" for
  // any system nothing else in the graph happens to lean on, which is wrong for
  // e.g. Customer Data Warehouse rather than genuinely idle.
  for (const su of systemAgentUsage || []) {
    if (agentEntities[su.agent_id] && systemEntities[su.system_id]) {
      R(agentEntities[su.agent_id], 'depends_on', systemEntities[su.system_id], { metadata: { source: 'system_agent_usage' } })
    }
  }

  // ─── External entities (external_entities / external_entity_supplies tables) ───
  const extEntities = {} // external_entities.id -> entity
  for (const ext of externalEntities || []) {
    extEntities[ext.id] = E({
      type: ext.kind === 'customer' ? 'customer' : 'vendor',
      name: ext.name,
      metadata: { sourceTable: 'external_entities', sourceId: ext.id, criticality: ext.criticality },
    })
    if (ext.relationship_owner_id && employeeById[ext.relationship_owner_id]) {
      R(employeeById[ext.relationship_owner_id], 'owns', extEntities[ext.id], {
        criticality: ext.criticality || 'medium', metadata: { source: 'external_entities' },
      })
    }
  }
  for (const sup of externalEntitySupplies || []) {
    if (extEntities[sup.external_entity_id] && platformEntities[sup.platform_id]) {
      R(extEntities[sup.external_entity_id], 'produces', platformEntities[sup.platform_id], { metadata: { source: 'external_entities' } })
    }
  }

  // ─── Processes (accountability_entities, entity_type='process') ───
  // Same source `export-company.js`'s outProcesses already derives from — no
  // company.json round-trip needed, graphLoader already has both tables loaded.
  const raciFor = (entityId, role) =>
    (acctLinks || []).find((l) => l.entity_id === entityId && l.raci_role === role)?.person_name ?? null
  for (const e of (acctEntities || []).filter((x) => x.entity_type === 'process')) {
    const processEntity = E({
      type: 'process',
      name: e.entity_name,
      metadata: { sourceTable: 'accountability_entities', sourceId: e.id, department: e.department },
    })
    const accountableName = raciFor(e.id, 'Accountable')
    const responsibleName = raciFor(e.id, 'Responsible')
    if (accountableName && employeeByName[accountableName]) {
      R(employeeByName[accountableName], 'owns', processEntity, { metadata: { source: 'accountability_entities', raci: 'accountable' } })
    }
    if (responsibleName && employeeByName[responsibleName]) {
      R(employeeByName[responsibleName], 'executes', processEntity, { metadata: { source: 'accountability_entities', raci: 'responsible' } })
    }
  }

  // ─── Decisions (decision_queue table) ───
  // decision_queue carries real per-row identity — a responsible owner
  // (`responsible_person`) and a named subject (`entity_name`) — unlike
  // decision_history (the table decisionQuality() in derived.js reads for its
  // aggregate score), which has no owner column at all. This loader never
  // wired decision_queue in before: the ontology's `decision` type sat at 0
  // entities despite this real, relationally-rich table already being read
  // live by six route files (voice.js, briefing.js, decisionSupport.js,
  // constitutional.js, context.js, automation/index.js).
  //
  // `entity_name` carries no type alongside it, so it is resolved against
  // every named entity type this loader builds, in a fixed order. A name
  // that doesn't resolve anywhere is skipped, not invented (D-07).
  const workflowByName = Object.fromEntries(workflows.map((w) => [w.name, workflowEntities[w.id]]))
  const agentByName = Object.fromEntries(agents.map((a) => [a.name, agentEntities[a.id]]))
  const platformByName = Object.fromEntries(platforms.map((p) => [p.name, platformEntities[p.id]]))
  const resolveByName = (name) =>
    employeeByName[name] || agentByName[name] || workflowByName[name] || platformByName[name] || null

  for (const d of decisionQueue || []) {
    const decisionEntity = E({
      type: 'decision',
      name: d.title,
      metadata: rowMeta('decision_queue', d, { omit: ['title'] }),
    })
    if (d.responsible_person && employeeByName[d.responsible_person]) {
      R(employeeByName[d.responsible_person], 'owns', decisionEntity, { metadata: { source: 'decision_queue' } })
    }
    const subject = d.entity_name ? resolveByName(d.entity_name) : null
    if (subject) {
      R(decisionEntity, 'concerns', subject, { metadata: { source: 'decision_queue' } })
    }
  }

  // ─── Collaboration (derived — no source table; see deriveCollaborations.js) ───
  // One edge per pair: M42 and M29 read `neighbors()`, which is direction-blind,
  // so a second reciprocal edge would double the count without adding meaning.
  // A name that resolves to no employee is skipped rather than invented.
  for (const { a, b, basis, on, weight } of deriveCollaborations({ acctEntities, acctLinks, workflows, workflowSteps })) {
    R(employeeByName[a], 'collaborates_with', employeeByName[b], {
      metadata: { source: 'derived', basis, on, weight },
    })
  }

  return graph.stats()
}

module.exports = { loadFromSupabase }
