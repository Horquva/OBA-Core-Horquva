/**
 * CONSTITUTIONAL COMMUNICATION LAYER (Kamran — Runtime component)
 * --------------------------------------------------------------
 * Enforces the constitutional rule that no module communicates directly with
 * another. Every capability invocation is routed, authenticated against the
 * registry, contract-checked, and its result is validated as a constitutional
 * intelligence package before it flows onward. This protects modularity and
 * constitutional integrity.
 */

const { validateIntelligence } = require('../knowledge/intelligenceExchange')

class CommunicationLayer {
  constructor({ moduleRegistry, capabilityRegistry, eventBus }) {
    this.moduleRegistry = moduleRegistry
    this.capabilityRegistry = capabilityRegistry
    this.eventBus = eventBus
    this._handlers = new Map() // capabilityId -> async fn(context) => intelligencePackage
  }

  /** A module binds an executable handler to one of its declared capabilities. */
  bindCapability(capabilityId, handler) {
    if (!this.capabilityRegistry.isDiscoverable(capabilityId)) {
      throw new Error(`Cannot bind unknown capability: ${capabilityId}`)
    }
    this._handlers.set(capabilityId, handler)
  }

  hasHandler(capabilityId) {
    return this._handlers.has(capabilityId)
  }

  /**
   * Route a request to a capability through the constitutional layer.
   * Returns a validated intelligence package.
   */
  async invoke(capabilityId, context = {}) {
    const cap = this.capabilityRegistry.get(capabilityId)
    if (!cap) throw new Error(`Capability not found: ${capabilityId}`)

    const owner = this.moduleRegistry.get(cap.owner)
    if (!owner || owner.health !== 'healthy') {
      throw new Error(`Module ${cap.owner} is unavailable for capability ${capabilityId}`)
    }

    this.eventBus.emitSignal('capability.invoked', { capabilityId, module: cap.owner })

    const handler = this._handlers.get(capabilityId)
    if (!handler) {
      // No stubs in production: every constitutional capability must be implemented.
      throw new Error(`No constitutional implementation bound for capability ${capabilityId} (module ${cap.owner})`)
    }
    const result = await handler(context)

    const { valid, errors } = validateIntelligence(result)
    if (!valid) {
      throw new Error(`Capability ${capabilityId} returned non-constitutional intelligence: ${errors.join(', ')}`)
    }
    this.eventBus.emitSignal('capability.completed', { capabilityId, module: cap.owner, confidence: result.confidence })
    return result
  }
}

module.exports = CommunicationLayer
