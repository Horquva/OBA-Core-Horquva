// Exports the Supabase seed company from sql/02_seed_data.sql into the
// 11-section company-dataset shape. One-time migration tool.
const fs = require('fs')
const path = require('path')

const ROOT = process.argv[2]
const sql = fs.readFileSync(path.join(ROOT, 'backend/sql/02_seed_data.sql'), 'utf8')

// ── AUTHORED SECTIONS ───────────────────────────────────────────────────────
// Everything below this banner is hand-written, not exported. The database has
// no table for any of it (BUILD_SPEC Part 0). Every person named here must exist
// in `employees` or the rule-2 check at the bottom fails the build.
// Edit these in place — regenerating the file preserves them.

const AUTHORED = {
  // The last entity type graphSeeder.js held alone. Once these exist it is deletable.
  systems: [
    {
      name: 'Core Platform', owner: 'Omar Hassan', department: 'Engineering',
      criticality: 'critical', documented: true, depends_on: [],
      description: 'Multi-tenant application runtime. Everything else runs on it.',
    },
    {
      name: 'Billing System', owner: 'Aisha Patel', department: 'Engineering',
      criticality: 'critical', documented: false, depends_on: ['Core Platform'],
      description: 'Subscription billing, invoicing and dunning.',
    },
    {
      name: 'Customer Data Warehouse', owner: 'Sophia Chen', department: 'Data',
      criticality: 'high', documented: true, depends_on: ['Core Platform'],
      description: 'Analytical store behind every dashboard and forecast.',
    },
    {
      name: 'Internal Admin Portal', owner: 'Marcus Rodriguez', department: 'Engineering',
      criticality: 'medium', documented: false, depends_on: ['Core Platform', 'Billing System'],
      description: 'Support and account administration tooling.',
    },
  ],

  external_entities: [
    { name: 'OpenAI', kind: 'vendor', supplies: ['ChatGPT Enterprise'], relationship_owner: 'Robert Chen', criticality: 'high' },
    { name: 'Anthropic', kind: 'vendor', supplies: ['Claude Pro'], relationship_owner: 'Lisa Wang', criticality: 'high' },
    { name: 'GitHub', kind: 'vendor', supplies: ['GitHub Copilot'], relationship_owner: 'Robert Chen', criticality: 'critical' },
    { name: 'Google', kind: 'vendor', supplies: ['Gemini Advanced'], relationship_owner: 'Daniel Murphy', criticality: 'medium' },
    { name: 'Amazon Web Services', kind: 'vendor', supplies: ['Core Platform hosting'], relationship_owner: 'Yuki Tanaka', criticality: 'critical' },
    { name: 'Ryan Phillips Procurement Desk', kind: 'vendor', supplies: [], relationship_owner: 'Ryan Phillips', criticality: 'low' },
    { name: 'Meridian Health', kind: 'customer', supplies: [], relationship_owner: 'Amara Diallo', criticality: 'critical' },
    { name: 'Cobalt Logistics', kind: 'customer', supplies: [], relationship_owner: 'Chris Anderson', criticality: 'high' },
    { name: 'Harbor Financial', kind: 'customer', supplies: [], relationship_owner: 'Rebecca Stone', criticality: 'critical' },
    { name: 'Vertex Retail', kind: 'customer', supplies: [], relationship_owner: 'Zara Hussein', criticality: 'medium' },
  ],

  // Written against the real failure surface: undocumented critical assets with
  // a single holder. Each one is traceable to a concentration risk in the data.
  incidents: [
    {
      date: '2026-01-30', entity: 'Billing System', entity_type: 'system',
      impact: 'Duplicate invoices issued to 12 customers over one billing run.',
      owner: 'Aisha Patel', resolved_by: 'Victoria Adams', resolution_days: 3,
      lesson: 'Billing System is critical and undocumented. The fix depended on one engineer reading the code.',
    },
    {
      date: '2026-02-18', entity: 'Code Deployment Pipeline', entity_type: 'workflow',
      impact: 'All deploys blocked for four hours after a CodeReviewAgent rule change rejected every pull request.',
      owner: 'Yuki Tanaka', resolved_by: 'Aisha Patel', resolution_days: 1,
      lesson: 'Agent configuration changes ship with no review step of their own.',
    },
    {
      date: '2026-03-05', entity: 'SecurityScanner', entity_type: 'agent',
      impact: 'An exposed credential went undetected for 11 days.',
      owner: 'Sarah Mitchell', resolved_by: 'Sarah Mitchell', resolution_days: 2,
      lesson: 'Sarah Mitchell is both Responsible and Accountable for Security Audit Process, so nobody independent reviews the scanner configuration.',
    },
    {
      date: '2026-03-19', entity: 'Data Ingestion Pipeline', entity_type: 'workflow',
      impact: 'An upstream schema change dropped two days of product events before anyone noticed.',
      owner: 'Sophia Chen', resolved_by: 'Kevin Osei', resolution_days: 2,
      lesson: 'No contract test between the producer and the pipeline.',
    },
    {
      date: '2026-04-10', entity: 'KnowledgeIndexer', entity_type: 'agent',
      impact: 'Indexing stalled silently for six days; workspace search returned stale results company-wide.',
      owner: 'Nathan Wright', resolved_by: 'Sophia Chen', resolution_days: 6,
      lesson: 'Indexing algorithms are undocumented and Nathan Wright is the only holder. Nothing alerted on a stalled job, so the outage was invisible until users complained.',
    },
    {
      date: '2026-05-22', entity: 'LogAnalyzer', entity_type: 'agent',
      impact: 'Agent went inactive unnoticed; three weeks of logs were never analysed.',
      owner: 'Omar Hassan', resolved_by: 'Yuki Tanaka', resolution_days: 4,
      lesson: 'An agent going quiet looks identical to an agent with nothing to do.',
    },
    {
      date: '2026-06-14', entity: 'Incident Response', entity_type: 'workflow',
      impact: 'On-call engineer had no runbook; time to mitigate ran to three times the target.',
      owner: 'Yuki Tanaka', resolved_by: 'Robert Chen', resolution_days: 1,
      lesson: 'The Incident Response workflow is marked critical and is not documented. Yuki Tanaka owns it alongside DeployBot and IncidentResponder.',
    },
    {
      date: '2026-07-02', entity: 'Customer Onboarding', entity_type: 'workflow',
      impact: 'Two enterprise customers stalled in onboarding for nine days each.',
      owner: 'Rebecca Stone', resolved_by: 'Amara Diallo', resolution_days: 5,
      lesson: 'Onboarding is undocumented and its owner is a VP with no operational backup.',
    },
  ],

  // A log of decisions with rationale and what actually happened — distinct from
  // `organizational_decisions`, which scores decision quality after the fact.
  decisions_log: [
    {
      date: '2026-01-12', owner: 'Lisa Wang', area: 'Product',
      decision: 'Freeze onboarding of new AI agents until documentation coverage exceeds 80%.',
      factors: ['documentation coverage at 61%', 'two incidents traced to undocumented agents', 'roadmap pressure'],
      outcome: 'not enforced — four agents were added in Q1 regardless',
    },
    {
      date: '2026-02-01', owner: 'Robert Chen', area: 'Engineering',
      decision: 'Run Claude Pro alongside ChatGPT Enterprise rather than consolidating onto one assistant.',
      factors: ['team preference split', 'vendor concentration risk', 'combined cost within budget'],
      outcome: 'adopted — both remain in use',
    },
    {
      date: '2026-03-15', owner: 'Jennifer Foster', area: 'Operations',
      decision: 'Require a named backup owner for every critical agent, workflow and system.',
      factors: ['SecurityScanner has no backup', 'March credential incident', 'audit finding'],
      outcome: 'partially implemented — several critical assets still have no backup owner',
    },
    {
      date: '2026-04-20', owner: 'Nathan Wright', area: 'Data',
      decision: 'Defer the KnowledgeIndexer rewrite to Q3 and keep the existing implementation.',
      factors: ['no spare data engineering capacity', 'rewrite estimated at six weeks', 'no failures in six months'],
      outcome: 'reversed ten days later after the 10 April outage',
    },
    {
      date: '2026-05-08', owner: 'Victoria Adams', area: 'Finance',
      decision: 'Cap monthly AI tool spend at $18,000 and require CFO approval above it.',
      factors: ['spend grew 34% in two quarters', 'five tools have no governing policy', 'unclear per-seat utilisation'],
      outcome: 'in effect',
    },
    {
      date: '2026-06-25', owner: 'Sarah Mitchell', area: 'Engineering',
      decision: 'Move SecurityScanner configuration into version control and require two reviewers.',
      factors: ['March incident', 'configuration held by one person', 'same Responsible and Accountable owner'],
      outcome: 'open — not started',
    },
  ],
}

// Vendors are authored above, so `ai_tools[].vendor` can finally be filled.
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

// knowledge_assets is one row per asset; group into areas by topic
const byTopic = new Map()
for (const k of knowledge) {
  const key = k.topic
  if (!byTopic.has(key)) byTopic.set(key, { area: key, holders: [], documented: true, criticality: k.criticality })
  const a = byTopic.get(key)
  const holder = empName(k.owner_id)
  if (holder && !a.holders.includes(holder)) a.holders.push(holder)
  if (!k.is_documented) a.documented = false
  if (k.criticality === 'critical') a.criticality = 'critical'
}
const outKnowledge = [...byTopic.values()]

// ── organization / departments / policies / processes ───────────────────────
// These four entity types exist only in graphSeeder.js today. Sourcing them here
// is what lets graphSeeder be deleted instead of kept as a second company.

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
// all 40 people isolated. Derived, never invented: two people collaborate if they
// share an entity's RACI, or act in the same workflow. R-1 source = 'derived'.

const collabPairs = new Map()
const addPair = (a, b, basis, on) => {
  if (!a || !b || a === b) return
  const [x, y] = [a, b].sort()
  const key = `${x}|${y}`
  if (!collabPairs.has(key)) collabPairs.set(key, { from: x, to: y, basis, on, weight: 0 })
  collabPairs.get(key).weight++
}

for (const e of acctEntities) {
  const people = [...new Set(acctLinks.filter((l) => l.entity_id === e.id).map((l) => l.person_name))]
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) addPair(people[i], people[j], 'raci', e.entity_name)
  }
}
for (const w of workflows) {
  const people = [...new Set(
    wfSteps.filter((s) => s.workflow_id === w.id && s.actor_type === 'human').map((s) => s.actor_name),
  )].filter(Boolean)
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) addPair(people[i], people[j], 'workflow', w.name)
  }
}
const outCollaborations = [...collabPairs.values()].sort((a, b) => b.weight - a.weight)

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
    'Exported from backend/sql/02_seed_data.sql by backend/tools/export-company.js. ' +
    'Placeholder company name — rename freely. This is the ONLY company dataset: never merge ' +
    'another one into it, replace it (BUILD_SPEC Part 0A). systems, incidents, decisions_log ' +
    'and external_entities are empty because no source table exists; they must be authored ' +
    'against this cast. Empty is the correct state, not a bug — see R-8.',
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
  systems: AUTHORED.systems,
  incidents: AUTHORED.incidents,
  decisions_log: AUTHORED.decisions_log,
  external_entities: AUTHORED.external_entities,
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
AUTHORED.systems.forEach((s) => { if (s.owner) referenced.add(s.owner) })
AUTHORED.incidents.forEach((i) => {
  if (i.owner) referenced.add(i.owner)
  if (i.resolved_by) referenced.add(i.resolved_by)
})
AUTHORED.decisions_log.forEach((d) => { if (d.owner) referenced.add(d.owner) })
AUTHORED.external_entities.forEach((e) => { if (e.relationship_owner) referenced.add(e.relationship_owner) })
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
  system: new Set(AUTHORED.systems.map((s) => s.name)),
  tool: new Set(outTools.map((t) => t.name)),
}
const badIncident = AUTHORED.incidents.filter((i) => !entityIndex[i.entity_type]?.has(i.entity))
if (badIncident.length) {
  errs.push(`incidents — entity not found: ${badIncident.map((i) => `${i.entity} (${i.entity_type})`).join(', ')}`)
}
const badSysDep = AUTHORED.systems.flatMap((s) =>
  s.depends_on.filter((n) => !entityIndex.system.has(n)).map((n) => `${s.name}→${n}`))
if (badSysDep.length) errs.push(`systems — depends_on not found: ${badSysDep.join(', ')}`)

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
console.log('— authored (no source table) —')
console.log('systems          ', AUTHORED.systems.length)
console.log('incidents        ', AUTHORED.incidents.length)
console.log('decisions_log    ', AUTHORED.decisions_log.length)
console.log('external_entities', AUTHORED.external_entities.length,
  '· vendors:', AUTHORED.external_entities.filter((e) => e.kind === 'vendor').length,
  '· customers:', AUTHORED.external_entities.filter((e) => e.kind === 'customer').length)
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
