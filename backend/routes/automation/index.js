const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// GET /api/automation/governance — M52 Governance Automation (advisory, read-only)
router.get('/governance', async (req, res) => {
  const { data, error } = await supabase
    .from('pending_decisions')
    .select('*')
    .order('raised_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const pending = data.filter((x) => (x.status || '').toLowerCase() === 'pending')
  res.json({
    module: 'M52',
    name: 'Governance Automation Intelligence',
    status: 'active',
    mounted: true,
    mode: 'advisory',
    model: { advisoryMode: true, readOnlyExecution: true, pendingIntentQueue: true, governedExecution: true },
    decisionsTracked: data.length,
    pendingApprovals: pending.length,
    pendingIntents: pending.slice(0, 10),
  })
})

// GET /api/automation/continuity — M53 Continuity Automation (advisory, read-only)
router.get('/continuity', async (req, res) => {
  const [{ data: criticalAssets, error: kaErr }, { data: platforms, error: pErr }, { data: backups, error: bErr }] = await Promise.all([
    supabase.from('knowledge_assets').select('*').eq('criticality', 'critical'),
    supabase.from('ai_platforms').select('id, name'),
    supabase.from('tool_backups').select('primary_platform'),
  ])
  if (kaErr) return res.status(500).json({ error: kaErr.message })
  if (pErr) return res.status(500).json({ error: pErr.message })
  if (bErr) return res.status(500).json({ error: bErr.message })

  const backedUpIds = new Set(backups.map((b) => b.primary_platform))
  const toolsNoBackup = platforms.filter((p) => !backedUpIds.has(p.id))

  res.json({
    module: 'M53',
    name: 'Continuity Automation Intelligence',
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
  res.json({ modules: ['M52', 'M53'], name: 'Automation Layer', status: 'active', mounted: true, mode: 'advisory', endpoints: ['/api/automation/governance', '/api/automation/continuity'] })
})

module.exports = router
