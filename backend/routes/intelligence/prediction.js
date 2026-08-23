/**
 * PREDICTION-LAYER INTELLIGENCE ENDPOINTS
 * ---------------------------------------
 * Exposes constitutional prediction/reasoning modules (Tahir + Kamran) as
 * simple REST endpoints for the frontend dashboard cards. Each endpoint runs
 * the corresponding analysis over the organizational Knowledge Graph and
 * returns its intelligence payload.
 *
 * Card  -> Module mapping:
 *   PatternRegularityCard  -> M37 Pattern Intelligence
 *   DNAFingerprintCard     -> M41 Organizational DNA Intelligence
 *   CultureHealthCard      -> M42 Culture Intelligence
 *   MaturityCurveCard      -> M43 Organizational Maturity Intelligence
 *   BehavioralProfileCard  -> M44 Organizational Behavior Intelligence
 *   IndustryBenchmarkCard  -> M45 Benchmark Intelligence
 *   StrategicAlignmentCard -> M40 Strategic Alignment Intelligence
 *   CapabilityByDeptCard   -> M39 Capability Intelligence
 *
 * Mounted at /api/intelligence (see backend/index.js).
 */

const express = require('express')
const router = express.Router()
const brain = require('../../brain')

// Run one analysis and return its intelligence fragment. brain.run() executes
// the analysis's declared dependencies first, so anything reading priorIntel
// still receives it — the same behaviour the retired execution engine gave.
async function runModule(code) {
  if (!brain.isReady()) {
    const err = new Error('Brain graph not loaded')
    err.status = 503
    throw err
  }
  const intel = await brain.run(code)
  if (!intel) {
    const err = new Error(`Module ${code} produced no intelligence`)
    err.status = 502
    throw err
  }
  return {
    module: code,
    type: intel.type,
    confidence: intel.confidence,
    payload: intel.payload,
    recommendations: intel.recommendations || [],
    dataSource: brain.graphSource(),
    generatedAt: new Date().toISOString(),
  }
}

// Factory that builds a GET handler for a given module code.
function moduleEndpoint(code) {
  return async (req, res) => {
    try {
      res.json(await runModule(code))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, module: code })
    }
  }
}

// ── Card endpoints ───────────────────────────────────────────────
router.get('/pattern', moduleEndpoint('M37')) // PatternRegularityCard
router.get('/dna', moduleEndpoint('M41')) // DNAFingerprintCard
router.get('/culture', moduleEndpoint('M42')) // CultureHealthCard
router.get('/maturity', moduleEndpoint('M43')) // MaturityCurveCard
router.get('/behavior', moduleEndpoint('M44')) // BehavioralProfileCard
router.get('/benchmark', moduleEndpoint('M45')) // IndustryBenchmarkCard
router.get('/strategic-alignment', moduleEndpoint('M40')) // StrategicAlignmentCard
router.get('/capability-by-dept', moduleEndpoint('M39')) // CapabilityByDeptCard

// Convenience index: list all prediction-layer endpoints in one call.
router.get('/prediction', (req, res) => {
  res.json({
    endpoints: {
      pattern: '/api/intelligence/pattern',
      dna: '/api/intelligence/dna',
      culture: '/api/intelligence/culture',
      maturity: '/api/intelligence/maturity',
      behavior: '/api/intelligence/behavior',
      benchmark: '/api/intelligence/benchmark',
      strategicAlignment: '/api/intelligence/strategic-alignment',
      capabilityByDept: '/api/intelligence/capability-by-dept',
    },
  })
})

module.exports = router
