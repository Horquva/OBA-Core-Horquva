const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')
const domain = require('../../domain')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// `executive_memory_items` held ten rows seeded by SQL and written by nothing.
// An organization's memory that cannot record anything new is not memory.
//
// The four memory types each have a root that produces them — repeat offenders
// and lessons from workflow_failures, hero risks from ownership without a named
// backup, bad decisions from decision_history — so these are derived now rather
// than remembered. Row shape matches the old SELECT so the handlers below are
// unchanged. See domain/derived.js for each type's rule.
async function fetchAllMemoryItems() {
  const intel = await domain.intelligence.all()
  return intel.executiveMemory.items.map(i => ({
    memory_type:     i.memoryType,
    title:           i.title,
    description:     i.description,
    entity_name:     i.entityName,
    relevance_score: i.relevanceScore,
    severity:        i.severity,
    source_module:   i.sourceModule,
    is_recurring:    i.isRecurring,
    created_at:      intel.executiveMemory.computedAt,
    evidence:        i.evidence,
  }))
}

/** Memory items of one type, newest-relevance first, from the live computation. */
async function memoryItemsOfType(memoryType) {
  const items = await fetchAllMemoryItems()
  return items.filter(i => i.memory_type === memoryType)
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

    // Lessons ARE the incident patterns in this model; `incident_patterns` was
    // a seeded pre-aggregate of the same workflow_failures rows.
    const patterns = items
      .filter(i => i.memory_type === 'lesson')
      .map(i => ({ occurrence_count: i.evidence.workflowCount }))

    // `hero_dependencies` was likewise seeded; hero risk is computed from
    // ownership concentration without a named backup.
    const heroes = items
      .filter(i => i.memory_type === 'hero_risk' && i.severity === 'critical')
      .map(i => ({ person_name: i.entity_name, risk_level: i.severity }))

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
    // `incident_patterns` was another seeded pre-aggregate of workflow_failures.
    // A pattern IS a lesson in this model — a failure mode seen across more
    // than one workflow — so both come from the same computation now.
    const intel = await domain.intelligence.all()
    const items = intel.executiveMemory.items

    const patterns = items
      .filter(i => i.memoryType === 'lesson')
      .map(i => ({
        patternName:      i.title,
        failureType:      i.evidence.failureType,
        occurrenceCount:  i.evidence.workflowCount,
        affectedEntities: i.evidence.affectedEntities,
        // workflow_failures records no timestamps, so there is no honest answer
        // here. The seeded table asserted dates it could not have known.
        firstSeen:        null,
        lastSeen:         null
      }))

    const recurring = items
      .filter(i => i.isRecurring)
      .map(i => ({
        title: i.title, description: i.description,
        entity_name: i.entityName, severity: i.severity
      }))

    res.json({
      totalPatterns: patterns.length,
      recurringMemoryItems: recurring.length,
      patterns,
      recurringItems: recurring,
      computedAt: intel.executiveMemory.computedAt,
      source: intel.executiveMemory.source
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
    const data = await memoryItemsOfType('lesson')

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
    // `hero_dependencies` was a seeded list of "people the organization leans
    // on". A hero risk is computed now: someone owning two or more critical
    // assets with nobody named as their backup. `resolutionCount` is not
    // carried over — nothing in the schema records incident resolutions, so the
    // seeded counts were asserting something the database cannot know.
    const data = (await memoryItemsOfType('hero_risk')).map(i => ({
      person_name:           i.entity_name,
      department:            i.evidence.department,
      risk_level:            i.severity,
      description:           i.description,
      critical_assets:       i.evidence.assets,
      critical_asset_count:  i.evidence.criticalAssetCount,
    }))

    // Pull hero memory items for context
    const heroItems = (await memoryItemsOfType('hero_risk')).map(i => ({
      title: i.title, description: i.description,
      entity_name: i.entity_name, relevance_score: i.relevance_score
    }))

    const critical = data.filter(h => h.risk_level === 'critical')

    res.json({
      totalHeroDependencies: data.length,
      criticalHeroes: critical.length,
      heroes: data.map(h => ({
        personName:         h.person_name,
        department:         h.department,
        // Replaces `resolutionCount`. The old field claimed "N incidents
        // resolved" from a seeded table; nothing records incident resolutions,
        // so it was never a derivable number. This one is: how many critical
        // assets this person holds with no backup owner named.
        criticalAssetCount: h.critical_asset_count,
        criticalAssets:     h.critical_assets,
        riskLevel:          h.risk_level,
        description:        h.description
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
    const items = (await memoryItemsOfType('repeat_offender')).map(i => ({
      title: i.title, description: i.description, entity_name: i.entity_name,
      relevance_score: i.relevance_score, severity: i.severity
    }))

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
    const memoryItems = await memoryItemsOfType('bad_decision')

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