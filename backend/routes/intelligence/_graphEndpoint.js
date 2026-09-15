/**
 * Shared factory for a "run one graph analysis, return its intelligence
 * fragment" GET handler. Extracted from prediction.js so reality.js (the
 * 2026-09-02 M28/M29/M31/M34/M35 wire-up) doesn't reimplement the same
 * request/response shape a second time — the M52/M53 audit finding was
 * exactly this kind of avoidable internal duplication.
 *
 * Routes through domain.graph, not brain/ directly (D-12, D-18) — see
 * prediction.js's header for the full rationale, which still applies here
 * unchanged.
 */

const domain = require('../../domain')

// Run one analysis and return its intelligence fragment. domain.graph.run()
// executes the analysis's declared dependencies first, so anything reading
// priorIntel still receives it.
async function runModule(analysis) {
  if (!domain.graph.isReady()) {
    const err = new Error('Brain graph not loaded')
    err.status = 503
    throw err
  }
  const intel = await domain.graph.run(analysis)
  if (!intel) {
    const err = new Error(`Analysis ${analysis} produced no intelligence`)
    err.status = 502
    throw err
  }
  return {
    module: domain.graph.toCode(analysis),
    analysis,
    type: intel.type,
    confidence: intel.confidence,
    // F-9: true only for a module whose headline number is built from
    // invented weights/thresholds (M03, M18, M43, M45) rather than a
    // measured structural fact — see intelligenceExchange.js's createIntelligence().
    authored: !!intel.authored,
    // Section 06: what population/computation this number covers, in one
    // sentence — see intelligenceExchange.js's createIntelligence().
    definition: intel.definition || '',
    payload: intel.payload,
    recommendations: intel.recommendations || [],
    dataSource: domain.graph.source(),
    generatedAt: new Date().toISOString(),
  }
}

// Factory that builds a GET handler for a given module code/slug.
function moduleEndpoint(analysis) {
  return async (req, res) => {
    try {
      res.json(await runModule(analysis))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, analysis })
    }
  }
}

module.exports = { runModule, moduleEndpoint }
