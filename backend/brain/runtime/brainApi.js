/**
 * CONSTITUTIONAL API GATEWAY — Brain Runtime endpoints (Kamran)
 * ------------------------------------------------------------
 * The Executive / Constitutional API layer for the Brain Runtime. Authenticates
 * requests conceptually, routes them to constitutional capabilities via the
 * Execution Engine, and returns fused executive intelligence. Never lets a
 * consumer bypass the runtime.
 *
 * Mounted under /api/brain (see brain/index.js).
 */

function buildBrainRouter(brain) {
  const express = require('express')
  const router = express.Router()
  const { state, eventBus, engine, moduleRegistry } = brain

  // Brain lifecycle + boot report.
  //
  // `dataSource` is the field to check before trusting anything else here. The
  // brain boots on a synthetic 16-entity demo graph and swaps in the real
  // Supabase graph asynchronously; `phase` reads 'ready' in both cases, so it
  // cannot tell you which one you are being served. If the swap fails the brain
  // keeps answering from the demo graph indefinitely, and `dataSource.live`
  // is the only thing that says so.
  router.get('/status', (req, res) => {
    res.json({
      phase: state.phase,
      ready: state.isReady(),
      dataSource: state.graph(),
      snapshot: state.snapshot(),
    })
  })

  router.get('/boot-report', (req, res) => {
    const r = state.bootReport()
    if (!r) return res.status(503).json({ error: 'Brain has not booted' })
    // Every other field is a boot-time fact and stays frozen, but the stored
    // report is only rebuilt on a *successful* graph swap — so its sync counters
    // would sit at zero after a failed one, reading as "not attempted yet"
    // rather than "attempted and failed". Overlay the current provenance.
    res.json({ ...r, dataSource: state.graph() })
  })

  router.get('/signals', (req, res) => {
    res.json({ stats: eventBus.stats(), journal: eventBus.journal(50) })
  })

  // Executive request — ask the Brain a constitutional question.
  // body: { modules?: ['M01',...], need?: 'ownership', context?: {} }
  router.post('/ask', async (req, res) => {
    if (!state.isReady()) return res.status(503).json({ error: 'Brain not ready' })
    const { modules, need, context } = req.body || {}
    try {
      const result = await engine.execute({ modules: modules || [], need, context: context || {} })
      // Same reason as /status: this may be answering from the demo graph.
      // dataSource.live is the only thing on this response that says so.
      res.json({ ...result, dataSource: state.graph() })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  // Admin: rebuild the Knowledge Graph from Supabase and swap it in atomically.
  // No auth layer exists yet to actually gate this "admin-only" — see BUILD_SPEC.
  router.post('/reload-graph', async (req, res) => {
    try {
      const stats = await brain.reloadGraph()
      res.json({ reloaded: true, stats, dataSource: state.graph() })
    } catch (e) {
      // A failed reload leaves the previous graph in place. Return what is
      // actually being served so the caller isn't left guessing.
      res.status(500).json({ reloaded: false, error: e.message, dataSource: state.graph() })
    }
  })

  // Preview the constitutional execution order for a set of modules.
  router.post('/plan', (req, res) => {
    const { modules } = req.body || {}
    if (!Array.isArray(modules) || !modules.length)
      return res.status(400).json({ error: 'modules array required' })
    try {
      res.json({ executionOrder: engine.resolveOrder(modules.map((m) => m.toUpperCase())) })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  return router
}

module.exports = { buildBrainRouter }
