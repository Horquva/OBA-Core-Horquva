const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

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

  const impactedAgents    = agentsRes.data    || []
  const impactedWorkflows = workflowsRes.data || []
  const impactedPlatforms = platformsRes.data || []

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