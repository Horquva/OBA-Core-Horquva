const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllMemoryItems() {
  const { data, error } = await supabase
    .from('executive_memory_items')
    .select('*')
    .order('relevance_score', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

function groupByType(items) {
  return items.reduce((acc, item) => {
    acc[item.memory_type] = (acc[item.memory_type] || 0) + 1
    return acc
  }, {})
}

// ─────────────────────────────────────────────
// LIVE REPEAT OFFENDERS — pulled from workflow_failures
// Entities appearing in 2+ critical failures
// ─────────────────────────────────────────────

async function detectRepeatOffenders() {
  const { data, error } = await supabase
    .from('workflow_failures')
    .select('severity, description, workflow_id, workflows(name, department)')
    .in('severity', ['critical', 'high'])

  if (error) throw new Error(error.message)

  // Group by workflow name
  const counts = {}
  data.forEach(f => {
    const name = f.workflows?.name ?? 'Unknown'
    if (!counts[name]) {
      counts[name] = { name, department: f.workflows?.department, count: 0 }
    }
    counts[name].count += 1
  })

  return Object.values(counts)
    .filter(w => w.count >= 2)
    .sort((a, b) => b.count - a.count)
}

// ─────────────────────────────────────────────
// GET /api/executive-memory/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const items = await fetchAllMemoryItems()
    const byType = groupByType(items)

    const patterns = await optional('incident_patterns', supabase
      .from('incident_patterns')
      .select('occurrence_count'), [])

    const heroes = await optional('hero_dependencies(critical)', supabase
      .from('hero_dependencies')
      .select('person_name, risk_level')
      .eq('risk_level', 'critical'), [])

    const totalOccurrences = patterns.reduce((s, p) => s + p.occurrence_count, 0)

    res.json({
      totalMemoryItems: items.length,
      recurringItems: items.filter(i => i.is_recurring).length,
      byType,
      criticalHeroDependencies: heroes.length,
      totalIncidentOccurrences: totalOccurrences,
      topMemoryItem: items[0]
        ? {
            title: items[0].title,
            type: items[0].memory_type,
            relevanceScore: items[0].relevance_score,
            entityName: items[0].entity_name
          }
        : null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/items
// ─────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const items = await fetchAllMemoryItems()

    res.json({
      totalItems: items.length,
      items: items.map(i => ({
        memoryType:     i.memory_type,
        title:          i.title,
        description:    i.description,
        entityName:     i.entity_name,
        relevanceScore: i.relevance_score,
        severity:       i.severity,
        sourceModule:   i.source_module,
        isRecurring:    i.is_recurring
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/patterns
// ─────────────────────────────────────────────

router.get('/patterns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('incident_patterns')
      .select('*')
      .order('occurrence_count', { ascending: false })

    if (error) throw new Error(error.message)

    // Also pull recurring memory items
    const recurring = await optional('executive_memory_items(recurring)', supabase
      .from('executive_memory_items')
      .select('title, description, entity_name, severity')
      .eq('is_recurring', true)
      .order('relevance_score', { ascending: false }), [])

    res.json({
      totalPatterns: data.length,
      recurringMemoryItems: recurring.length,
      patterns: data.map(p => ({
        patternName:      p.pattern_name,
        failureType:      p.failure_type,
        occurrenceCount:  p.occurrence_count,
        affectedEntities: p.affected_entities,
        firstSeen:        p.first_seen,
        lastSeen:         p.last_seen
      })),
      recurringItems: recurring
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/lessons
// ─────────────────────────────────────────────

router.get('/lessons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('executive_memory_items')
      .select('*')
      .eq('memory_type', 'lesson')
      .order('relevance_score', { ascending: false })

    if (error) throw new Error(error.message)

    // Pull live high/critical failures to surface additional context
    const failures = await optional('workflow_failures(critical/high)', supabase
      .from('workflow_failures')
      .select('failure_type, severity, description, workflows(name)')
      .in('severity', ['critical', 'high'])
      .limit(5), [])

    res.json({
      totalLessons: data.length,
      lessons: data.map(l => ({
        title:          l.title,
        description:    l.description,
        entityName:     l.entity_name,
        relevanceScore: l.relevance_score,
        severity:       l.severity,
        sourceModule:   l.source_module,
        isRecurring:    l.is_recurring
      })),
      relatedIncidents: failures.map(f => ({
        workflowName:  f.workflows?.name,
        failureType:   f.failure_type,
        severity:      f.severity,
        description:   f.description
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/hero-risk
// ─────────────────────────────────────────────

router.get('/hero-risk', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hero_dependencies')
      .select('*')
      .order('resolution_count', { ascending: false })

    if (error) throw new Error(error.message)

    // Pull hero memory items for context
    const heroItems = await optional('executive_memory_items(hero_risk)', supabase
      .from('executive_memory_items')
      .select('title, description, entity_name, relevance_score')
      .eq('memory_type', 'hero_risk')
      .order('relevance_score', { ascending: false }), [])

    const critical = data.filter(h => h.risk_level === 'critical')

    res.json({
      totalHeroDependencies: data.length,
      criticalHeroes: critical.length,
      heroes: data.map(h => ({
        personName:      h.person_name,
        department:      h.department,
        resolutionCount: h.resolution_count,
        riskLevel:       h.risk_level,
        description:     h.description
      })),
      heroMemoryItems: heroItems
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/repeat-offenders
// ─────────────────────────────────────────────

router.get('/repeat-offenders', async (req, res) => {
  try {
    const repeatOffenders = await detectRepeatOffenders()

    // Also pull repeat_offender memory items
    const items = await optional('executive_memory_items(repeat_offender)', supabase
      .from('executive_memory_items')
      .select('title, description, entity_name, relevance_score, severity')
      .eq('memory_type', 'repeat_offender')
      .order('relevance_score', { ascending: false }), [])

    res.json({
      totalRepeatOffenders: repeatOffenders.length,
      repeatOffenders,
      memoryItems: items
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive-memory/bad-decisions
// ─────────────────────────────────────────────

router.get('/bad-decisions', async (req, res) => {
  try {
    // Pull bad decision memory items — this route's primary data
    const memoryItems = await must('executive_memory_items(bad_decision)', supabase
      .from('executive_memory_items')
      .select('*')
      .eq('memory_type', 'bad_decision')
      .order('relevance_score', { ascending: false }))

    // Pull historical decisions flagged for revisit from decision_history
    const historical = await must('decision_history(should_revisit)', supabase
      .from('decision_history')
      .select('*')
      .eq('should_revisit', true)
      .order('decided_at', { ascending: true }))

    res.json({
      totalBadDecisionMemoryItems: memoryItems.length,
      totalFlaggedForRevisit: historical.length,
      badDecisions: memoryItems.map(m => ({
        title:          m.title,
        description:    m.description,
        entityName:     m.entity_name,
        relevanceScore: m.relevance_score,
        severity:       m.severity
      })),
      flaggedHistoricalDecisions: historical.map(d => ({
        title:         d.title,
        outcome:       d.outcome,
        decidedAt:     d.decided_at,
        revisitReason: d.revisit_reason
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router