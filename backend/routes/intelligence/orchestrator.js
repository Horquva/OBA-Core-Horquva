const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// MODULE REGISTRY
// Every contributing module with its reader,
// weight, and display label.
// ─────────────────────────────────────────────

const MODULE_REGISTRY = [
  { key: 'brainCore',         label: 'Organizational Brain Core',     weight: 0.18 },
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
  const { data } = await supabase
    .from('brain_core_snapshots')
    .select('brain_index, posture')
    .order('computed_at', { ascending: false })
    .limit(1).single()

  return {
    score:    data?.brain_index ?? 0,
    verified: !!data,
    source:   'brain_core_snapshots',
    meta:     { posture: data?.posture }
  }
}

async function readGovernance() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'GI')
    .single()

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readContinuity() {
  const { data } = await supabase
    .from('org_health_snapshots')
    .select('continuity_score')
    .order('snapshot_month', { ascending: false })
    .limit(1).single()

  return { score: data?.continuity_score ?? 0, verified: !!data, source: 'org_health_snapshots' }
}

async function readOrgHealth() {
  const { data } = await supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: false })
    .limit(1).single()

  return { score: data?.health_index ?? 0, verified: !!data, source: 'org_health_snapshots' }
}

async function readPredictiveRisk() {
  const { data } = await supabase
    .from('predictive_risk_scores')
    .select('threat_level')

  if (!data?.length) return { score: 0, verified: false, source: 'predictive_risk_scores' }

  const critical = data.filter(p => p.threat_level === 'CRITICAL').length
  const score = Math.round(((data.length - critical) / data.length) * 100)

  return { score, verified: true, source: 'predictive_risk_scores' }
}

async function readMemory() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'MI')
    .single()

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readCollaboration() {
  const { data } = await supabase
    .from('collaboration_summary')
    .select('collaboration_score')
    .order('computed_at', { ascending: false })
    .limit(1).single()

  return { score: data?.collaboration_score ?? 0, verified: !!data, source: 'collaboration_summary' }
}

async function readAccountability() {
  const { data } = await supabase
    .from('accountability_summary')
    .select('accountability_score')
    .order('computed_at', { ascending: false })
    .limit(1).single()

  return { score: data?.accountability_score ?? 0, verified: !!data, source: 'accountability_summary' }
}

async function readDomainIntelligence() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'DI')
    .single()

  return { score: data?.score ?? 0, verified: !!data, source: 'intelligence_results' }
}

async function readDecisionQuality() {
  const { data } = await supabase
    .from('decision_history')
    .select('outcome')

  if (!data?.length) return { score: 50, verified: false, source: 'decision_history' }

  const negative = data.filter(d => d.outcome === 'negative').length
  const score = Math.round(((data.length - negative) / data.length) * 100)

  return { score, verified: true, source: 'decision_history' }
}

async function readAIAdoption() {
  const { data } = await supabase
    .from('collaboration_summary')
    .select('ai_adoption_score')
    .order('computed_at', { ascending: false })
    .limit(1).single()

  return { score: data?.ai_adoption_score ?? 0, verified: !!data, source: 'collaboration_summary' }
}

async function readExecutiveBriefing() {
  const { data } = await supabase
    .from('executive_briefings')
    .select('doc_trend_current')
    .order('briefing_date', { ascending: false })
    .limit(1).single()

  // Use documentation trend as a proxy for briefing quality
  const score = data?.doc_trend_current
    ? Math.min(Math.round(data.doc_trend_current * 1.5), 100)
    : 0

  return { score, verified: !!data, source: 'executive_briefings' }
}

async function readExecutiveMemory() {
  const { data } = await supabase
    .from('executive_memory_items')
    .select('relevance_score, severity')

  if (!data?.length) return { score: 0, verified: false, source: 'executive_memory_items' }

  // Invert: more critical memory items = lower memory health score
  const critical = data.filter(m => m.severity === 'critical').length
  const score = Math.round(((data.length - critical) / data.length) * 100)

  return { score, verified: true, source: 'executive_memory_items' }
}

async function readHealthTrend() {
  const { data } = await supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: true })

  if (!data || data.length < 2) return { score: 50, verified: false, source: 'org_health_snapshots' }

  const latest  = data[data.length - 1].health_index
  const earliest = data[0].health_index

  // Trending upward = higher score
  const delta = latest - earliest
  const score = Math.min(Math.max(Math.round(50 + delta * 2), 0), 100)

  return { score, verified: true, source: 'org_health_snapshots' }
}

const MODULE_READERS = {
  brainCore:         readBrainCore,
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

async function orchestrate() {
  // Read all modules in parallel
  const results = await Promise.all(
    MODULE_REGISTRY.map(async cfg => {
      const result = await MODULE_READERS[cfg.key]()
      return {
        key:      cfg.key,
        label:    cfg.label,
        weight:   cfg.weight,
        score:    result.score,
        verified: result.verified,
        source:   result.source,
        meta:     result.meta ?? null
      }
    })
  )

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

  // Brain posture from brainCore meta
  const brainMeta = results.find(m => m.key === 'brainCore')
  const brainPosture = brainMeta?.meta?.posture ?? null

  return { score, rating, verdict, recs, trust, brainPosture, modules: results }
}

// ─────────────────────────────────────────────
// SNAPSHOT CACHE  (once per day)
// ─────────────────────────────────────────────

async function getOrComputeOrchestration() {
  const today = new Date().toISOString().split('T')[0]

  const { data: cached } = await supabase
    .from('orchestrator_snapshots')
    .select('*')
    .gte('computed_at', `${today}T00:00:00`)
    .order('computed_at', { ascending: false })
    .limit(1).single()

  if (cached) return { ...cached, fromCache: true }

  const result = await orchestrate()

  const moduleBreakdown = {}
  result.modules.forEach(m => {
    moduleBreakdown[m.key] = {
      score: m.score, weight: m.weight,
      verified: m.verified, source: m.source
    }
  })

  const { data: saved } = await supabase
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

  return {
    ...(saved ?? {}),
    organizational_intelligence_score: result.score,
    rating:      result.rating,
    final_verdict: result.verdict,
    brain_posture: result.brainPosture,
    trust_score:   result.trust,
    executive_recommendations: result.recs,
    modules: result.modules,
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
      fromCache:       snap.fromCache
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
      generatedAt: snap.computed_at ?? new Date().toISOString()
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
      brainPosture: snap.brain_posture
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
      modules: sorted.map(m => ({
        name:     m.label,
        key:      m.key,
        verified: m.verified,
        score:    m.score,
        weight:   `${Math.round(m.weight * 100)}%`,
        source:   m.source
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
      rating: snap.rating
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router