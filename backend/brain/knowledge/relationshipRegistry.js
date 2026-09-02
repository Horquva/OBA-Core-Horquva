/**
 * RELATIONSHIP REGISTRY (Huzaifa — Knowledge Platform Component 6)
 * ---------------------------------------------------------------
 * Organizations are networks of relationships, not isolated entities. Records
 * how every entity connects (owns, manages, reports_to, depends_on, ...).
 * Relationships are first-class intelligence assets and must NEVER exist
 * without valid entities.
 */

const crypto = require('crypto')
const ontology = require('../data/ontology')

class RelationshipRegistry {
  constructor(entityRegistry) {
    this.entities = entityRegistry
    this._rels = new Map() // id -> relationship
    this._dedupe = new Set() // `${from}|${type}|${to}`
  }

  /**
   * `metadata` carries provenance: which system of record asserted this edge,
   * and on what basis. BUILD_SPEC D1 requires it on every `owns` edge — the
   * ownership precedence rules (human > codeowners > team_permission >
   * contribution) all read `metadata.source`. Note this signature destructures
   * a fixed field list, so any key not named here is silently dropped; that is
   * why provenance goes inside `metadata` rather than as a loose top-level key.
   */
  add({ from, to, type, confidence = 1, evidence = [], criticality = 'medium', direction = 'directed', failureImpact = null, metadata = {} }) {
    ontology.assertRelationshipType(type)
    if (!this.entities.has(from)) throw new Error(`Relationship rejected: source entity ${from} does not exist`)
    if (!this.entities.has(to)) throw new Error(`Relationship rejected: target entity ${to} does not exist`)

    const key = `${from}|${type}|${to}`
    if (this._dedupe.has(key)) {
      return [...this._rels.values()].find((r) => r.from === from && r.to === to && r.type === type)
    }

    const id = `rel_${crypto.randomBytes(6).toString('hex')}`
    const rel = {
      id, from, to, type,
      confidence, evidence, criticality, direction, failureImpact, metadata,
      timestamp: new Date().toISOString(),
    }
    this._rels.set(id, rel)
    this._dedupe.add(key)
    return rel
  }

  list(type) {
    const all = [...this._rels.values()]
    return type ? all.filter((r) => r.type === type) : all
  }

  from(entityId) {
    return [...this._rels.values()].filter((r) => r.from === entityId)
  }

  to(entityId) {
    return [...this._rels.values()].filter((r) => r.to === entityId)
  }

  neighbors(entityId) {
    return [...this._rels.values()].filter((r) => r.from === entityId || r.to === entityId)
  }

  count() {
    return this._rels.size
  }

  /** Every relationship must reference existing entities (integrity). */
  validate() {
    const errors = []
    for (const r of this._rels.values()) {
      if (!this.entities.has(r.from)) errors.push(`relationship ${r.id} dangling source ${r.from}`)
      if (!this.entities.has(r.to)) errors.push(`relationship ${r.id} dangling target ${r.to}`)
      if (!ontology.isValidRelationshipType(r.type)) errors.push(`relationship ${r.id} invalid type ${r.type}`)
    }
    return { valid: errors.length === 0, errors, total: this._rels.size }
  }
}

module.exports = RelationshipRegistry
