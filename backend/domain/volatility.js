/**
 * FEATURE 3 / Longitudinal Volatility Intelligence (Phase 3.3).
 * ============================================================================
 *
 * NOT a separate engine — a longitudinal analytics layer over the rows
 * Feature 3's mutation layer writes to dependency_change_log. Answers "how
 * is our fragility moving over time?" with the standard SPC instruments:
 *
 *   - Churn velocity: mutations per day, weighted by |ΔOHI|/10 + 1 (a
 *     health-neutral rename and a −14-point owner removal are not the same
 *     amount of churn), smoothed with an EWMA (λ = 0.3 [AUTHORED]).
 *   - CUSUM drift detection on the daily counts: standardized positive
 *     CUSUM with the classic k = 0.5, h = 5 settings (NIST/SEMATECH §6.3.2)
 *     — fires on SUSTAINED drift, not on one spike.
 *   - Risk trajectory: the ΔOHI series — net exposure change, direction
 *     split (damage events vs improvements), and the single worst event.
 *
 * Windows: rolling 7-day (operational) and 30-day (executive). Zero rows in
 * a window → insufficient_evidence for that window per the Ironclad rule —
 * never a fabricated "all quiet".
 *
 * Academic framing: dynamic-graph change-point detection (arXiv:2007.01229);
 * the instruments themselves are deliberately closed-form (EWMA/CUSUM), so
 * every number in the briefing is explainable. Pure: no I/O — callers pass
 * the org-scoped change-log rows.
 */

const EWMA_LAMBDA = 0.3
const CUSUM_K = 0.5
const CUSUM_H = 5

const dayKey = (iso) => String(iso).slice(0, 10)

function ewma(series, lambda = EWMA_LAMBDA) {
  if (!series.length) return 0
  let s = series[0]
  for (let i = 1; i < series.length; i++) s = lambda * series[i] + (1 - lambda) * s
  return s
}

/**
 * Standardized positive CUSUM with a split-window baseline: the FIRST half
 * of the series is the in-control reference, the SECOND half is monitored.
 * Basing mean/std on the whole series lets a real shift inflate its own
 * variance and hide (a 60/40 split is undetectable that way). This is the
 * change-point framing — "is the recent period drifting above the preceding
 * norm?" — matching the briefing's question. k = 0.5, h = 5 (NIST/SEMATECH
 * §6.3.2); fires on SUSTAINED drift, never on one spike.
 */
function cusum(series, { k = CUSUM_K, h = CUSUM_H } = {}) {
  const n = series.length
  if (n < 6) return { alert: false, maxC: 0, baseline: 0 }
  const half = Math.floor(n / 2)
  const base = series.slice(0, half)
  const monitored = series.slice(half)
  const mean = base.reduce((a, b) => a + b, 0) / base.length
  const variance = base.reduce((a, b) => a + (b - mean) * (b - mean), 0) / base.length
  const std = Math.sqrt(variance)
  if (std === 0) {
    // Degenerate baseline (perfectly flat): any monitored point above it is
    // drift. Standardize by the mean's magnitude instead of the std.
    const scale = Math.abs(mean) || 1
    let c = 0
    let maxC = 0
    for (const x of monitored) {
      c = Math.max(0, c + (x - mean) / scale - k)
      if (c > maxC) maxC = c
    }
    return { alert: maxC > h, maxC: Math.round(maxC * 100) / 100, baseline: Math.round(mean * 100) / 100 }
  }
  let c = 0
  let maxC = 0
  for (const x of monitored) {
    c = Math.max(0, c + (x - mean) / std - k)
    if (c > maxC) maxC = c
  }
  return { alert: maxC > h, maxC: Math.round(maxC * 100) / 100, baseline: Math.round(mean * 100) / 100 }
}

/** Builds a contiguous day-series (oldest → newest) of weighted churn. */
function dailySeries(rows, days, weightOf) {
  const counts = new Map()
  for (const row of rows) {
    const key = dayKey(row.created_at)
    counts.set(key, (counts.get(key) || 0) + weightOf(row))
  }
  const series = []
  const end = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    series.push({ day: key, value: counts.get(key) || 0 })
  }
  return series
}

const weightOf = (row) => 1 + Math.abs(Number(row.health_delta) || 0) / 10

/**
 * Computes the volatility briefing for one window.
 * @param {Array} rows org-scoped dependency_change_log rows (any order)
 * @param {number} days window length (7 or 30)
 */
function windowBriefing(rows, days) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)
  const inWindow = rows.filter((r) => new Date(r.created_at) >= since)
  if (inWindow.length === 0) {
    return { windowDays: days, status: 'insufficient_evidence', materialChanges: 0 }
  }

  const series = dailySeries(inWindow, days, weightOf)
  const values = series.map((d) => d.value)
  const velocity = Math.round(ewma(values) * 100) / 100
  const drift = cusum(values)

  // Risk trajectory — ΔOHI series (damage events carry health_delta > 0:
  // the impact engine's convention is "points WORSE").
  const deltas = inWindow.map((r) => Number(r.health_delta) || 0)
  const netExposureChange = Math.round(deltas.reduce((a, b) => a + b, 0) * 10) / 10
  const damaging = inWindow.filter((r) => (Number(r.health_delta) || 0) > 0)
  const improving = inWindow.filter((r) => (Number(r.health_delta) || 0) < 0)
  const worst = inWindow.reduce((worstRow, r) => {
    const v = Math.abs(Number(r.health_delta) || 0)
    return !worstRow || v > Math.abs(Number(worstRow.health_delta) || 0) ? r : worstRow
  }, null)

  const baselineMean = values.reduce((a, b) => a + b, 0) / values.length
  const velocityBand = velocity > baselineMean * 1.5 && baselineMean > 0 ? 'HIGH'
    : velocity < baselineMean * 0.75 || baselineMean === 0 ? 'LOW' : 'MODERATE'

  return {
    windowDays: days,
    status: 'computed',
    materialChanges: inWindow.length,
    outOfBand: inWindow.filter((r) => r.mutation_type === 'OUT_OF_BAND').length,
    velocity,
    velocityBand,
    drift: { alert: drift.alert, maxC: drift.maxC },
    risk: {
      netExposureChange,
      damagingEvents: damaging.length,
      improvingEvents: improving.length,
      worstEvent: worst ? {
        mutationType: worst.mutation_type,
        targetType: worst.target_type,
        targetId: worst.target_id,
        healthDelta: Number(worst.health_delta),
        mitigation: worst.mitigation,
        createdAt: worst.created_at,
      } : null,
    },
  }
}

/**
 * Full volatility read: rolling 7-day + 30-day briefings.
 * @param {Array} rows org-scoped dependency_change_log rows
 */
function volatility(rows) {
  const week = windowBriefing(rows || [], 7)
  const month = windowBriefing(rows || [], 30)
  return {
    week,
    month,
    constants: { EWMA_LAMBDA, CUSUM_K, CUSUM_H },
  }
}

module.exports = { volatility, windowBriefing, ewma, cusum, EWMA_LAMBDA, CUSUM_K, CUSUM_H }
