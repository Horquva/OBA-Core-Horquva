const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/', async (req, res) => {
  // Get all undocumented assets with owner info
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select(`
      asset_type,
      asset_id,
      is_documented,
      criticality,
      employees ( id, name, role )
    `)
    .eq('is_documented', false)

  if (error) return res.status(500).json({ error: error.message })

  const agentIds    = data.filter(a => a.asset_type === 'agent')   .map(a => a.asset_id)
  const workflowIds = data.filter(a => a.asset_type === 'workflow') .map(a => a.asset_id)
  const platformIds = data.filter(a => a.asset_type === 'platform') .map(a => a.asset_id)

  // Fetch full details in parallel
  const [agentsRes, workflowsRes, platformsRes] = await Promise.all([
    agentIds.length
      ? supabase.from('agents').select('id, name, status, risk').in('id', agentIds)
      : { data: [] },
    workflowIds.length
      ? supabase.from('workflows').select('id, name, status, risk').in('id', workflowIds)
      : { data: [] },
    platformIds.length
      ? supabase.from('ai_platforms').select('id, name, type, status').in('id', platformIds)
      : { data: [] }
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

  const undocumentedAgents    = enrich(agentsRes.data,    'agent')
  const undocumentedWorkflows = enrich(workflowsRes.data, 'workflow')
  const undocumentedPlatforms = enrich(platformsRes.data, 'platform')

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