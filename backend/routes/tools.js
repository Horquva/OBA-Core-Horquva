const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { optional } = require('../lib/supabaseQuery')

/*
 * GET /api/tools
 * The frontend (ai-tools, ownership, knowledge, memory, continuity, decision,
 * recommendations, simulation pages) expects a RAW ARRAY of tools, each with:
 *   { id, name, vendor, category, users[], departments[], workflows[],
 *     agents_using[], monthly_cost_usd, criticality, documented,
 *     backup_tool, access_owner }
 * Returning an object breaks Array.isArray() and shows $0 everywhere.
 *
 * All fields are read live from Supabase (`ai_platforms` plus the join
 * tables below). `vendor` and every tool's `criticality`/`documented`
 * assessment are seeded by sql/09 and sql/10. `criticality`/`documented`
 * still come back `null` for any future tool added without a matching
 * `knowledge_assets` row —
 * both come back `null` rather than a fabricated default when unassessed.
 */

/** platform_id -> { users: [name], departments: Set<dept> }, via tool_users -> employees */
async function loadPlatformUsers() {
  const links = await optional('tool_users', supabase
    .from('tool_users')
    .select('platform_id, employees ( name, department )'), [])

  const byPlatform = {}
  for (const l of links) {
    const e = l.employees
    if (!e) continue
    const slot = (byPlatform[l.platform_id] = byPlatform[l.platform_id] || { users: [], departments: new Set() })
    if (e.name && !slot.users.includes(e.name)) slot.users.push(e.name)
    if (e.department) slot.departments.add(e.department)
  }
  return byPlatform
}

/** platform_id -> owner name, via tool_ownership -> employees */
async function loadPlatformOwners() {
  const data = await optional('tool_ownership', supabase.from('tool_ownership').select('platform_id, employees ( name )'), [])
  const byPlatform = {}
  for (const r of data) {
    if (r.employees?.name) byPlatform[r.platform_id] = r.employees.name
  }
  return byPlatform
}

/** platform_id -> backup tool name, via tool_backups -> ai_platforms */
async function loadPlatformBackups(platforms) {
  const backups = await optional('tool_backups', supabase.from('tool_backups').select('primary_platform, backup_platform'), [])
  const nameById = Object.fromEntries(platforms.map((p) => [p.id, p.name]))
  const byPlatform = {}
  for (const b of backups) byPlatform[b.primary_platform] = nameById[b.backup_platform] || null
  return byPlatform
}

/** platform_id -> { documented, criticality }, via knowledge_assets where asset_type='platform' */
async function loadPlatformKnowledge() {
  const data = await optional('knowledge_assets(platform)', supabase.from('knowledge_assets').select('*').eq('asset_type', 'platform'), [])
  const byPlatform = {}
  for (const k of data) byPlatform[k.asset_id] = { documented: k.is_documented, criticality: k.criticality }
  return byPlatform
}

/** platform_id -> [agent name], via agent_platform -> agents */
async function loadPlatformAgents() {
  const links = await optional('agent_platform', supabase.from('agent_platform').select('platform_id, agents ( name )'), [])
  const byPlatform = {}
  for (const l of links) {
    if (!l.agents?.name) continue
    ;(byPlatform[l.platform_id] = byPlatform[l.platform_id] || []).push(l.agents.name)
  }
  return byPlatform
}

/** platform_id -> [workflow name], via workflow_tool_dependencies -> workflows */
async function loadPlatformWorkflows() {
  const links = await optional('workflow_tool_dependencies', supabase.from('workflow_tool_dependencies').select('platform_id, workflows ( name )'), [])
  const byPlatform = {}
  for (const l of links) {
    if (!l.workflows?.name) continue
    ;(byPlatform[l.platform_id] = byPlatform[l.platform_id] || []).push(l.workflows.name)
  }
  return byPlatform
}

/** The enriched tool list — pulled out so other routes (decisionIntelligence.js)
 *  can reuse this exact computation instead of re-deriving it. */
async function loadEnrichedTools() {
  const { data: platforms, error } = await supabase.from('ai_platforms').select('*')
  if (error) throw new Error(`ai_platforms: ${error.message}`)

  const [users, owners, backups, knowledge, agentsUsing, workflowsUsing] = await Promise.all([
    loadPlatformUsers(),
    loadPlatformOwners(),
    loadPlatformBackups(platforms),
    loadPlatformKnowledge(),
    loadPlatformAgents(),
    loadPlatformWorkflows(),
  ])

  return platforms.map((t) => {
    const u = users[t.id] || { users: [], departments: new Set() }
    const k = knowledge[t.id]
    return {
      id: String(t.id),
      name: t.name,
      vendor: t.vendor || null,
      category: t.type || null,
      users: u.users,
      departments: [...u.departments],
      workflows: workflowsUsing[t.id] || [],
      agents_using: agentsUsing[t.id] || [],
      monthly_cost_usd: Number(t.cost_monthly || 0),
      criticality: k ? k.criticality : null,
      documented: k ? k.documented : null,
      backup_tool: backups[t.id] || null,
      access_owner: owners[t.id] || null,
    }
  })
}

router.get('/', async (req, res) => {
  try {
    res.json(await loadEnrichedTools())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.loadEnrichedTools = loadEnrichedTools
