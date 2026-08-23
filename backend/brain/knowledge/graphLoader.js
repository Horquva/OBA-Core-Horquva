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
 * ─── What this loader deliberately does NOT emit ───
 * The ontology defines `system`, `team`, `customer`, `process` and `project`,
 * and modules query them. No Supabase table sources any of the five, so they
 * are absent rather than approximated. `data/company.json` carries hand-authored
 * `systems` (4) and `external_entities` (10) which would fill `system` and
 * `vendor`/`customer` — wiring that file in is BUILD_SPEC's W2, not this file's
 * job. Until then M39's `systemCapabilities` and M31's `externalActors` are
 * legitimately empty, and must not be read as "this organization has none".
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

const EXEC_TITLE = /^(VP|COO|CFO|CEO|CTO|Head of|Chief|President|Director)/i

async function loadFromSupabase(graph) {
  const E = (spec) => graph.addEntity(spec)
  const R = (from, type, to, extra = {}) => {
    if (!from || !to) return null
    return graph.addRelationship({ from: from.id, to: to.id, type, ...extra })
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
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13
  if (firstError) throw new Error(`graphLoader: ${firstError.message}`)

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
      metadata: { role: emp.role, department: emp.department, risk: emp.risk },
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
    }
  }

  // ─── AI agents (both agents and ai_platforms map to ontology's ai_agent) ───
  const agentEntities = {} // agents.id -> entity
  for (const a of agents) {
    agentEntities[a.id] = E({
      type: 'ai_agent',
      name: a.name,
      metadata: { kind: 'automation-agent', agentType: a.type, status: a.status, risk: a.risk },
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
      metadata: { kind: 'ai-platform', agentType: p.type, status: p.status, vendor: p.vendor },
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
    workflowEntities[w.id] = E({
      type: 'workflow',
      name: w.name,
      metadata: { department: w.department, status: w.status, risk: w.risk, frequency: w.frequency },
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

  // ─── Policies (tool_policies -> platform) ───
  const policyEntities = {} // policy_name -> entity
  for (const pol of toolPolicies) {
    if (!platformEntities[pol.platform_id]) continue
    if (!policyEntities[pol.policy_name]) {
      policyEntities[pol.policy_name] = E({ type: 'policy', name: pol.policy_name, metadata: { status: pol.status } })
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
      metadata: { documented: k.is_documented, criticality: k.criticality },
    })
    const subject = subjectFor(k.asset_type, k.asset_id)
    if (subject) R(knowledge, 'supports', subject)
    if (k.owner_id && employeeEntities[k.owner_id]) R(employeeEntities[k.owner_id], 'owns', knowledge, { metadata: { source: 'knowledge_assets' } })
  }

  // ─── Collaboration (derived — no source table; see the header note) ───
  // Two people collaborate if they share an entity's RACI in
  // `accountability_links`, or both act as `human` in the same workflow's
  // steps. Identical to backend/tools/export-company.js's derivation, so this
  // graph and data/company.json's `collaborations` section cannot drift apart.
  // RACI runs first so the stronger basis wins when a pair appears in both.
  const collabPairs = new Map() // 'A|B' (sorted) -> { basis, on }
  const addPair = (a, b, basis, on) => {
    if (!a || !b || a === b) return
    const key = [a, b].sort().join('|')
    if (!collabPairs.has(key)) collabPairs.set(key, { basis, on })
  }

  const acctEntityById = Object.fromEntries(acctEntities.map((e) => [e.id, e]))
  const peopleByAcctEntity = {}
  for (const link of acctLinks) {
    (peopleByAcctEntity[link.entity_id] ||= new Set()).add(link.person_name)
  }
  for (const [entityId, people] of Object.entries(peopleByAcctEntity)) {
    const names = [...people]
    const on = (acctEntityById[entityId] || {}).entity_name || null
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) addPair(names[i], names[j], 'raci', on)
    }
  }

  const humansByWorkflow = {}
  for (const step of workflowSteps) {
    if (step.actor_type !== 'human' || !step.actor_name) continue
    (humansByWorkflow[step.workflow_id] ||= new Set()).add(step.actor_name)
  }
  for (const [workflowId, people] of Object.entries(humansByWorkflow)) {
    const names = [...people]
    const on = (workflows.find((w) => String(w.id) === String(workflowId)) || {}).name || null
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) addPair(names[i], names[j], 'workflow_step', on)
    }
  }

  // One edge per pair: M42 and M29 read `neighbors()`, which is direction-blind,
  // so a second reciprocal edge would double the count without adding meaning.
  // A name that resolves to no employee is skipped rather than invented.
  for (const [key, { basis, on }] of collabPairs) {
    const [a, b] = key.split('|')
    R(employeeByName[a], 'collaborates_with', employeeByName[b], {
      metadata: { source: 'derived', basis, on },
    })
  }

  return graph.stats()
}

module.exports = { loadFromSupabase }
