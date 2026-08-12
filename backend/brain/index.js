/**
 * ORGANIZATIONAL BRAIN — assembly entry point
 * -------------------------------------------
 * Boots the Brain (Huzaifa's Knowledge Platform + Kamran's Runtime) and exposes
 * a single Express router that mounts every constitutional API under /api/brain.
 *
 * Usage in backend/index.js:
 *   const { mountBrain } = require('./brain')
 *   await mountBrain(app)
 */

const OrganizationalBrainRuntime = require('./runtime/runtime')

let _brain = null

function bootBrain(options = {}) {
  const runtime = new OrganizationalBrainRuntime(options)
  const report = runtime.boot(options)
  _brain = runtime
  return { runtime, report }
}

function getBrain() {
  return _brain
}

/** Boot the Brain and mount its routers on an existing Express app. */
function mountBrain(app, options = {}) {
  const { runtime, report } = bootBrain(options)
  const { buildGraphRouter } = require('./knowledge/graphApi')
  const { buildBrainRouter } = require('./runtime/brainApi')
  const router = require('express').Router()
  router.use(buildGraphRouter(runtime))   // Huzaifa: registry + graph + exchange APIs
  router.use(buildBrainRouter(runtime))   // Kamran: runtime + execution APIs
  router.get('/', (req, res) =>
    res.json({
      brain: 'Horquva Organizational Brain',
      phase: runtime.state.phase,
      accepted: report.accepted,
      endpoints: [
        'GET  /api/brain/status',
        'GET  /api/brain/boot-report',
        'GET  /api/brain/signals',
        'POST /api/brain/ask        { modules|need, context }',
        'POST /api/brain/plan       { modules }',
        'POST /api/brain/reload-graph',
        'GET  /api/brain/registry/modules',
        'GET  /api/brain/registry/capabilities',
        'GET  /api/brain/graph/entities',
        'GET  /api/brain/graph/traverse/:id',
        'GET  /api/brain/graph/dependency-path/:id',
        'GET  /api/brain/graph/validate',
      ],
    })
  )
  app.use('/api/brain', router)
  return { runtime, report }
}

module.exports = { bootBrain, getBrain, mountBrain }
