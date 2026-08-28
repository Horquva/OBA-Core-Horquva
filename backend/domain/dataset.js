// The flat, asset-shaped organizational view:
// { agents, workflows, ai_tools, knowledge_areas, incidents, decisions_log, history }
//
// ─── Derived from the graph, not from a second pass over Supabase ───
// This used to read fourteen tables of its own, eight of which graphLoader also
// read — two loaders building a whole-organization view from one database, free
// to drift. It now reads the graph that graphLoader already built, and queries
// SQL only for the three tables the graph legitimately cannot hold:
// `decision_history`, `documentation_trend` and `snapshots`. The graph has no
// time dimension and is not going to grow one; temporal questions are SQL's job.
//
// Entity iteration order is insertion order (the registry is a Map), and
// graphLoader inserts in the order Supabase returned each table, so the arrays
// below come out in the same order the direct queries produced. Verified
// byte-identical against the previous implementation.
//
// One gap is real, not a bug: per-asset `documented` / `backup_owner` are
// joins rather than columns — graphLoader now performs them once and records
// the result on the entity. `incidents` reads the real `incidents` table
// (added in W-J); its resolution/lesson tracking is what powers the
// "Incident lessons captured" and "Incident learning loop is active" checks
// in domain/analyses.js.

const supabase = require('../supabase')
const brain = require('../brain')

async function loadOrgDataset() {
  // One loader. If the graph is not up yet, bring it up rather than opening a
  // second path to the same data.
  if (!brain.isReady()) await brain.loadGraph()
  const g = brain.getGraph()

  const [
    { data: decisionHistory, error: e1 },
    { data: docTrend, error: e2 },
    { data: snapshots, error: e3 },
    { data: incidentRows, error: e4 },
  ] = await Promise.all([
    supabase.from('decision_history').select('*').order('decided_at'),
    supabase.from('documentation_trend').select('*').order('recorded_month'),
    supabase.from('snapshots').select('*').order('snapshot_date'),
    supabase.from('incidents').select('*').order('occurred_at'),
  ])
  const firstError = e1 || e2 || e3 || e4
  if (firstError) throw new Error(firstError.message)

  /** The human who owns this asset, via the graph's `owns` edge. */
  const ownerOf = (entity) => {
    const rel = g.relationships.to(entity.id).find((r) => r.type === 'owns')
    return rel ? g.entities.get(rel.from) : null
  }

  const aiAgents = g.entities.list('ai_agent')
  const agentEntities = aiAgents.filter((e) => e.metadata.kind === 'automation-agent')
  const platformEntities = aiAgents.filter((e) => e.metadata.kind === 'ai-platform')

  const agents = agentEntities.map((e) => {
    const owner = ownerOf(e)
    return {
      id: e.metadata.sourceId,
      name: e.name,
      status: e.metadata.status,
      owner: owner ? owner.name : null,
      backup_owner: owner ? owner.metadata.backup_owner ?? null : null,
      criticality: e.metadata.risk,
      department: owner ? owner.metadata.department : null,
      documented: e.metadata.documented,
    }
  })

  const workflows = g.entities.list('workflow').map((e) => {
    const owner = ownerOf(e)
    return {
      id: e.metadata.sourceId,
      name: e.name,
      status: e.metadata.status,
      owner: owner ? owner.name : null,
      backup_owner: owner ? owner.metadata.backup_owner ?? null : null,
      criticality: e.metadata.risk,
      department: e.metadata.department,
      documented: e.metadata.documented,
    }
  })

  const ai_tools = platformEntities.map((e) => ({
    id: e.metadata.sourceId,
    name: e.name,
    criticality: e.metadata.assetCriticality,
    documented: e.metadata.documented,
    backup_tool: e.metadata.backupTool,
    workflows: e.metadata.workflowsUsing,
    agents_using: e.metadata.agentsUsing,
  }))

  const knowledge_areas = g.entities.list('knowledge').map((e) => {
    const owner = ownerOf(e)
    return {
      area: e.name,
      holders: owner ? [owner.name] : [],
      documented: e.metadata.is_documented,
      criticality: e.metadata.criticality,
    }
  })

  const decisions_log = (decisionHistory || []).map((d) => ({ outcome: d.outcome, lesson: d.description }))

  // documentation_trend and snapshots are both 6 rows for the same 6 months
  // in the same chronological order — zip by index. open_incidents/backup_pct
  // have no per-month source in this schema and are left absent rather than
  // invented; consumers already treat a missing/flat trend as "no signal"
  // so this degrades honestly, not silently wrong.
  const history = (docTrend || []).map((dt, i) => ({
    documented_pct: dt.coverage_pct,
    risk_index: snapshots?.[i]?.risk_index,
  }))

  const incidents = (incidentRows || []).map((i) => ({
    date: i.occurred_at,
    entity: i.entity_name,
    entity_type: i.entity_type,
    impact: i.impact,
    owner: i.owner_id,
    resolved_by: i.resolved_by_id,
    resolution_days: i.resolution_days,
    lesson: i.lesson,
  }))

  return {
    agents,
    workflows,
    ai_tools,
    knowledge_areas,
    incidents,
    decisions_log,
    history,
  }
}

module.exports = { loadOrgDataset }
