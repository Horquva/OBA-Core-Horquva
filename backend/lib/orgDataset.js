// Shared, live-from-Supabase organizational snapshot — one assembled shape
// { agents, workflows, ai_tools, knowledge_areas, incidents, decisions_log,
// history }, used by both intelligence/constitutional.js (M36-M55 scoring)
// and voice/voice.js (the conversational answer engine), so the same real
// joins aren't duplicated or allowed to drift between the two.
//
// Two gaps are real, not bugs: this schema has no per-agent/workflow
// "documented" or "backup_owner" columns without a join (see below), and no
// incidents table with resolution/lesson tracking exists at all —
// `incidents` is always [] rather than fabricated.

const supabase = require('../supabase')

async function loadOrgDataset() {
  const [
    { data: agents, error: e1 },
    { data: employees, error: e2 },
    { data: owners, error: e3 },
    { data: workflows, error: e4 },
    { data: workflowRunbooks, error: e5 },
    { data: knowledgeAssets, error: e6 },
    { data: decisionHistory, error: e7 },
    { data: docTrend, error: e8 },
    { data: snapshots, error: e9 },
    { data: platforms, error: e10 },
    { data: toolUsers, error: e11 },
    { data: toolBackups, error: e12 },
    { data: agentPlatform, error: e13 },
    { data: workflowToolDeps, error: e14 },
  ] = await Promise.all([
    supabase.from('agents').select('*'),
    supabase.from('employees').select('id, name, department'),
    supabase.from('owners').select('*'),
    supabase.from('workflows').select('*'),
    supabase.from('workflow_runbooks').select('*, employees ( name )'),
    supabase.from('knowledge_assets').select('*'),
    supabase.from('decision_history').select('*').order('decided_at'),
    supabase.from('documentation_trend').select('*').order('recorded_month'),
    supabase.from('snapshots').select('*').order('snapshot_date'),
    supabase.from('ai_platforms').select('*'),
    supabase.from('tool_users').select('platform_id, employees ( name, department )'),
    supabase.from('tool_backups').select('*'),
    supabase.from('agent_platform').select('*, agents ( name )'),
    supabase.from('workflow_tool_dependencies').select('*, workflows ( name )'),
  ])
  const firstError = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8 || e9 || e10 || e11 || e12 || e13 || e14
  if (firstError) throw new Error(firstError.message)

  const empById = Object.fromEntries((employees || []).map((e) => [e.id, e]))
  // agents.owner_id and workflow_runbooks.owner_id both reference employees.id,
  // NOT owners.id despite the matching name — verified against the pinned
  // "DeployBot -> Yuki Tanaka" ownership fact. `owners` is a separate, smaller
  // reference list (10 rows) keyed by name that only exists to carry
  // `backup_owner`, so it's looked up by name, not id.
  const ownerByName = Object.fromEntries((owners || []).map((o) => [o.name, o]))

  const kaByAgent = {}, kaByWorkflow = {}, kaByPlatform = {}
  ;(knowledgeAssets || []).forEach((k) => {
    if (k.asset_type === 'agent') kaByAgent[k.asset_id] = k
    else if (k.asset_type === 'workflow') kaByWorkflow[k.asset_id] = k
    else if (k.asset_type === 'platform') kaByPlatform[k.asset_id] = k
  })

  const dAgents = (agents || []).map((a) => {
    const owner = empById[a.owner_id]
    const ownerRow = owner ? ownerByName[owner.name] : null
    const ka = kaByAgent[a.id]
    return {
      id: a.id,
      name: a.name,
      status: a.status,
      owner: owner ? owner.name : null,
      backup_owner: ownerRow ? ownerRow.backup_owner : null,
      criticality: a.risk,
      department: owner ? owner.department : null,
      documented: ka ? ka.is_documented : null,
    }
  })

  const runbookByWorkflow = Object.fromEntries((workflowRunbooks || []).map((r) => [r.workflow_id, r]))
  const dWorkflows = (workflows || []).map((w) => {
    const rb = runbookByWorkflow[w.id]
    const ownerName = rb?.employees?.name || null
    const ownerRow = ownerName ? ownerByName[ownerName] : null
    const ka = kaByWorkflow[w.id]
    return {
      id: w.id,
      name: w.name,
      status: w.status,
      owner: ownerName,
      backup_owner: ownerRow ? ownerRow.backup_owner : null,
      criticality: w.risk,
      department: w.department,
      documented: rb ? rb.is_documented : (ka ? ka.is_documented : null),
    }
  })

  const userMap = {}
  ;(toolUsers || []).forEach((l) => {
    const e = l.employees
    if (!e) return
    const slot = (userMap[l.platform_id] = userMap[l.platform_id] || { users: [], departments: new Set() })
    if (e.name && !slot.users.includes(e.name)) slot.users.push(e.name)
    if (e.department) slot.departments.add(e.department)
  })
  const nameById = Object.fromEntries((platforms || []).map((p) => [p.id, p.name]))
  const backupByPlatform = {}
  ;(toolBackups || []).forEach((b) => { backupByPlatform[b.primary_platform] = nameById[b.backup_platform] || null })
  const agentsUsingByPlatform = {}
  ;(agentPlatform || []).forEach((l) => {
    if (!l.agents?.name) return
    ;(agentsUsingByPlatform[l.platform_id] = agentsUsingByPlatform[l.platform_id] || []).push(l.agents.name)
  })
  const workflowsUsingByPlatform = {}
  ;(workflowToolDeps || []).forEach((l) => {
    if (!l.workflows?.name) return
    ;(workflowsUsingByPlatform[l.platform_id] = workflowsUsingByPlatform[l.platform_id] || []).push(l.workflows.name)
  })

  const dAiTools = (platforms || []).map((t) => {
    const ka = kaByPlatform[t.id]
    return {
      id: t.id,
      name: t.name,
      criticality: ka ? ka.criticality : null,
      documented: ka ? ka.is_documented : null,
      backup_tool: backupByPlatform[t.id] || null,
      workflows: workflowsUsingByPlatform[t.id] || [],
      agents_using: agentsUsingByPlatform[t.id] || [],
    }
  })

  const dKnowledgeAreas = (knowledgeAssets || []).map((k) => {
    const owner = empById[k.owner_id]
    return { area: k.topic, holders: owner ? [owner.name] : [], documented: k.is_documented, criticality: k.criticality }
  })

  const dDecisionsLog = (decisionHistory || []).map((d) => ({ outcome: d.outcome, lesson: d.description }))

  // documentation_trend and snapshots are both 6 rows for the same 6 months
  // in the same chronological order — zip by index. open_incidents/backup_pct
  // have no per-month source in this schema and are left absent rather than
  // invented; consumers already treat a missing/flat trend as "no signal"
  // so this degrades honestly, not silently wrong.
  const dHistory = (docTrend || []).map((dt, i) => ({
    documented_pct: dt.coverage_pct,
    risk_index: snapshots?.[i]?.risk_index,
  }))

  return {
    agents: dAgents,
    workflows: dWorkflows,
    ai_tools: dAiTools,
    knowledge_areas: dKnowledgeAreas,
    incidents: [], // no incidents table with resolution/lesson tracking exists in this schema
    decisions_log: dDecisionsLog,
    history: dHistory,
  }
}

module.exports = { loadOrgDataset }
