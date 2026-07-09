/**
 * MODULE REGISTRY LOADER (Huzaifa — Knowledge Platform Component 1)
 * ----------------------------------------------------------------
 * The boot sequence of the Organizational Brain. Discovers every
 * constitutional module (M01–M55) automatically, validates identity,
 * prevents duplicate registration, rejects invalid modules, and becomes the
 * authoritative source of truth for module discovery.
 *
 * Definition of Done:
 *   - 55/55 modules discovered automatically (no manual registration)
 *   - duplicates prevented, invalid modules rejected
 *   - metadata validated, startup completes without registry failures
 */

const { MODULES } = require('../data/constitutional-modules')

class ModuleRegistry {
  constructor() {
    this._modules = new Map() // code -> module record
    this._loaded = false
  }

  _validate(m) {
    if (!m || typeof m !== 'object') throw new Error('Invalid module: not an object')
    if (!/^M[0-9]{2}$/.test(m.code || '')) throw new Error(`Invalid module code: ${m.code}`)
    if (!m.name) throw new Error(`Module ${m.code} missing name`)
    if (!m.owner) throw new Error(`Module ${m.code} missing owner`)
    if (!m.layer) throw new Error(`Module ${m.code} missing layer`)
    if (!Array.isArray(m.capabilities) || m.capabilities.length === 0)
      throw new Error(`Module ${m.code} exposes no capabilities`)
    return true
  }

  register(m) {
    this._validate(m)
    if (this._modules.has(m.code)) {
      throw new Error(`Duplicate module registration rejected: ${m.code}`)
    }
    this._modules.set(m.code, {
      ...m,
      health: 'healthy',
      registeredAt: new Date().toISOString(),
    })
    return this._modules.get(m.code)
  }

  /** Automatic discovery + registration of all constitutional modules. */
  discoverAll() {
    const errors = []
    for (const m of MODULES) {
      try {
        if (!this._modules.has(m.code)) this.register(m)
      } catch (e) {
        errors.push(e.message)
      }
    }
    this._loaded = true
    return {
      discovered: this._modules.size,
      expected: MODULES.length,
      complete: this._modules.size === MODULES.length,
      errors,
    }
  }

  get(code) {
    return this._modules.get(code) || null
  }

  list() {
    return [...this._modules.values()]
  }

  listByOwner(owner) {
    return this.list().filter((m) => m.owner.toLowerCase() === String(owner).toLowerCase())
  }

  listByLayer(layer) {
    return this.list().filter((m) => m.layer === layer)
  }

  setHealth(code, health) {
    const m = this._modules.get(code)
    if (!m) throw new Error(`Unknown module: ${code}`)
    m.health = health
    return m
  }

  health() {
    const all = this.list()
    const healthy = all.filter((m) => m.health === 'healthy').length
    return { total: all.length, healthy, unhealthy: all.length - healthy }
  }

  isComplete() {
    return this._modules.size === MODULES.length
  }
}

module.exports = ModuleRegistry
