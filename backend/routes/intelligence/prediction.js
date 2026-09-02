/**
 * PREDICTION-LAYER INTELLIGENCE ENDPOINTS
 * ---------------------------------------
 * Exposes constitutional prediction/reasoning modules (Tahir + Kamran) as
 * simple REST endpoints for the frontend dashboard cards. Each endpoint runs
 * the corresponding analysis over the organizational Knowledge Graph and
 * returns its intelligence payload.
 *
 * Card  -> Module mapping:
 *   PatternRegularityCard   -> M37 Pattern Intelligence
 *   DNAFingerprintCard      -> M41 Organizational DNA Intelligence
 *   CultureHealthCard       -> M42 Culture Intelligence
 *   MaturityCurveCard       -> M43 Organizational Maturity Intelligence
 *   BehavioralProfileCard   -> M44 Organizational Behavior Intelligence
 *   IndustryBenchmarkCard   -> M45 Benchmark Intelligence
 *   OwnershipCoverageCard   -> M40 Strategic Alignment Intelligence
 *   CapabilityInventoryCard -> M39 Capability Intelligence
 *   ContinuityTab           -> M18 Organizational Continuity Intelligence
 *   GovernanceTab           -> M19 Governance Intelligence
 *   RecommendationsPage     -> M04 Recommendation Engine (D-62)
 *
 * Mounted at /api/intelligence (see backend/index.js).
 *
 * The URL paths below are named for what each endpoint actually returns,
 * not for the M-catalog name it happens to implement (M40 "Strategic
 * Alignment Intelligence" computes ownership coverage; M39 "Capability
 * Intelligence" returns org-wide counts with no department breakdown at
 * all). The catalog names themselves are locked (constitutional-modules.js)
 * and unchanged — only the public route names and the frontend card/type
 * names that were making the same false claim are renamed here.
 */

const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// Analyses are named, not numbered. domain.graph.run() accepts either the
// catalog code ('M42') or its readable slug ('culture'); the slug is used
// here because a route file is exactly where the name matters. See the
// design document — the dataset analyses in domain/analyses.js dropped their
// M-numbers entirely, so nothing outside this catalog claims one any more.
//
// Routes through domain.graph, not brain/ directly (D-12, D-18) — the brain
// stops being an independent surface routes reach into; domain/index.js
// already re-exports this exact call path from brain.run/isReady/toCode/
// graphSource, so this is an import-path change with an identical call path
// underneath. Run one analysis and return its intelligence fragment.
// domain.graph.run() executes the analysis's declared dependencies first, so
// anything reading priorIntel still receives it — the same behaviour the
// retired execution engine gave.
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
    payload: intel.payload,
    recommendations: intel.recommendations || [],
    dataSource: domain.graph.source(),
    generatedAt: new Date().toISOString(),
  }
}

// Factory that builds a GET handler for a given module code.
function moduleEndpoint(analysis) {
  return async (req, res) => {
    try {
      res.json(await runModule(analysis))
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message, analysis })
    }
  }
}

// ── Card endpoints ───────────────────────────────────────────────
router.get('/pattern', moduleEndpoint('pattern')) // PatternRegularityCard
router.get('/dna', moduleEndpoint('organizational-dna')) // DNAFingerprintCard
router.get('/culture', moduleEndpoint('culture')) // CultureHealthCard
router.get('/maturity', moduleEndpoint('organizational-maturity')) // MaturityCurveCard
router.get('/behavior', moduleEndpoint('organizational-behavior')) // BehavioralProfileCard
router.get('/benchmark', moduleEndpoint('benchmark')) // IndustryBenchmarkCard
// API-2: renamed from /strategic-alignment -- the module slug passed to
// moduleEndpoint() stays 'strategic-alignment' (derived from M40's locked
// catalog name), only the public URL changes to match what the payload
// actually is: ownershipCoverageScore + gaps, not an alignment-to-strategy
// measure.
router.get('/ownership-coverage', moduleEndpoint('strategic-alignment')) // OwnershipCoverageCard
// API-2: renamed from /capability-by-dept, which returned org-wide counts
// with no department breakdown at all.
router.get('/capability-inventory', moduleEndpoint('capability')) // CapabilityInventoryCard
router.get('/continuity', moduleEndpoint('organizational-continuity')) // ContinuityTab (M18)
router.get('/governance', moduleEndpoint('governance')) // GovernanceTab (M19)
router.get('/recommendations', moduleEndpoint('recommendation-engine')) // RecommendationsPage (M04, D-62)

// ── Graph lifecycle (D-14) ───────────────────────────────────────
// loadGraph() otherwise runs exactly once, at backend/index.js boot — nothing
// ever calls it again, so a Supabase edit after boot is invisible until the
// process restarts. No admin gate: D-05 deleted requireRole, and a reload is
// idempotent and non-destructive (loadGraph() only swaps the graph in on
// success, so the previous one keeps answering every other route here if
// this fails) — any authenticated user triggering it is acceptable.

// GET /api/intelligence/graph/status — current provenance, no analysis run.
router.get('/graph/status', (req, res) => {
  res.json({ isReady: domain.graph.isReady(), source: domain.graph.source() })
})

// POST /api/intelligence/graph/reload — see header comment above.
router.post('/graph/reload', async (req, res) => {
  try {
    const stats = await domain.graph.load()
    res.json({ reloaded: true, stats, loadedAt: domain.graph.source().loadedAt })
  } catch (e) {
    res.status(502).json({ reloaded: false, error: e.message, source: domain.graph.source() })
  }
})

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
      ownershipCoverage: '/api/intelligence/ownership-coverage',
      capabilityInventory: '/api/intelligence/capability-inventory',
      continuity: '/api/intelligence/continuity',
      governance: '/api/intelligence/governance',
    },
  })
})

module.exports = router
