const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { optional } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function computePriorityScore(impact, urgency, effort, blastRadius) {
  return Math.round(
    (impact * 0.40) +
    (urgency * 0.35) +
    ((100 - effort) * 0.15) +
    (blastRadius * 0.10)
  )
}

async function fetchQueue(filterStatus = null, filterDriver = null) {
  let query = supabase
    .from('decision_queue')
    .select('*')

  if (filterStatus) query = query.eq('status', filterStatus)
  if (filterDriver) query = query.eq('driver', filterDriver)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return data
    .map(d => ({
      ...d,
      priority_score: computePriorityScore(
        d.impact_score,
        d.urgency_score,
        d.effort_score,
        d.blast_radius
      )
    }))
    .sort((a, b) => b.priority_score - a.priority_score)
}

function driverLabel(driver) {
  const labels = {
    spof:                   'Single Point of Failure',
    active_incident:        'Active Incident',
    undocumented_knowledge: 'Undocumented Knowledge',
    other:                  'Other'
  }
  return labels[driver] ?? driver
}

// ─────────────────────────────────────────────
// GET /api/decision-support/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const queue = await fetchQueue()

    const total = queue.length
    const pending = queue.filter(d => d.status === 'pending').length
    const inProgress = queue.filter(d => d.status === 'in_progress').length
    const resolved = queue.filter(d => d.status === 'resolved').length

    const byDriver = queue.reduce((acc, d) => {
      acc[d.driver] = (acc[d.driver] || 0) + 1
      return acc
    }, {})

    const topDecision = queue[0]

    const history = await optional('decision_history(revisit_flags)', supabase
      .from('decision_history')
      .select('outcome, should_revisit'), [])

    const revisitCount = history.filter(h => h.should_revisit).length

    res.json({
      totalDecisions: total,
      pending,
      inProgress,
      resolved,
      decisionsToRevisit: revisitCount,
      topPriorityDecision: topDecision
        ? {
            title: topDecision.title,
            priorityScore: topDecision.priority_score,
            driver: driverLabel(topDecision.driver),
            entityName: topDecision.entity_name,
            responsiblePerson: topDecision.responsible_person
          }
        : null,
      byDriver: Object.entries(byDriver).map(([driver, count]) => ({
        driver: driverLabel(driver),
        count
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decision-support/queue
// ─────────────────────────────────────────────

router.get('/queue', async (req, res) => {
  try {
    const queue = await fetchQueue('pending')

    res.json({
      totalPending: queue.length,
      decisions: queue.map(d => ({
        title: d.title,
        description: d.description,
        driver: driverLabel(d.driver),
        priorityScore: d.priority_score,
        impactScore: d.impact_score,
        urgencyScore: d.urgency_score,
        effortScore: d.effort_score,
        blastRadius: d.blast_radius,
        entityName: d.entity_name,
        responsiblePerson: d.responsible_person,
        status: d.status
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decision-support/top-actions
// ─────────────────────────────────────────────

router.get('/top-actions', async (req, res) => {
  try {
    const queue = await fetchQueue('pending')
    const top = queue.slice(0, 5)

    res.json({
      topActions: top.map((d, i) => ({
        rank: i + 1,
        title: d.title,
        driver: driverLabel(d.driver),
        priorityScore: d.priority_score,
        entityName: d.entity_name,
        responsiblePerson: d.responsible_person,
        blastRadius: d.blast_radius
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decision-support/drivers
// ─────────────────────────────────────────────

router.get('/drivers', async (req, res) => {
  try {
    const queue = await fetchQueue()

    const drivers = ['spof', 'active_incident', 'undocumented_knowledge', 'other']

    const grouped = drivers.map(driver => {
      const items = queue.filter(d => d.driver === driver)
      const avgScore = items.length
        ? Math.round(items.reduce((s, d) => s + d.priority_score, 0) / items.length)
        : 0

      return {
        driver: driverLabel(driver),
        driverKey: driver,
        count: items.length,
        avgPriorityScore: avgScore,
        topDecision: items[0]
          ? { title: items[0].title, priorityScore: items[0].priority_score }
          : null
      }
    }).filter(d => d.count > 0)

    res.json(grouped)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decision-support/review
// ─────────────────────────────────────────────

router.get('/review', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('*')
      .order('decided_at', { ascending: false })

    if (error) throw new Error(error.message)

    const outcomes = data.reduce((acc, d) => {
      acc[d.outcome] = (acc[d.outcome] || 0) + 1
      return acc
    }, {})

    res.json({
      totalHistoricalDecisions: data.length,
      outcomeBreakdown: outcomes,
      decisions: data.map(d => ({
        title: d.title,
        outcome: d.outcome,
        description: d.description,
        decidedAt: d.decided_at,
        shouldRevisit: d.should_revisit,
        revisitReason: d.revisit_reason
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/decision-support/revisit
// ─────────────────────────────────────────────

router.get('/revisit', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('decision_history')
      .select('*')
      .eq('should_revisit', true)
      .order('decided_at', { ascending: true })

    if (error) throw new Error(error.message)

    res.json({
      totalFlaggedForRevisit: data.length,
      decisions: data.map(d => ({
        title: d.title,
        outcome: d.outcome,
        decidedAt: d.decided_at,
        revisitReason: d.revisit_reason
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router