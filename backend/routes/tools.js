const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

let supabase = null
try { supabase = require('../supabase') } catch (e) { supabase = null }

/*
 * GET /api/tools
 * The frontend (ai-tools, ownership, knowledge, memory, continuity, decision,
 * recommendations, simulation pages) expects a RAW ARRAY of tools, each with:
 *   { id, name, vendor, category, users[], departments[], workflows[],
 *     agents_using[], monthly_cost_usd, criticality, documented,
 *     backup_tool, access_owner }
 * Returning an object breaks Array.isArray() and shows $0 everywhere.
 *
 * Data source order:
 *   1. Supabase (real data) — only trusted if it has spend or users
 *   2. data/sunrise_care.json (repo dataset)
 *   3. INLINE_AI_TOOLS below — guarantees the demo is NEVER empty, even on
 *      Vercel serverless where the data/ folder may not be bundled.
 */

const INLINE_AI_TOOLS = [
  { id: 'tool_001', name: 'ChatGPT', vendor: 'OpenAI', category: 'LLM', users: ['Robert','Sarah','Mike','Lisa','David','Emma','James'], departments: ['Sales','Marketing','Support','HR'], workflows: ['wf_001','wf_002','wf_005'], agents_using: ['agent_001','agent_002','agent_011'], monthly_cost_usd: 420, criticality: 'critical', documented: false, backup_tool: null, access_owner: 'Robert' },
  { id: 'tool_002', name: 'Claude', vendor: 'Anthropic', category: 'LLM', users: ['Lisa','Sarah','James'], departments: ['HR','Legal','Finance'], workflows: ['wf_003','wf_004'], agents_using: ['agent_008','agent_010','agent_009'], monthly_cost_usd: 180, criticality: 'high', documented: true, backup_tool: 'tool_001', access_owner: 'Lisa' },
  { id: 'tool_003', name: 'GitHub Copilot', vendor: 'GitHub', category: 'Code Assistant', users: ['David','James','Emma'], departments: ['IT','Analytics'], workflows: ['wf_006'], agents_using: ['agent_014','agent_012'], monthly_cost_usd: 114, criticality: 'medium', documented: true, backup_tool: null, access_owner: 'David' },
  { id: 'tool_004', name: 'Gemini', vendor: 'Google', category: 'LLM', users: ['Mike','Emma'], departments: ['Marketing','Analytics'], workflows: ['wf_002','wf_007'], agents_using: ['agent_011','agent_007'], monthly_cost_usd: 90, criticality: 'medium', documented: false, backup_tool: 'tool_001', access_owner: 'Mike' },
  { id: 'tool_005', name: 'Microsoft Copilot', vendor: 'Microsoft', category: 'Productivity AI', users: ['Robert','Sarah','Lisa','Mike','David','Emma','James','Nina'], departments: ['Sales','HR','Finance','Operations','Legal','IT','Support','Marketing'], workflows: ['wf_001','wf_003','wf_004','wf_005','wf_006','wf_007'], agents_using: [], monthly_cost_usd: 640, criticality: 'high', documented: true, backup_tool: null, access_owner: 'David' },
]

function loadLocalTools() {
  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'sunrise_care.json'),
    path.join(__dirname, '..', 'data', 'sunrise_care.json'),
    path.join(process.cwd(), 'data', 'sunrise_care.json'),
    path.join(process.cwd(), '..', 'data', 'sunrise_care.json'),
    path.join(process.cwd(), 'backend', 'data', 'sunrise_care.json'),
  ]
  for (const p of candidates) {
    try {
      const d = JSON.parse(fs.readFileSync(p, 'utf-8'))
      if (Array.isArray(d.ai_tools) && d.ai_tools.length) return d.ai_tools
    } catch (e) { /* try next path */ }
  }
  return INLINE_AI_TOOLS
}

function normalize(t) {
  return {
    id: (t.id != null ? String(t.id) : ''),
    name: t.name || 'Unknown Tool',
    vendor: t.vendor || t.provider || 'Unknown',
    category: t.category || t.type || 'General',
    users: Array.isArray(t.users) ? t.users : [],
    departments: Array.isArray(t.departments) ? t.departments : (t.department ? [t.department] : []),
    workflows: Array.isArray(t.workflows) ? t.workflows : [],
    agents_using: Array.isArray(t.agents_using) ? t.agents_using.map(String) : [],
    // `ai_platforms` spells this `cost_monthly`. Without it every Supabase row
    // normalised to 0, the "does Supabase have real data?" check below failed,
    // and the route silently served the local JSON dataset instead.
    monthly_cost_usd: Number(
      t.monthly_cost_usd != null ? t.monthly_cost_usd
        : t.monthly_cost != null ? t.monthly_cost
          : t.cost_monthly != null ? t.cost_monthly : 0
    ),
    criticality: (t.criticality || t.risk || 'low'),
    documented: Boolean(t.documented != null ? t.documented : (t.has_policy != null ? t.has_policy : false)),
    backup_tool: (t.backup_tool != null ? t.backup_tool : (t.fallback_tool != null ? t.fallback_tool : null)),
    access_owner: t.access_owner || t.owner || 'Unassigned',
  }
}

/** Who uses each platform. `ai_platforms` has no users column — the mapping
 *  lives in `tool_users` (platform_id -> employee_id). Returns
 *  { [platform_id]: { users: [name], departments: [dept] } }. */
async function loadPlatformUsers() {
  const { data: links, error } = await supabase
    .from('tool_users')
    .select('platform_id, employees ( name, department )')

  if (error || !Array.isArray(links)) return {}

  const byPlatform = {}
  for (const l of links) {
    const e = l.employees
    if (!e) continue
    const slot = (byPlatform[l.platform_id] = byPlatform[l.platform_id] || { users: [], departments: [] })
    if (e.name && !slot.users.includes(e.name)) slot.users.push(e.name)
    if (e.department && !slot.departments.includes(e.department)) slot.departments.push(e.department)
  }
  return byPlatform
}

router.get('/', async (req, res) => {
  // 1) Try Supabase — only trust it if it carries real spend or users
  try {
    if (supabase) {
      const { data, error } = await supabase.from('ai_platforms').select('*')
      if (!error && Array.isArray(data) && data.length) {
        const usage = await loadPlatformUsers()
        const mapped = data.map((t) => normalize({ ...t, ...(usage[t.id] || {}) }))
        const spend = mapped.reduce((s, t) => s + t.monthly_cost_usd, 0)
        const users = mapped.reduce((s, t) => s + t.users.length, 0)
        if (spend > 0 || users > 0) return res.json(mapped)
      }
    }
  } catch (e) { /* fall through to local dataset */ }

  // 2) + 3) Local dataset / inline fallback
  return res.json(loadLocalTools().map(normalize))
})

module.exports = router
