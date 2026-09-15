/**
 * INTELLIGENCE EXCHANGE PROTOCOL (Huzaifa — Knowledge Platform Component 3)
 * ------------------------------------------------------------------------
 * The common language of the Organizational Brain. Modules never exchange raw
 * application data (an Employee ID, a status flag). Instead every interaction
 * exchanges a structured Intelligence Package: source, type, confidence,
 * evidence, recommendations, relationships, context, timestamp, version.
 *
 * This is the common structure every analysis returns. Provides schema
 * validation and confidence fusion (`runMany()`'s fusedConfidence). The six
 * modules that used to read each other's output through this shape — M11,
 * M23, M24, M48, M50, M55 — were retired 2026-09-02 (see
 * data/constitutional-modules.js); the dependency-ordering machinery this
 * protocol rides on is kept regardless, since `dependsOn` still expresses
 * real prerequisite structure among the 24 modules that remain.
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
  // F-9: mirrors derived.js's pillars().definitionsAreAuthored -- true only
  // for a module whose headline number is built from invented weights or
  // thresholds (e.g. M45's benchmark targets, M03/M18's severity weights)
  // rather than a measured structural fact (M01's ownership coverage, M02's
  // dependency count). Named loudly so nobody mistakes an authored metric
  // for a measured one.
  authored = false,
  // Section 06: one sentence naming exactly what population and computation
  // this module's headline number covers. Several catalog names collide
  // with a same-named SQL surface that answers a structurally different
  // question over a different population (M03's SPOF count is every asset
  // type; GET /api/dependencies/agent-spofs is agents only -- both correctly
  // called "SPOF", both real, disagreeing numbers). `definition` is how a
  // reader tells which one they're looking at without reading source.
  definition = '',
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
    authored: !!authored,
    definition: String(definition || ''),
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
