const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { must } = require('../lib/supabaseQuery')

// Base index route so health checks and discovery return 200 (the analysis route requires a :name param)
router.get('/', (req, res) => {
  res.json({
    ok: true,
    endpoint: '/api/tool-impact',
    usage: '/api/tool-impact/:name/impact',
    description: 'Blast-radius impact analysis for a given AI tool: impacted workflows, agents, employees, backup availability and risk level.'
  })
})

router.get('/:name/impact', async (req, res) => {
  try {
    const { name } = req.params

    // 1. Find platform — maybeSingle: zero rows is a legitimate 404, not a failure
    const { data: platform, error: pErr } = await supabase
      .from('ai_platforms')
      .select('id, name, status')
      .ilike('name', name)
      .maybeSingle()

    if (pErr) return res.status(500).json({ error: pErr.message })
    if (!platform) return res.status(404).json({ error: 'Tool not found' })

    // 2-4. These feed the risk level below, so a query failure must not
    // silently understate blast radius — must() throws to a real 500 instead.
    const wfLinks = await must('workflow_tool_dependencies', supabase
      .from('workflow_tool_dependencies')
      .select('is_critical, workflows ( id, name, status, risk )')
      .eq('platform_id', platform.id))

    const impactedWorkflows = wfLinks.map(w => ({
      ...w.workflows,
      is_critical: w.is_critical
    }))

    const agentLinks = await must('agent_platform', supabase
      .from('agent_platform')
      .select('agents ( id, name, status, risk )')
      .eq('platform_id', platform.id))

    const impactedAgents = agentLinks.map(a => a.agents)

    const userLinks = await must('tool_users', supabase
      .from('tool_users')
      .select('usage_level, employees ( id, name, role, department )')
      .eq('platform_id', platform.id))

    const impactedEmployees = userLinks.map(u => ({
      ...u.employees,
      usage_level: u.usage_level
    }))

    // 5. Backup available — maybeSingle: no backup configured is legitimate, not an error
    const { data: backup, error: bErr } = await supabase
      .from('tool_backups')
      .select('ai_platforms!tool_backups_backup_platform_fkey ( name, status )')
      .eq('primary_platform', platform.id)
      .maybeSingle()
    if (bErr) return res.status(500).json({ error: bErr.message })

    const backupTool = backup?.ai_platforms ?? null

    // 6. Risk level
    const hasCriticalWorkflow = wfLinks.some(w => w.is_critical)
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
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router