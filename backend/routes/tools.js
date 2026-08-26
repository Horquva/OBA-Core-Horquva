const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { optional } = require('../lib/supabaseQuery')
const { maxLevel } = require('../domain/definitions')

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

  // A platform can have several knowledge assets. The previous version assigned
  // on every iteration, so it kept whichever row the database returned last --
  // an arbitrary, order-dependent answer (F-K). Take the highest criticality
  // instead: one critical piece of knowledge about a tool makes the tool
  // critical. Documented stays a conjunction -- one undocumented asset means
  // the platform is not fully documented.
  const byPlatform = {}
  for (const k of data) {
    const prev = byPlatform[k.asset_id]
    byPlatform[k.asset_id] = {
      documented: prev ? Boolean(prev.documented) && Boolean(k.is_documented) : Boolean(k.is_documented),
      criticality: maxLevel([prev?.criticality, k.criticality]),
    }
  }
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

/**
 * Composite tool-risk score (0-100) and tier -- was independently computed
 * client-side in frontend/lib/aiToolIntelligence.ts's buildToolScore()/
 * scoreToTier(), over exactly this same enriched-tool shape. Ported verbatim
 * (same weights, same thresholds) rather than redesigned: this migration is
 * about WHERE the computation runs, not changing what it outputs. Every
 * input (criticality/documented/backup_tool/departments/agents_using) is
 * already computed above with zero new queries.
 */
const TOOL_RISK_WEIGHTS = {
  NO_POLICY: 25,
  NO_BACKUP: 30,
  CRITICALITY: { critical: 20, high: 12, medium: 6, low: 2 },
  ORG_WIDE_DEPTS: 20,   // >= 6 departments
  CROSS_DEPT: 12,       // >= 4 departments
  MANY_AGENTS: 15,      // >= 3 agents
  SOME_AGENTS: 8,        // >= 1 agent
}

/** Returns { score, factors } -- factors is the same shape the frontend's
 *  UI breakdown (CriticalToolPanel.tsx) already renders, computed once here
 *  instead of the score being computed here and the "why" reconstructed
 *  again client-side. */
function computeToolRiskScore(tool) {
  const factors = []
  let score = 0

  if (!tool.documented) {
    factors.push({ label: 'No Usage Policy Documented', points: TOOL_RISK_WEIGHTS.NO_POLICY, severity: 'high' })
    score += TOOL_RISK_WEIGHTS.NO_POLICY
  }
  if (!tool.backup_tool) {
    factors.push({ label: 'No Backup / Fallback Tool', points: TOOL_RISK_WEIGHTS.NO_BACKUP, severity: 'critical' })
    score += TOOL_RISK_WEIGHTS.NO_BACKUP
  }
  const critPoints = TOOL_RISK_WEIGHTS.CRITICALITY[tool.criticality]
  if (critPoints) {
    const severity = tool.criticality === 'critical' ? 'critical' : tool.criticality === 'high' ? 'high' : tool.criticality === 'medium' ? 'medium' : 'low'
    factors.push({ label: `Business Criticality: ${String(tool.criticality).toUpperCase()}`, points: critPoints, severity })
    score += critPoints
  }
  if (tool.departments.length >= 6) {
    factors.push({ label: `Org-Wide Exposure (${tool.departments.length} departments)`, points: TOOL_RISK_WEIGHTS.ORG_WIDE_DEPTS, severity: 'critical' })
    score += TOOL_RISK_WEIGHTS.ORG_WIDE_DEPTS
  } else if (tool.departments.length >= 4) {
    factors.push({ label: `Cross-Dept Exposure (${tool.departments.length} departments)`, points: TOOL_RISK_WEIGHTS.CROSS_DEPT, severity: 'high' })
    score += TOOL_RISK_WEIGHTS.CROSS_DEPT
  }
  if (tool.agents_using.length >= 3) {
    factors.push({ label: `Powers ${tool.agents_using.length} Critical Agents`, points: TOOL_RISK_WEIGHTS.MANY_AGENTS, severity: 'high' })
    score += TOOL_RISK_WEIGHTS.MANY_AGENTS
  } else if (tool.agents_using.length >= 1) {
    factors.push({ label: `Used by ${tool.agents_using.length} Agent(s)`, points: TOOL_RISK_WEIGHTS.SOME_AGENTS, severity: 'medium' })
    score += TOOL_RISK_WEIGHTS.SOME_AGENTS
  }

  return { score: Math.min(score, 100), factors }
}

function toolRiskTier(score) {
  if (score >= 70) return 'CRITICAL'
  if (score >= 45) return 'HIGH'
  if (score >= 20) return 'MEDIUM'
  return 'LOW'
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
    const tool = {
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
    const { score: compositeScore, factors } = computeToolRiskScore(tool)
    // A hard override, not a re-banding: undocumented + unbacked + already
    // high/critical is CRITICAL regardless of where the weighted score
    // lands, matching the frontend's original isCriticalByRule.
    const isCriticalByRule = !tool.documented && !tool.backup_tool &&
      (tool.criticality === 'critical' || tool.criticality === 'high')
    return {
      ...tool,
      compositeScore,
      tier: isCriticalByRule ? 'CRITICAL' : toolRiskTier(compositeScore),
      isCriticalByRule,
      riskFactors: factors,
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
module.exports.computeToolRiskScore = computeToolRiskScore
module.exports.toolRiskTier = toolRiskTier
module.exports.TOOL_RISK_WEIGHTS = TOOL_RISK_WEIGHTS
