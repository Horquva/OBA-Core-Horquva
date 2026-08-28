const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { optional } = require('../../lib/supabaseQuery')
const domain = require('../../domain')

// ─────────────────────────────────────────────
// SIGNAL WEIGHTS  (must sum to 1.0)
// ─────────────────────────────────────────────

const SIGNAL_CONFIG = [
  { key: 'governance',         label: 'Governance Score',            weight: 0.15 },
  { key: 'continuity',         label: 'Continuity Resilience',       weight: 0.15 },
  { key: 'orgHealth',          label: 'Organizational Health',       weight: 0.15 },
  { key: 'predictiveRisk',     label: 'Predictive Risk (inverted)',  weight: 0.15 },
  { key: 'memoryIntelligence', label: 'Management Intelligence',     weight: 0.10 },
  { key: 'collaboration',      label: 'Collaboration Score',         weight: 0.10 },
  { key: 'domainIntelligence', label: 'Data Intelligence',           weight: 0.08 },
  { key: 'accountability',     label: 'Accountability Score',        weight: 0.07 },
  { key: 'aiAdoption',         label: 'AI Adoption Score',           weight: 0.03 },
  { key: 'decisionQuality',    label: 'Decision Quality',            weight: 0.02 }
]

// ─────────────────────────────────────────────
// SIGNAL READERS  — each returns { score, source, verified }
//
// `verified: false` means "nothing on record to score" and ONLY that. It must
// never absorb a failure: an earlier version let a dropped table produce
// verified:false, which silently removed that signal from the weighted average
// and renormalized the rest, so the headline Brain Index quietly changed
// composition with nothing anywhere saying so. readSignal() below keeps the two
// apart — a thrown error becomes `unavailable`, which computeBrainCore()
// reports as degraded.
// ─────────────────────────────────────────────

// Every signal below is a PROJECTION of one live computation, not a table read.
//
// These ten readers used to query eight different pre-aggregated tables. Six of
// those were seeded once by SQL and written by nothing afterwards, so the Brain
// Index was a weighted average of numbers that could not change — and because
// this route stamps its snapshot with `computed_at: now()`, a fortnight-old
// input came back out wearing today's date. The freshness was manufactured here.
//
// `domain.intelligence.all()` computes all of it from the root tables on
// demand. See domain/derived.js for each metric's definition, and note that the
// GI/MI/DI pillars are authored measures rather than recovered ones.

function pillarScore(intel, key) {
  const found = (intel.pillars.pillars || []).find((p) => p.resultKey === key)
  return found
    ? { score: found.score, source: `domain.intelligence.pillars(${key})`, verified: true }
    : { score: 0, source: `domain.intelligence.pillars(${key})`, verified: false }
}

const SIGNAL_READERS = {
  governance:         (intel) => pillarScore(intel, 'GI'),
  memoryIntelligence: (intel) => pillarScore(intel, 'MI'),
  domainIntelligence: (intel) => pillarScore(intel, 'DI'),

  continuity: (intel) => ({
    score: intel.orgHealth.continuityScore,
    source: 'domain.intelligence.orgHealth',
    verified: true,
  }),

  orgHealth: (intel) => ({
    score: intel.orgHealth.healthIndex,
    source: 'domain.intelligence.orgHealth',
    verified: true,
  }),

  // Inverted: more CRITICAL agents means a lower score.
  predictiveRisk: (intel) => {
    const scores = intel.predictiveRisk.scores
    if (!scores.length) {
      return { score: 0, source: 'domain.intelligence.predictiveRisk', verified: false }
    }
    const critical = scores.filter((s) => s.threatLevel === 'CRITICAL').length
    return {
      score: Math.round(((scores.length - critical) / scores.length) * 100),
      source: 'domain.intelligence.predictiveRisk',
      verified: true,
    }
  },

  collaboration: (intel) => ({
    score: intel.collaboration.summary.collaborationScore,
    source: 'domain.intelligence.collaboration',
    verified: intel.collaboration.perEmployee.length > 0,
  }),

  accountability: (intel) => ({
    score: intel.accountability.accountabilityScore,
    source: 'domain.intelligence.accountability',
    verified: intel.accountability.entitiesWithLinks > 0,
  }),

  aiAdoption: (intel) => ({
    score: intel.collaboration.summary.aiAdoptionScore,
    source: 'domain.intelligence.collaboration',
    verified: intel.collaboration.perEmployee.length > 0,
  }),

  decisionQuality: (intel) => ({
    score: intel.decisionQuality.score,
    source: 'domain.intelligence.decisionQuality',
    verified: intel.decisionQuality.evidence.sufficient,
  }),
}

/**
 * Run one signal reader, turning a query failure into an explicit `unavailable`
 * marker rather than an indistinguishable zero. One broken table must not dark
 * the whole dashboard — ten independent signals means nine are still real — but
 * it must not be invisible either.
 */
async function readSignal(key, reader, intel) {
  try {
    return await reader(intel)
  } catch (err) {
    console.error(`[brainCore] signal '${key}' unavailable: ${err.message}`)
    return { score: 0, source: null, verified: false, unavailable: true, error: err.message }
  }
}


// ─────────────────────────────────────────────
// CORE COMPUTATION
// ─────────────────────────────────────────────

async function computeBrainCore() {
  // ONE computation, shared by all ten signals. Reading them independently
  // would let two signals in the same Brain Index describe the organization at
  // two different moments — and would multiply eighteen root reads by ten.
  const intel = await domain.intelligence.all()

  const rawSignals = await Promise.all(
    SIGNAL_CONFIG.map(async cfg => {
      const result = await readSignal(cfg.key, SIGNAL_READERS[cfg.key], intel)
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

  // Only verified signals are shown in the diagnostic breakdown below —
  // the headline number is intel.pillars.orgScore, not a weighted vote of
  // these 10 signals (D-02, D-17; this is the same fix as orchestrator.js's,
  // for the second of the two OIS-shaped composites the pre-existing
  // brain-as-library-design.md's open question 3 named as a pair).
  const verifiedSignals = rawSignals.filter(s => s.verified)

  // A signal excluded because its query FAILED is a different fact from one
  // excluded because no row is seeded, and consumers of a headline score need to
  // be able to tell. Without this, a partial Supabase outage silently changed
  // which signals composed the Brain Index.
  const unavailable = rawSignals.filter(s => s.unavailable)

  // Integrity has TWO axes, and this used to track only one.
  //
  // `degraded` answered "did a query fail?" — pure reachability. A row that read
  // back perfectly counted as verified no matter how old it was, so the six
  // never-written tables that fed this index scored a clean bill of health
  // every single time. The metric that existed to catch bad inputs was
  // structurally incapable of noticing the actual problem.
  //
  // `computedAt` closes that: every signal now derives from a computation with
  // a real timestamp, so freshness is a fact about this response rather than
  // something a reader has to take on trust.
  const dataIntegrity = {
    degraded: unavailable.length > 0,
    signalsRead: rawSignals.length,
    signalsVerified: verifiedSignals.length,
    signalsUnavailable: unavailable.length,
    unavailableSignals: unavailable.map(s => ({ key: s.key, label: s.label, error: s.error })),
    computedAt: intel.computedAt,
    inputsComputedLive: true,
    rootCounts: intel.rootCounts,
    warning: unavailable.length
      ? `${unavailable.length} of ${rawSignals.length} signals could not be read. This index was computed from the rest and is NOT a complete picture.`
      : null,
  }

  // Same gate orchestrator.js applies to this identical intel.pillars.orgScore
  // input (D-07, D-10, D-22): when evidence coverage is insufficient, orgScore
  // is `null`. Without this guard, `brainIndex >= 80` and `>= 60` both compare
  // false against null, so an insufficient-evidence organization fell through
  // to the final `: 'CRITICAL'` branch by construction — reporting elevated
  // structural risk from an absence of evidence, the exact fabricated-verdict
  // failure the evidence gate exists to prevent. Short-circuit to an
  // explanatory verdict instead of computing a posture from a score that was
  // never published, exactly as orchestrator.js already does for the same input.
  const orgScoreEvidence = intel.pillars.orgScore.evidence
  if (!orgScoreEvidence.sufficient) {
    return {
      brainIndex: null,
      posture: null,
      summary: `Insufficient evidence to compute a Brain Index — ${Math.round((orgScoreEvidence.coverage ?? 0) * 100)}% coverage on at least one pillar. See evidence for detail.`,
      topSignals: [],
      explanation: 'No Brain Index was computed this run because evidence coverage was insufficient on at least one pillar.',
      signals: rawSignals,
      dataIntegrity,
      evidence: orgScoreEvidence,
    }
  }

  const brainIndex = intel.pillars.orgScore.score

  // Posture keeps its own STABLE/STRAINED/CRITICAL vocabulary — only what
  // feeds it changed.
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
    `Brain Index is the organization's weighted pillar score (Governance, Management and Data Intelligence) — the ${verifiedSignals.length} verified signals below explain what is contributing to it, they do not compute it.`,
    `The three weakest signals dragging the score down were: ${lowest.map(s => `${s.label} (${s.score}/100)`).join(', ')}.`,
    `The two strongest positive signals were: ${highest.map(s => `${s.label} (${s.score}/100)`).join(', ')}.`,
    `With a total weighted index of ${brainIndex}/100, the operating posture is classified as ${posture}.`,
    posture === 'CRITICAL'
      ? 'Immediate executive intervention is required to address the structural fragility detected.'
      : posture === 'STRAINED'
      ? 'Targeted remediation of the weakest dimensions is recommended before posture degrades further.'
      : 'Continue monitoring. No immediate intervention required.'
  ].join(' ')

  return { brainIndex, posture, summary, topSignals, explanation, signals: rawSignals, dataIntegrity, evidence: orgScoreEvidence }
}

// ─────────────────────────────────────────────
// SNAPSHOT CACHE
// ─────────────────────────────────────────────

/**
 * Integrity for a response, whether it was just computed or read from today's
 * cached snapshot.
 *
 * A cache hit used to report `dataIntegrity: null`, on the reasoning that a
 * snapshot is only ever written when every read succeeded, so there is no
 * degradation to report. That is still true of the REACHABILITY axis — and
 * false of the freshness one. A snapshot cached at 02:00 is a real answer about
 * 02:00, and reporting nothing at all is how a stale number passes for a fresh
 * one. Age is now always reported, and it is the cached path that most needs to
 * report it.
 */
function integrityFor(snapshot) {
  if (snapshot.dataIntegrity) return snapshot.dataIntegrity
  return {
    degraded: false,
    fromCache: true,
    computedAt: snapshot.computed_at ?? null,
    warning: null,
  }
}

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

  // Never cache an incomplete OR insufficiently-evidenced index. Persisting a
  // degraded result would pin a number computed from a partial outage for the
  // rest of the day, long after the outage cleared; persisting an insufficient-
  // evidence result (brainIndex/posture both null, since the evidence guard
  // above short-circuits before either is computed) would pin that null for the
  // rest of the day even after coverage improves. Same reasoning orchestrator.js
  // already applies to the identical evidence input.
  if (result.dataIntegrity.degraded || !result.evidence.sufficient) {
    if (!result.evidence.sufficient) {
      console.warn('[brainCore] not caching an insufficient-evidence snapshot')
    } else {
      console.warn('[brainCore] not caching a degraded snapshot —', result.dataIntegrity.warning)
    }
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
      dataIntegrity: integrityFor(snapshot)
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
      dataIntegrity: integrityFor(snapshot)
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
      dataIntegrity: integrityFor(snapshot)
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