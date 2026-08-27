const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must } = require('../../lib/supabaseQuery')

// Skips the query entirely when there is nothing to look up (an empty .in()
// list is rejected by PostgREST), but still fails loudly on a real error
// instead of letting it look like "zero impacted assets".
const fetchByIds = (table, cols, ids) =>
  ids.length ? must(table, supabase.from(table).select(cols).in('id', ids)) : Promise.resolve([])

// Base index route so health checks and discovery return 200 (the analysis route requires an :employee param)
router.get('/', (req, res) => {
  res.json({
    ok: true,
    endpoint: '/api/knowledge/impact',
    usage: '/api/knowledge/impact/:employee',
    description: 'Knowledge-loss impact analysis if a given employee leaves: impacted agents, workflows, platforms, undocumented assets and risk level.'
  })
})

router.get('/:employee', async (req, res) => {
  const { employee } = req.params

  // Get employee
  const { data: emp, error: empError } = await supabase
    .from('employees')
    .select('id, name, role, department, risk')
    .ilike('name', employee)
    .single()

  if (empError || !emp) return res.status(404).json({ error: 'Employee not found' })

  // Get all knowledge assets owned by this employee
  const { data: assets, error: assetError } = await supabase
    .from('knowledge_assets')
    .select('asset_type, asset_id, is_documented, criticality')
    .eq('owner_id', emp.id)

  if (assetError) return res.status(500).json({ error: assetError.message })

  // Split asset IDs by type
  const agentIds    = assets.filter(a => a.asset_type === 'agent')   .map(a => a.asset_id)
  const workflowIds = assets.filter(a => a.asset_type === 'workflow') .map(a => a.asset_id)
  const platformIds = assets.filter(a => a.asset_type === 'platform') .map(a => a.asset_id)

  // Fetch full details in parallel
  const [impactedAgents, impactedWorkflows, impactedPlatforms] = await Promise.all([
    fetchByIds('agents', 'id, name, status, risk', agentIds),
    fetchByIds('workflows', 'id, name, status, risk', workflowIds),
    fetchByIds('ai_platforms', 'id, name, type, status', platformIds),
  ])

  const totalImpact = impactedAgents.length + impactedWorkflows.length + impactedPlatforms.length
  const undocumented = assets.filter(a => !a.is_documented).length
  const hasCritical  = assets.some(a => a.criticality === 'critical')

  const riskLevel =
    hasCritical              ? 'CRITICAL' :
    totalImpact >= 5         ? 'HIGH'     :
    totalImpact >= 2         ? 'MEDIUM'   : 'LOW'

  res.json({
    scenario:           `If ${emp.name} leaves`,
    employee:           emp,
    totalImpact,
    undocumentedAssets: undocumented,
    riskLevel,
    impactedAgents,
    impactedWorkflows,
    impactedPlatforms
  })
})

module.exports = router