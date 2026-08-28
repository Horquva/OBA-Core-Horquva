const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')
const domain = require('../../domain')

// ─────────────────────────────────────────────
// MODULE REGISTRY
// Every contributing module with its reader,
// weight, and display label.
// ─────────────────────────────────────────────

// 'brainCore' is deliberately NOT a voting member here. Its own score
// (brainCore.js) is already a weighted average of governance, continuity,
// orgHealth, predictiveRisk, memory, collaboration, accountability,
// domainInt, decisionQuality and aiAdoption — all ten of which vote below
// in their own right. Including brainCore as an eleventh, 0.18-weighted
// entry counted those same ten signals a second time and structurally
// over-weighted them relative to executiveBriefing/executiveMemory/
// healthTrend, the only genuinely independent signals in this registry.
// readBrainCore() is still called (see orchestrate()) purely to surface
// `brainPosture` for display.
// Weights sum to exactly 1.00 — verified module weights are displayed to the
// caller (GET /modules) as-is, so they must be honest percentages, not just
// relative ratios. (The score itself renormalizes by the verified subset's
// total weight regardless, so this rescaling doesn't change any computed score.)
const MODULE_REGISTRY = [
  { key: 'governance', label: 'Governance Intelligence', weight: 0.15 },
  { key: 'continuity', label: 'Continuity Resilience', weight: 0.15 },
  { key: 'orgHealth', label: 'Organizational Health', weight: 0.12 },
  { key: 'predictiveRisk', label: 'Predictive Risk Intelligence', weight: 0.12 },
  { key: 'memory', label: 'Management Intelligence', weight: 0.10 },
  { key: 'collaboration', label: 'Human-AI Collaboration', weight: 0.09 },
  { key: 'accountability', label: 'Accountability Intelligence', weight: 0.09 },
  { key: 'domainInt', label: 'Data Intelligence', weight: 0.07 },
  { key: 'decisionQuality', label: 'Decision Quality', weight: 0.05 },
  { key: 'aiAdoption', label: 'AI Adoption Score', weight: 0.02 },
  { key: 'executiveBriefing', label: 'Executive Briefing', weight: 0.02 },
  { key: 'executiveMemory', label: 'Executive Memory', weight: 0.01 },
  { key: 'healthTrend', label: 'Health Trend', weight: 0.01 }
]

// ─────────────────────────────────────────────
// MODULE READERS
// Each reads one verified signal from its source
// table. Returns { score, verified, source }.
// ─────────────────────────────────────────────

async function readBrainCore() {
  const data = await must('brain_core_snapshots', supabase
    .from('brain_core_snapshots')
    .select('brain_index, posture')
    .order('computed_at', { ascending: false })
    .limit(1).maybeSingle())

  return {
    score: data?.brain_index ?? 0,
    verified: !!data,
    source: 'brain_core_snapshots',
    meta: { posture: data?.posture }
  }
}

// Eleven of the thirteen readers below used to SELECT from pre-aggregated
// tables that nothing in the application ever wrote. They are projections of
// one live computation now — see domain/derived.js. The two that still read a
// table (`readBrainCore`, `readExecutiveBriefing`) read snapshot tables this
// application genuinely writes on request, so they were never frozen.

function pillar(intel, key) {
  const found = (intel.pillars.pillars || []).find((p) => p.resultKey === key)
  return found
    ? { score: found.score, verified: true, source: `domain.intelligence.pillars(${key})` }
    : { score: 0, verified: false, source: `domain.intelligence.pillars(${key})` }
}

const readGovernance = (intel) => pillar(intel, 'GI')
const readMemory = (intel) => pillar(intel, 'MI')
const readDomainIntelligence = (intel) => pillar(intel, 'DI')

const readContinuity = (intel) => ({
  score: intel.orgHealth.continuityScore, verified: true,
  source: 'domain.intelligence.orgHealth',
})

const readOrgHealth = (intel) => ({
  score: intel.orgHealth.healthIndex, verified: true,
  source: 'domain.intelligence.orgHealth',
})

// Inverted: more CRITICAL agents means a lower score.
function readPredictiveRisk(intel) {
  const scores = intel.predictiveRisk.scores
  if (!scores.length) return { score: 0, verified: false, source: 'domain.intelligence.predictiveRisk' }
  const critical = scores.filter((p) => p.threatLevel === 'CRITICAL').length
  return {
    score: Math.round(((scores.length - critical) / scores.length) * 100),
    verified: true, source: 'domain.intelligence.predictiveRisk',
  }
}

const readCollaboration = (intel) => ({
  score: intel.collaboration.summary.collaborationScore,
  verified: intel.collaboration.perEmployee.length > 0,
  source: 'domain.intelligence.collaboration',
})

const readAccountability = (intel) => ({
  score: intel.accountability.accountabilityScore,
  verified: intel.accountability.entitiesWithLinks > 0,
  source: 'domain.intelligence.accountability',
})

const readDecisionQuality = (intel) => ({
  score: intel.decisionQuality.score,
  verified: intel.decisionQuality.evidence.sufficient,
  source: 'domain.intelligence.decisionQuality',
})

const readAIAdoption = (intel) => ({
  score: intel.collaboration.summary.aiAdoptionScore,
  verified: intel.collaboration.perEmployee.length > 0,
  source: 'domain.intelligence.collaboration',
})

// Inverted: more critical memory items means a lower memory-health score.
function readExecutiveMemory(intel) {
  const items = intel.executiveMemory.items
  if (!items.length) return { score: 0, verified: false, source: 'domain.intelligence.executiveMemory' }
  const critical = items.filter((m) => m.severity === 'critical').length
  return {
    score: Math.round(((items.length - critical) / items.length) * 100),
    verified: true, source: 'domain.intelligence.executiveMemory',
  }
}

// The one genuinely temporal signal. `org_health_snapshots` is a monthly series
// and history cannot be recomputed — the Knowledge Graph has no time dimension
// — so the stored months stay exactly as they are and supply the baseline,
// while the CURRENT end of the trend is computed live. Comparing two stored
// rows, as this did before, compared June against January and called it today.
async function readHealthTrend(intel) {
  const history = await optional('org_health_snapshots(trend)', supabase
    .from('org_health_snapshots')
    .select('health_index, snapshot_month')
    .order('snapshot_month', { ascending: true }), [])

  if (!history.length) return { score: 50, verified: false, source: 'org_health_snapshots' }

  const earliest = history[0].health_index
  const current = intel.orgHealth.healthIndex
  const delta = current - earliest

  return {
    score: Math.min(Math.max(Math.round(50 + delta * 2), 0), 100),
    verified: true,
    source: 'org_health_snapshots(history) + domain.intelligence.orgHealth(current)',
    meta: { baselineMonth: history[0].snapshot_month, baseline: earliest, current, delta },
  }
}

async function readExecutiveBriefing() {
  const data = await must('executive_briefings', supabase
    .from('executive_briefings')
    .select('doc_trend_current')
    .order('briefing_date', { ascending: false })
    .limit(1).maybeSingle())

  // Use documentation trend as a proxy for briefing quality
  const score = data?.doc_trend_current
    ? Math.min(Math.round(data.doc_trend_current * 1.5), 100)
    : 0

  return { score, verified: !!data, source: 'executive_briefings' }
}

const MODULE_READERS = {
  governance: readGovernance,
  continuity: readContinuity,
  orgHealth: readOrgHealth,
  predictiveRisk: readPredictiveRisk,
  memory: readMemory,
  collaboration: readCollaboration,
  accountability: readAccountability,
  domainInt: readDomainIntelligence,
  decisionQuality: readDecisionQuality,
  aiAdoption: readAIAdoption,
  executiveBriefing: readExecutiveBriefing,
  executiveMemory: readExecutiveMemory,
  healthTrend: readHealthTrend
}

// ─────────────────────────────────────────────
// SCORING HELPERS
// ─────────────────────────────────────────────

function generateVerdict(score, rating, modules) {
  const sorted = [...modules].sort((a, b) => a.score - b.score)
  const weakest = sorted.slice(0, 3).map(m => m.label.toLowerCase())
  const strongest = sorted.slice(-2).map(m => m.label.toLowerCase())

  // Keys must match what band() returns: STRONG | PARTIAL | WEAK | CRITICAL
  const openers = {
    'STRONG': 'The organization demonstrates strong intelligence across most dimensions.',
    'PARTIAL': 'The organization demonstrates moderate intelligence but remains constrained',
    'WEAK': 'The organization demonstrates developing intelligence but remains constrained',
    'CRITICAL': 'The organization is at significant risk of intelligence failure, constrained'
  }

  const opener = openers[rating] ?? 'The organization\'s intelligence posture is being assessed.'
  // STRONG is already a full sentence — don't append "by weaknesses in..."
  const intro = rating === 'STRONG'
    ? opener
    : `${opener} by weaknesses in ${weakest.join(', ')}.`

  return [
    intro,
    `Verified signals from ${modules.filter(m => m.verified).length} of ${modules.length} modules confirm this assessment.`,
    `Strongest performing dimensions are ${strongest.join(' and ')}.`,
    score < 60
      ? 'Immediate executive intervention is required to prevent further posture degradation.'
      : score < 80
        ? 'Targeted remediation of the weakest dimensions is recommended.'
        : 'Continue monitoring. No immediate intervention required.'
  ].join(' ')
}

function generateRecommendations(modules) {
  const recommendations = []
  const byKey = {}
  modules.forEach(m => { byKey[m.key] = m })

  if ((byKey.continuity?.score ?? 100) < 40)
    recommendations.push('Assign backup owners to all critical agents and workflows immediately')

  if ((byKey.governance?.score ?? 100) < 60)
    recommendations.push('Resolve all separation-of-duty violations and governance gaps')

  if ((byKey.predictiveRisk?.score ?? 100) < 50)
    recommendations.push('Address all CRITICAL predicted agents before they escalate to incidents')

  if ((byKey.orgHealth?.score ?? 100) < 40)
    recommendations.push('Launch an executive-mandated documentation sprint to reach 60% coverage')

  if ((byKey.collaboration?.score ?? 100) < 50)
    recommendations.push('Redistribute ownership concentration to reduce single-person dependency')

  if ((byKey.memory?.score ?? 100) < 60)
    recommendations.push('Strengthen institutional memory through structured knowledge transfer')

  if ((byKey.accountability?.score ?? 100) < 70)
    recommendations.push('Enforce RACI discipline across all accountability entities')

  if ((byKey.decisionQuality?.score ?? 100) < 60)
    recommendations.push('Review and revise historical decisions flagged for negative outcomes')

  // Always include one forward-looking recommendation
  recommendations.push('Establish a monthly Organizational Intelligence review cadence')

  return recommendations.slice(0, 5)
}

function computeTrustScore(modules) {
  const verified = modules.filter(m => m.verified).length
  const total = modules.length
  const coverage = Math.round((verified / total) * 100)
  const avgScore = modules
    .filter(m => m.verified)
    .reduce((s, m) => s + m.score, 0) / (verified || 1)

  // Trust = 60% coverage + 40% average score
  return Math.round((coverage * 0.6) + (avgScore * 0.4))
}

// ─────────────────────────────────────────────
// CORE ORCHESTRATION
// ─────────────────────────────────────────────

/**
 * Run one module reader, turning a query failure into an explicit `unavailable`
 * marker. `verified: false` means "no row on record" and only that — it used to
 * absorb query failures too, silently dropping a module from the weighted
 * average and renormalizing the rest, so the headline Organizational
 * Intelligence Score changed composition with nothing saying so.
 */
async function readModule(key, reader, intel) {
  try {
    return await reader(intel)
  } catch (err) {
    console.error(`[orchestrator] module '${key}' unavailable: ${err.message}`)
    return { score: 0, verified: false, source: null, unavailable: true, error: err.message }
  }
}

/**
 * Runs the module registry and builds the response from an already-loaded
 * `intel` bundle. Split out from orchestrate() so it's callable with a
 * hand-built intel bundle in tests, without a live Supabase call.
 *
 * The headline score is intel.pillars.orgScore — the one OIS (D-02, D-17).
 * The 13-module registry above no longer votes on it; it still explains it
 * via generateVerdict/generateRecommendations, UNLESS orgScore's own
 * evidence gate reports insufficient (D-07, D-10, D-22) — those two
 * functions assume a real numeric score, so an insufficient orgScore
 * short-circuits to a fixed explanatory verdict instead.
 */
async function orchestrateFrom(intel) {
  const orgScoreEvidence = intel.pillars.orgScore.evidence

  // Read all voting modules, plus brainCore separately for display only
  // (see the comment on MODULE_REGISTRY — it does not vote).
  const [results, brainCoreResult] = await Promise.all([
    Promise.all(
      MODULE_REGISTRY.map(async cfg => {
        const result = await readModule(cfg.key, MODULE_READERS[cfg.key], intel)
        return {
          key: cfg.key,
          label: cfg.label,
          weight: cfg.weight,
          score: result.score,
          verified: result.verified,
          source: result.source,
          meta: result.meta ?? null,
          unavailable: !!result.unavailable,
          error: result.error ?? null
        }
      })
    ),
    readModule('brainCore', readBrainCore, intel)
  ])

  const brainPosture = brainCoreResult?.meta?.posture ?? null
  const trust = computeTrustScore(results)

  const unavailable = results.filter(m => m.unavailable)
  const dataIntegrity = {
    degraded: unavailable.length > 0,
    modulesRead: results.length,
    modulesVerified: results.filter(m => m.verified).length,
    modulesUnavailable: unavailable.length,
    unavailableModules: unavailable.map(m => ({ key: m.key, label: m.label, error: m.error })),
    warning: unavailable.length
      ? `${unavailable.length} of ${results.length} modules could not be read. This score was computed from the rest and is NOT a complete picture.`
      : null,
  }

  if (!orgScoreEvidence.sufficient) {
    return {
      score: null,
      rating: null,
      verdict: `Insufficient evidence to compute an Organizational Intelligence Score — ${Math.round((orgScoreEvidence.coverage ?? 0) * 100)}% coverage on at least one pillar. See evidence for detail.`,
      recs: [],
      trust,
      brainPosture,
      modules: results,
      dataIntegrity,
      evidence: orgScoreEvidence,
    }
  }

  const score = intel.pillars.orgScore.score
  const rating = intel.pillars.orgScore.rating
  const verdict = generateVerdict(score, rating, results)
  const recs = generateRecommendations(results)

  return { score, rating, verdict, recs, trust, brainPosture, modules: results, dataIntegrity, evidence: orgScoreEvidence }
}

async function orchestrate() {
  // ONE computation feeds every module that derives from the roots, so no two
  // modules in the same score can describe the organization at two different
  // moments.
  const intel = await domain.intelligence.all()
  return orchestrateFrom(intel)
}

// ─────────────────────────────────────────────
// SNAPSHOT CACHE  (once per day)
// ─────────────────────────────────────────────

async function getOrComputeOrchestration() {
  const today = new Date().toISOString().split('T')[0]

  // A failed cache read is non-fatal — recomputing live is the right fallback —
  // but the error is logged rather than discarded.
  const cached = await optional('orchestrator_snapshots (cache read)', supabase
    .from('orchestrator_snapshots')
    .select('*')
    .gte('computed_at', `${today}T00:00:00`)
    .order('computed_at', { ascending: false })
    .limit(1).maybeSingle())

  if (cached) return { ...cached, fromCache: true }

  const result = await orchestrate()

  // Never cache an incomplete or insufficiently-evidenced score. Persisting
  // either would pin a number computed during a partial outage, or a null
  // score whose evidence.coverage may have genuinely changed by the next
  // read, for the rest of the day (D-07, D-10).
  if (result.dataIntegrity.degraded || !result.evidence.sufficient) {
    if (!result.evidence.sufficient) {
      console.warn('[orchestrator] not caching an insufficient-evidence snapshot')
    } else {
      console.warn('[orchestrator] not caching a degraded snapshot —', result.dataIntegrity.warning)
    }
    return {
      organizational_intelligence_score: result.score,
      rating: result.rating,
      final_verdict: result.verdict,
      brain_posture: result.brainPosture,
      trust_score: result.trust,
      executive_recommendations: result.recs,
      modules: result.modules,
      dataIntegrity: result.dataIntegrity,
      evidence: result.evidence,
      computed_at: new Date().toISOString(),
      fromCache: false
    }
  }

  const moduleBreakdown = {}
  result.modules.forEach(m => {
    moduleBreakdown[m.key] = {
      score: m.score, weight: m.weight,
      verified: m.verified, source: m.source
    }
  })

  const { data: saved, error: saveError } = await supabase
    .from('orchestrator_snapshots')
    .insert({
      organizational_intelligence_score: result.score,
      rating: result.rating,
      final_verdict: result.verdict,
      brain_posture: result.brainPosture,
      trust_score: result.trust,
      executive_recommendations: result.recs,
      module_breakdown: moduleBreakdown
    })
    .select().single()

  // The score is still valid if only the write failed — return it, but say so.
  if (saveError) {
    console.warn(`[orchestrator] failed to persist snapshot: ${saveError.message}`)
  }

  return {
    ...(saved ?? {}),
    organizational_intelligence_score: result.score,
    rating: result.rating,
    final_verdict: result.verdict,
    brain_posture: result.brainPosture,
    trust_score: result.trust,
    executive_recommendations: result.recs,
    modules: result.modules,
    dataIntegrity: result.dataIntegrity,
    evidence: result.evidence,
    fromCache: false
  }
}

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const snap = await getOrComputeOrchestration()

    res.json({
      organizationalIntelligenceScore: snap.organizational_intelligence_score,
      rating: snap.rating,
      finalVerdict: snap.final_verdict,
      brainPosture: snap.brain_posture,
      trustScore: snap.trust_score,
      generatedAt: snap.computed_at ?? new Date().toISOString(),
      fromCache: snap.fromCache,
      // Absent on a cache hit — a snapshot is only ever persisted when every
      // module read cleanly, so there is no degradation to report.
      dataIntegrity: snap.dataIntegrity ?? null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const snap = await getOrComputeOrchestration()

    res.json({
      organizationalIntelligenceScore: snap.organizational_intelligence_score,
      rating: snap.rating,
      brainPosture: snap.brain_posture,
      trustScore: snap.trust_score,
      finalVerdict: snap.final_verdict,
      topRecommendations: (
        snap.executive_recommendations ?? []
      ).slice(0, 3),
      generatedAt: snap.computed_at ?? new Date().toISOString(),
      dataIntegrity: snap.dataIntegrity ?? null,
      evidence: snap.evidence ?? null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator/verdict
// ─────────────────────────────────────────────

router.get('/verdict', async (req, res) => {
  try {
    const snap = await getOrComputeOrchestration()

    res.json({
      finalVerdict: snap.final_verdict,
      rating: snap.rating,
      brainPosture: snap.brain_posture,
      dataIntegrity: snap.dataIntegrity ?? null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator/recommendations
// ─────────────────────────────────────────────

router.get('/recommendations', async (req, res) => {
  try {
    // Always compute live — recs depend on current signal state
    const result = await orchestrate()

    res.json({
      organizationalIntelligenceScore: result.score,
      rating: result.rating,
      totalRecommendations: result.recs.length,
      dataIntegrity: result.dataIntegrity,
      recommendations: result.recs.map((r, i) => ({
        rank: i + 1,
        recommendation: r
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator/modules
// ─────────────────────────────────────────────

router.get('/modules', async (req, res) => {
  try {
    // Always live — shows current verification status
    const result = await orchestrate()

    const sorted = [...result.modules].sort((a, b) => a.score - b.score)

    res.json({
      totalModules: result.modules.length,
      verifiedModules: result.modules.filter(m => m.verified).length,
      dataIntegrity: result.dataIntegrity,
      modules: sorted.map(m => ({
        name: m.label,
        key: m.key,
        verified: m.verified,
        score: m.score,
        weight: `${Math.round(m.weight * 100)}%`,
        source: m.source,
        // Separates "no row seeded" from "this query failed".
        unavailable: m.unavailable,
        error: m.error
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/orchestrator/score
// ─────────────────────────────────────────────

router.get('/score', async (req, res) => {
  try {
    const snap = await getOrComputeOrchestration()

    res.json({
      organizationalIntelligenceScore: snap.organizational_intelligence_score,
      rating: snap.rating,
      dataIntegrity: snap.dataIntegrity ?? null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
module.exports.orchestrateFrom = orchestrateFrom