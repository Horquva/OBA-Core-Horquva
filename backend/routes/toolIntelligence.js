const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data: platforms, error } = await supabase
    .from('ai_platforms')
    .select(`
      id, name, type, status,
      tool_ownership ( employees ( name ) ),
      tool_users ( id ),
      workflow_tool_dependencies ( workflow_id, is_critical ),
      tool_backups_primary:tool_backups!tool_backups_primary_platform_fkey ( id ),
      tool_policies ( status ),
      tool_spend ( amount_usd, month )
    `)

  if (error) return res.status(500).json({ error: error.message })

  let totalMonthlySpend    = 0
  const toolsWithoutBackup  = []
  const toolsWithoutPolicy  = []
  const criticalTools        = []

  const summaries = platforms.map(p => {
    const spend       = p.tool_spend?.reduce((sum, s) => sum + Number(s.amount_usd), 0) ?? 0
    const hasBackup   = (p.tool_backups_primary?.length ?? 0) > 0
    const hasPolicy   = (p.tool_policies?.length ?? 0) > 0
    const isCritical  = p.workflow_tool_dependencies?.some(w => w.is_critical) ?? false

    totalMonthlySpend += spend
    if (!hasBackup)  toolsWithoutBackup.push(p.name)
    if (!hasPolicy)  toolsWithoutPolicy.push(p.name)
    if (isCritical)  criticalTools.push(p.name)

    return {
      name:           p.name,
      status:         p.status,
      owner:          p.tool_ownership?.[0]?.employees?.name ?? 'Unassigned',
      usersCount:     p.tool_users?.length ?? 0,
      workflowsCount: p.workflow_tool_dependencies?.length ?? 0,
      monthlySpend:   spend,
      hasBackup,
      hasPolicy,
      isCritical
    }
  })

  res.json({
    totalMonthlySpend,
    toolsWithoutBackup,
    toolsWithoutPolicy,
    criticalTools,
    summaries
  })
})

module.exports = router