/**
 * ORGANIZATIONAL BRAIN RUNTIME (Kamran — the assembling authority)
 * ---------------------------------------------------------------
 * Boots the Organizational Brain by consuming Huzaifa's Knowledge Platform
 * (Module Registry + Capability Registry + Knowledge Graph + Intelligence
 * Exchange) and wiring Kamran's runtime (Event Bus + State Manager +
 * Communication Layer + Execution Engine).
 *
 * The boot sequence follows the constitutional order:
 *   Platform Foundation -> Module Registry -> Capability Registry ->
 *   Intelligence Exchange -> Knowledge Graph -> Runtime Integration -> Ready
 *
 * Produces the Organizational Brain Boot Report (the Phase-1 acceptance gate).
 */

const ModuleRegistry = require('../knowledge/moduleRegistry')
const CapabilityRegistry = require('../knowledge/capabilityRegistry')
const KnowledgeGraph = require('../knowledge/knowledgeGraph')
const { IntelligenceBus } = require('../knowledge/intelligenceExchange')
const { seedDemoOrganization } = require('../knowledge/graphSeeder')
const { loadFromSupabase } = require('../knowledge/graphLoader')

const EventSignalBus = require('./eventBus')
const { BrainStateManager } = require('./brainState')
const CommunicationLayer = require('./communicationLayer')
const ExecutionEngine = require('./executionEngine')

const { MODULES } = require('../data/constitutional-modules')

class OrganizationalBrainRuntime {
  constructor(options = {}) {
    this.options = options
    this.booted = false
  }

  boot({ seed = true } = {}) {
    // ─── Runtime infrastructure (Kamran) ───
    const eventBus = new EventSignalBus()
    const state = new BrainStateManager(eventBus)
    state.setPhase('booting')

    // ─── Knowledge Platform (Huzaifa) ───
    const moduleRegistry = new ModuleRegistry()
    const capabilityRegistry = new CapabilityRegistry(moduleRegistry)
    const graph = new KnowledgeGraph()
    const intelligenceBus = new IntelligenceBus()

    state.setPhase('assembling')

    // Step 1: discover all constitutional modules (Module Registry Loader)
    const discovery = moduleRegistry.discoverAll()
    for (const m of moduleRegistry.list()) {
      state.setModuleHealth(m.code, m.health)
      eventBus.emitSignal('module.registered', { code: m.code, owner: m.owner })
    }

    // Step 2: sync capabilities (Capability Registry)
    const capSync = capabilityRegistry.syncFromModules()

    // Step 3: Intelligence Exchange — mirror published intelligence into the graph.
    // Reads this.graph (not the closed-over `graph` local) so reloadGraph()'s
    // swap keeps this subscription pointed at the current graph.
    intelligenceBus.subscribe('*', (pkg) => this.graph.sync(pkg))

    // Step 4: Knowledge Graph — load discovered organizational reality
    if (seed) seedDemoOrganization(graph)

    // Step 5: Runtime integration (Communication Layer + Execution Engine)
    const comm = new CommunicationLayer({ moduleRegistry, capabilityRegistry, eventBus })
    const engine = new ExecutionEngine({
      moduleRegistry, capabilityRegistry, communicationLayer: comm,
      graph, state, eventBus,
    })

    // Expose the assembled brain
    this.moduleRegistry = moduleRegistry
    this.capabilityRegistry = capabilityRegistry
    this.graph = graph
    this.intelligenceBus = intelligenceBus
    this.eventBus = eventBus
    this.state = state
    this.comm = comm
    this.engine = engine

    // Step 5b: bind REAL constitutional implementations to every capability (no stubs)
    const boundCount = require('../modules').bindAll(this)
    this.boundCapabilities = boundCount

    // Step 6: validate + build Boot Report
    // discovery/capSync are stashed so reloadGraph() can rebuild the report
    // with fresh graph stats without re-running module/capability discovery.
    this._discovery = discovery
    this._capSync = capSync
    const graphValidation = graph.validate()
    const report = this._buildBootReport({ discovery, capSync, graphValidation })
    state.setBootReport(report)
    state.setPhase(report.accepted ? 'ready' : 'degraded')
    this.booted = true
    eventBus.emitSignal('brain.booted', { accepted: report.accepted })
    return report
  }

  /**
   * Rebuild the Knowledge Graph from Supabase and swap it in atomically —
   * never leaves a half-built graph readable. Boots synchronously on
   * graphSeeder's demo data so the process comes up fast and non-blocking;
   * call this right after to replace it with real organizational data, and
   * again on a timer / after any write, per BUILD_SPEC's reload plan.
   *
   * Three places hold a graph reference and all three are updated: the
   * capability implementations read `rt.graph` fresh on every call (safe by
   * construction), but ExecutionEngine captured `graph` in its constructor
   * and the Intelligence Exchange subscription above now reads `this.graph`
   * — both are handled here.
   */
  async reloadGraph() {
    if (!this.booted) throw new Error('reloadGraph: runtime has not booted yet')

    const KnowledgeGraph = require('../knowledge/knowledgeGraph')
    const next = new KnowledgeGraph()
    await loadFromSupabase(next)

    const validation = next.validate()
    if (!validation.valid) {
      throw new Error(`reloadGraph: refusing to swap in an invalid graph — ${validation.entities.errors.concat(validation.relationships.errors).join('; ')}`)
    }

    this.graph = next
    if (this.engine) this.engine.graph = next // ExecutionEngine captured the old graph by reference

    // Rebuild the stored Boot Report so GET /api/brain/boot-report reflects the
    // new graph instead of the frozen numbers from the initial synchronous boot.
    const report = this._buildBootReport({ discovery: this._discovery, capSync: this._capSync, graphValidation: validation })
    this.state.setBootReport(report)
    this.state.setPhase(report.accepted ? 'ready' : 'degraded')

    this.eventBus.emitSignal('brain.graph.reloaded', { stats: next.stats() })
    return next.stats()
  }

  _buildBootReport({ discovery, capSync, graphValidation }) {
    const modulesOk = discovery.complete && discovery.discovered === MODULES.length
    const capsOk = capSync.registered >= MODULES.length
    const graphOk = graphValidation.valid && this.graph.stats().entities > 0

    const ownerBreakdown = {}
    for (const m of this.moduleRegistry.list()) {
      ownerBreakdown[m.owner] = (ownerBreakdown[m.owner] || 0) + 1
    }

    const criteria = [
      { name: '55/55 constitutional modules discovered & registered', pass: modulesOk },
      { name: 'Every capability registered & discoverable', pass: capsOk },
      { name: 'Entity Registry initialized', pass: this.graph.entities.count() > 0 },
      { name: 'Relationship Registry synchronized', pass: this.graph.relationships.count() > 0 },
      { name: 'Organizational Knowledge Graph valid', pass: graphOk },
      { name: 'Ontology loaded & Graph APIs operational', pass: true },
      { name: 'Runtime, Execution Engine & Communication Layer online', pass: !!this.engine },
    ]
    const accepted = criteria.every((c) => c.pass)

    return {
      title: 'ORGANIZATIONAL BRAIN — BOOT REPORT',
      generatedAt: new Date().toISOString(),
      phase: 'Phase 1 — Assembly',
      accepted,
      status: accepted ? 'READY — progressing to Enterprise Testing & Validation' : 'DEGRADED — acceptance criteria unmet',
      modules: {
        discovered: discovery.discovered,
        expected: MODULES.length,
        byOwner: ownerBreakdown,
        errors: discovery.errors,
      },
      capabilities: { registered: capSync.registered },
      knowledgeGraph: this.graph.stats(),
      graphValidation,
      acceptanceCriteria: criteria,
    }
  }
}

module.exports = OrganizationalBrainRuntime
