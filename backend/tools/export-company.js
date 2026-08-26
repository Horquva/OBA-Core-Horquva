// Exports the Supabase seed company from sql/02_seed_data.sql into the
// 11-section company-dataset shape. One-time migration tool.
const fs = require('fs')
const path = require('path')
const { maxLevel } = require('../domain/definitions')
const { deriveCollaborations } = require('../lib/deriveCollaborations')

const ROOT = process.argv[2]
const sql = fs.readFileSync(path.join(ROOT, 'backend/sql/02_seed_data.sql'), 'utf8')
  + '\n' + fs.readFileSync(path.join(ROOT, 'backend/sql/14_authored_entities.sql'), 'utf8')

// Vendors are authored here, so `ai_tools[].vendor` can finally be filled.
const VENDOR_OF = {
  'ChatGPT Enterprise': 'OpenAI',
  'Claude Pro': 'Anthropic',
  'GitHub Copilot': 'GitHub',
  'Gemini Advanced': 'Google',
}

// ── SQL VALUES parsing ──────────────────────────────────────────────────────

/** Strip -- line comments that sit outside string literals. */
function stripComments(s) {
  let out = '', inStr = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) {
      out += c
      if (c === "'") { if (s[i + 1] === "'") { out += s[++i] } else inStr = false }
      continue
    }
    if (c === "'") { inStr = true; out += c; continue }
    if (c === '-' && s[i + 1] === '-') { while (i < s.length && s[i] !== '\n') i++; out += '\n'; continue }
    out += c
  }
  return out
}

/** Split a VALUES body into top-level ( ... ) tuples. */
function splitTuples(body) {
  const tuples = []
  let depth = 0, cur = '', inStr = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (inStr) {
      cur += c
      if (c === "'") { if (body[i + 1] === "'") { cur += body[++i] } else inStr = false }
      continue
    }
    if (c === "'") { inStr = true; cur += c; continue }
    if (c === '(') { depth++; if (depth === 1) { cur = ''; continue } }
    if (c === ')') { depth--; if (depth === 0) { tuples.push(cur); cur = ''; continue } }
    if (depth > 0) cur += c
  }
  return tuples
}

/** Split one tuple body on top-level commas. */
function splitFields(t) {
  const out = []
  let depth = 0, cur = '', inStr = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (inStr) {
      cur += c
      if (c === "'") { if (t[i + 1] === "'") { cur += t[++i] } else inStr = false }
      continue
    }
    if (c === "'") { inStr = true; cur += c; continue }
    if (c === '[' || c === '(') depth++
    if (c === ']' || c === ')') depth--
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function coerce(v) {
  if (v == null) return null
  const s = v.trim()
  if (/^null$/i.test(s)) return null
  if (/^true$/i.test(s)) return true
  if (/^false$/i.test(s)) return false
  if (/^ARRAY\s*\[/i.test(s)) {
    const inner = s.slice(s.indexOf('[') + 1, s.lastIndexOf(']'))
    return inner.trim() ? splitFields(inner).map(coerce) : []
  }
  if (s.startsWith("'")) return s.slice(1, -1).replace(/''/g, "'")
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

/** Parse one INSERT INTO <table> into an array of column-keyed objects. */
function table(name) {
  const re = new RegExp(`INSERT INTO ${name}\\s*\\(([^)]*)\\)\\s*VALUES([\\s\\S]*?);\\s*(?:\\n|$)`, 'i')
  const m = stripComments(sql).match(re)
  if (!m) return []
  const cols = m[1].split(',').map((c) => c.trim())
  return splitTuples(m[2]).map((t) => {
    const f = splitFields(t)
    return Object.fromEntries(cols.map((c, i) => [c, coerce(f[i])]))
  })
}

// ── Load ────────────────────────────────────────────────────────────────────

const employees = table('employees')
const platforms = table('ai_platforms')
const agents = table('agents')
const owners = table('owners')
const workflows = table('workflows')
const deps = table('dependencies')
const toolOwn = table('tool_ownership')
const toolUsers = table('tool_users')
const toolBackups = table('tool_backups')
const wfSteps = table('workflow_steps')
const wfRunbooks = table('workflow_runbooks')
const knowledge = table('knowledge_assets')
const snapshots = table('snapshots')
const toolPolicies = table('tool_policies')
const acctEntities = table('accountability_entities')
const acctLinks = table('accountability_links')
const deptExposure = table('department_exposure')
const systemsRows = table('systems')
const systemDepsRows = table('system_dependencies')
const systemUsageRows = table('system_agent_usage')
const externalEntitiesRows = table('external_entities')
const externalSuppliesRows = table('external_entity_supplies')
const incidentsRows = table('incidents')

const empById = new Map(employees.map((e) => [e.id, e]))
const platById = new Map(platforms.map((p) => [p.id, p]))
const agentById = new Map(agents.map((a) => [a.id, a]))
const wfById = new Map(workflows.map((w) => [w.id, w]))
const empName = (id) => empById.get(id)?.name ?? null
const backupFor = (empId) => owners.find((o) => o.employee_id === empId)?.backup_owner ?? null
const docFor = (type, id) =>
  knowledge.find((k) => k.asset_type === type && k.asset_id === id)?.is_documented ?? null

const pad = (n) => String(n).padStart(3, '0')

// ── Build the 11 sections ───────────────────────────────────────────────────

const outEmployees = employees.map((e) => ({
  id: `emp_${pad(e.id)}`,
  name: e.name,
  role: e.role,
  department: e.department,
  reports_to: e.manager ?? null,
  status: 'active',
  started_at: e.hire_date ?? null,
  left_at: null,
  skills: e.skills ?? [],
  workload: e.workload ?? null,
}))

const outAgents = agents.map((a) => ({
  name: a.name,
  owner: empName(a.owner_id),
  backup_owner: backupFor(a.owner_id),
  criticality: a.risk,
  department: empById.get(a.owner_id)?.department ?? null,
  documented: docFor('agent', a.id),
  type: a.type,
  status: a.status,
  monthly_cost_usd: a.cost ?? null,
}))

const outTools = platforms.map((p) => {
  const users = toolUsers.filter((u) => u.platform_id === p.id).map((u) => empName(u.employee_id)).filter(Boolean)
  const ownerRow = toolOwn.find((o) => o.platform_id === p.id)
  const backup = toolBackups.find((b) => b.primary_platform === p.name)
  return {
    name: p.name,
    vendor: VENDOR_OF[p.name] ?? null, // authored above; null stays NOT_INGESTED, never inferred
    users,
    departments: [...new Set(users.map((n) => employees.find((e) => e.name === n)?.department).filter(Boolean))],
    monthly_cost_usd: p.cost_monthly ?? null,
    access_owner: ownerRow ? empName(ownerRow.employee_id) : null,
    backup_tool: backup ? backup.backup_platform : null,
  }
})

const outWorkflows = workflows.map((w) => {
  const rb = wfRunbooks.find((r) => r.workflow_id === w.id)
  const steps = wfSteps
    .filter((s) => s.workflow_id === w.id)
    .sort((a, b) => a.step_number - b.step_number)
    .map((s) => ({
      step: s.step_name,
      actor: s.actor_type,
      actor_name: s.actor_name ?? null,
      required: s.is_required ?? null,
      duration_minutes: s.duration_minutes ?? null,
    }))
  return {
    name: w.name,
    owner: rb ? empName(rb.owner_id) : null,
    backup_owner: rb ? backupFor(rb.owner_id) : null,
    criticality: w.risk,
    department: w.department,
    frequency: w.frequency,
    documented: rb ? rb.is_documented : null,
    steps,
  }
})

const nameFor = (type, id) =>
  type === 'agent' ? agentById.get(id)?.name
    : type === 'platform' || type === 'tool' ? platById.get(id)?.name
      : type === 'employee' ? empName(id)
        : type === 'workflow' ? wfById.get(id)?.name
          : null

// agent_source / agent_target duplicate source_id / target_id as integers —
// ignore them and resolve names from the typed id pair (R-4, R-5).
const outDeps = deps
  .map((d) => ({
    from: nameFor(d.source_type, d.source_id),
    from_type: d.source_type,
    to: nameFor(d.target_type, d.target_id),
    to_type: d.target_type,
    type: d.dependency_type,
    strength: d.strength ?? null,
  }))
  .filter((d) => d.from && d.to)

const systemNameById = new Map(systemsRows.map((s) => [s.id, s.name]))

const outSystems = systemsRows.map((s) => ({
  name: s.name,
  owner: empName(s.owner_id),
  department: s.department,
  criticality: s.criticality,
  documented: s.documented,
  depends_on: systemDepsRows
    .filter((sd) => sd.system_id === s.id)
    .map((sd) => systemNameById.get(sd.depends_on_system_id))
    .filter(Boolean),
  used_by: systemUsageRows
    .filter((su) => su.system_id === s.id)
    .map((su) => agentById.get(su.agent_id)?.name)
    .filter(Boolean),
  description: s.description,
}))

const outExternalEntities = externalEntitiesRows.map((e) => ({
  name: e.name,
  kind: e.kind,
  supplies: externalSuppliesRows
    .filter((sup) => sup.external_entity_id === e.id)
    .map((sup) => platById.get(sup.platform_id)?.name)
    .filter(Boolean),
  relationship_owner: empName(e.relationship_owner_id),
  criticality: e.criticality,
}))

const outIncidents = incidentsRows.map((i) => ({
  date: i.occurred_at,
  entity: i.entity_name,
  entity_type: i.entity_type,
  impact: i.impact,
  owner: empName(i.owner_id),
  resolved_by: empName(i.resolved_by_id),
  resolution_days: i.resolution_days,
  lesson: i.lesson,
}))

// knowledge_assets is one row per asset; group into areas by topic
const byTopic = new Map()
for (const k of knowledge) {
  const key = k.topic
  if (!byTopic.has(key)) byTopic.set(key, { area: key, holders: [], documented: true, criticality: k.criticality })
  const a = byTopic.get(key)
  const holder = empName(k.owner_id)
  if (holder && !a.holders.includes(holder)) a.holders.push(holder)
  if (!k.is_documented) a.documented = false
  // Was: if (k.criticality === 'critical') a.criticality = 'critical' -- which only
  // ever escalated for the exact string 'critical'; a 'high' row never raised the
  // group above whatever the FIRST row in the topic happened to be, an arbitrary,
  // order-dependent answer (same defect class as F-K). Take the max across every row.
  a.criticality = maxLevel([a.criticality, k.criticality])
}
const outKnowledge = [...byTopic.values()]

// ── organization / departments / policies / processes ───────────────────────
// These four entity types had no table and lived only in graphSeeder.js.
// graphSeeder is deleted; these authored rows are now their only source.

const raciFor = (entityId, role) =>
  acctLinks.find((l) => l.entity_id === entityId && l.raci_role === role)?.person_name ?? null

const roots = employees.filter((e) => !e.manager)

const outDepartments = deptExposure.map((d) => {
  const head = roots.find((r) => r.department === d.department)
  return {
    name: d.department,
    head: head ? head.name : null,
    headcount: employees.filter((e) => e.department === d.department).length,
    documentation_coverage: d.documentation_coverage,
    backup_coverage: d.backup_coverage,
    incident_exposure_score: d.incident_exposure_score,
    risk_level: d.incident_risk_level,
  }
})

const outOrganization = {
  name: 'Northwind Labs',
  industry: 'B2B SaaS',
}

// Tool-scoped policies from tool_policies, org-scoped from accountability_entities.
const policyMap = new Map()
for (const p of toolPolicies) {
  if (!policyMap.has(p.policy_name)) {
    policyMap.set(p.policy_name, {
      name: p.policy_name, scope: 'tool', governs: [], department: null,
      accountable: null, status: p.status,
    })
  }
  const name = platById.get(p.platform_id)?.name
  if (name) policyMap.get(p.policy_name).governs.push(name)
}
for (const e of acctEntities.filter((x) => x.entity_type === 'policy')) {
  policyMap.set(e.entity_name, {
    name: e.entity_name, scope: 'organization', governs: [], department: e.department,
    accountable: raciFor(e.id, 'Accountable'), status: 'active',
  })
}
const outPolicies = [...policyMap.values()]

const outProcesses = acctEntities
  .filter((x) => x.entity_type === 'process')
  .map((e) => ({
    name: e.entity_name,
    department: e.department,
    accountable: raciFor(e.id, 'Accountable'),
    responsible: raciFor(e.id, 'Responsible'),
  }))

// Attach RACI accountability to workflows where the seed records it. Where this
// disagrees with the runbook owner that is an R-1 CONFLICT to surface, not a bug.
const wfAcct = new Map(
  acctEntities.filter((x) => x.entity_type === 'workflow').map((e) => [e.entity_name, raciFor(e.id, 'Accountable')]),
)
outWorkflows.forEach((w) => { w.accountable = wfAcct.get(w.name) ?? null })

// ── collaborations ──────────────────────────────────────────────────────────
// `collaborates_with` is READ BY MODULES — implementations.js:1007 marks every
// human with no such edge as "siloed", so an empty set makes the brain report
// all 40 people isolated. Derived, never invented, via the same
// deriveCollaborations() graphLoader.js calls — one algorithm, not two kept in
// sync by hand (that comment used to promise "identical" without enforcing it,
// and had already drifted on the basis label and weight tracking).
const outCollaborations = deriveCollaborations({ acctEntities, acctLinks, workflows, workflowSteps: wfSteps })
  .map(({ a, b, basis, on, weight }) => ({ from: a, to: b, basis, on, weight }))
  .sort((a, b) => b.weight - a.weight)

const outHistory = snapshots.map((s) => ({
  month: s.snapshot_date,
  headcount: s.headcount,
  avg_workload: s.avg_workload,
  tool_cost_usd: s.total_tool_cost,
  risk_index: s.risk_index,
  continuity_score: s.continuity_score,
  governance_score: s.governance_score,
}))

const dataset = {
  company: outOrganization.name,
  _note:
    'Exported from backend/sql/02_seed_data.sql and backend/sql/14_authored_entities.sql by ' +
    'backend/tools/export-company.js. Placeholder company name — rename freely. This is the ' +
    'ONLY company dataset: never merge another one into it, replace it (BUILD_SPEC Part 0A). ' +
    'systems, incidents and external_entities are derived from the systems/incidents/' +
    'external_entities tables like every other section — no hand-authored data remains.',
  organization: outOrganization,
  departments: outDepartments,
  employees: outEmployees,
  agents: outAgents,
  ai_tools: outTools,
  workflows: outWorkflows,
  processes: outProcesses,
  policies: outPolicies,
  dependencies: outDeps,
  collaborations: outCollaborations,
  knowledge_areas: outKnowledge,
  history: outHistory,
  systems: outSystems,
  incidents: outIncidents,
  external_entities: outExternalEntities,
}

// ── Validate against Part 0A ────────────────────────────────────────────────

const errs = []
const names = outEmployees.map((e) => e.name)
const dupes = names.filter((n, i) => names.indexOf(n) !== i)
if (dupes.length) errs.push(`rule 1 — duplicate names: ${[...new Set(dupes)].join(', ')}`)

const nameSet = new Set(names)
const referenced = new Set()
outAgents.forEach((a) => { if (a.owner) referenced.add(a.owner); if (a.backup_owner) referenced.add(a.backup_owner) })
outTools.forEach((t) => { t.users.forEach((u) => referenced.add(u)); if (t.access_owner) referenced.add(t.access_owner) })
outWorkflows.forEach((w) => {
  if (w.owner) referenced.add(w.owner)
  if (w.backup_owner) referenced.add(w.backup_owner)
  w.steps.forEach((s) => { if (s.actor === 'human' && s.actor_name) referenced.add(s.actor_name) })
})
outKnowledge.forEach((k) => k.holders.forEach((h) => referenced.add(h)))
outDepartments.forEach((d) => { if (d.head) referenced.add(d.head) })
outPolicies.forEach((p) => { if (p.accountable) referenced.add(p.accountable) })
outProcesses.forEach((p) => {
  if (p.accountable) referenced.add(p.accountable)
  if (p.responsible) referenced.add(p.responsible)
})
outWorkflows.forEach((w) => { if (w.accountable) referenced.add(w.accountable) })
outCollaborations.forEach((c) => { referenced.add(c.from); referenced.add(c.to) })
outSystems.forEach((s) => { if (s.owner) referenced.add(s.owner) })
outIncidents.forEach((i) => {
  if (i.owner) referenced.add(i.owner)
  if (i.resolved_by) referenced.add(i.resolved_by)
})
outExternalEntities.forEach((e) => { if (e.relationship_owner) referenced.add(e.relationship_owner) })
const orphans = [...referenced].filter((n) => !nameSet.has(n))
if (orphans.length) errs.push(`rule 2 — named but not in employees: ${orphans.join(', ')}`)

const badMgr = outEmployees.filter((e) => e.reports_to && e.reports_to !== 'unknown' && !nameSet.has(e.reports_to))
if (badMgr.length) errs.push(`rule 3 — manager not in employees: ${badMgr.map((e) => `${e.name}→${e.reports_to}`).join(', ')}`)

// rule 4 (revised): roots are reported, not rejected — `roots` is declared above
const cycles = []
for (const e of outEmployees) {
  const seen = new Set([e.name])
  let cur = e
  while (cur && cur.reports_to && cur.reports_to !== 'unknown') {
    if (seen.has(cur.reports_to)) { cycles.push(e.name); break }
    seen.add(cur.reports_to)
    cur = outEmployees.find((x) => x.name === cur.reports_to)
  }
}
if (cycles.length) errs.push(`rule 5 — cycles from: ${cycles.join(', ')}`)

// Authored sections must point at things that exist, not just people who exist.
const entityIndex = {
  agent: new Set(outAgents.map((a) => a.name)),
  workflow: new Set(outWorkflows.map((w) => w.name)),
  system: new Set(outSystems.map((s) => s.name)),
  tool: new Set(outTools.map((t) => t.name)),
}
const badIncident = outIncidents.filter((i) => !entityIndex[i.entity_type]?.has(i.entity))
if (badIncident.length) {
  errs.push(`incidents — entity not found: ${badIncident.map((i) => `${i.entity} (${i.entity_type})`).join(', ')}`)
}
const badSysDep = outSystems.flatMap((s) =>
  s.depends_on.filter((n) => !entityIndex.system.has(n)).map((n) => `${s.name}→${n}`))
if (badSysDep.length) errs.push(`systems — depends_on not found: ${badSysDep.join(', ')}`)
const badSysUsedBy = outSystems.flatMap((s) =>
  s.used_by.filter((n) => !entityIndex.agent.has(n)).map((n) => `${s.name}→${n}`))
if (badSysUsedBy.length) errs.push(`systems — used_by agent not found: ${badSysUsedBy.join(', ')}`)

console.log('organization      1')
console.log('departments      ', outDepartments.length, '· head resolved:', outDepartments.filter((d) => d.head).length)
console.log('employees        ', outEmployees.length)
console.log('agents           ', outAgents.length, '· owner resolved:', outAgents.filter((a) => a.owner).length)
console.log('ai_tools         ', outTools.length)
console.log('workflows        ', outWorkflows.length, '· with steps:', outWorkflows.filter((w) => w.steps.length).length)
console.log('processes        ', outProcesses.length)
console.log('policies         ', outPolicies.length, '· tool-scoped:', outPolicies.filter((p) => p.scope === 'tool').length)
console.log('dependencies     ', outDeps.length)
console.log('collaborations   ', outCollaborations.length, '· people covered:', new Set(outCollaborations.flatMap(c=>[c.from,c.to])).size)
console.log('knowledge_areas  ', outKnowledge.length)
console.log('history          ', outHistory.length)
console.log('systems          ', outSystems.length)
console.log('incidents        ', outIncidents.length)
console.log('external_entities', outExternalEntities.length,
  '· vendors:', outExternalEntities.filter((e) => e.kind === 'vendor').length,
  '· customers:', outExternalEntities.filter((e) => e.kind === 'customer').length)
console.log('ai_tools with vendor:', outTools.filter((t) => t.vendor).length, 'of', outTools.length)
console.log('')
console.log('headcount (derived, active):', outEmployees.filter((e) => e.status === 'active').length)
console.log('roots (reports_to null):', roots.length, '—', roots.map((r) => `${r.name} (${r.role})`).join(', '))
const conflicts = outWorkflows.filter((w) => w.accountable && w.owner && w.accountable !== w.owner)
console.log('R-1 owner/accountable conflicts to surface:', conflicts.length,
  conflicts.length ? '— ' + conflicts.map((w) => `${w.name}: owner ${w.owner} vs accountable ${w.accountable}`).join(' | ') : '')
console.log('')
console.log(errs.length ? 'VALIDATION FAILURES:\n  ' + errs.join('\n  ') : 'validation: all rules pass')

fs.writeFileSync(path.join(ROOT, 'data/company.json'), JSON.stringify(dataset, null, 2) + '\n')
console.log('\nwrote data/company.json')
