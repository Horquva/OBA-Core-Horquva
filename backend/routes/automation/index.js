const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { applyOrgScope } = require('../../lib/tenant')
const { computePriorityScore, priorityLabel } = require('../../lib/decisionPriority')

// ⚠ This endpoint does NOT implement the brain's M52 (Governance Automation Intelligence). It used to
// report `module: 'M52'` and carry that analysis's catalog name while computing
// something entirely different from Supabase — the same collision the dataset
// analyses had before they were renamed. It is now named for what it does.
// M01–M55 is the brain catalog's namespace; see
// docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
// The brain's M52 returns governance COVERAGE traversed from the graph
// (complianceRate, governanceGaps). This returns PENDING APPROVALS from the
// `decision_queue` table. Different questions, and that is the whole point.
//
// GET /api/automation/governance — pending approval queue (advisory, read-only)
router.get('/governance', async (req, res) => {
  // decision_queue merged onto it 2026-09-18 (owner decision) -- see
  // sql/18_drop_superseded_pending_decisions.sql. This route's own response
  // contract (frontend/lib/notifications.ts's GovernanceIntentRaw: id,
  // title, description, priority, raised_at, status) is preserved by
  // deriving `priority` from decision_queue's real score instead of a
  // hand-picked label.
  const { data, error } = await supabase
    .from('decision_queue')
    .select('*')
    .order('raised_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const pending = data
    .filter((x) => (x.status || '').toLowerCase() === 'pending')
    .map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      priority: priorityLabel(computePriorityScore(d.impact_score, d.urgency_score, d.effort_score, d.blast_radius)),
      raised_at: d.raised_at,
      status: d.status,
    }))
  res.json({
    service: 'pending-approvals',
    name: 'Pending Approval Queue',
    status: 'active',
    mounted: true,
    mode: 'advisory',
    model: { advisoryMode: true, readOnlyExecution: true, pendingIntentQueue: true, governedExecution: true },
    decisionsTracked: data.length,
    pendingApprovals: pending.length,
    pendingIntents: pending.slice(0, 10),
  })
})

// ⚠ This endpoint does NOT implement the brain's M53 (Continuity Automation Intelligence). It used to
// report `module: 'M53'` and carry that analysis's catalog name while computing
// something entirely different from Supabase — the same collision the dataset
// analyses had before they were renamed. It is now named for what it does.
// M01–M55 is the brain catalog's namespace; see
// docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
//
// GET /api/automation/continuity — backup coverage for critical assets (advisory)
router.get('/continuity', async (req, res) => {
  const [{ data: criticalAssets, error: kaErr }, { data: platforms, error: pErr }, { data: backups, error: bErr }] = await Promise.all([
    applyOrgScope(supabase.from('knowledge_assets').select('*')).eq('criticality', 'critical'),
    applyOrgScope(supabase.from('ai_platforms').select('id, name')),
    applyOrgScope(supabase.from('tool_backups').select('primary_platform')),
  ])
  if (kaErr) return res.status(500).json({ error: kaErr.message })
  if (pErr) return res.status(500).json({ error: pErr.message })
  if (bErr) return res.status(500).json({ error: bErr.message })

  const backedUpIds = new Set(backups.map((b) => b.primary_platform))
  const toolsNoBackup = platforms.filter((p) => !backedUpIds.has(p.id))

  res.json({
    service: 'backup-coverage',
    name: 'Backup Coverage',
    status: 'active',
    mounted: true,
    mode: 'advisory',
    model: { advisoryMode: true, readOnlyExecution: true, pendingIntentQueue: true, governedExecution: true },
    criticalAreasMonitored: criticalAssets.length,
    toolsWithoutBackup: toolsNoBackup.length,
    continuityPlans: criticalAssets.slice(0, 10).map((k) => ({ area: k.topic, plan: 'documented_backup_owner', status: 'recommended' })),
  })
})

// GET /api/automation — module status index
router.get('/', (req, res) => {
  res.json({ services: ['pending-approvals', 'backup-coverage'], name: 'Automation Layer', status: 'active', mounted: true, mode: 'advisory', endpoints: ['/api/automation/governance', '/api/automation/continuity'] })
})

module.exports = router
