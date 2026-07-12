// ─────────────────────────────────────────────────────────────
// Phase 6 — Constitutional Intelligence & Meta-Brain (M36–M55)
// Owner: Kamran
//
// These endpoints expose the constitutional intelligence modules over HTTP.
// They compute from the canonical local dataset (data/sunrise_care.json) so
// they can be verified WITHOUT a live Supabase connection. This mirrors the
// Python reference implementation in /modules and keeps the locked module
// definitions (M36, M38, M39, M40, M46, M48, M50, M54, M55) as the single
// source of truth.
// ─────────────────────────────────────────────────────────────

const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DATA_PATH = path.join(__dirname, '..', '..', '..', 'data', 'sunrise_care.json')

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
}
function assetsOf(d) {
  return [...(d.agents || []), ...(d.workflows || [])]
}
function pct(n, dd) {
  return dd ? Math.round((100 * n) / dd) : 0
}

// ── M36 — Signal Intelligence ──
function signalIntelligence(d) {
  const hist = d.history || []
  const incidents = d.incidents || []
  const signals = []
  const trend = (s) => (s.length < 2 ? 'flat' : s[s.length - 1] - s[0] > 0 ? 'rising' : s[s.length - 1] - s[0] < 0 ? 'falling' : 'flat')
  if (hist.length) {
    if (trend(hist.map(h => h.documented_pct || 0)) === 'falling')
      signals.push({ signal: 'Documentation coverage declining', severity: 'HIGH' })
    if (trend(hist.map(h => h.risk_index || 0)) === 'rising')
      signals.push({ signal: 'Organizational risk index rising', severity: 'CRITICAL' })
    if (trend(hist.map(h => h.open_incidents || 0)) === 'rising')
      signals.push({ signal: 'Open incidents trending up', severity: 'HIGH' })
    if (trend(hist.map(h => h.backup_pct || 0)) === 'falling')
      signals.push({ signal: 'Backup/continuity coverage eroding', severity: 'MEDIUM' })
  }
  const unresolved = incidents.filter(i => !i.resolved_by)
  if (unresolved.length) signals.push({ signal: 'Unresolved incidents on record', severity: 'HIGH' })
  const score = Math.max(0, 100 - (18 * signals.filter(s => s.severity === 'CRITICAL').length + 10 * signals.filter(s => s.severity === 'HIGH').length + 4 * signals.filter(s => s.severity === 'MEDIUM').length))
  return { stabilityScore: score, activeSignals: signals.length, signals }
}

// ── M38 — Opportunity Intelligence ──
function opportunityIntelligence(d) {
  const assets = assetsOf(d)
  const opps = []
  const undoc = assets.filter(a => !a.documented && ['critical', 'high'].includes((a.criticality || '').toLowerCase()))
  if (undoc.length) opps.push({ opportunity: 'Document critical assets', impact: 'HIGH', effort: 'LOW', count: undoc.length })
  const single = (d.knowledge_areas || []).filter(k => ['critical', 'high'].includes(k.criticality) && (k.holders || []).length === 1)
  single.forEach(k => opps.push({ opportunity: `Cross-train on '${k.area}'`, impact: 'HIGH', effort: 'MEDIUM', count: 1 }))
  const noBackup = assets.filter(a => !a.backup_owner && (a.criticality || '').toLowerCase() === 'critical')
  if (noBackup.length) opps.push({ opportunity: 'Assign backup owners to critical assets', impact: 'HIGH', effort: 'LOW', count: noBackup.length })
  const quickWins = opps.filter(o => o.impact === 'HIGH' && o.effort === 'LOW').length
  return { total: opps.length, quickWins, opportunities: opps }
}

// ── M39 — Capability Intelligence ──
function capabilityIntelligence(d) {
  const assets = assetsOf(d)
  const byDept = {}
  assets.forEach(a => { (byDept[a.department || 'Unassigned'] = byDept[a.department || 'Unassigned'] || []).push(a) })
  const rows = Object.entries(byDept).map(([dept, items]) => {
    const total = items.length || 1
    const doc = pct(items.filter(a => a.documented).length, total)
    const backup = pct(items.filter(a => a.backup_owner).length, total)
    const depth = pct(new Set(items.map(a => a.owner).filter(Boolean)).size, total)
    const capability = Math.round(0.4 * doc + 0.35 * backup + 0.25 * depth)
    const band = capability >= 70 ? 'STRONG' : capability >= 45 ? 'DEVELOPING' : 'AT RISK'
    return { dept, assets: total, documentation: doc, continuity: backup, ownershipDepth: depth, capability, band }
  }).sort((a, b) => b.capability - a.capability)
  const orgCapability = rows.length ? Math.round(rows.reduce((s, r) => s + r.capability, 0) / rows.length) : 0
  return { orgCapability, strengths: rows.filter(r => r.band === 'STRONG').map(r => r.dept), gaps: rows.filter(r => r.band === 'AT RISK').map(r => r.dept), rows }
}

// ── M40 — Strategic Alignment Intelligence ──
function strategicAlignment(d) {
  const checks = []
  const critWf = (d.workflows || []).filter(w => (w.criticality || '').toLowerCase() === 'critical')
  checks.push({ dimension: 'Critical workflows documented', score: critWf.length ? pct(critWf.filter(w => w.documented).length, critWf.length) : 100 })
  const dl = d.decisions_log || []
  checks.push({ dimension: 'Decisions with tracked outcomes', score: dl.length ? pct(dl.filter(x => x.outcome).length, dl.length) : 100 })
  checks.push({ dimension: 'Decision reversibility', score: dl.length ? pct(dl.filter(x => x.reversible).length, dl.length) : 100 })
  const inc = d.incidents || []
  checks.push({ dimension: 'Incident lessons captured', score: inc.length ? pct(inc.filter(i => i.lesson).length, inc.length) : 100 })
  const alignment = checks.length ? Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length) : 0
  const state = alignment >= 70 ? 'ALIGNED' : alignment >= 50 ? 'PARTIAL' : 'MISALIGNED'
  return { alignment, state, misaligned: checks.filter(c => c.score < 50).map(c => c.dimension), checks }
}

// ── M46 — Truth Intelligence (gates M48) ──
function truthIntelligence(d) {
  const assets = assetsOf(d)
  const knowledge = d.knowledge_areas || []
  const truths = []
  const spof = assets.filter(a => (a.criticality || '').toLowerCase() === 'critical' && !a.backup_owner)
  truths.push({ claim: 'Single points of failure exist', verified: spof.length > 0, confidence: 'HIGH', evidence: `${spof.length} critical assets without a backup owner` })
  const undocAssets = assets.filter(a => !a.documented && ['critical', 'high'].includes((a.criticality || '').toLowerCase()))
  const undocKa = knowledge.filter(k => !k.documented && ['critical', 'high'].includes(k.criticality))
  truths.push({ claim: 'Critical knowledge is undocumented', verified: undocAssets.length > 0 || undocKa.length > 0, confidence: undocAssets.length && undocKa.length ? 'HIGH' : 'MEDIUM', evidence: `${undocAssets.length} assets + ${undocKa.length} knowledge areas undocumented` })
  const owners = {}
  assets.forEach(a => { if (a.owner) owners[a.owner] = (owners[a.owner] || 0) + 1 })
  const top = Object.entries(owners).sort((a, b) => b[1] - a[1])[0] || [null, 0]
  truths.push({ claim: 'Ownership is over-concentrated', verified: top[1] >= 3, confidence: top[1] >= 4 ? 'HIGH' : top[1] >= 3 ? 'MEDIUM' : 'LOW', evidence: top[0] ? `Top owner '${top[0]}' holds ${top[1]} assets` : 'n/a' })
  const inc = d.incidents || []
  const lessons = inc.filter(i => i.lesson).length
  truths.push({ claim: 'Incident learning loop is active', verified: lessons >= Math.max(1, Math.floor(inc.length / 2)), confidence: 'MEDIUM', evidence: `${lessons}/${inc.length} incidents have documented lessons` })
  const trustScore = truths.length ? Math.round((100 * truths.filter(t => t.confidence === 'HIGH').length) / truths.length) : 0
  return { verifiedCount: truths.filter(t => t.verified).length, trustScore, truths }
}

// ── M48 — Autonomous Advisor (only verified truths) ──
function autonomousAdvisor(d) {
  const truth = truthIntelligence(d)
  const playbook = {
    'Single points of failure exist': ['Assign and train backup owners for every critical asset', 'CRITICAL'],
    'Critical knowledge is undocumented': ['Launch a documentation sprint for critical knowledge', 'HIGH'],
    'Ownership is over-concentrated': ['Redistribute ownership and cross-train secondary owners', 'HIGH'],
  }
  const advice = []
  const heldBack = []
  truth.truths.forEach(t => {
    if (t.claim === 'Incident learning loop is active') {
      if (!t.verified) advice.push({ action: 'Establish a formal post-incident review loop', priority: 'MEDIUM', basis: t.claim, confidence: t.confidence })
      return
    }
    if (t.verified && playbook[t.claim]) advice.push({ action: playbook[t.claim][0], priority: playbook[t.claim][1], basis: t.claim, confidence: t.confidence })
    else if (!t.verified) heldBack.push(t.claim)
  })
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  advice.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))
  return { recommendedActions: advice.length, heldBack, trustScore: truth.trustScore, advice }
}

// ── M25 helper (health) reused by M50 ──
function healthIndex(d) {
  const assets = assetsOf(d)
  const total = assets.length || 1
  const dims = {
    documentation: pct(assets.filter(a => a.documented).length, total),
    continuity: pct(assets.filter(a => a.backup_owner).length, total),
    ownershipSpread: pct(new Set(assets.map(a => a.owner).filter(Boolean)).size, total),
    criticalSafety: pct(total - assets.filter(a => (a.criticality || '').toLowerCase() === 'critical' && !a.backup_owner).length, total),
  }
  return Math.round(Object.values(dims).reduce((s, v) => s + v, 0) / Object.keys(dims).length)
}

// ── M50 — Brain Core Logic ──
function brainCore(d) {
  const health = healthIndex(d)
  const trust = truthIntelligence(d).trustScore
  const stability = signalIntelligence(d).stabilityScore
  const brainIndex = Math.round(0.45 * health + 0.3 * stability + 0.25 * trust)
  const posture = brainIndex >= 75 ? 'OPTIMIZE' : brainIndex >= 55 ? 'STABILIZE' : brainIndex >= 40 ? 'DEFEND' : 'RECOVER'
  return { brainIndex, posture, inputs: { healthM25: health, signalM36: stability, truthM46: trust } }
}

// ── M54 — Simulation Universe ──
function simulationUniverse(d) {
  const assets = assetsOf(d)
  const total = assets.length || 1
  const baseline = Math.round((100 * (0.5 * assets.filter(a => a.documented).length + 0.5 * assets.filter(a => a.backup_owner).length)) / total)
  const scenarios = []
  const owners = {}
  assets.forEach(a => { if (a.owner) (owners[a.owner] = owners[a.owner] || []).push(a) })
  Object.entries(owners).sort((a, b) => b[1].length - a[1].length).slice(0, 3).forEach(([owner, owned]) => {
    const lostCrit = owned.filter(a => (a.criticality || '').toLowerCase() === 'critical' && !a.backup_owner).length
    scenarios.push({ scenario: `Key person leaves: ${owner}`, assetsHit: owned.length, unrecoverable: lostCrit, resilienceDrop: Math.round((100 * lostCrit) / total) })
  })
  ;(d.ai_tools || []).forEach(t => {
    if ((t.criticality || '').toLowerCase() === 'critical' && !t.backup_tool) {
      const dep = (t.workflows || []).length + (t.agents_using || []).length
      scenarios.push({ scenario: `Critical tool outage: ${t.name}`, assetsHit: dep, unrecoverable: dep, resilienceDrop: Math.min(100, dep * 8) })
    }
  })
  const undocCrit = assets.filter(a => !a.documented && ['critical', 'high'].includes((a.criticality || '').toLowerCase()))
  scenarios.push({ scenario: 'Documentation loss shock', assetsHit: undocCrit.length, unrecoverable: undocCrit.length, resilienceDrop: Math.min(100, undocCrit.length * 10) })
  scenarios.sort((a, b) => b.resilienceDrop - a.resilienceDrop)
  const worst = scenarios[0] || null
  return { baseline, survivability: Math.max(0, baseline - (worst ? worst.resilienceDrop : 0)), worst, scenarios }
}

// ── M55 — Intelligence Orchestrator (meta-brain, runs last) ──
function orchestrator(d) {
  const signal = signalIntelligence(d)
  const capability = capabilityIntelligence(d)
  const alignment = strategicAlignment(d)
  const truth = truthIntelligence(d)
  const brain = brainCore(d)
  const sim = simulationUniverse(d)
  const advisor = autonomousAdvisor(d)
  const pipeline = {
    'M36 Signal': signal.stabilityScore,
    'M39 Capability': capability.orgCapability,
    'M40 Alignment': alignment.alignment,
    'M46 Truth': truth.trustScore,
    'M50 Brain Core': brain.brainIndex,
    'M54 Survivability': sim.survivability,
  }
  const vals = Object.values(pipeline)
  const orgIntelligence = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
  const grade = orgIntelligence >= 80 ? 'A' : orgIntelligence >= 65 ? 'B' : orgIntelligence >= 50 ? 'C' : 'D'
  const topAction = advisor.advice[0] ? advisor.advice[0].action : 'Maintain current controls'
  return { organizationalIntelligenceScore: orgIntelligence, grade, posture: brain.posture, topPriority: topAction, pipeline }
}

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
const wrap = (fn) => (req, res) => {
  try { res.json(fn(loadData())) } catch (err) { res.status(500).json({ error: err.message }) }
}

router.get('/signals', wrap(signalIntelligence))            // M36
router.get('/opportunities', wrap(opportunityIntelligence)) // M38
router.get('/capability', wrap(capabilityIntelligence))     // M39
router.get('/alignment', wrap(strategicAlignment))          // M40
router.get('/truth', wrap(truthIntelligence))               // M46
router.get('/advisor', wrap(autonomousAdvisor))             // M48
router.get('/brain-core', wrap(brainCore))                  // M50
router.get('/simulation-universe', wrap(simulationUniverse))// M54
router.get('/orchestrator', wrap(orchestrator))             // M55

// Index of all Phase 6 constitutional intelligence endpoints
router.get('/', (req, res) => {
  res.json({
    phase: 'Phase 6 — Constitutional Intelligence & Meta-Brain (M36–M55)',
    owner: 'Kamran',
    endpoints: {
      'M36 Signal Intelligence': 'GET /api/intelligence/signals',
      'M38 Opportunity Intelligence': 'GET /api/intelligence/opportunities',
      'M39 Capability Intelligence': 'GET /api/intelligence/capability',
      'M40 Strategic Alignment': 'GET /api/intelligence/alignment',
      'M46 Truth Intelligence': 'GET /api/intelligence/truth',
      'M48 Autonomous Advisor': 'GET /api/intelligence/advisor',
      'M50 Brain Core Logic': 'GET /api/intelligence/brain-core',
      'M54 Simulation Universe': 'GET /api/intelligence/simulation-universe',
      'M55 Intelligence Orchestrator': 'GET /api/intelligence/orchestrator',
    },
  })
})

module.exports = router
