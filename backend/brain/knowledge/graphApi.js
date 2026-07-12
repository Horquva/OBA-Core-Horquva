/**
 * GRAPH APIs (Huzaifa — Knowledge Platform Component 8)
 * ----------------------------------------------------
 * The official, ONLY gateway to organizational knowledge. No consumer accesses
 * graph storage directly. Powers the Executive Operating System, Graph
 * Explorer, OBA, Digital Twin, Brain Runtime, Decision Support and Briefings.
 *
 * Exposes: Module Registry API, Capability Registry API, Knowledge Graph API,
 * Intelligence Exchange API.
 *
 * Mounted under /api/brain (see brain/index.js).
 */

function buildGraphRouter(brain) {
  const express = require('express')
  const router = express.Router()
  const { moduleRegistry, capabilityRegistry, graph, intelligenceBus } = brain

  // ───── Module Registry API ─────
  router.get('/registry/modules', (req, res) => {
    const { owner, layer } = req.query
    let list = moduleRegistry.list()
    if (owner) list = list.filter((m) => m.owner.toLowerCase() === String(owner).toLowerCase())
    if (layer) list = list.filter((m) => m.layer === layer)
    res.json({
      total: list.length,
      discovered: moduleRegistry.list().length,
      complete: moduleRegistry.isComplete(),
      modules: list.map((m) => ({
        code: m.code, name: m.name, owner: m.owner, layer: m.layer,
        question: m.question, version: m.version, health: m.health,
        dependsOn: m.dependsOn, consumers: m.consumers,
      })),
    })
  })

  router.get('/registry/modules/:code', (req, res) => {
    const m = moduleRegistry.get(req.params.code.toUpperCase())
    if (!m) return res.status(404).json({ error: 'Module not found' })
    res.json(m)
  })

  router.get('/registry/health', (req, res) => res.json(moduleRegistry.health()))

  // ───── Capability Registry API ─────
  router.get('/registry/capabilities', (req, res) => {
    const { discover } = req.query
    const list = discover ? capabilityRegistry.discover(discover) : capabilityRegistry.list()
    res.json({ total: list.length, capabilities: list })
  })

  router.get('/registry/capabilities/:id', (req, res) => {
    const c = capabilityRegistry.get(req.params.id)
    if (!c) return res.status(404).json({ error: 'Capability not found' })
    res.json(c)
  })

  // ───── Knowledge Graph API ─────
  router.get('/graph/stats', (req, res) => res.json(graph.stats()))

  router.get('/graph/entities', (req, res) => {
    const { type, status, owner } = req.query
    const list = graph.queryEntities({ type, status, owner })
    res.json({ total: list.length, entities: list })
  })

  router.get('/graph/entities/:id', (req, res) => {
    const e = graph.getEntity(req.params.id)
    if (!e) return res.status(404).json({ error: 'Entity not found' })
    res.json(e)
  })

  router.get('/graph/relationships', (req, res) => {
    const { type } = req.query
    res.json({ relationships: graph.relationships.list(type) })
  })

  router.get('/graph/traverse/:id', (req, res) => {
    const depth = Math.min(parseInt(req.query.depth, 10) || 2, 5)
    res.json(graph.traverse(req.params.id, depth))
  })

  router.get('/graph/dependency-path/:id', (req, res) => {
    res.json({ path: graph.dependencyPath(req.params.id) })
  })

  router.get('/graph/search', (req, res) => {
    res.json({ results: graph.searchContext(req.query.q || '') })
  })

  router.get('/graph/validate', (req, res) => res.json(graph.validate()))

  // ───── Intelligence Exchange API ─────
  router.get('/intelligence/history', (req, res) => {
    res.json({ history: intelligenceBus.history(50) })
  })

  return router
}

module.exports = { buildGraphRouter }
