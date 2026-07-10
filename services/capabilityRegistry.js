/**
 * services/capabilityRegistry.js
 * ─────────────────────────────────────────────
 * Capability Registry — lets the orchestrator discover and call modules
 * dynamically instead of being hardcoded.  All 55+ constitutional modules
 * plus infrastructure modules are registered here.
 *
 * Exported functions:
 *   registerCapability(moduleId, moduleName, category, baseRoute, capabilities)
 *   getCapability(moduleId)
 *   listCapabilities(category)          — optional category filter
 *   findCapabilityFor(intent)           — naive keyword match
 */

const supabase = require('../supabase')

// ─────────────────────────────────────────────
// registerCapability
// Upserts a module into module_capabilities (match on module_id).
// ─────────────────────────────────────────────
async function registerCapability(moduleId, moduleName, category, baseRoute, capabilities) {
  const { data, error } = await supabase
    .from('module_capabilities')
    .upsert(
      {
        module_id:    moduleId,
        module_name:  moduleName,
        category,
        base_route:   baseRoute,
        capabilities: capabilities,
        status:       'active',
        registered_at: new Date().toISOString()
      },
      { onConflict: 'module_id' }
    )
    .select()
    .single()

  if (error) throw new Error(`[CapabilityRegistry] Failed to register ${moduleId}: ${error.message}`)
  return data
}

// ─────────────────────────────────────────────
// getCapability
// Returns one module's registered capabilities by moduleId.
// ─────────────────────────────────────────────
async function getCapability(moduleId) {
  const { data, error } = await supabase
    .from('module_capabilities')
    .select('*')
    .eq('module_id', moduleId)
    .single()

  if (error) return null
  return data
}

// ─────────────────────────────────────────────
// listCapabilities
// Returns all registered modules, optionally filtered by category.
// ─────────────────────────────────────────────
async function listCapabilities(category) {
  let query = supabase
    .from('module_capabilities')
    .select('*')
    .eq('status', 'active')
    .order('module_id')

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw new Error(`[CapabilityRegistry] listCapabilities failed: ${error.message}`)
  return data || []
}

// ─────────────────────────────────────────────
// findCapabilityFor
// Naive keyword match: checks module_name, category, and capability
// descriptions for the intent string. Returns matching modules.
// ─────────────────────────────────────────────
async function findCapabilityFor(intent) {
  if (!intent) return []

  const all = await listCapabilities()
  const lower = intent.toLowerCase()

  const matches = all.filter(mod => {
    // Check module name and category
    if (mod.module_name.toLowerCase().includes(lower)) return true
    if (mod.category.toLowerCase().includes(lower))    return true
    if (mod.base_route.toLowerCase().includes(lower))  return true

    // Check each capability's description and endpoint
    const caps = Array.isArray(mod.capabilities) ? mod.capabilities : []
    return caps.some(cap =>
      (cap.description || '').toLowerCase().includes(lower) ||
      (cap.endpoint    || '').toLowerCase().includes(lower) ||
      (cap.returns     || '').toLowerCase().includes(lower)
    )
  })

  return matches
}

module.exports = { registerCapability, getCapability, listCapabilities, findCapabilityFor }
