const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/', async (req, res) => {
  const { data: platforms, error } = await supabase
    .from('ai_platforms')
    .select(`
      id, name, type, status,
      tool_ownership ( employee_id, employees ( name ) ),
      tool_users ( id ),
      workflow_tool_dependencies ( workflow_id ),
      tool_backups_primary:tool_backups!tool_backups_primary_platform_fkey ( id ),
      tool_policies ( status ),
      tool_spend ( amount_usd )
    `)

  if (error) return res.status(500).json({ error: error.message })

  const result = platforms.map(p => {
    const totalSpend = p.tool_spend?.reduce((sum, s) => sum + Number(s.amount_usd), 0) ?? 0

    return {
      name:             p.name,
      type:             p.type,
      status:           p.status,
      owner:            p.tool_ownership?.[0]?.employees?.name ?? 'Unassigned',
      usersCount:       p.tool_users?.length ?? 0,
      workflowsCount:   p.workflow_tool_dependencies?.length ?? 0,
      backupAssigned:   (p.tool_backups_primary?.length ?? 0) > 0,
      policyExists:     (p.tool_policies?.length ?? 0) > 0,
      monthlySpend:     totalSpend
    }
  })

  res.json(result)
})

module.exports = router