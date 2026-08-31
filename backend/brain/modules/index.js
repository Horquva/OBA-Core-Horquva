/**
 * MODULE IMPLEMENTATION BINDER
 * ----------------------------
 * Binds every constitutional module's REAL implementation (see
 * ./implementations.js) to its capability in the Communication Layer. After
 * this runs, there are no stubs: each capability computes genuine intelligence
 * from the Unified Knowledge Graph and returns a validated Intelligence Package.
 */

const { MODULES } = require('../data/constitutional-modules')
const { createIntelligence } = require('../knowledge/intelligenceExchange')
const IMPL = require('./implementations')

/**
 * @param {OrganizationalBrainRuntime} runtime fully-assembled runtime
 * @returns {number} number of capabilities bound
 */
function bindAll(runtime) {
  let bound = 0
  for (const m of MODULES) {
    const impl = IMPL[m.code]
    if (typeof impl !== 'function') {
      throw new Error(`Missing constitutional implementation for ${m.code} (${m.name})`)
    }
    for (const cap of m.capabilities) {
      runtime.comm.bindCapability(cap.id, async (context) => {
        const out = await impl(runtime, context || {})
        return createIntelligence({
          sourceModule: m.code,
          type: out.type || 'generic',
          payload: out.payload || {},
          confidence: out.confidence != null ? out.confidence : 0.5,
          evidence: out.evidence || [],
          recommendations: out.recommendations || [],
          relationships: out.relationships || [],
          context: {},
          consumers: m.consumers || [],
          version: m.version,
        })
      })
      bound++
    }
  }
  return bound
}

module.exports = { bindAll }
