/**
 * routes/capabilities/capabilities.js
 * ─────────────────────────────────────────────
 * Capability Registry routes — lets the orchestrator and external clients
 * discover what modules exist and what they can do.
 *
 * Endpoints
 *   GET /api/capabilities               — list all registered modules
 *   GET /api/capabilities/search?intent — naive keyword match
 *   GET /api/capabilities/:moduleId     — one module's capabilities
 */

const express  = require('express')
const router   = express.Router()
const { listCapabilities, getCapability, findCapabilityFor } = require('../../services/capabilityRegistry')

// ─────────────────────────────────────────────
// GET /api/capabilities
// List all registered modules, optional ?category= filter
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    const modules = await listCapabilities(category || null)

    const countsByCategory = modules.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1
      return acc
    }, {})

    res.json({
      totalModules: modules.length,
      filters: { category: category || null },
      countsByCategory,
      modules: modules.map(m => ({
        moduleId:     m.module_id,
        moduleName:   m.module_name,
        category:     m.category,
        baseRoute:    m.base_route,
        capabilityCount: Array.isArray(m.capabilities) ? m.capabilities.length : 0,
        capabilities: m.capabilities,
        status:       m.status,
        registeredAt: m.registered_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/capabilities/search?intent=...
// Keyword match against module names and capability descriptions
// IMPORTANT: this route must come BEFORE /:moduleId
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { intent } = req.query
    if (!intent) return res.status(400).json({ error: 'Query param ?intent= is required' })

    const matches = await findCapabilityFor(intent)

    res.json({
      intent,
      totalMatches: matches.length,
      modules: matches.map(m => ({
        moduleId:    m.module_id,
        moduleName:  m.module_name,
        category:    m.category,
        baseRoute:   m.base_route,
        capabilities: m.capabilities,
        status:      m.status
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/capabilities/:moduleId
// One module by moduleId (e.g. 'M11', 'M64', 'core.graph')
// ─────────────────────────────────────────────
router.get('/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params
    const mod = await getCapability(moduleId)

    if (!mod) return res.status(404).json({ error: `Module ${moduleId} not found in registry` })

    res.json({
      moduleId:     mod.module_id,
      moduleName:   mod.module_name,
      category:     mod.category,
      baseRoute:    mod.base_route,
      capabilities: mod.capabilities,
      status:       mod.status,
      registeredAt: mod.registered_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
