/**
 * GRAPH LOADER — real organizational reality, from Supabase
 * -----------------------------------------------------------
 * The production replacement for graphSeeder.js's synthetic "Horquva Pilot
 * Org" demo data, named in that file's own comment: "In production this is
 * replaced by live discovery / Supabase import; the structure of entities +
 * relationships stays identical." Builds the same Unified Knowledge Graph
 * shape (see ontology.js for the valid entity/relationship vocabulary) from
 * the real relational schema in backend/sql/.
 *
 * Executives vs employees: anyone with no `manager` (the 6 department heads)
 * or a VP/C-level/Head-of/Director title is modeled as `executive`; everyone
 * else as `employee`. Both `agents` and `ai_platforms` map to the ontology's
 * `ai_agent` type (its own definition is "an AI tool or agent"); metadata.kind
 * distinguishes which table an entity came from.
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
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10
  if (firstError) throw new Error(`graphLoader: ${firstError.message}`)

  // ─── Organization + departments ───
  // No table stores the company's display name (data/company.json's is a
  // hand-authored placeholder, "Northwind Labs" — not queryable from Supabase).
  const org = E({ type: 'organization', name: 'Organization', metadata: { source: 'supabase' } })
  const departments = {}
  for (const dept of new Set(employees.map((e) => e.department).filter(Boolean))) {
    departments[dept] = E({ type: 'department', name: dept })
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
      R(employeeEntities[a.owner_id], 'owns', agentEntities[a.id], { criticality: a.risk || 'medium' })
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
      R(employeeEntities[own.employee_id], 'owns', platformEntities[own.platform_id])
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
      R(employeeEntities[rb.owner_id], 'owns', workflowEntities[w.id], { criticality: w.risk || 'medium' })
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
    if (k.owner_id && employeeEntities[k.owner_id]) R(employeeEntities[k.owner_id], 'owns', knowledge)
  }

  return graph.stats()
}

module.exports = { loadFromSupabase }
