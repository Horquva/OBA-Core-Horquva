/**
 * CAPABILITY REGISTRY (Huzaifa — Knowledge Platform Component 2)
 * -------------------------------------------------------------
 * Modules are implementation units; capabilities are organizational services.
 * The Brain Execution Engine discovers capabilities that answer organizational
 * questions — it never searches for source files. Synchronized dynamically with
 * the Module Registry.
 *
 * Definition of Done: every constitutional capability is discoverable, exposes
 * standardized metadata, and the Execution Engine can invoke capabilities
 * without implementation-specific knowledge.
 */

class CapabilityRegistry {
  constructor(moduleRegistry) {
    this.moduleRegistry = moduleRegistry
    this._capabilities = new Map() // capabilityId -> record
  }

  /** Sync capabilities from every registered module. */
  syncFromModules() {
    this._capabilities.clear()
    for (const m of this.moduleRegistry.list()) {
      for (const cap of m.capabilities) {
        if (this._capabilities.has(cap.id)) {
          throw new Error(`Duplicate capability id rejected: ${cap.id}`)
        }
        this._capabilities.set(cap.id, {
          id: cap.id,
          name: cap.name,
          description: cap.description || '',
          owner: m.code,
          ownerName: m.name,
          inputs: cap.inputs || [],
          outputs: cap.outputs || [],
          version: m.version,
          available: m.health === 'healthy',
        })
      }
    }
    return { registered: this._capabilities.size }
  }

  get(id) {
    return this._capabilities.get(id) || null
  }

  list() {
    return [...this._capabilities.values()]
  }

  /** Find capabilities by a free-text need (name/description/module). */
  discover(query) {
    const q = String(query || '').toLowerCase()
    return this.list().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.owner.toLowerCase() === q ||
        c.id.toLowerCase().includes(q)
    )
  }

  /** Which module provides a capability. */
  providerOf(id) {
    const c = this.get(id)
    return c ? this.moduleRegistry.get(c.owner) : null
  }

  listProviders() {
    return this.list().map((c) => ({ capability: c.id, module: c.owner }))
  }

  isDiscoverable(id) {
    return this._capabilities.has(id)
  }

  count() {
    return this._capabilities.size
  }
}

module.exports = CapabilityRegistry
