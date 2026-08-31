/**
 * ENTITY REGISTRY (Huzaifa — Knowledge Platform Component 5)
 * ---------------------------------------------------------
 * Every organizational object exists once as an identifiable entity: people,
 * executives, teams, systems, AI tools, projects, workflows, documents,
 * vendors, customers. Each entity carries a unique identity, type, metadata,
 * status, ownership, confidence, and history — so modules reference the SAME
 * entity without duplication (Single Source of Truth).
 */

const crypto = require('crypto')
const ontology = require('../data/ontology')

class EntityRegistry {
  constructor() {
    this._entities = new Map() // id -> entity
    this._byNaturalKey = new Map() // `${type}:${name}` -> id (dedupe)
  }

  _naturalKey(type, name) {
    return `${type}:${String(name).trim().toLowerCase()}`
  }

  /**
   * Upsert an entity. Deduplicates on (type, name) so the same real-world
   * object is never represented twice.
   */
  upsert({ type, name, status = 'active', owner = null, source = 'discovery', confidence = 1, metadata = {} }) {
    ontology.assertEntityType(type)
    if (!name) throw new Error('Entity requires a name')

    const key = this._naturalKey(type, name)
    const existingId = this._byNaturalKey.get(key)
    const now = new Date().toISOString()

    if (existingId) {
      const e = this._entities.get(existingId)
      e.status = status
      e.owner = owner ?? e.owner
      e.confidence = confidence
      e.metadata = { ...e.metadata, ...metadata }
      e.updatedAt = now
      return e
    }

    const id = `ent_${crypto.randomBytes(6).toString('hex')}`
    const entity = {
      id, type, name, status, owner, source,
      confidence, metadata, createdAt: now, updatedAt: now,
    }
    this._entities.set(id, entity)
    this._byNaturalKey.set(key, id)
    return entity
  }

  get(id) {
    return this._entities.get(id) || null
  }

  find(type, name) {
    const id = this._byNaturalKey.get(this._naturalKey(type, name))
    return id ? this._entities.get(id) : null
  }

  list(type) {
    const all = [...this._entities.values()]
    return type ? all.filter((e) => e.type === type) : all
  }

  has(id) {
    return this._entities.has(id)
  }

  count() {
    return this._entities.size
  }

  /** Validate every entity has a valid identity, type and ownership. */
  validate() {
    const errors = []
    for (const e of this._entities.values()) {
      if (!e.id) errors.push(`entity missing id`)
      if (!ontology.isValidEntityType(e.type)) errors.push(`entity ${e.id} invalid type ${e.type}`)
      if (!e.name) errors.push(`entity ${e.id} missing name`)
    }
    return { valid: errors.length === 0, errors, total: this._entities.size }
  }
}

module.exports = EntityRegistry
