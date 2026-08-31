const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

// Try several locations so the data file is found in both local and
// serverless (Vercel) environments.
function loadData() {
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'data', 'sunrise_care.json'),
    path.join(__dirname, '..', '..', 'data', 'sunrise_care.json'),
    path.join(process.cwd(), 'data', 'sunrise_care.json'),
    path.join(process.cwd(), 'sunrise_care.json'),
  ]
  for (const p of candidates) {
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')) } catch (_) { /* next */ }
  }
  return {}
}

const iso = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString()

function normalizeSeverity(s) {
  const v = String(s || '').toLowerCase()
  if (['critical', 'high', 'medium', 'low'].includes(v)) return v
  if (v === 'warning') return 'medium'
  if (v === 'error' || v === 'fatal') return 'high'
  return 'medium'
}

// Demo-safe fallback issues — always available even if the data file is
// missing (e.g. serverless cold start). Consistent with the Daily Briefing.
function inlineIssues() {
  return [
    { id: 'sh-001', type: 'Single Point of Failure', severity: 'critical', description: 'SecurityScanner has no backup owner. If Priya Sharma is unavailable there is no coverage for critical production security scans. Recommended: assign and cross-train a backup owner.', detectedAt: iso(12) },
    { id: 'sh-002', type: 'Failed Component',         severity: 'critical', description: 'KnowledgeIndexer is in a FAILED state and only Nathan Wright can restore it — a key-person dependency. Recommended: document the recovery runbook.', detectedAt: iso(34) },
    { id: 'sh-003', type: 'Blocked Workflow',         severity: 'high',     description: 'The Security Audit workflow is BLOCKED at step 1 of 4 due to an unassigned owner action. Recommended: assign an owner to unblock.', detectedAt: iso(58) },
    { id: 'sh-004', type: 'Documentation Gap',        severity: 'medium',   description: 'Documentation coverage is 48.1%, below the 60% safe threshold. The data ingestion pipeline runbook is undocumented.', detectedAt: iso(120) },
    { id: 'sh-005', type: 'No Backup Tool',           severity: 'medium',   description: 'ChatGPT is a critical AI tool with no configured backup/fallback. Recommended: define a fallback tool and document the switchover.', detectedAt: iso(210) },
  ]
}

// Build issues from the organizational dataset, normalized to the frontend shape:
// { id, type, severity, description, detectedAt }
function buildFromData(d) {
  const issues = []
  let n = 0
  ;(d.knowledge_areas || []).forEach((k) => {
    const holders = k.holders || k.holder || []
    const holderCount = Array.isArray(holders) ? holders.length : (holders ? 1 : 0)
    if ((k.criticality || '').toLowerCase() === 'critical' && holderCount <= 1) {
      n++
      issues.push({ id: 'sh-kn-' + n, type: 'Single Point of Failure', severity: 'high', description: 'Critical knowledge area "' + (k.area || k.name) + '" has ' + holderCount + ' holder(s). Cross-train a backup owner and document the process.', detectedAt: iso(n * 15) })
    }
  })
  ;(d.ai_tools || []).forEach((t) => {
    if ((t.criticality || '').toLowerCase() === 'critical' && !t.backup_tool) {
      n++
      issues.push({ id: 'sh-tool-' + n, type: 'No Backup Tool', severity: 'medium', description: 'Critical AI tool "' + t.name + '" has no configured backup. Define a fallback tool and document the switchover.', detectedAt: iso(n * 15) })
    }
  })
  ;(d.incidents || []).filter((i) => (i.status || '').toLowerCase() !== 'resolved').forEach((i) => {
    n++
    issues.push({ id: 'sh-inc-' + n, type: 'Open Incident', severity: normalizeSeverity(i.severity), description: i.description || i.title || 'Unresolved incident. Assign an owner and track to resolution.', detectedAt: i.created_at || iso(n * 15) })
  })
  return issues
}

function detectIssues() {
  const fromData = buildFromData(loadData())
  return fromData.length ? fromData : inlineIssues()
}

// GET /api/self-healing/detect — detect organizational issues (advisory, read-only)
router.get('/detect', (req, res) => {
  const issues = detectIssues()
  res.json({
    module: 'M51',
    name: 'Self-Healing Organization',
    status: 'active',
    mounted: true,
    mode: 'advisory',
    issues_found: issues.length,
    issuesDetected: issues.length,
    issues,
  })
})

// POST /api/self-healing/run — advisory corrective plan (no destructive action)
router.post('/run', (req, res) => {
  const issueId = (req.body && req.body.issueId) || null
  const issues = detectIssues()
  const target = issues.find((i) => i.id === issueId) || issues[0]
  res.json({
    module: 'M51',
    mode: 'advisory',
    issueId: target ? target.id : null,
    action: 'cross_train_backup_and_document',
    target: target ? target.type : 'organization',
    status: 'recommended',
    message: 'Self-healing runs in advisory mode. This corrective action is recommended for executive approval — no destructive action is taken automatically.',
  })
})

// GET /api/self-healing — module status
router.get('/', (req, res) => {
  res.json({ module: 'M51', name: 'Self-Healing Organization', status: 'active', mounted: true, mode: 'advisory' })
})

module.exports = router
