/**
 * ORGANIZATIONAL BRAIN — an analysis library, not a runtime
 * ---------------------------------------------------------
 * Holds the organizational Knowledge Graph and runs the 24-module analysis
 * catalog over it (M01–M55, most codes retired — see
 * data/constitutional-modules.js's header for the full retirement history).
 * Callers ask for one analysis by code; its declared dependencies run first
 * so it receives the same `priorIntel` it always has.
 *
 * This replaces a 1,154-line constitutional runtime — execution engine, event
 * bus, communication layer, module and capability registries, brain state
 * manager, intelligence bus and an /api/brain surface — none of which had a
 * consumer outside its own self-description. See
 * docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
 *
 * What was kept, deliberately:
 *   - the dependency ordering, byte-identical to the old engine's (Kahn's with
 *     a sorted queue).
 *   - `createIntelligence` / `propagateConfidence`, so every analysis returns
 *     the same validated package shape it always did.
 *
 * The two constitutional ordering rules this library used to also enforce —
 * Truth (M46) before Advisor (M48), and Meta-Brain (M55) last — were retired
 * with those three modules on 2026-09-02 (see constitutional-modules.js):
 * each had a richer, already-live SQL/derived.js answer to the same question,
 * so the rule that gated them no longer has anything to gate.
 */

const KnowledgeGraph = require('./knowledge/knowledgeGraph')
const { loadFromSupabase } = require('./knowledge/graphLoader')
const { createIntelligence, propagateConfidence } = require('./knowledge/intelligenceExchange')
const { MODULES } = require('./data/constitutional-modules')
const IMPL = require('./modules/implementations')

const BY_CODE = Object.fromEntries(MODULES.map((m) => [m.code, m]))
const BY_SLUG = Object.fromEntries(MODULES.map((m) => [m.slug, m]))

/**
 * Accept either the catalog code ('M42') or its readable slug ('culture').
 * The code remains canonical — dependsOn and the ordering rules key on it, and
 * resolveOrder() returns codes — but callers reading a route file get to write
 * the name. Returns null for anything unknown.
 */
function toCode(idOrSlug) {
  if (BY_CODE[idOrSlug]) return idOrSlug
  if (BY_SLUG[idOrSlug]) return BY_SLUG[idOrSlug].code
  return null
}

let graph = null
let source = { live: false, stats: null, loadedAt: null, error: null }

/**
 * Build the graph from Supabase and swap it in atomically. A failure leaves any
 * previously-loaded graph in place and is recorded on `source` — a caller that
 * only logs the rejection would otherwise leave the brain answering from a
 * stale graph with nothing saying so.
 */
async function loadGraph() {
  const next = new KnowledgeGraph()
  try {
    await loadFromSupabase(next)
    const validation = next.validate()
    if (!validation.valid) {
      throw new Error(
        'refusing to swap in an invalid graph — ' +
        validation.entities.errors.concat(validation.relationships.errors).join('; '),
      )
    }
    graph = next
    source = { live: true, stats: next.stats(), loadedAt: new Date().toISOString(), error: null }
    return source.stats
  } catch (err) {
    source = { ...source, live: false, error: err.message, failedAt: new Date().toISOString() }
    throw err
  }
}

function getGraph() {
  return graph
}

/**
 * Use an already-built graph instead of loading from Supabase. `source.live`
 * stays false so provenance never claims this came from the database — callers
 * checking graphSource() before trusting an answer still get the truth.
 */
function setGraph(next) {
  if (!next || typeof next.stats !== 'function') throw new Error('setGraph expects a KnowledgeGraph')
  graph = next
  source = { live: false, stats: next.stats(), loadedAt: new Date().toISOString(), error: null, provided: true }
  return source.stats
}

function isReady() {
  return graph !== null
}

/** Provenance of what is currently being answered from. Check this first. */
function graphSource() {
  return { ...source }
}

/**
 * Topological order for `codes` plus every transitive dependency.
 * Kahn's algorithm with a sorted queue, matching the retired execution engine
 * exactly so results do not shift under the refactor.
 */
function resolveOrder(ids) {
  const codes = ids.map(toCode)
  const unknown = ids.filter((_, i) => !codes[i])
  if (unknown.length) throw new Error(`Unknown analyses: ${unknown.join(', ')}`)
  const set = new Set(codes)
  let changed = true
  while (changed) {
    changed = false
    for (const code of [...set]) {
      const m = BY_CODE[code]
      if (!m) continue
      for (const dep of m.dependsOn) {
        if (!set.has(dep)) { set.add(dep); changed = true }
      }
    }
  }

  const all = [...set]
  const indeg = new Map(all.map((c) => [c, 0]))
  const edges = new Map(all.map((c) => [c, []]))
  for (const c of all) {
    for (const dep of BY_CODE[c].dependsOn) {
      if (set.has(dep)) { edges.get(dep).push(c); indeg.set(c, indeg.get(c) + 1) }
    }
  }

  const queue = all.filter((c) => indeg.get(c) === 0).sort()
  const order = []
  while (queue.length) {
    const c = queue.shift()
    order.push(c)
    for (const next of edges.get(c)) {
      indeg.set(next, indeg.get(next) - 1)
      if (indeg.get(next) === 0) queue.push(next)
    }
    queue.sort()
  }
  if (order.length !== all.length) {
    throw new Error('Circular dependency among analyses: ' + all.join(', '))
  }

  return order
}

/** Invoke one analysis and wrap its output in a validated intelligence package. */
async function invoke(code, context) {
  const m = BY_CODE[code]
  const out = await IMPL[code]({ graph }, context)
  return createIntelligence({
    sourceModule: code,
    type: out.type || 'generic',
    payload: out.payload || {},
    confidence: out.confidence != null ? out.confidence : 0.5,
    evidence: out.evidence || [],
    recommendations: out.recommendations || [],
    relationships: out.relationships || [],
    context: {},
    consumers: m.consumers || [],
    version: m.version,
    authored: !!out.authored,
    definition: out.definition || '',
  })
}

/**
 * Run one analysis, having first run everything it depends on so that
 * `context.priorIntel` is populated. Returns the requested analysis's package.
 */
async function run(id, context = {}) {
  const code = toCode(id)
  if (!code) throw new Error(`Unknown analysis: ${id}`)
  if (!graph) throw new Error('Brain graph has not been loaded — call loadGraph() first')

  const order = resolveOrder([code])
  const priorIntel = []
  let result = null
  for (const c of order) {
    const intel = await invoke(c, { ...context, priorIntel })
    priorIntel.push({ module: c, package: intel })
    if (c === code) result = intel
  }
  return result
}

/**
 * Run several analyses in dependency order and return all of them, plus a
 * fused confidence (weakest-link/average — see propagateConfidence()).
 */
async function runMany(ids, context = {}) {
  const unknown = ids.filter((c) => !toCode(c))
  if (unknown.length) throw new Error(`Unknown analyses: ${unknown.join(', ')}`)
  if (!graph) throw new Error('Brain graph has not been loaded — call loadGraph() first')
  const order = resolveOrder(ids)
  const priorIntel = []
  const results = []
  for (const c of order) {
    const intel = await invoke(c, { ...context, priorIntel })
    priorIntel.push({ module: c, package: intel })
    results.push({ module: c, ...intel })
  }
  const fusedConfidence = propagateConfidence(results.map((r) => ({ confidence: r.confidence ?? 0 })))
  return {
    order,
    results,
    fusedConfidence: Math.round(fusedConfidence * 100) / 100,
  }
}

module.exports = {
  loadGraph, getGraph, setGraph, isReady, graphSource,
  run, runMany, resolveOrder, toCode,
  MODULES,
}
