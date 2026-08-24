/**
 * ORGANIZATIONAL ANALYSES OVER THE COMPANY DATASET
 * ------------------------------------------------
 * Pure functions of `domain/dataset.js`'s shape. Reached through `domain/`,
 * alongside the graph analyses — callers ask the domain layer a question and do
 * not choose which technique answers it. See domain/index.js for the boundary.
 *
 * ⚠ These are NOT the brain's M39/M40/M46/M48/M54. Those compute different
 * things from the Knowledge Graph and are reached through
 * routes/intelligence/prediction.js. Two analyses sharing a module number is
 * the collision the design document exists to remove — step 5 renames these
 * off the M-numbers. Until then, check which file you are in.
 */

const { atOrAbove } = require('./definitions')

function assetsOf(d) {
  return [...(d.agents || []), ...(d.workflows || [])]
}
function pct(n, dd) {
  return dd ? Math.round((100 * n) / dd) : 0
}

// ── Trend signals: which monthly series are moving the wrong way ──
function trendSignals(d) {
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

// ── Improvement opportunities, ranked by impact against effort ──
function improvementOpportunities(d) {
  const assets = assetsOf(d)
  const opps = []
  const undoc = assets.filter(a => !a.documented && atOrAbove(a.criticality, 'high'))
  if (undoc.length) opps.push({ opportunity: 'Document critical assets', impact: 'HIGH', effort: 'LOW', count: undoc.length })
  const single = (d.knowledge_areas || []).filter(k => atOrAbove(k.criticality, 'high') && (k.holders || []).length === 1)
  single.forEach(k => opps.push({ opportunity: `Cross-train on '${k.area}'`, impact: 'HIGH', effort: 'MEDIUM', count: 1 }))
  const noBackup = assets.filter(a => !a.backup_owner && (a.criticality || '').toLowerCase() === 'critical')
  if (noBackup.length) opps.push({ opportunity: 'Assign backup owners to critical assets', impact: 'HIGH', effort: 'LOW', count: noBackup.length })
  const quickWins = opps.filter(o => o.impact === 'HIGH' && o.effort === 'LOW').length
  return { total: opps.length, quickWins, opportunities: opps }
}

// ── Per-department capability score (documentation, continuity, ownership depth) ──
function departmentCapability(d) {
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

// ── Alignment checklist across three dimensions ──
// ⚠ A dimension with no data is UNKNOWN, never perfect. Each check scores null
// when its source is empty, and null dimensions are excluded from the average
// instead of being folded in as 100 — which is what the previous
// `rows.length ? … : 100` fallbacks did. On the live dataset that made half this
// score a constant: `incidents` is hardcoded [] in orgDataset (no such table
// exists) so it always contributed a perfect 100, and an organization with no
// data at all scored 100/ALIGNED.
//
// "Decision reversibility" was removed outright. It read `x.reversible`, a field
// orgDataset has never emitted, so it was permanently 0% — there is no source
// for it and none is planned.
//
// Same defect class as the M42 culture fix: an absence rendered as a confident
// verdict. Expect more of these.
function alignmentChecklist(d) {
  const checks = []
  const dim = (dimension, rows, predicate) =>
    checks.push({ dimension, score: rows.length ? pct(rows.filter(predicate).length, rows.length) : null })

  dim('Critical workflows documented',
    (d.workflows || []).filter((w) => (w.criticality || '').toLowerCase() === 'critical'),
    (w) => w.documented)
  dim('Decisions with tracked outcomes', d.decisions_log || [], (x) => x.outcome)
  dim('Incident lessons captured', d.incidents || [], (i) => i.lesson)

  const scored = checks.filter((c) => c.score !== null)
  const alignment = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
    : null
  const state = alignment === null ? 'NO_SIGNAL'
    : alignment >= 70 ? 'ALIGNED'
      : alignment >= 50 ? 'PARTIAL' : 'MISALIGNED'

  return {
    alignment,
    state,
    dimensionsScored: scored.length,
    dimensionsUnknown: checks.length - scored.length,
    misaligned: scored.filter((c) => c.score < 50).map((c) => c.dimension),
    unknown: checks.filter((c) => c.score === null).map((c) => c.dimension),
    checks,
  }
}

// ── Four standard claims, each verified against the dataset ──
function standardClaimChecks(d) {
  const assets = assetsOf(d)
  const knowledge = d.knowledge_areas || []
  const truths = []
  const spof = assets.filter(a => (a.criticality || '').toLowerCase() === 'critical' && !a.backup_owner)
  truths.push({ claim: 'Single points of failure exist', verified: spof.length > 0, confidence: 'HIGH', evidence: `${spof.length} critical assets without a backup owner` })
  const undocAssets = assets.filter(a => !a.documented && atOrAbove(a.criticality, 'high'))
  const undocKa = knowledge.filter(k => !k.documented && atOrAbove(k.criticality, 'high'))
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

// ── Playbook advice — only for claims that verified ──
function playbookAdvice(d) {
  const truth = standardClaimChecks(d)
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

// ── Resilience scenarios: what each shock costs ──
function resilienceScenarios(d) {
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
  const undocCrit = assets.filter(a => !a.documented && atOrAbove(a.criticality, 'high'))
  scenarios.push({ scenario: 'Documentation loss shock', assetsHit: undocCrit.length, unrecoverable: undocCrit.length, resilienceDrop: Math.min(100, undocCrit.length * 10) })
  scenarios.sort((a, b) => b.resilienceDrop - a.resilienceDrop)
  const worst = scenarios[0] || null
  return { baseline, survivability: Math.max(0, baseline - (worst ? worst.resilienceDrop : 0)), worst, scenarios }
}

module.exports = {
  assetsOf, pct,
  trendSignals, improvementOpportunities, departmentCapability,
  alignmentChecklist, standardClaimChecks, playbookAdvice, resilienceScenarios,
}
