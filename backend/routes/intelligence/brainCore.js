const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')

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
//
// `verified: false` means "no row on record" and ONLY that. It used to also
// absorb every query failure: these readers destructured just `{ data }`, so a
// dropped table or an RLS rejection produced data:null, verified:false, and the
// signal was silently dropped from the weighted average while the remaining
// signals were renormalized. The headline Brain Index then changed composition
// with nothing anywhere saying so.
//
// Now the readers use must(), so a broken query throws; readSignal() below
// catches it and marks the signal `unavailable` with the real error, which
// computeBrainCore() reports as a degraded result. Missing rows still degrade
// gracefully — a Supabase failure is no longer able to impersonate one.
// ─────────────────────────────────────────────

async function readGovernance() {
  const data = await must('intelligence_results (GI)', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'GI')
    .maybeSingle())

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readContinuity() {
  const data = await must('org_health_snapshots (continuity)', supabase
    .from('org_health_snapshots')
    .select('continuity_score')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .maybeSingle())

  return { score: data?.continuity_score ?? 0, source: 'org_health_snapshots', verified: !!data }
}

async function readOrgHealth() {
  const data = await must('org_health_snapshots (health_index)', supabase
    .from('org_health_snapshots')
    .select('health_index')
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .maybeSingle())

  return { score: data?.health_index ?? 0, source: 'org_health_snapshots', verified: !!data }
}

async function readPredictiveRisk() {
  // Invert: more CRITICAL agents = lower score
  const data = await must('predictive_risk_scores', supabase
    .from('predictive_risk_scores')
    .select('threat_level'))

  if (!data.length) return { score: 0, source: 'predictive_risk_scores', verified: false }

  const criticalCount = data.filter(p => p.threat_level === 'CRITICAL').length
  const safeRatio = (data.length - criticalCount) / data.length
  const score = Math.round(safeRatio * 100)

  return { score, source: 'predictive_risk_scores', verified: true }
}

async function readMemoryIntelligence() {
  const data = await must('intelligence_results (MI)', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'MI')
    .maybeSingle())

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readCollaboration() {
  const data = await must('collaboration_summary (collaboration)', supabase
    .from('collaboration_summary')
    .select('collaboration_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  return { score: data?.collaboration_score ?? 0, source: 'collaboration_summary', verified: !!data }
}

async function readDomainIntelligence() {
  const data = await must('intelligence_results (DI)', supabase
    .from('intelligence_results')
    .select('score')
    .eq('result_type', 'pillar')
    .eq('result_key', 'DI')
    .maybeSingle())

  return { score: data?.score ?? 0, source: 'intelligence_results', verified: !!data }
}

async function readAccountability() {
  const data = await must('accountability_summary', supabase
    .from('accountability_summary')
    .select('accountability_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  return { score: data?.accountability_score ?? 0, source: 'accountability_summary', verified: !!data }
}

async function readAIAdoption() {
  const data = await must('collaboration_summary (ai_adoption)', supabase
    .from('collaboration_summary')
    .select('ai_adoption_score')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  return { score: data?.ai_adoption_score ?? 0, source: 'collaboration_summary', verified: !!data }
}

async function readDecisionQuality() {
  // Score = % of historical decisions that were not negative
  const data = await must('decision_history', supabase
    .from('decision_history')
    .select('outcome'))

  if (!data.length) return { score: 50, source: 'decision_history', verified: false }

  const negative = data.filter(d => d.outcome === 'negative').length
  const score = Math.round(((data.length - negative) / data.length) * 100)

  return { score, source: 'decision_history', verified: true }
}

/**
 * Run one signal reader, turning a query failure into an explicit `unavailable`
 * marker rather than an indistinguishable zero. One broken table must not dark
 * the whole dashboard — ten independent signals means nine are still real — but
 * it must not be invisible either.
 */
async function readSignal(key, reader) {
  try {
    return await reader()
  } catch (err) {
    console.error(`[brainCore] signal '${key}' unavailable: ${err.message}`)
    return { score: 0, source: null, verified: false, unavailable: true, error: err.message }
  }
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
      const result = await readSignal(cfg.key, SIGNAL_READERS[cfg.key])
      return {
        key:          cfg.key,
        label:        cfg.label,
        weight:       cfg.weight,
        score:        result.score,
        contribution: Math.round(result.score * cfg.weight * 100) / 100,
        source:       result.source,
        verified:     result.verified,
        unavailable:  !!result.unavailable,
        error:        result.error ?? null
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

  // A signal excluded because its query FAILED is a different fact from one
  // excluded because no row is seeded, and consumers of a headline score need to
  // be able to tell. Without this, a partial Supabase outage silently changed
  // which signals composed the Brain Index.
  const unavailable = rawSignals.filter(s => s.unavailable)
  const dataIntegrity = {
    degraded: unavailable.length > 0,
    signalsRead: rawSignals.length,
    signalsVerified: verifiedSignals.length,
    signalsUnavailable: unavailable.length,
    unavailableSignals: unavailable.map(s => ({ key: s.key, label: s.label, error: s.error })),
    warning: unavailable.length
      ? `${unavailable.length} of ${rawSignals.length} signals could not be read. This index was computed from the rest and is NOT a complete picture.`
      : null,
  }

  return { brainIndex, posture, summary, topSignals, explanation, signals: rawSignals, dataIntegrity }
}

// ─────────────────────────────────────────────
// SNAPSHOT CACHE
// ─────────────────────────────────────────────

async function getOrComputeSnapshot() {
  // Return today's cached snapshot if available. A failed cache read is
  // genuinely non-fatal — recomputing live is the correct fallback — so this is
  // `optional`, which logs the real error instead of discarding it.
  const today = new Date().toISOString().split('T')[0]

  const cached = await optional('brain_core_snapshots (cache read)', supabase
    .from('brain_core_snapshots')
    .select('*')
    .gte('computed_at', `${today}T00:00:00`)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (cached) return { ...cached, fromCache: true }

  // Compute fresh
  const result = await computeBrainCore()

  // Never cache an incomplete index. Persisting a degraded result would pin a
  // number computed from a partial outage for the rest of the day, long after
  // the outage cleared.
  if (result.dataIntegrity.degraded) {
    console.warn('[brainCore] not caching a degraded snapshot —', result.dataIntegrity.warning)
    return { ...result, fromCache: false, computed_at: new Date().toISOString() }
  }

  const signalBreakdown = {}
  result.signals.forEach(s => {
    signalBreakdown[s.key] = {
      score: s.score, weight: s.weight,
      contribution: s.contribution, source: s.source
    }
  })

  const { data: saved, error: saveError } = await supabase
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

  // The computed answer is still valid if only the write failed — return it,
  // but do not let the write failure pass unremarked.
  if (saveError) {
    console.warn(`[brainCore] failed to persist snapshot: ${saveError.message}`)
  }

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
      computedAt:  snapshot.computed_at,
      // Absent on a cache hit — a cached snapshot is only ever written when the
      // read was complete, so there is no degradation to report.
      dataIntegrity: snapshot.dataIntegrity ?? null
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
      computedAt: snapshot.computed_at,
      dataIntegrity: snapshot.dataIntegrity ?? null
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
      brainIndex: snapshot.brain_index ?? snapshot.brainIndex,
      dataIntegrity: snapshot.dataIntegrity ?? null
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
      dataIntegrity:   result.dataIntegrity,
      signals: sorted.map(s => ({
        label:        s.label,
        key:          s.key,
        score:        s.score,
        weight:       `${Math.round(s.weight * 100)}%`,
        contribution: s.contribution,
        source:       s.source,
        verified:     s.verified,
        // Distinguishes "no row seeded" (verified:false, unavailable:false)
        // from "this query failed" (unavailable:true, with the error).
        unavailable:  s.unavailable,
        error:        s.error
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
      dataIntegrity:    result.dataIntegrity,
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