const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')

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
const MODULE_REGISTRY = [
  { key: 'governance',        label: 'Governance Intelligence',        weight: 0.12 },
  { key: 'continuity',        label: 'Continuity Resilience',          weight: 0.12 },
  { key: 'orgHealth',         label: 'Organizational Health',          weight: 0.10 },
  { key: 'predictiveRisk',    label: 'Predictive Risk Intelligence',   weight: 0.10 },
  { key: 'memory',            label: 'Memory Intelligence',            weight: 0.08 },
  { key: 'collaboration',     label: 'Human-AI Collaboration',         weight: 0.07 },
  { key: 'accountability',    label: 'Accountability Intelligence',    weight: 0.07 },
  { key: 'domainInt',         label: 'Domain Intelligence',            weight: 0.06 },
  { key: 'decisionQuality',   label: 'Decision Quality',               weight: 0.04 },
  { key: 'aiAdoption',        label: 'AI Adoption Score',              weight: 0.02 },
  { key: 'executiveBriefing', label: 'Executive Briefing',             weight: 0.02 },
  { key: 'executiveMemory',   label: 'Executive Memory',               weight: 0.01 },
  { key: 'healthTrend',       label: 'Health Trend',                   weight: 0.01 }
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
    score:    data?.brain_index ?? 0,
    verified: !!data,
    source:   'brain_core_snapshots',
    meta:     { posture: data?.posture }
  }
}

async function readGovernance() {
  const data = await must('intelligence_results', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'GI')
    .maybeSingle())

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readContinuity() {
  const data = await must('org_health_snapshots', supabase
    .from('org_health_snapshots')
    .select('continuity_score')
    .order('snapshot_month', { ascending: false })
    .limit(1).maybeSingle())

  return { score: data?.continuity_score ?? 0, verified: !!data, source: 'org_health_snapshots' }
}

async function readOrgHealth() {
  const data = await must('org_health_snapshots', supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: false })
    .limit(1).maybeSingle())

  return { score: data?.health_index ?? 0, verified: !!data, source: 'org_health_snapshots' }
}

async function readPredictiveRisk() {
  const data = await must('predictive_risk_scores', supabase
    .from('predictive_risk_scores')
    .select('threat_level'))

  if (!data.length) return { score: 0, verified: false, source: 'predictive_risk_scores' }

  const critical = data.filter(p => p.threat_level === 'CRITICAL').length
  const score = Math.round(((data.length - critical) / data.length) * 100)

  return { score, verified: true, source: 'predictive_risk_scores' }
}

async function readMemory() {
  const data = await must('intelligence_results', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'MI')
    .maybeSingle())

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readCollaboration() {
  const data = await must('collaboration_summary', supabase
    .from('collaboration_summary')
    .select('collaboration_score')
    .order('computed_at', { ascending: false })
    .limit(1).maybeSingle())

  return { score: data?.collaboration_score ?? 0, verified: !!data, source: 'collaboration_summary' }
}

async function readAccountability() {
  const data = await must('accountability_summary', supabase
    .from('accountability_summary')
    .select('accountability_score')
    .order('computed_at', { ascending: false })
    .limit(1).maybeSingle())

  return { score: data?.accountability_score ?? 0, verified: !!data, source: 'accountability_summary' }
}

async function readDomainIntelligence() {
  const data = await must('intelligence_results', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'DI')
    .maybeSingle())

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readDecisionQuality() {
  const data = await must('decision_history', supabase
    .from('decision_history')
    .select('outcome'))

  if (!data.length) return { score: 50, verified: false, source: 'decision_history' }

  const negative = data.filter(d => d.outcome === 'negative').length
  const score = Math.round(((data.length - negative) / data.length) * 100)

  return { score, verified: true, source: 'decision_history' }
}

async function readAIAdoption() {
  const data = await must('collaboration_summary', supabase
    .from('collaboration_summary')
    .select('ai_adoption_score')
    .order('computed_at', { ascending: false })
    .limit(1).maybeSingle())

  return { score: data?.ai_adoption_score ?? 0, verified: !!data, source: 'collaboration_summary' }
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

async function readExecutiveMemory() {
  const data = await must('executive_memory_items', supabase
    .from('executive_memory_items')
    .select('relevance_score, severity'))

  if (!data.length) return { score: 0, verified: false, source: 'executive_memory_items' }

  // Invert: more critical memory items = lower memory health score
  const critical = data.filter(m => m.severity === 'critical').length
  const score = Math.round(((data.length - critical) / data.length) * 100)

  return { score, verified: true, source: 'executive_memory_items' }
}

async function readHealthTrend() {
  const data = await must('org_health_snapshots', supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: true }))

  if (data.length < 2) return { score: 50, verified: false, source: 'org_health_snapshots' }

  const latest  = data[data.length - 1].health_index
  const earliest = data[0].health_index

  // Trending upward = higher score
  const delta = latest - earliest
  const score = Math.min(Math.max(Math.round(50 + delta * 2), 0), 100)

  return { score, verified: true, source: 'org_health_snapshots' }
}

const MODULE_READERS = {
  governance:        readGovernance,
  continuity:        readContinuity,
  orgHealth:         readOrgHealth,
  predictiveRisk:    readPredictiveRisk,
  memory:            readMemory,
  collaboration:     readCollaboration,
  accountability:    readAccountability,
  domainInt:         readDomainIntelligence,
  decisionQuality:   readDecisionQuality,
  aiAdoption:        readAIAdoption,
  executiveBriefing: readExecutiveBriefing,
  executiveMemory:   readExecutiveMemory,
  healthTrend:       readHealthTrend
}

// ─────────────────────────────────────────────
// SCORING HELPERS
// ─────────────────────────────────────────────

function classifyRating(score) {
  if (score >= 80) return 'HIGHLY INTELLIGENT'
  if (score >= 60) return 'MODERATELY INTELLIGENT'
  if (score >= 40) return 'DEVELOPING'
  return 'AT RISK'
}

function generateVerdict(score, rating, modules) {
  const sorted    = [...modules].sort((a, b) => a.score - b.score)
  const weakest   = sorted.slice(0, 3).map(m => m.label.toLowerCase())
  const strongest = sorted.slice(-2).map(m => m.label.toLowerCase())

  const openers = {
    'HIGHLY INTELLIGENT':    'The organization demonstrates strong intelligence across most dimensions.',
    'MODERATELY INTELLIGENT':'The organization demonstrates moderate intelligence but remains constrained',
    'DEVELOPING':            'The organization demonstrates developing intelligence but remains constrained',
    'AT RISK':               'The organization is at significant risk of intelligence failure, constrained'
  }

  return [
    `${openers[rating]} by weaknesses in ${weakest.join(', ')}.`,
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

  if ((byKey.continuity?.score   ?? 100) < 40)
    recommendations.push('Assign backup owners to all critical agents and workflows immediately')

  if ((byKey.governance?.score   ?? 100) < 60)
    recommendations.push('Resolve all separation-of-duty violations and governance gaps')

  if ((byKey.predictiveRisk?.score ?? 100) < 50)
    recommendations.push('Address all CRITICAL predicted agents before they escalate to incidents')

  if ((byKey.orgHealth?.score    ?? 100) < 40)
    recommendations.push('Launch an executive-mandated documentation sprint to reach 60% coverage')

  if ((byKey.collaboration?.score ?? 100) < 50)
    recommendations.push('Redistribute ownership concentration to reduce single-person dependency')

  if ((byKey.memory?.score       ?? 100) < 60)
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
  const verified  = modules.filter(m => m.verified).length
  const total     = modules.length
  const coverage  = Math.round((verified / total) * 100)
  const avgScore  = modules
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
async function readModule(key, reader) {
  try {
    return await reader()
  } catch (err) {
    console.error(`[orchestrator] module '${key}' unavailable: ${err.message}`)
    return { score: 0, verified: false, source: null, unavailable: true, error: err.message }
  }
}

async function orchestrate() {
  // Read all voting modules, plus brainCore separately for display only
  // (see the comment on MODULE_REGISTRY — it does not vote).
  const [results, brainCoreResult] = await Promise.all([
    Promise.all(
      MODULE_REGISTRY.map(async cfg => {
        const result = await readModule(cfg.key, MODULE_READERS[cfg.key])
        return {
          key:         cfg.key,
          label:       cfg.label,
          weight:      cfg.weight,
          score:       result.score,
          verified:    result.verified,
          source:      result.source,
          meta:        result.meta ?? null,
          unavailable: !!result.unavailable,
          error:       result.error ?? null
        }
      })
    ),
    readModule('brainCore', readBrainCore)
  ])

  // Only verified modules contribute to the score
  const verified = results.filter(m => m.verified)
  const totalWeight = verified.reduce((s, m) => s + m.weight, 0)

  const rawScore = totalWeight > 0
    ? verified.reduce((s, m) => s + (m.score * m.weight), 0) / totalWeight
    : 0

  const score   = Math.round(rawScore)
  const rating  = classifyRating(score)
  const verdict = generateVerdict(score, rating, results)
  const recs    = generateRecommendations(results)
  const trust   = computeTrustScore(results)
  const brainPosture = brainCoreResult?.meta?.posture ?? null

  const unavailable = results.filter(m => m.unavailable)
  const dataIntegrity = {
    degraded: unavailable.length > 0,
    modulesRead: results.length,
    modulesVerified: verified.length,
    modulesUnavailable: unavailable.length,
    unavailableModules: unavailable.map(m => ({ key: m.key, label: m.label, error: m.error })),
    warning: unavailable.length
      ? `${unavailable.length} of ${results.length} modules could not be read. This score was computed from the rest and is NOT a complete picture.`
      : null,
  }

  return { score, rating, verdict, recs, trust, brainPosture, modules: results, dataIntegrity }
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

  // Never cache an incomplete score. Persisting a degraded result would pin a
  // number computed during a partial outage for the rest of the day.
  if (result.dataIntegrity.degraded) {
    console.warn('[orchestrator] not caching a degraded snapshot —', result.dataIntegrity.warning)
    return {
      organizational_intelligence_score: result.score,
      rating:        result.rating,
      final_verdict: result.verdict,
      brain_posture: result.brainPosture,
      trust_score:   result.trust,
      executive_recommendations: result.recs,
      modules:       result.modules,
      dataIntegrity: result.dataIntegrity,
      computed_at:   new Date().toISOString(),
      fromCache:     false
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
      rating:                            result.rating,
      final_verdict:                     result.verdict,
      brain_posture:                     result.brainPosture,
      trust_score:                       result.trust,
      executive_recommendations:         result.recs,
      module_breakdown:                  moduleBreakdown
    })
    .select().single()

  // The score is still valid if only the write failed — return it, but say so.
  if (saveError) {
    console.warn(`[orchestrator] failed to persist snapshot: ${saveError.message}`)
  }

  return {
    ...(saved ?? {}),
    organizational_intelligence_score: result.score,
    rating:      result.rating,
    final_verdict: result.verdict,
    brain_posture: result.brainPosture,
    trust_score:   result.trust,
    executive_recommendations: result.recs,
    modules: result.modules,
    dataIntegrity: result.dataIntegrity,
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
      rating:          snap.rating,
      finalVerdict:    snap.final_verdict,
      brainPosture:    snap.brain_posture,
      trustScore:      snap.trust_score,
      generatedAt:     snap.computed_at ?? new Date().toISOString(),
      fromCache:       snap.fromCache,
      // Absent on a cache hit — a snapshot is only ever persisted when every
      // module read cleanly, so there is no degradation to report.
      dataIntegrity:   snap.dataIntegrity ?? null
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
      rating:       snap.rating,
      brainPosture: snap.brain_posture,
      trustScore:   snap.trust_score,
      finalVerdict: snap.final_verdict,
      topRecommendations: (
        snap.executive_recommendations ?? []
      ).slice(0, 3),
      generatedAt: snap.computed_at ?? new Date().toISOString(),
      dataIntegrity: snap.dataIntegrity ?? null
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
      rating:       snap.rating,
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
        rank:           i + 1,
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
      totalModules:    result.modules.length,
      verifiedModules: result.modules.filter(m => m.verified).length,
      dataIntegrity:   result.dataIntegrity,
      modules: sorted.map(m => ({
        name:     m.label,
        key:      m.key,
        verified: m.verified,
        score:    m.score,
        weight:   `${Math.round(m.weight * 100)}%`,
        source:   m.source,
        // Separates "no row seeded" from "this query failed".
        unavailable: m.unavailable,
        error:       m.error
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