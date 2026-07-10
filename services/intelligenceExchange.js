/**
 * services/intelligenceExchange.js
 * ─────────────────────────────────────────────
 * Intelligence Exchange Protocol (IEP)
 *
 * Every module that wants to hand intelligence to another module
 * (or to the orchestrator) should package it through this function
 * so all intelligence responses share a consistent, machine-readable shape.
 *
 * CONTRACT — packageIntelligence() input shape:
 * {
 *   sourceModule:    string   — which module produced this (e.g. 'predictiveRisk')
 *   capability:      string   — what capability this represents (e.g. 'critical_risk_detection')
 *   findings:        any      — the raw findings/data from the module
 *   confidence:      number   — 0.0–1.0, how confident the module is
 *   evidence:        string[] — supporting evidence strings
 *   recommendations: string[] — actionable recommendations
 *   graphRefs:       { nodeType, entityId, entityName }[] — Knowledge Graph node references
 * }
 *
 * CONTRACT — packageIntelligence() output shape:
 * {
 *   sourceModule:    string
 *   capability:      string
 *   findings:        any
 *   confidenceScore: number   — 0.0–1.0
 *   evidence:        string[]
 *   recommendations: string[]
 *   graphRefs:       { nodeType, entityId, entityName }[]
 *   timestamp:       string   — ISO 8601
 * }
 */

/**
 * packageIntelligence — wraps module output in the standard IEP envelope.
 *
 * @param {object} params
 * @param {string}   params.sourceModule    — module identifier (camelCase)
 * @param {string}   params.capability      — human-readable capability label
 * @param {*}        params.findings        — the module's core output data
 * @param {number}   [params.confidence=1]  — 0.0–1.0
 * @param {string[]} [params.evidence=[]]   — supporting evidence strings
 * @param {string[]} [params.recommendations=[]] — actionable recommendations
 * @param {Array}    [params.graphRefs=[]]  — refs to graph nodes: [{ nodeType, entityId, entityName }]
 * @returns {object} Standardized IEP intelligence package
 */
function packageIntelligence({
  sourceModule,
  capability,
  findings,
  confidence    = 1.0,
  evidence      = [],
  recommendations = [],
  graphRefs     = []
}) {
  // Clamp confidence to [0, 1]
  const confidenceScore = Math.min(1.0, Math.max(0.0, Number(confidence) || 0))

  return {
    sourceModule,
    capability,
    findings,
    confidenceScore,
    evidence:        Array.isArray(evidence)        ? evidence        : [String(evidence)],
    recommendations: Array.isArray(recommendations) ? recommendations : [String(recommendations)],
    graphRefs:       Array.isArray(graphRefs)        ? graphRefs       : [],
    timestamp:       new Date().toISOString()
  }
}

module.exports = { packageIntelligence }
