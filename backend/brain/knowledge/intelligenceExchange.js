/**
 * INTELLIGENCE EXCHANGE PROTOCOL (Huzaifa — Knowledge Platform Component 3)
 * ------------------------------------------------------------------------
 * The common language of the Organizational Brain. Modules never exchange raw
 * application data (an Employee ID, a status flag). Instead every interaction
 * exchanges a structured Intelligence Package: source, type, confidence,
 * evidence, recommendations, relationships, context, timestamp, version.
 *
 * This is the common structure every analysis returns, and how M11/M23/M24/M48/
 * M50/M55 read each other's output. Provides schema validation and confidence
 * fusion.
 *
 * The publish/subscribe IntelligenceBus that used to live here was removed with
 * the runtime: its only readers were four analyses reporting on the log of Brain
 * runs rather than on the organization. See the design document, open question 1.
 */


const INTELLIGENCE_TYPES = [
  'ownership', 'dependency', 'risk', 'governance', 'accountability',
  'workflow', 'relationship', 'ecosystem', 'network', 'prediction',
  'recommendation', 'truth', 'decision', 'health', 'simulation', 'generic',
]

function clamp01(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/**
 * Build a constitutional intelligence package. Throws on contract violation.
 */
function createIntelligence({
  sourceModule,
  type = 'generic',
  payload = {},
  confidence = 0,
  evidence = [],
  recommendations = [],
  relationships = [],
  context = {},
  consumers = [],
  version = '1.0.0',
}) {
  if (!/^M[0-9]{2}$/.test(sourceModule || '')) {
    throw new Error(`Intelligence contract violation: invalid sourceModule "${sourceModule}"`)
  }
  if (!INTELLIGENCE_TYPES.includes(type)) {
    throw new Error(`Intelligence contract violation: unknown type "${type}"`)
  }
  if (!Array.isArray(evidence)) throw new Error('Intelligence contract violation: evidence must be an array')
  return {
    sourceModule,
    type,
    payload,
    confidence: clamp01(confidence),
    evidence,
    recommendations,
    relationships,
    context,
    consumers,
    version,
    timestamp: new Date().toISOString(),
  }
}

/** Validate a package conforms to the constitutional schema. */
function validateIntelligence(pkg) {
  const errors = []
  if (!pkg || typeof pkg !== 'object') return { valid: false, errors: ['not an object'] }
  if (!/^M[0-9]{2}$/.test(pkg.sourceModule || '')) errors.push('invalid sourceModule')
  if (!INTELLIGENCE_TYPES.includes(pkg.type)) errors.push('invalid type')
  if (typeof pkg.confidence !== 'number' || pkg.confidence < 0 || pkg.confidence > 1)
    errors.push('confidence must be 0..1')
  if (!Array.isArray(pkg.evidence)) errors.push('evidence must be an array')
  if (!pkg.timestamp) errors.push('missing timestamp')
  return { valid: errors.length === 0, errors }
}

/**
 * Confidence propagation: combine multiple intelligence confidences into one
 * (weighted toward the lowest — a chain is only as trustworthy as its weakest
 * link, but rewarded for corroboration).
 */
function propagateConfidence(packages) {
  if (!packages.length) return 0
  const min = Math.min(...packages.map((p) => p.confidence))
  const avg = packages.reduce((s, p) => s + p.confidence, 0) / packages.length
  return clamp01(min * 0.6 + avg * 0.4)
}

module.exports = {
  INTELLIGENCE_TYPES,
  createIntelligence,
  validateIntelligence,
  propagateConfidence,
}
