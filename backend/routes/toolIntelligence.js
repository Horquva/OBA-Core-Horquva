const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

/**
 * `tool_spend` holds one row per platform per month (six months live —
 * 2026-01 through 2026-06 — see sql/15_tool_spend.sql). "Monthly spend"
 * means the latest month on record, not every month added together: summing
 * all six used to inflate every platform's figure roughly 6x and label the
 * total "monthly" when it was really six months of spend (F-1). `month` is
 * 'YYYY-MM' text, so a plain string comparison sorts correctly.
 */
function latestMonthSpend(rows) {
  if (!rows || !rows.length) return 0
  const latest = rows.reduce((a, b) => (b.month > a.month ? b : a))
  return Number(latest.amount_usd)
}

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
    const spend       = latestMonthSpend(p.tool_spend)
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