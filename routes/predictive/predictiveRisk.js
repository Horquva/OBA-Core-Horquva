const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { packageIntelligence } = require('../../services/intelligenceExchange')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllPredictions() {
  const { data, error } = await supabase
    .from('predictive_risk_scores')
    .select(`
      id,
      agent_id,
      predicted_score,
      threat_level,
      is_emerging_threat,
      contributing_factors,
      reasons,
      computed_at,
      agents ( name, status, risk, owner_id )
    `)
    .order('predicted_score', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

/**
 * buildAgentInDegreeMap — fetches graph_nodes for all agents then counts
 * incoming graph_edges for each node (how many dependents an agent has).
 * Returns { [agentEntityId]: inDegreeCount }.
 * Cross-referenced in /critical and /emerging so agents with many dependents
 * score higher risk even if their standalone predicted_score is moderate.
 */
async function buildAgentInDegreeMap() {
  const [{ data: agentNodes }, { data: inEdges }] = await Promise.all([
    supabase
      .from('graph_nodes')
      .select('id, entity_id')
      .eq('node_type', 'agent'),
    supabase
      .from('graph_edges')
      .select('target_node_id, relationship_type')
      .in('relationship_type', ['depends_on', 'uses'])
  ])

  if (!agentNodes || !inEdges) return {}

  // node_id → agent entity_id
  const nodeToAgent = {}
  agentNodes.forEach(n => { nodeToAgent[n.id] = n.entity_id })

  // Count how many edges point TO each agent node (in-degree = dependents)
  const inDegree = {}
  inEdges.forEach(e => {
    const agentEntityId = nodeToAgent[e.target_node_id]
    if (agentEntityId !== undefined) {
      inDegree[agentEntityId] = (inDegree[agentEntityId] || 0) + 1
    }
  })

  return inDegree
}

function formatPrediction(p, inDegree = 0) {
  // Boost predicted score if this agent has many dependents in the graph.
  // Formula: +2 per dependent, capped at +20 total boost, score capped at 100.
  const dependencyBoost = Math.min(20, inDegree * 2)
  const adjustedScore   = Math.min(100, p.predicted_score + dependencyBoost)

  return {
    agentName: p.agents?.name,
    currentRisk: p.agents?.risk,
    predictedScore: p.predicted_score,
    adjustedScore,           // graph-boosted score (used for ranking)
    dependentCount: inDegree, // how many graph nodes depend on this agent
    dependencyBoost,         // how many points the graph added
    threatLevel: p.threat_level,
    isEmergingThreat: p.is_emerging_threat,
    contributingFactors: p.contributing_factors,
    reasons: p.reasons,
    computedAt: p.computed_at
  }
}

// ─────────────────────────────────────────────
// GET /api/predictive-risk/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const predictions = await fetchAllPredictions()

    const breakdown = predictions.reduce((acc, p) => {
      acc[p.threat_level] = (acc[p.threat_level] || 0) + 1
      return acc
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 })

    const emergingCount = predictions.filter(p => p.is_emerging_threat).length

    // Top contributing factors across all agents
    const factorTotals = {}
    predictions.forEach(p => {
      const factors = p.contributing_factors || {}
      Object.entries(factors).forEach(([key, val]) => {
        factorTotals[key] = (factorTotals[key] || 0) + val
      })
    })

    const topDrivers = Object.entries(factorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor]) => factor)

    res.json({
      totalAgentsAssessed: predictions.length,
      breakdown,
      emergingThreats: emergingCount,
      topRiskDrivers: topDrivers
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/agents
// ─────────────────────────────────────────────

router.get('/agents', async (req, res) => {
  try {
    const predictions = await fetchAllPredictions()
    res.json(predictions.map(p => formatPrediction(p, 0)))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/critical
// ─────────────────────────────────────────────

router.get('/critical', async (req, res) => {
  try {
    // Fetch predictions and graph in-degree in parallel
    const [predictions, inDegreeMap] = await Promise.all([
      fetchAllPredictions(),
      buildAgentInDegreeMap()
    ])

    const critical = predictions.filter(p => p.threat_level === 'CRITICAL')
    // Format with graph-boosted scores and sort by adjustedScore descending
    const formatted = critical
      .map(p => formatPrediction(p, inDegreeMap[p.agent_id] || 0))
      .sort((a, b) => b.adjustedScore - a.adjustedScore)

    // Fire risk.critical event for each agent over threshold (async, don't block response)
    formatted.forEach(agent => {
      eventBus.publish('risk.critical', 'predictiveRisk', 'executiveMemory', {
        agentName: agent.agentName,
        threatLevel: agent.threatLevel,
        predictedScore: agent.predictedScore,
        reasons: agent.reasons
      }, agent.predictedScore / 100)
    })

    // Wrap in Intelligence Exchange Protocol envelope
    res.json(packageIntelligence({
      sourceModule: 'predictiveRisk',
      capability: 'critical_risk_detection',
      findings: { totalCritical: critical.length, agents: formatted },
      confidence: critical.length > 0 ? 0.95 : 1.0,
      evidence: formatted.map(a => `${a.agentName}: score ${a.predictedScore}/100 (adj. ${a.adjustedScore} with ${a.dependentCount} graph dependents) — ${(a.reasons || []).join('; ')}`),
      recommendations: formatted.map(a => `Address CRITICAL agent ${a.agentName} (${a.dependentCount} dependents in graph) before escalation`),
      graphRefs: formatted.map(a => ({ nodeType: 'agent', entityName: a.agentName }))
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/emerging
// ─────────────────────────────────────────────

router.get('/emerging', async (req, res) => {
  try {
    // Fetch predictions and graph in-degree in parallel
    const [predictions, inDegreeMap] = await Promise.all([
      fetchAllPredictions(),
      buildAgentInDegreeMap()
    ])

    const emerging = predictions.filter(p => p.is_emerging_threat)
    // Format with graph-boosted scores; sort emerging by adjustedScore so agents
    // with many dependents surface first even if their standalone score is moderate
    const formatted = emerging
      .map(p => formatPrediction(p, inDegreeMap[p.agent_id] || 0))
      .sort((a, b) => b.adjustedScore - a.adjustedScore)

    res.json(packageIntelligence({
      sourceModule: 'predictiveRisk',
      capability: 'emerging_threat_detection',
      findings: { totalEmerging: emerging.length, agents: formatted },
      confidence: emerging.length > 0 ? 0.85 : 1.0,
      evidence: formatted.map(a => `${a.agentName}: emerging threat, adjusted score ${a.adjustedScore} (${a.dependentCount} graph dependents)`),
      recommendations: formatted.map(a => a.dependentCount > 2
        ? `URGENT: ${a.agentName} is an emerging threat with ${a.dependentCount} dependent nodes — assign backup before escalation`
        : `Monitor ${a.agentName} — emerging threat flag raised, score ${a.adjustedScore}/100`),
      graphRefs: formatted.map(a => ({ nodeType: 'agent', entityName: a.agentName }))
    }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/predictive-risk/agent/:name
// ─────────────────────────────────────────────

router.get('/agent/:name', async (req, res) => {
  try {
    const { name } = req.params

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status, risk')
      .ilike('name', name)
      .single()

    if (agentError || !agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }

    const { data: prediction, error: predError } = await supabase
      .from('predictive_risk_scores')
      .select('*')
      .eq('agent_id', agent.id)
      .single()

    if (predError || !prediction) {
      return res.status(404).json({ error: 'No prediction found for this agent' })
    }

    res.json({
      agentName: agent.name,
      currentRisk: agent.risk,
      status: agent.status,
      predictedScore: prediction.predicted_score,
      threatLevel: prediction.threat_level,
      isEmergingThreat: prediction.is_emerging_threat,
      contributingFactors: prediction.contributing_factors,
      reasons: prediction.reasons,
      computedAt: prediction.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router