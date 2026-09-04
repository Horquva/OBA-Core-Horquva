const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must } = require('../../lib/supabaseQuery')

// Skips the query entirely when there is nothing to look up (an empty .in()
// list is rejected by PostgREST), but still fails loudly on a real error
// instead of letting it look like "zero undocumented assets".
const fetchByIds = (table, cols, ids) =>
  ids.length ? must(table, supabase.from(table).select(cols).in('id', ids)) : Promise.resolve([])

router.get('/', async (req, res) => {
  // Get all undocumented assets with owner info
  const data = await must('knowledge_assets', supabase
    .from('knowledge_assets')
    .select(`
      asset_type,
      asset_id,
      is_documented,
      criticality,
      employees ( id, name, role )
    `)
    .eq('is_documented', false))

  const agentIds    = data.filter(a => a.asset_type === 'agent')   .map(a => a.asset_id)
  const workflowIds = data.filter(a => a.asset_type === 'workflow') .map(a => a.asset_id)
  const platformIds = data.filter(a => a.asset_type === 'platform') .map(a => a.asset_id)

  // Fetch full details in parallel
  const [agents, workflows, platforms] = await Promise.all([
    fetchByIds('agents', 'id, name, status, risk', agentIds),
    fetchByIds('workflows', 'id, name, status, risk', workflowIds),
    fetchByIds('ai_platforms', 'id, name, type, status', platformIds),
  ])

  // Attach owner info to each asset
  const enrich = (items, type) =>
    (items || []).map(item => {
      const meta = data.find(
        a => a.asset_id === item.id && a.asset_type === type
      )
      return {
        ...item,
        criticality: meta?.criticality || 'unknown',
        owner:       meta?.employees?.name || 'Unassigned'
      }
    })

  const undocumentedAgents    = enrich(agents,    'agent')
  const undocumentedWorkflows = enrich(workflows, 'workflow')
  const undocumentedPlatforms = enrich(platforms, 'platform')

  const totalGaps =
    undocumentedAgents.length +
    undocumentedWorkflows.length +
    undocumentedPlatforms.length

  res.json({
    totalGaps,
    breakdown: {
      agents:    undocumentedAgents.length,
      workflows: undocumentedWorkflows.length,
      platforms: undocumentedPlatforms.length
    },
    undocumentedAgents,
    undocumentedWorkflows,
    undocumentedPlatforms
  })
})

module.exports = router