const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { must } = require('../lib/supabaseQuery')

// GET /api/data-quality — comprehensive data integrity checks
//
// Every read here used to destructure only `{ data }` and fall back to `[]` on
// failure. That inverted the score under an outage: a dropped table meant fewer
// rows to check, which means fewer issues found, which means a HIGHER
// dataQualityScore — a database failure reported as data getting *healthier*.
// All ten reads now use must() and a failure 500s instead.
router.get('/', async (req, res) => {
  try {
    const issues = []
    const warnings = []
    const stats = {}

    // 1. Check for orphaned agents (no owner)
    const agents = await must('agents', supabase
      .from('agents')
      .select('id, name, owner_id'))

    const orphanedAgents = agents.filter(a => !a.owner_id)
    if (orphanedAgents.length > 0) {
      issues.push({
        type: 'orphaned_agents',
        severity: 'high',
        message: `${orphanedAgents.length} agents have no owner assigned`,
        items: orphanedAgents.map(a => a.name)
      })
    }
    stats.totalAgents = agents.length

    // 2. Check for failed/inactive agents
    const agentsWithStatus = await must('agents (status)', supabase
      .from('agents')
      .select('id, name, status')
      .in('status', ['failed', 'inactive', 'deprecated']))

    if (agentsWithStatus.length > 0) {
      warnings.push({
        type: 'unhealthy_agents',
        severity: 'medium',
        message: `${agentsWithStatus.length} agents are not active`,
        items: agentsWithStatus.map(a => ({ name: a.name, status: a.status }))
      })
    }

    // 3. Check for undocumented critical knowledge assets
    const knowledgeAssets = await must('knowledge_assets', supabase
      .from('knowledge_assets')
      .select('id, topic, is_documented, criticality, owner_id')
      .in('criticality', ['critical', 'high'])
      .eq('is_documented', false))

    if (knowledgeAssets.length > 0) {
      issues.push({
        type: 'undocumented_critical_knowledge',
        severity: 'critical',
        message: `${knowledgeAssets.length} critical/high knowledge assets are undocumented`,
        items: knowledgeAssets.map(a => a.topic || `Asset #${a.id}`)
      })
    }

    // 4. Check for workflows without runbooks
    const workflows = await must('workflows', supabase
      .from('workflows')
      .select('id, name'))

    const runbooks = await must('workflow_runbooks', supabase
      .from('workflow_runbooks')
      .select('workflow_id, is_documented'))

    const workflowsWithoutRunbook = workflows.filter(
      w => !runbooks.some(r => r.workflow_id === w.id)
    )
    const undocumentedRunbooks = runbooks.filter(r => !r.is_documented)

    if (workflowsWithoutRunbook.length > 0) {
      issues.push({
        type: 'missing_runbooks',
        severity: 'high',
        message: `${workflowsWithoutRunbook.length} workflows have no runbook`,
        items: workflowsWithoutRunbook.map(w => w.name)
      })
    }
    if (undocumentedRunbooks.length > 0) {
      warnings.push({
        type: 'undocumented_runbooks',
        severity: 'medium',
        message: `${undocumentedRunbooks.length} workflow runbooks are not documented`,
        items: undocumentedRunbooks.map(r => `Workflow #${r.workflow_id}`)
      })
    }
    stats.totalWorkflows = workflows.length

    // 5. Check for tools without policies
    const platforms = await must('ai_platforms', supabase
      .from('ai_platforms')
      .select('id, name, status')
      .eq('status', 'active'))

    const policies = await must('tool_policies', supabase
      .from('tool_policies')
      .select('platform_id'))

    const policyPlatformIds = new Set(policies.map(p => p.platform_id))
    const noPolicyTools = platforms.filter(p => !policyPlatformIds.has(p.id))

    if (noPolicyTools.length > 0) {
      warnings.push({
        type: 'tools_without_policies',
        severity: 'medium',
        message: `${noPolicyTools.length} active tools have no governance policy`,
        items: noPolicyTools.map(t => t.name)
      })
    }
    stats.totalTools = platforms.length

    // 6. Check for tools without backups
    const backups = await must('tool_backups', supabase
      .from('tool_backups')
      .select('primary_platform'))

    const backupPlatformIds = new Set(backups.map(b => b.primary_platform))
    const noBackupTools = platforms.filter(p => !backupPlatformIds.has(p.id))

    if (noBackupTools.length > 0) {
      warnings.push({
        type: 'tools_without_backups',
        severity: 'high',
        message: `${noBackupTools.length} active tools have no backup tool`,
        items: noBackupTools.map(t => t.name)
      })
    }

    // 7. Employee count
    const employees = await must('employees', supabase
      .from('employees')
      .select('id'))
    stats.totalEmployees = employees.length

    // 8. Snapshot check
    const snapshots = await must('snapshots', supabase
      .from('snapshots')
      .select('id'))
    stats.totalSnapshots = snapshots.length

    // Compute overall health
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    const highIssues     = issues.filter(i => i.severity === 'high').length
    const dataQualityScore = Math.max(0, 100 - (criticalIssues * 20) - (highIssues * 10) - (warnings.length * 5))

    const overallStatus = dataQualityScore >= 80 ? 'HEALTHY'
                        : dataQualityScore >= 60 ? 'WARNING'
                        : dataQualityScore >= 40 ? 'AT RISK'
                        : 'CRITICAL'

    res.json({
      dataQualityScore,
      overallStatus,
      stats,
      issueCount:   issues.length,
      warningCount: warnings.length,
      issues,
      warnings
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
