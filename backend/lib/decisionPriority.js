/*
 * OBA Core — shared scoring for decision_queue.
 *
 * pending_decisions and decision_queue were two independently-seeded tables
 * answering the exact same question ("what needs a decision right now?") --
 * checked row by row, every one of pending_decisions' 7 rows had a matching
 * (and richer) counterpart in decision_queue's 9. Owner decision, 2026-09-18:
 * merge onto decision_queue, the superset. See
 * sql/18_drop_superseded_pending_decisions.sql.
 *
 * computePriorityScore() was previously a private copy inside
 * routes/decisionSupport/decisionSupport.js; every other former reader of
 * pending_decisions (briefing.js, voice.js, automation/index.js, context.js)
 * needs the same score decision_queue's own page already uses, not a second
 * invented formula.
 */

function computePriorityScore(impact, urgency, effort, blastRadius) {
  return Math.round(
    (impact * 0.40) +
    (urgency * 0.35) +
    ((100 - effort) * 0.15) +
    (blastRadius * 0.10)
  )
}

/**
 * Bands a 0-100 priority score into the critical/high/medium/low vocabulary
 * pending_decisions used to carry as a hand-picked column. Not a byte-for-byte
 * reproduction of those old labels -- checked against the old seed data, the
 * two tables' hand-authored priorities weren't even consistent with a strict
 * ranking by this score (an 88 was labelled "high", an 80 was labelled
 * "critical") -- so deriving it consistently from the one real score is more
 * honest than preserving labels that disagreed with each other.
 */
function priorityLabel(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

const DRIVER_LABELS = {
  spof: 'Single Point of Failure',
  active_incident: 'Active Incident',
  undocumented_knowledge: 'Undocumented Knowledge',
  other: 'Other',
}

function driverLabel(driver) {
  return DRIVER_LABELS[driver] ?? driver
}

module.exports = { computePriorityScore, priorityLabel, driverLabel }
