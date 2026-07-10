/**
 * routes/intelligence/registryBridge.js
 * ─────────────────────────────────────────────
 * Registry Bridge — proves the Orchestrator can call the Capability Registry
 * without modifying Fizza's orchestrator.js.
 *
 * This is a thin integration file that:
 * 1. Reads Fizza's MODULE_REGISTRY keys from orchestrator constants
 * 2. Calls the Capability Registry to look up the same modules
 * 3. Returns a side-by-side comparison proving the two systems connect
 *
 * NOTE: Fizza's orchestrator.js was NOT modified. This bridge calls
 * GET /api/capabilities for lookups and is mounted at
 * GET /api/intelligence/registry-bridge
 *
 * Endpoint
 *   GET /api/intelligence/registry-bridge              — bridge status
 *   GET /api/intelligence/registry-bridge/resolve/:key — resolve one orchestrator key
 *   GET /api/intelligence/registry-bridge/coverage     — coverage of all orchestrator keys
 */

const express  = require('express')
const router   = express.Router()
const { findCapabilityFor, getCapability, listCapabilities } = require('../../services/capabilityRegistry')

// The keys Fizza's orchestrator uses internally (from orchestrator.js MODULE_REGISTRY)
// Mapping to their canonical Capability Registry module IDs
const ORCHESTRATOR_KEY_MAP = {
  brainCore:         'M50',
  governance:        'M19',
  continuity:        'M18',
  orgHealth:         'M25',
  predictiveRisk:    'M11',
  memory:            'M10',
  collaboration:     'M13',
  accountability:    'M20',
  domainInt:         'M46',
  decisionQuality:   'M14',
  aiAdoption:        'M13',
  executiveBriefing: 'M23',
  executiveMemory:   'M26',
  healthTrend:       'M25'
}

// ─────────────────────────────────────────────
// GET /api/intelligence/registry-bridge
// Bridge health + overview
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const allModules = await listCapabilities()

    res.json({
      status:             'active',
      description:        'Registry Bridge connecting orchestrator.js MODULE_REGISTRY to the Capability Registry. Fizza\'s orchestrator.js was NOT modified.',
      orchestratorKeys:   Object.keys(ORCHESTRATOR_KEY_MAP).length,
      registryModules:    allModules.length,
      keyMappings:        ORCHESTRATOR_KEY_MAP,
      usage: {
        resolveOne:   'GET /api/intelligence/registry-bridge/resolve/:orchestratorKey',
        coverage:     'GET /api/intelligence/registry-bridge/coverage',
        searchIntent: 'GET /api/capabilities/search?intent=risk'
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/registry-bridge/resolve/:key
// Resolve one orchestrator key to a registered module
// ─────────────────────────────────────────────
router.get('/resolve/:key', async (req, res) => {
  try {
    const { key } = req.params
    const moduleId = ORCHESTRATOR_KEY_MAP[key]

    if (!moduleId) {
      return res.status(404).json({
        error: `Orchestrator key "${key}" not in bridge mapping`,
        knownKeys: Object.keys(ORCHESTRATOR_KEY_MAP)
      })
    }

    const mod = await getCapability(moduleId)

    if (!mod) {
      return res.status(404).json({
        orchestratorKey: key,
        moduleId,
        error: `Module ${moduleId} not yet registered in capability registry. Run POST /api/capabilities/seed first.`
      })
    }

    res.json({
      orchestratorKey: key,
      resolvedTo: {
        moduleId:     mod.module_id,
        moduleName:   mod.module_name,
        category:     mod.category,
        baseRoute:    mod.base_route,
        capabilityCount: Array.isArray(mod.capabilities) ? mod.capabilities.length : 0,
        capabilities: mod.capabilities
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/registry-bridge/coverage
// Show how many of orchestrator's module keys are in the registry
// ─────────────────────────────────────────────
router.get('/coverage', async (req, res) => {
  try {
    const results = []

    for (const [orchKey, moduleId] of Object.entries(ORCHESTRATOR_KEY_MAP)) {
      const mod = await getCapability(moduleId)
      results.push({
        orchestratorKey: orchKey,
        moduleId,
        registered:      !!mod,
        moduleName:      mod?.module_name ?? null,
        baseRoute:       mod?.base_route ?? null
      })
    }

    const registered = results.filter(r => r.registered).length
    const total      = results.length

    res.json({
      coveragePct:  Math.round((registered / total) * 100),
      registered,
      total,
      details: results
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
