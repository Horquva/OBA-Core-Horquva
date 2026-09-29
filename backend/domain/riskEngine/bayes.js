/**
 * ENGINE B — Asset failure probability via a discrete Bayesian belief network.
 * ============================================================================
 *
 * Replaces the legacy additive point table (RISK_FACTORS in derived.js), which
 * summed uncorrelated penalty points and clamped at 100. Instead, each asset's
 * evidence over four variables — Ownership resilience (O), Documentation
 * coverage (D), Runtime state (S), and upstream Cascading exposure (U, from
 * Engine A) — is evaluated against an 81-configuration conditional probability
 * table to produce an exact posterior over the asset's risk:
 *
 *     P(Nominal | o,d,s,u), P(Elevated | o,d,s,u), P(Critical | o,d,s,u)
 *
 * Because all four parents are always observed, inference is a direct CPT
 * lookup — there are no hidden variables. Variable elimination in the Python
 * reference (backend/risk_engine/) is used to VERIFY this table, not to run it.
 *
 * PROVENANCE (honesty rule — read before trusting these numbers):
 * The DAG shape follows the BBN operational-risk literature (arXiv:0906.3968,
 * arXiv:2505.06281). Every CPT value, the state spaces, the U evidence
 * variable, and the score weights below are AUTHORED design values for OBA
 * Core — not measurements, and not values from those papers. They are anchored
 * to four boundary conditions (see the anchor table in
 * docs/risk_engine_research/IMPLEMENTATION_PLAN_EXPANDED.md SPEC-2.2) and
 * generated deterministically by the two-stage chain below, so the whole tensor
 * is auditable from eight coefficients instead of 243 hand-typed numbers.
 *
 * Pure module: no I/O, no imports from derived.js (derived requires this one).
 */

// ─── CPT chain coefficients ──────────────────────────────────────────────────
//
// Step 1: P(Critical | o,d,s,u) = σ(zC − (dO·o + dD·d + dS·s + dU·u) / 2)
//   All-worst  (0,0,0,0): P(Critical) = σ(zC)             = 0.99
//   All-best   (2,2,2,2): P(Critical) = σ(zC − Σd)        = 0.005   (Σd = 9.8884)
//   (0,2,2,2)  unowned but documented:                     = 0.45
//   (0,0,2,2)  unowned and undocumented:                   = 0.88
//   The larger documentation coefficient against the shared logit scale is what
//   produces the plan's required non-linear compounding (0.45 → 0.88).
//
// Step 2: P(Elevated | ~Critical, o,d,s,u) = σ(zE − k·(Σd contribution) / 2)
//   All-worst: 0.9; all-best: 0.035/0.995 — k pins that second anchor.
// Step 3: P(Nominal) = 1 − P(Critical) − P(Elevated) (chain keeps the three
//   states a valid distribution and ordered by construction).
const CPT_COEFFS = {
  zC: Math.log(0.99 / 0.01), // 4.59512
  zE: Math.log(0.9 / 0.1),   // 2.19722
  k: 0.557098,
  dO: 5.0926,   // ownership is the dominant driver
  dD: 2.1931,   // documentation compounding
  dS: 1.55,     // observed runtime state
  dU: 1.0527,   // upstream cascade exposure (Engine A)
}

const SIGMOID = (z) => 1 / (1 + Math.exp(-z))

/** State index order for the target variable and every evidence variable. */
const RISK_STATES = ['Nominal', 'Elevated', 'Critical']

// ─── Tensor generation (memoized — the tensor is static for the process) ─────

let _tensor = null

/**
 * Builds the 81×3 CPT tensor, flattened as
 *   idx = ((o*3 + d)*3 + s)*3 + u,  values [pNominal, pElevated, pCritical].
 */
function buildTensor() {
  if (_tensor) return _tensor
  const { zC, zE, k, dO, dD, dS, dU } = CPT_COEFFS
  const tensor = new Float64Array(81 * 3)
  let i = 0
  for (let o = 0; o <= 2; o++) {
    for (let d = 0; d <= 2; d++) {
      for (let s = 0; s <= 2; s++) {
        for (let u = 0; u <= 2; u++) {
          const x = (dO * o + dD * d + dS * s + dU * u) / 2
          const pC = SIGMOID(zC - x)
          const pEnc = SIGMOID(zE - (k * dO * o + k * dD * d + k * dS * s + k * dU * u) / 2)
          const pE = pEnc * (1 - pC)
          tensor[i * 3] = 1 - pC - pE
          tensor[i * 3 + 1] = pE
          tensor[i * 3 + 2] = pC
          i++
        }
      }
    }
  }
  _tensor = tensor
  return tensor
}

/** Flattened-tensor index for an evidence configuration. */
function tensorIndex(o, d, s, u) {
  return ((o * 3 + d) * 3 + s) * 3 + u
}

// ─── Score & bands ───────────────────────────────────────────────────────────

// Bands the posterior score onto the same four-step label the legacy table
// used, so every consumer of `threatLevel` (there are ~15) keeps working and
// the word attached to a number keeps meaning the same thing. Canonical home
// of the 35/55/75 thresholds — derived.js's threatLevel() delegates here.
const THREAT_BANDS = { CRITICAL: 75, HIGH: 55, MEDIUM: 35 }

function threatLevelFor(score) {
  if (score >= THREAT_BANDS.CRITICAL) return 'CRITICAL'
  if (score >= THREAT_BANDS.HIGH) return 'HIGH'
  if (score >= THREAT_BANDS.MEDIUM) return 'MEDIUM'
  return 'LOW'
}

/**
 * Unified 0-100 score from the posterior. 100·P(Critical) + 45·P(Elevated):
 * a certainly-critical asset reads 100, a certainly-elevated one 45, and the
 * all-best boundary (0.005/0.035) reads 2 — the floor is deliberately not 0,
 * because nothing is ever risk-free. [AUTHORED weights, per the plan.]
 */
function scoreFromPosterior(pC, pE) {
  return Math.round(100 * pC + 45 * pE)
}

// ─── Posterior, attribution, reasons ─────────────────────────────────────────

/**
 * Exact posterior + glass-box attribution for one evidence configuration.
 *
 * `ev` = { ownership, documentation, runtime_state, cascade_exposure }, each
 * 0..2 (SPEC-1 in the expanded plan). Attribution(X) is the score the asset
 * would shed if X were counterfactually restored to its optimal state (2):
 *
 *     attribution(X) = max(0, score(e) − score(e with X←2))
 *
 * These are NOT additive points and do not sum to the score — factor
 * interactions are real, and the legacy identity `score = Σ factors` was the
 * bug this engine replaces. The four values are comparable magnitudes on the
 * same 0-100 scale.
 */
function scoreAgent(ev) {
  const tensor = buildTensor()
  const base = tensorIndex(ev.ownership, ev.documentation, ev.runtime_state, ev.cascade_exposure)
  const pN = tensor[base * 3]
  const pE = tensor[base * 3 + 1]
  const pC = tensor[base * 3 + 2]
  const predictedScore = scoreFromPosterior(pC, pE)

  // Counterfactual restorations, each a direct lookup.
  const restore = (restoreO, restoreD, restoreS, restoreU) => {
    const idx = tensorIndex(
      restoreO ? 2 : ev.ownership,
      restoreD ? 2 : ev.documentation,
      restoreS ? 2 : ev.runtime_state,
      restoreU ? 2 : ev.cascade_exposure,
    )
    return scoreFromPosterior(tensor[idx * 3 + 2], tensor[idx * 3 + 1])
  }
  const attribution = {
    ownership: Math.max(0, predictedScore - restore(true, false, false, false)),
    documentation: Math.max(0, predictedScore - restore(false, true, false, false)),
    runtime_state: Math.max(0, predictedScore - restore(false, false, true, false)),
    cascade_exposure: Math.max(0, predictedScore - restore(false, false, false, true)),
  }

  return {
    pNominal: pN,
    pElevated: pE,
    pCritical: pC,
    predictedScore,
    threatLevel: threatLevelFor(predictedScore),
    attribution,
  }
}

/**
 * Human-readable reasons for the non-optimal evidence states, in the same
 * O/D/S/U order as the attribution keys (frontend renders them side by side).
 * Only states below 2 get a line — "active and evidenced" is not a finding.
 */
function reasonsFor(ev) {
  const reasons = []
  if (ev.ownership === 0) reasons.push('has no named owner at all')
  else if (ev.ownership === 1) {
    reasons.push(`${ev.ownerName || 'the owner'} is the only named owner and has no backup`)
  }
  if (ev.documentation === 0) reasons.push('has no documented knowledge assets')
  else if (ev.documentation === 1) {
    reasons.push(`${ev.docTotal - ev.docDocumented} of ${ev.docTotal} knowledge asset(s) undocumented`)
  }
  if (ev.runtime_state === 0) reasons.push('currently in a failed state')
  else if (ev.runtime_state === 1) reasons.push('currently inactive')
  if (ev.cascade_exposure === 0) reasons.push('under high cascade pressure from upstream dependencies')
  else if (ev.cascade_exposure === 1) reasons.push('under moderate cascade pressure from upstream dependencies')
  return reasons
}

// ─── Engine A → U mapping ────────────────────────────────────────────────────

// Upstream cascading exposure thresholds on Engine A's steady-state score
// r_i. [AUTHORED, per the plan — the eIRWR paper outputs a root-cause ranking,
// not a per-node exposure band.] r > 0.40 means meaningful failure mass is
// arriving from upstream dependencies.
const U_THRESHOLDS = { HIGH: 0.4, MODERATE: 0.15 }

function exposureState(r) {
  if (r > U_THRESHOLDS.HIGH) return 0 // HighExposure
  if (r > U_THRESHOLDS.MODERATE) return 1 // ModerateExposure
  return 2 // Protected
}

module.exports = {
  CPT_COEFFS,
  RISK_STATES,
  THREAT_BANDS,
  U_THRESHOLDS,
  buildTensor,
  tensorIndex,
  threatLevelFor,
  scoreFromPosterior,
  scoreAgent,
  reasonsFor,
  exposureState,
}
