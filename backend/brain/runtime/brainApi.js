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

  // Brain lifecycle + boot report
  router.get('/status', (req, res) => {
    res.json({ phase: state.phase, ready: state.isReady(), snapshot: state.snapshot() })
  })

  router.get('/boot-report', (req, res) => {
    const r = state.bootReport()
    if (!r) return res.status(503).json({ error: 'Brain has not booted' })
    res.json(r)
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
      res.json(result)
    } catch (e) {
      res.status(400).json({ error: e.message })
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
