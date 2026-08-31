const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// SIGNAL WEIGHTS  (must sum to 1.0)
// ─────────────────────────────────────────────

const SIGNAL_CONFIG = [
  { key: 'governance',         label: 'Governance Score',            weight: 0.15 },
  { key: 'continuity',         label: 'Continuity Resilience',       weight: 0.15 },
  { key: 'orgHealth',          label: 'Organizational Health',       weight: 0.15 },
  { key: 'predictiveRisk',     label: 'Predictive Risk (inverted)',  weight: 0.15 },
  { key: 'memoryIntelligence', label: 'Memory Intelligence',         weight: 0.10 },
  { key: 'collaboration',      label: 'Collaboration Score',         weight: 0.10 },
  { key: 'domainIntelligence', label: 'Domain Intelligence',         weight: 0.08 },
  { key: 'accountability',     label: 'Accountability Score',        weight: 0.07 },
  { key: 'aiAdoption',         label: 'AI Adoption Score',           weight: 0.03 },
  { key: 'decisionQuality',    label: 'Decision Quality',            weight: 0.02 }
]

// ─────────────────────────────────────────────
// SIGNAL READERS  — one per source table
// Each returns { score, source, verified }
// ─────────────────────────────────────────────

async function readGovernance() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'GI')
    .single()

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readContinuity() {
  const { data } = await supabase
    .from('org_health_snapshots')
    .select('continuity_score')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .single()

  return { score: data?.continuity_score ?? 0, source: 'org_health_snapshots', verified: !!data }
}

async function readOrgHealth() {
  const { data } = await supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .single()

  return { score: data?.health_index ?? 0, source: 'org_health_snapshots', verified: !!data }
}

async function readPredictiveRisk() {
  // Invert: more CRITICAL agents = lower score
  const { data } = await supabase
    .from('predictive_risk_scores')
    .select('threat_level')

  if (!data?.length) return { score: 0, source: 'predictive_risk_scores', verified: false }

  const criticalCount = data.filter(p => p.threat_level === 'CRITICAL').length
  const safeRatio = (data.length - criticalCount) / data.length
  const score = Math.round(safeRatio * 100)

  return { score, source: 'predictive_risk_scores', verified: true }
}

async function readMemoryIntelligence() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'MI')
    .single()

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readCollaboration() {
  const { data } = await supabase
    .from('collaboration_summary')
    .select('collaboration_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  return { score: data?.collaboration_score ?? 0, source: 'collaboration_summary', verified: !!data }
}

async function readDomainIntelligence() {
  const { data } = await supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'DI')
    .single()

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readAccountability() {
  const { data } = await supabase
    .from('accountability_summary')
    .select('accountability_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  return { score: data?.accountability_score ?? 0, source: 'accountability_summary', verified: !!data }
}

async function readAIAdoption() {
  const { data } = await supabase
    .from('collaboration_summary')
    .select('ai_adoption_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  return { score: data?.ai_adoption_score ?? 0, source: 'collaboration_summary', verified: !!data }
}

async function readDecisionQuality() {
  // Score = % of historical decisions that were not negative
  const { data } = await supabase
    .from('decision_history')
    .select('outcome')

  if (!data?.length) return { score: 50, source: 'decision_history', verified: false }

  const negative = data.filter(d => d.outcome === 'negative').length
  const score = Math.round(((data.length - negative) / data.length) * 100)

  return { score, source: 'decision_history', verified: true }
}

const SIGNAL_READERS = {
  governance:         readGovernance,
  continuity:         readContinuity,
  orgHealth:          readOrgHealth,
  predictiveRisk:     readPredictiveRisk,
  memoryIntelligence: readMemoryIntelligence,
  collaboration:      readCollaboration,
  domainIntelligence: readDomainIntelligence,
  accountability:     readAccountability,
  aiAdoption:         readAIAdoption,
  decisionQuality:    readDecisionQuality
}

// ─────────────────────────────────────────────
// CORE COMPUTATION
// ─────────────────────────────────────────────

async function computeBrainCore() {
  // Read all signals in parallel
  const rawSignals = await Promise.all(
    SIGNAL_CONFIG.map(async cfg => {
      const result = await SIGNAL_READERS[cfg.key]()
      return {
        key:          cfg.key,
        label:        cfg.label,
        weight:       cfg.weight,
        score:        result.score,
        contribution: Math.round(result.score * cfg.weight * 100) / 100,
        source:       result.source,
        verified:     result.verified
      }
    })
  )

  // Only verified signals contribute
  const verifiedSignals = rawSignals.filter(s => s.verified)

  // Weighted average
  const totalWeight = verifiedSignals.reduce((s, sig) => s + sig.weight, 0)
  const rawIndex = totalWeight > 0
    ? verifiedSignals.reduce((s, sig) => s + sig.contribution, 0) / totalWeight
    : 0

  const brainIndex = Math.round(rawIndex)

  // Posture
  const posture =
    brainIndex >= 80 ? 'STABLE'
    : brainIndex >= 60 ? 'STRAINED'
    : 'CRITICAL'

  // Top signals — lowest scores pull the posture down
  const topSignals = [...rawSignals]
    .filter(s => s.verified)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(s => {
      if (s.score <= 30) return `${s.label} is critically low at ${s.score}/100`
      if (s.score <= 55) return `${s.label} is weak at ${s.score}/100`
      return `${s.label} is moderate at ${s.score}/100`
    })

  // Summary
  const summary =
    posture === 'STABLE'
      ? 'The organization is operating within safe parameters. Verified intelligence signals are broadly healthy.'
      : posture === 'STRAINED'
      ? 'The organization is under structural strain. Multiple intelligence signals require attention before they compound.'
      : 'The organization is operating under elevated structural risk. Multiple verified intelligence signals confirm fragility across key dimensions.'

  // Explanation
  const lowest = [...rawSignals].sort((a, b) => a.score - b.score).slice(0, 3)
  const highest = [...rawSignals].sort((a, b) => b.score - a.score).slice(0, 2)

  const explanation = [
    `Brain Index was computed from ${verifiedSignals.length} verified signals across Modules M01–M26.`,
    `The three weakest signals dragging the score down were: ${lowest.map(s => `${s.label} (${s.score}/100)`).join(', ')}.`,
    `The two strongest positive signals were: ${highest.map(s => `${s.label} (${s.score}/100)`).join(', ')}.`,
    `With a total weighted index of ${brainIndex}/100, the operating posture is classified as ${posture}.`,
    posture === 'CRITICAL'
      ? 'Immediate executive intervention is required to address the structural fragility detected.'
      : posture === 'STRAINED'
      ? 'Targeted remediation of the weakest dimensions is recommended before posture degrades further.'
      : 'Continue monitoring. No immediate intervention required.'
  ].join(' ')

  return { brainIndex, posture, summary, topSignals, explanation, signals: rawSignals }
}

// ─────────────────────────────────────────────
// SNAPSHOT CACHE
// ─────────────────────────────────────────────

async function getOrComputeSnapshot() {
  // Return today's cached snapshot if available
  const today = new Date().toISOString().split('T')[0]

  const { data: cached } = await supabase
    .from('brain_core_snapshots')
    .select('*')
    .gte('computed_at', `${today}T00:00:00`)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) return { ...cached, fromCache: true }

  // Compute fresh
  const result = await computeBrainCore()

  const signalBreakdown = {}
  result.signals.forEach(s => {
    signalBreakdown[s.key] = {
      score: s.score, weight: s.weight,
      contribution: s.contribution, source: s.source
    }
  })

  const { data: saved } = await supabase
    .from('brain_core_snapshots')
    .insert({
      brain_index:      result.brainIndex,
      posture:          result.posture,
      summary:          result.summary,
      top_signals:      result.topSignals,
      explanation:      result.explanation,
      signal_breakdown: signalBreakdown
    })
    .select()
    .single()

  return { ...(saved ?? {}), ...result, fromCache: false }
}

// ─────────────────────────────────────────────
// GET /api/intelligence/brain-core
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const snapshot = await getOrComputeSnapshot()

    res.json({
      brainIndex:  snapshot.brain_index  ?? snapshot.brainIndex,
      posture:     snapshot.posture,
      summary:     snapshot.summary,
      topSignals:  snapshot.top_signals  ?? snapshot.topSignals,
      explanation: snapshot.explanation,
      fromCache:   snapshot.fromCache,
      computedAt:  snapshot.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/brain-core/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const snapshot = await getOrComputeSnapshot()

    res.json({
      brainIndex: snapshot.brain_index ?? snapshot.brainIndex,
      posture:    snapshot.posture,
      summary:    snapshot.summary,
      topSignals: snapshot.top_signals ?? snapshot.topSignals,
      computedAt: snapshot.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/brain-core/posture
// ─────────────────────────────────────────────

router.get('/posture', async (req, res) => {
  try {
    const snapshot = await getOrComputeSnapshot()

    res.json({
      posture:    snapshot.posture,
      brainIndex: snapshot.brain_index ?? snapshot.brainIndex
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/brain-core/signals
// ─────────────────────────────────────────────

router.get('/signals', async (req, res) => {
  try {
    // Always compute live for signals — never serve cached
    const result = await computeBrainCore()

    const sorted = [...result.signals].sort((a, b) => a.score - b.score)

    res.json({
      totalSignals:    result.signals.length,
      verifiedSignals: result.signals.filter(s => s.verified).length,
      brainIndex:      result.brainIndex,
      signals: sorted.map(s => ({
        label:        s.label,
        key:          s.key,
        score:        s.score,
        weight:       `${Math.round(s.weight * 100)}%`,
        contribution: s.contribution,
        source:       s.source,
        verified:     s.verified
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/brain-core/explanation
// ─────────────────────────────────────────────

router.get('/explanation', async (req, res) => {
  try {
    const result = await computeBrainCore()

    const byPosture = {
      STABLE:    'No immediate action required. Maintain current governance and monitoring cadence.',
      STRAINED:  'Targeted intervention recommended. Address the weakest 2–3 signals before they compound.',
      CRITICAL:  'Immediate executive intervention required. Structural fragility is confirmed across multiple dimensions.'
    }

    res.json({
      brainIndex:       result.brainIndex,
      posture:          result.posture,
      explanation:      result.explanation,
      recommendation:   byPosture[result.posture],
      signalSummary: result.signals
        .filter(s => s.verified)
        .sort((a, b) => a.score - b.score)
        .map(s => ({
          label:  s.label,
          score:  s.score,
          weight: `${Math.round(s.weight * 100)}%`,
          impact: s.score <= 30 ? 'HIGH DRAG' : s.score <= 55 ? 'MODERATE DRAG' : 'POSITIVE'
        }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router