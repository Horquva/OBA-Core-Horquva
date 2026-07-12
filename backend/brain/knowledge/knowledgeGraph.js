/**
 * UNIFIED ORGANIZATIONAL KNOWLEDGE GRAPH (Huzaifa — Component 4)
 * -------------------------------------------------------------
 * The single most important system: the Organizational Brain's long-term
 * memory of organizational reality. Connects every constitutional module's
 * intelligence into one continuously evolving model. No module maintains its
 * own disconnected version of reality — all intelligence synchronizes here and
 * this graph becomes the shared, authoritative organizational truth.
 *
 * Wraps the Entity Registry + Relationship Registry and provides traversal,
 * querying, dependency-path analysis, and context search. No consumer should
 * access storage directly — everything goes through this graph (and Graph APIs).
 */

const EntityRegistry = require('./entityRegistry')
const RelationshipRegistry = require('./relationshipRegistry')

class KnowledgeGraph {
  constructor() {
    this.entities = new EntityRegistry()
    this.relationships = new RelationshipRegistry(this.entities)
    this._syncCount = 0
  }

  // ─── Mutation (used by modules via Intelligence Exchange) ───
  addEntity(spec) {
    return this.entities.upsert(spec)
  }

  addRelationship(spec) {
    return this.relationships.add(spec)
  }

  /**
   * Synchronize an intelligence package into the graph: its declared
   * relationships and entities are merged in. Called automatically whenever a
   * module publishes intelligence.
   */
  sync(intelligencePackage) {
    const { relationships = [], context = {} } = intelligencePackage
    const entitiesIn = context.entities || []
    for (const e of entitiesIn) this.addEntity(e)
    for (const r of relationships) {
      // relationships may reference entities by {type,name}; resolve to ids
      const from = r.fromId || this._resolve(r.from)
      const to = r.toId || this._resolve(r.to)
      if (from && to) this.addRelationship({ ...r, from, to })
    }
    this._syncCount++
    return true
  }

  _resolve(ref) {
    if (!ref) return null
    if (typeof ref === 'string' && this.entities.has(ref)) return ref
    if (ref && ref.type && ref.name) {
      const e = this.entities.find(ref.type, ref.name)
      return e ? e.id : null
    }
    return null
  }

  // ─── Query ───
  getEntity(id) {
    return this.entities.get(id)
  }

  queryEntities({ type, status, owner } = {}) {
    return this.entities.list(type).filter(
      (e) =>
        (status ? e.status === status : true) &&
        (owner ? e.owner === owner : true)
    )
  }

  /** Breadth-first traversal from an entity up to `depth` hops. */
  traverse(startId, depth = 2) {
    if (!this.entities.has(startId)) return { nodes: [], edges: [] }
    const visited = new Set([startId])
    const nodes = [this.entities.get(startId)]
    const edges = []
    let frontier = [startId]
    for (let d = 0; d < depth; d++) {
      const next = []
      for (const id of frontier) {
        for (const r of this.relationships.neighbors(id)) {
          edges.push(r)
          const other = r.from === id ? r.to : r.from
          if (!visited.has(other) && this.entities.has(other)) {
            visited.add(other)
            nodes.push(this.entities.get(other))
            next.push(other)
          }
        }
      }
      frontier = next
    }
    return { nodes, edges: dedupeEdges(edges) }
  }

  /** Follow depends_on edges to find the full dependency chain of an entity. */
  dependencyPath(startId, maxDepth = 6) {
    const path = []
    const visited = new Set()
    const walk = (id, depth) => {
      if (depth > maxDepth || visited.has(id)) return
      visited.add(id)
      for (const r of this.relationships.from(id)) {
        if (r.type === 'depends_on') {
          path.push({ from: id, to: r.to, criticality: r.criticality })
          walk(r.to, depth + 1)
        }
      }
    }
    walk(startId, 0)
    return path
  }

  /** Search entities by free-text over name + type + metadata. */
  searchContext(query) {
    const q = String(query || '').toLowerCase()
    return this.entities.list().filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        JSON.stringify(e.metadata).toLowerCase().includes(q)
    )
  }

  stats() {
    return {
      entities: this.entities.count(),
      relationships: this.relationships.count(),
      syncs: this._syncCount,
    }
  }

  validate() {
    const e = this.entities.validate()
    const r = this.relationships.validate()
    return {
      valid: e.valid && r.valid,
      entities: e,
      relationships: r,
    }
  }
}

function dedupeEdges(edges) {
  const seen = new Set()
  const out = []
  for (const e of edges) {
    if (!seen.has(e.id)) {
      seen.add(e.id)
      out.push(e)
    }
  }
  return out
}

module.exports = KnowledgeGraph
