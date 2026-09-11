const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')

const FAILURE_TYPE_LABEL = {
  human_spof: 'Single Point of Failure',
  tool_failure: 'Tool Failure',
  process_gap: 'Process Gap',
  escalation_failure: 'Escalation Gap',
}

// Build issues from Supabase, normalized to the frontend shape:
// { id, type, severity, description }
//
// No `detectedAt` field: detection happens at request time, computed fresh
// from live tables (workflow_failures, executiveMemory's hero risks, backup
// coverage) — there is no recorded moment any of these were first noticed,
// so there is nothing honest to put in that field. It used to be synthesized
// as `now - (loop index * 15 minutes)`, which produced a plausible-looking
// timestamp that changed on every request and never corresponded to an
// actual detection event.
async function detectIssues() {
  // Hero dependencies used to come from a seeded table, so a resolved single
  // point of failure stayed on the self-healing issue list permanently.
  const [heroIntel, { data: failures, error: fErr }, { data: platforms, error: pErr }, { data: backups, error: bErr }, { data: knowledge, error: kErr }] = await Promise.all([
    domain.intelligence.all(),
    supabase.from('workflow_failures').select('*, workflows ( name )'),
    supabase.from('ai_platforms').select('id, name'),
    supabase.from('tool_backups').select('primary_platform'),
    supabase.from('knowledge_assets').select('asset_id, criticality').eq('asset_type', 'platform').eq('criticality', 'critical'),
  ])
  if (fErr || pErr || bErr || kErr) {
    throw new Error((fErr || pErr || bErr || kErr).message)
  }

  const heroes = heroIntel.executiveMemory.items
    .filter(i => i.memoryType === 'hero_risk')
    .map(i => ({ person_name: i.entityName, risk_level: i.severity, description: i.description }))

  const issues = []
  let n = 0

  heroes.forEach((h) => {
    n++
    issues.push({
      id: 'sh-hero-' + n,
      type: 'Single Point of Failure',
      severity: h.risk_level,
      description: h.description,
    })
  })

  failures.forEach((f) => {
    n++
    issues.push({
      id: 'sh-wf-' + n,
      type: FAILURE_TYPE_LABEL[f.failure_type] || 'Workflow Issue',
      severity: f.severity,
      description: (f.workflows?.name ? f.workflows.name + ': ' : '') + f.description,
    })
  })

  const backedUpIds = new Set(backups.map((b) => b.primary_platform))
  const criticalToolIds = new Set(knowledge.map((k) => k.asset_id))
  platforms
    .filter((p) => criticalToolIds.has(p.id) && !backedUpIds.has(p.id))
    .forEach((p) => {
      n++
      issues.push({
        id: 'sh-tool-' + n,
        type: 'No Backup Tool',
        severity: 'medium',
        description: `Critical AI tool "${p.name}" has no configured backup. Define a fallback tool and document the switchover.`,
      })
    })

  return issues
}

// ⚠ This endpoint does NOT implement the brain's M51 (Self-Healing Intelligence). It used to
// report `module: 'M51'` and carry that analysis's catalog name while computing
// something entirely different from Supabase — the same collision the dataset
// analyses had before they were renamed. It is now named for what it does.
// M01–M55 is the brain catalog's namespace; see
// docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
//
// GET /api/self-healing/detect — detect organizational issues (advisory, read-only)
router.get('/detect', async (req, res) => {
  try {
    const issues = await detectIssues()
    res.json({
      service: 'self-healing',
      name: 'Self-Healing Detection',
      status: 'active',
      mounted: true,
      mode: 'advisory',
      issues_found: issues.length,
      issuesDetected: issues.length,
      issues,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/self-healing/run — advisory corrective plan (no destructive action)
router.post('/run', async (req, res) => {
  try {
    const issueId = (req.body && req.body.issueId) || null
    const issues = await detectIssues()
    const target = issues.find((i) => i.id === issueId) || issues[0]
    res.json({
      service: 'self-healing',
      mode: 'advisory',
      issueId: target ? target.id : null,
      action: 'cross_train_backup_and_document',
      target: target ? target.type : 'organization',
      status: 'recommended',
      message: 'Self-healing runs in advisory mode. This corrective action is recommended for executive approval — no destructive action is taken automatically.',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/self-healing — module status
router.get('/', (req, res) => {
  res.json({ service: 'self-healing', name: 'Self-Healing Detection', status: 'active', mounted: true, mode: 'advisory' })
})

module.exports = router
