const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(__dirname, '..', '..', '..', 'data', 'sunrise_care.json')
function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) } catch (_) { return {} }
}

// GET /api/automation/governance — M52 Governance Automation (advisory, read-only)
router.get('/governance', (req, res) => {
  const d = loadData()
  const decisions = d.decisions_log || d.decisions || []
  const pending = decisions.filter(x => (x.status || '').toLowerCase() === 'pending')
  res.json({ module: 'M52', name: 'Governance Automation Intelligence', status: 'active', mounted: true, mode: 'advisory', model: { advisoryMode: true, readOnlyExecution: true, pendingIntentQueue: true, governedExecution: true }, decisionsTracked: decisions.length, pendingApprovals: pending.length, pendingIntents: pending.slice(0, 10) })
})

// GET /api/automation/continuity — M53 Continuity Automation (advisory, read-only)
router.get('/continuity', (req, res) => {
  const d = loadData()
  const criticalAreas = (d.knowledge_areas || []).filter(k => (k.criticality || '').toLowerCase() === 'critical')
  const toolsNoBackup = (d.ai_tools || []).filter(t => !t.backup_tool)
  res.json({ module: 'M53', name: 'Continuity Automation Intelligence', status: 'active', mounted: true, mode: 'advisory', model: { advisoryMode: true, readOnlyExecution: true, pendingIntentQueue: true, governedExecution: true }, criticalAreasMonitored: criticalAreas.length, toolsWithoutBackup: toolsNoBackup.length, continuityPlans: criticalAreas.slice(0, 10).map(k => ({ area: k.area || k.name, plan: 'documented_backup_owner', status: 'recommended' })) })
})

// GET /api/automation — module status index
router.get('/', (req, res) => {
  res.json({ modules: ['M52', 'M53'], name: 'Automation Layer', status: 'active', mounted: true, mode: 'advisory', endpoints: ['/api/automation/governance', '/api/automation/continuity'] })
})

module.exports = router
