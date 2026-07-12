const express = require('express')
const router = express.Router()
const supabase = require('../supabase')

router.get('/:name/impact', async (req, res) => {
  const { name } = req.params

  // 1. Find platform
  const { data: platform, error: pErr } = await supabase
    .from('ai_platforms')
    .select('id, name, status')
    .ilike('name', name)
    .single()

  if (pErr || !platform) return res.status(404).json({ error: 'Tool not found' })

  // 2. Impacted workflows
  const { data: wfLinks } = await supabase
    .from('workflow_tool_dependencies')
    .select('is_critical, workflows ( id, name, status, risk )')
    .eq('platform_id', platform.id)

  const impactedWorkflows = wfLinks?.map(w => ({
    ...w.workflows,
    is_critical: w.is_critical
  })) ?? []

  // 3. Impacted agents (via agent_platform)
  const { data: agentLinks } = await supabase
    .from('agent_platform')
    .select('agents ( id, name, status, risk )')
    .eq('platform_id', platform.id)

  const impactedAgents = agentLinks?.map(a => a.agents) ?? []

  // 4. Impacted employees (via tool_users)
  const { data: userLinks } = await supabase
    .from('tool_users')
    .select('usage_level, employees ( id, name, role, department )')
    .eq('platform_id', platform.id)

  const impactedEmployees = userLinks?.map(u => ({
    ...u.employees,
    usage_level: u.usage_level
  })) ?? []

  // 5. Backup available
  const { data: backup } = await supabase
    .from('tool_backups')
    .select('ai_platforms!tool_backups_backup_platform_fkey ( name, status )')
    .eq('primary_platform', platform.id)
    .single()

  const backupTool = backup?.ai_platforms ?? null

  // 6. Risk level
  const hasCriticalWorkflow = wfLinks?.some(w => w.is_critical) ?? false
  const riskLevel = hasCriticalWorkflow && !backupTool ? 'critical'
                  : hasCriticalWorkflow &&  backupTool ? 'high'
                  : impactedAgents.length > 2          ? 'high'
                  : 'medium'

  res.json({
    tool:               platform.name,
    scenario:           `If ${platform.name} goes down`,
    impactedWorkflows,
    impactedAgents,
    impactedEmployees,
    backupAvailable:    !!backupTool,
    backupTool,
    healthBefore:       'stable',
    healthAfter:        riskLevel === 'critical' ? 'critical' : 'degraded',
    riskLevel
  })
})

module.exports = router