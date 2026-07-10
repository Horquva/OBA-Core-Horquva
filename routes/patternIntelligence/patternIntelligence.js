/**
 * routes/patternIntelligence/patternIntelligence.js
 * ─────────────────────────────────────────────
 * Pattern Intelligence — analysis layer over system_events, incident_patterns,
 * workflow_failures, and graph_edges.  Surfaces recurring structural and
 * behavioural patterns that are invisible when looking at any table in isolation.
 *
 * Endpoints
 *   GET  /api/pattern-intelligence/summary
 *   GET  /api/pattern-intelligence/recurring-failures
 *   GET  /api/pattern-intelligence/dependency-clusters
 *   GET  /api/pattern-intelligence/event-correlations
 *   POST /api/pattern-intelligence/scan
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const { packageIntelligence } = require('../../services/intelligenceExchange')

// ─────────────────────────────────────────────
// HELPERS — graph traversal (reuse logic from graph.js, not duplicated)
// ─────────────────────────────────────────────

/** Fetch all graph edges */
async function fetchAllEdges() {
  const { data, error } = await supabase
    .from('graph_edges')
    .select('id, source_node_id, target_node_id, relationship_type, weight')
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Compute fan-in and fan-out degree for every node using all edges.
 * Returns Map<nodeId, { fanIn, fanOut, total }>
 */
function computeDegrees(edges) {
  const degrees = {}
  edges.forEach(e => {
    if (!degrees[e.source_node_id]) degrees[e.source_node_id] = { fanIn: 0, fanOut: 0 }
    if (!degrees[e.target_node_id]) degrees[e.target_node_id] = { fanIn: 0, fanOut: 0 }
    degrees[e.source_node_id].fanOut += 1
    degrees[e.target_node_id].fanIn  += 1
  })
  Object.keys(degrees).forEach(id => {
    degrees[id].total = degrees[id].fanIn + degrees[id].fanOut
  })
  return degrees
}

/** Upsert a detected pattern into the detected_patterns table */
async function upsertPattern({ patternType, title, description, entitiesInvolved, occurrenceCount, confidence }) {
  // Check if same-title pattern already exists
  const { data: existing } = await supabase
    .from('detected_patterns')
    .select('id, occurrence_count')
    .eq('title', title)
    .eq('status', 'active')
    .limit(1)

  if (existing && existing.length > 0) {
    // Update it
    const { error } = await supabase
      .from('detected_patterns')
      .update({
        occurrence_count:  Math.max(existing[0].occurrence_count, occurrenceCount),
        confidence,
        entities_involved: entitiesInvolved,
        last_detected:     new Date().toISOString()
      })
      .eq('id', existing[0].id)
    if (error) throw new Error(error.message)
    return existing[0].id
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('detected_patterns')
      .insert({
        pattern_type:      patternType,
        title,
        description,
        entities_involved: entitiesInvolved,
        occurrence_count:  occurrenceCount,
        confidence,
        first_detected:    new Date().toISOString(),
        last_detected:     new Date().toISOString(),
        status:            'active'
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data.id
  }
}

// ─────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────

/**
 * DETECTION 1 — Recurring Failures
 * Groups workflow_failures by failure_type and incident_patterns by failure_type.
 * Any combo appearing 3+ times is a confirmed recurring pattern.
 */
async function detectRecurringFailures() {
  const [{ data: wfFailures }, { data: incidentPatterns }] = await Promise.all([
    supabase
      .from('workflow_failures')
      .select('id, workflow_id, failure_type, severity, description, workflows(id, name, department)'),
    supabase
      .from('incident_patterns')
      .select('id, pattern_name, failure_type, occurrence_count, affected_entities, first_seen, last_seen')
  ])

  const patterns = []

  // Group workflow_failures by failure_type
  const wfByType = {}
  ;(wfFailures || []).forEach(f => {
    if (!wfByType[f.failure_type]) wfByType[f.failure_type] = []
    wfByType[f.failure_type].push(f)
  })

  Object.entries(wfByType).forEach(([failureType, failures]) => {
    if (failures.length >= 2) {  // 2+ workflow failures of same type
      const entities = failures.map(f => ({
        entityName: f.workflows?.name ?? `workflow_${f.workflow_id}`,
        entityType: 'workflow',
        department: f.workflows?.department,
        severity:   f.severity
      }))
      const criticalCount = failures.filter(f => f.severity === 'critical').length
      patterns.push({
        patternType:      'recurring_failure',
        title:            `Recurring ${failureType.replace(/_/g, ' ')} failures`,
        description:      `${failures.length} workflows share the same failure type "${failureType}". ${criticalCount} are critical severity.`,
        entitiesInvolved: entities,
        occurrenceCount:  failures.length,
        confidence:       Math.min(0.95, 0.5 + failures.length * 0.1)
      })
    }
  })

  // Incident patterns that already have high occurrence counts (3+)
  ;(incidentPatterns || []).forEach(ip => {
    if (ip.occurrence_count >= 3) {
      patterns.push({
        patternType:      'recurring_failure',
        title:            ip.pattern_name,
        description:      `Incident pattern "${ip.pattern_name}" (${ip.failure_type}) has recurred ${ip.occurrence_count} times between ${ip.first_seen?.slice(0,10)} and ${ip.last_seen?.slice(0,10)}.`,
        entitiesInvolved: (ip.affected_entities || []).map(e => ({ entityName: e, entityType: 'mixed' })),
        occurrenceCount:  ip.occurrence_count,
        confidence:       Math.min(0.98, 0.6 + ip.occurrence_count * 0.08)
      })
    }
  })

  return patterns
}

/**
 * DETECTION 2 — Dependency Clusters
 * Uses graph_edges to find nodes with unusually high fan-in or fan-out.
 * High fan-in = many dependents (blast radius risk)
 * High fan-out = depends on many others (fragility risk)
 */
async function detectDependencyClusters() {
  const edges   = await fetchAllEdges()
  const degrees = computeDegrees(edges)

  // Fetch node info for high-degree nodes
  const nodeIds    = Object.keys(degrees).map(Number)
  if (nodeIds.length === 0) return []

  const { data: nodes, error } = await supabase
    .from('graph_nodes')
    .select('id, node_type, entity_id, entity_name, properties')
    .in('id', nodeIds)
  if (error) throw new Error(error.message)

  const nodeMap = {}
  ;(nodes || []).forEach(n => { nodeMap[n.id] = n })

  // Compute mean + stddev for thresholding
  const totals    = Object.values(degrees).map(d => d.total)
  const mean      = totals.reduce((a, b) => a + b, 0) / (totals.length || 1)
  const variance  = totals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (totals.length || 1)
  const stddev    = Math.sqrt(variance)
  const threshold = mean + stddev  // 1 sigma above mean = structural risk

  const patterns = []

  Object.entries(degrees).forEach(([nodeId, deg]) => {
    const nId = parseInt(nodeId, 10)
    if (deg.total < threshold && deg.total < 5) return  // not a cluster node

    const node = nodeMap[nId]
    if (!node) return

    const clusterType = deg.fanIn > deg.fanOut ? 'high_fan_in' : 'high_fan_out'
    const riskLabel   = clusterType === 'high_fan_in'
      ? `${deg.fanIn} nodes depend on it (blast radius risk)`
      : `Depends on ${deg.fanOut} other nodes (fragility risk)`

    patterns.push({
      patternType:      'dependency_cluster',
      title:            `Dependency cluster: ${node.entity_name}`,
      description:      `${node.entity_name} (${node.node_type}) has total degree ${deg.total} (fan-in: ${deg.fanIn}, fan-out: ${deg.fanOut}). ${riskLabel}.`,
      entitiesInvolved: [{ entityName: node.entity_name, entityType: node.node_type, nodeId: nId, fanIn: deg.fanIn, fanOut: deg.fanOut }],
      occurrenceCount:  deg.total,
      confidence:       Math.min(0.92, 0.4 + (deg.total / (mean + 1)) * 0.2)
    })
  })

  // Sort by total degree descending, return top 10
  return patterns
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 10)
}

/**
 * DETECTION 3 — Escalation Chains
 * Reads incident_patterns and workflow_failures for 'escalation_failure' type.
 * Also looks at system_events for escalation-tagged events.
 */
async function detectEscalationChains() {
  const [{ data: wfEscalations }, { data: ipEscalations }, { data: escalationEvents }] = await Promise.all([
    supabase
      .from('workflow_failures')
      .select('workflow_id, failure_type, severity, description, workflows(name, department)')
      .eq('failure_type', 'escalation_failure'),
    supabase
      .from('incident_patterns')
      .select('pattern_name, failure_type, occurrence_count, affected_entities')
      .eq('failure_type', 'escalation_failure'),
    supabase
      .from('system_events')
      .select('id, event_type, source_module, payload, created_at')
      .ilike('event_type', '%escalat%')
      .order('created_at', { ascending: false })
      .limit(20)
  ])

  const patterns = []

  // Each workflow escalation failure is a chain segment
  if ((wfEscalations || []).length > 0) {
    const entities = (wfEscalations || []).map(f => ({
      entityName: f.workflows?.name ?? `workflow_${f.workflow_id}`,
      entityType: 'workflow',
      department: f.workflows?.department,
      severity:   f.severity
    }))
    patterns.push({
      patternType:      'escalation_chain',
      title:            'Escalation path failures across workflows',
      description:      `${(wfEscalations || []).length} workflows have undocumented or broken escalation paths. This creates incident response delays.`,
      entitiesInvolved: entities,
      occurrenceCount:  (wfEscalations || []).length,
      confidence:       0.88
    })
  }

  // Incident-pattern escalation chains
  ;(ipEscalations || []).forEach(ip => {
    patterns.push({
      patternType:      'escalation_chain',
      title:            `Escalation pattern: ${ip.pattern_name}`,
      description:      `Pattern "${ip.pattern_name}" (escalation_failure) has occurred ${ip.occurrence_count} times across: ${(ip.affected_entities || []).join(', ')}.`,
      entitiesInvolved: (ip.affected_entities || []).map(e => ({ entityName: e, entityType: 'mixed' })),
      occurrenceCount:  ip.occurrence_count,
      confidence:       0.85
    })
  })

  // System event escalation correlations
  if ((escalationEvents || []).length >= 2) {
    patterns.push({
      patternType:      'escalation_chain',
      title:            'Escalation event cluster in system bus',
      description:      `${(escalationEvents || []).length} escalation-related events detected in the system event bus — indicating live or recent escalation activity.`,
      entitiesInvolved: (escalationEvents || []).map(e => ({ entityName: e.event_type, entityType: 'system_event', sourceModule: e.source_module })),
      occurrenceCount:  (escalationEvents || []).length,
      confidence:       0.75
    })
  }

  return patterns
}

/**
 * DETECTION 4 — Event Correlations
 * Queries system_events grouped by correlation_id where 3+ related events
 * happened within the same correlation group.
 */
async function detectEventCorrelations() {
  // Fetch recent events with their correlation_ids
  const { data: events, error } = await supabase
    .from('system_events')
    .select('id, event_type, source_module, target_module, correlation_id, created_at, payload')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  // Group by event_type to find types that cluster frequently
  const byType = {}
  ;(events || []).forEach(e => {
    if (!byType[e.event_type]) byType[e.event_type] = []
    byType[e.event_type].push(e)
  })

  // Group by correlation_id to find correlated event chains
  const byCorrelation = {}
  ;(events || []).forEach(e => {
    if (!e.correlation_id) return
    if (!byCorrelation[e.correlation_id]) byCorrelation[e.correlation_id] = []
    byCorrelation[e.correlation_id].push(e)
  })

  const patterns = []

  // Event types with 3+ occurrences = event storm pattern
  Object.entries(byType).forEach(([eventType, evts]) => {
    if (evts.length >= 3) {
      // Check time window: any 3 within 1 hour?
      const sorted   = evts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const windowMs = 60 * 60 * 1000  // 1 hour
      let clusterCount = 0

      for (let i = 0; i < sorted.length - 2; i++) {
        const t0 = new Date(sorted[i].created_at).getTime()
        const t2 = new Date(sorted[Math.min(i + 2, sorted.length - 1)].created_at).getTime()
        if (t2 - t0 <= windowMs) { clusterCount++; break }
      }

      patterns.push({
        patternType:      'event_correlation',
        title:            `Event storm: "${eventType}"`,
        description:      `Event type "${eventType}" has been published ${evts.length} times${clusterCount > 0 ? ', including 3+ within a 1-hour window' : ''}. Source modules: ${[...new Set(evts.map(e => e.source_module))].join(', ')}.`,
        entitiesInvolved: [...new Set(evts.map(e => e.source_module))].map(m => ({ entityName: m, entityType: 'module' })),
        occurrenceCount:  evts.length,
        confidence:       Math.min(0.90, 0.5 + evts.length * 0.05)
      })
    }
  })

  // Correlated chains: correlation_id groups with 3+ events
  Object.entries(byCorrelation).forEach(([corrId, evts]) => {
    if (evts.length >= 3) {
      patterns.push({
        patternType:      'event_correlation',
        title:            `Correlated event chain (${corrId.slice(0, 8)}…)`,
        description:      `Correlation group ${corrId} contains ${evts.length} related events: ${evts.map(e => e.event_type).join(' → ')}.`,
        entitiesInvolved: evts.map(e => ({ entityName: e.event_type, entityType: 'event', sourceModule: e.source_module })),
        occurrenceCount:  evts.length,
        confidence:       0.80
      })
    }
  })

  return patterns.slice(0, 15)  // cap at 15 event correlation patterns
}

// ─────────────────────────────────────────────
// GET /api/pattern-intelligence/summary
// Counts by pattern_type, top 5 by occurrence_count
// Wrapped in IEP packageIntelligence()
// ─────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const { data: patterns, error } = await supabase
      .from('detected_patterns')
      .select('id, pattern_type, title, occurrence_count, confidence, status, last_detected')
      .eq('status', 'active')
      .order('occurrence_count', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    const countsByType = (patterns || []).reduce((acc, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
      return acc
    }, {})

    const top5 = (patterns || []).slice(0, 5)

    const findings = {
      totalActivePatterns: (patterns || []).length,
      countsByType,
      top5ByOccurrence: top5.map(p => ({
        id:            p.id,
        patternType:   p.pattern_type,
        title:         p.title,
        occurrenceCount: p.occurrence_count,
        confidence:    p.confidence,
        lastDetected:  p.last_detected
      }))
    }

    res.json(packageIntelligence({
      sourceModule:    'patternIntelligence',
      capability:      'pattern_detection_summary',
      findings,
      confidence:      (patterns || []).length > 0 ? 0.88 : 0.5,
      evidence:        Object.entries(countsByType).map(([t, c]) => `${c} ${t.replace(/_/g, ' ')} pattern(s) detected`),
      recommendations: [
        (countsByType.recurring_failure || 0) > 0
          ? `Address ${countsByType.recurring_failure} recurring failure patterns to break failure cycles`
          : 'No recurring failure patterns detected',
        (countsByType.dependency_cluster || 0) > 0
          ? `Review ${countsByType.dependency_cluster} dependency cluster nodes for SPOF risk`
          : 'No high-risk dependency clusters detected',
        (countsByType.escalation_chain || 0) > 0
          ? `Document ${countsByType.escalation_chain} escalation chain gaps to reduce incident response delays`
          : 'Escalation chains are healthy'
      ],
      graphRefs: top5.map(p => ({
        nodeType:   'pattern',
        entityName: p.title
      }))
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/pattern-intelligence/recurring-failures
// ─────────────────────────────────────────────
router.get('/recurring-failures', async (req, res) => {
  try {
    // Return from detected_patterns table (populated by /scan)
    const { data, error } = await supabase
      .from('detected_patterns')
      .select('*')
      .eq('pattern_type', 'recurring_failure')
      .eq('status', 'active')
      .order('occurrence_count', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    // If table is empty, run live detection and return it without persisting
    let patterns = data || []
    if (patterns.length === 0) {
      const live = await detectRecurringFailures()
      return res.json({
        notice:           'Run POST /api/pattern-intelligence/scan to persist patterns',
        totalPatterns:    live.length,
        recurringFailures: live
      })
    }

    res.json({
      totalPatterns:    patterns.length,
      recurringFailures: patterns.map(p => ({
        id:              p.id,
        title:           p.title,
        description:     p.description,
        entitiesInvolved: p.entities_involved,
        occurrenceCount:  p.occurrence_count,
        confidence:      p.confidence,
        firstDetected:   p.first_detected,
        lastDetected:    p.last_detected
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/pattern-intelligence/dependency-clusters
// ─────────────────────────────────────────────
router.get('/dependency-clusters', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('detected_patterns')
      .select('*')
      .eq('pattern_type', 'dependency_cluster')
      .eq('status', 'active')
      .order('occurrence_count', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    let patterns = data || []
    if (patterns.length === 0) {
      const live = await detectDependencyClusters()
      return res.json({
        notice:             'Run POST /api/pattern-intelligence/scan to persist patterns',
        totalClusters:      live.length,
        dependencyClusters: live
      })
    }

    res.json({
      totalClusters:      patterns.length,
      dependencyClusters: patterns.map(p => ({
        id:              p.id,
        title:           p.title,
        description:     p.description,
        entitiesInvolved: p.entities_involved,
        occurrenceCount:  p.occurrence_count,
        confidence:      p.confidence,
        firstDetected:   p.first_detected,
        lastDetected:    p.last_detected
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/pattern-intelligence/event-correlations
// ─────────────────────────────────────────────
router.get('/event-correlations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('detected_patterns')
      .select('*')
      .eq('pattern_type', 'event_correlation')
      .eq('status', 'active')
      .order('occurrence_count', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    let patterns = data || []
    if (patterns.length === 0) {
      const live = await detectEventCorrelations()
      return res.json({
        notice:             'Run POST /api/pattern-intelligence/scan to persist patterns',
        totalCorrelations:  live.length,
        eventCorrelations:  live
      })
    }

    res.json({
      totalCorrelations:  patterns.length,
      eventCorrelations: patterns.map(p => ({
        id:              p.id,
        title:           p.title,
        description:     p.description,
        entitiesInvolved: p.entities_involved,
        occurrenceCount:  p.occurrence_count,
        confidence:      p.confidence,
        firstDetected:   p.first_detected,
        lastDetected:    p.last_detected
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// POST /api/pattern-intelligence/scan
// Runs all detection logic and upserts into detected_patterns
// This is the real computed scan — not a stub
// ─────────────────────────────────────────────
router.post('/scan', async (req, res) => {
  try {
    const startedAt = new Date().toISOString()

    // Run all detections in parallel
    const [recurringFailures, dependencyClusters, escalationChains, eventCorrelations] = await Promise.all([
      detectRecurringFailures(),
      detectDependencyClusters(),
      detectEscalationChains(),
      detectEventCorrelations()
    ])

    const allPatterns = [
      ...recurringFailures,
      ...dependencyClusters,
      ...escalationChains,
      ...eventCorrelations
    ]

    // Upsert all detected patterns
    const upsertResults = []
    for (const pattern of allPatterns) {
      try {
        const id = await upsertPattern(pattern)
        upsertResults.push({ id, title: pattern.title, patternType: pattern.patternType })
      } catch (upsertErr) {
        console.error(`[PatternIntelligence] Failed to upsert pattern "${pattern.title}":`, upsertErr.message)
      }
    }

    // Summary counts
    const countsByType = allPatterns.reduce((acc, p) => {
      acc[p.patternType] = (acc[p.patternType] || 0) + 1
      return acc
    }, {})

    res.json({
      success:     true,
      scanStarted: startedAt,
      scanEnded:   new Date().toISOString(),
      totalDetected: allPatterns.length,
      persisted:     upsertResults.length,
      countsByType,
      breakdown: {
        recurringFailures:  recurringFailures.length,
        dependencyClusters: dependencyClusters.length,
        escalationChains:   escalationChains.length,
        eventCorrelations:  eventCorrelations.length
      },
      patternsUpserted: upsertResults
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
