/**
 * BRAIN EXECUTION ENGINE (Kamran — Runtime component)
 * --------------------------------------------------
 * Orchestrates constitutional module execution to answer a request. It:
 *   1. discovers required capabilities (via Capability Registry — Huzaifa)
 *   2. resolves module dependencies into a safe execution order (topological)
 *   3. enforces constitutional rules (Truth M46 gates Advisor M48; Meta-Brain
 *      M55 always runs last)
 *   4. invokes each capability through the Communication Layer
 *   5. fuses the resulting intelligence into one coherent executive output
 *
 * Discovery Before Execution: the engine never hard-codes module references.
 */

const crypto = require('crypto')
const { propagateConfidence } = require('../knowledge/intelligenceExchange')

class ExecutionEngine {
  constructor({ moduleRegistry, capabilityRegistry, communicationLayer, graph, state, eventBus }) {
    this.moduleRegistry = moduleRegistry
    this.capabilityRegistry = capabilityRegistry
    this.comm = communicationLayer
    this.graph = graph
    this.state = state
    this.eventBus = eventBus
  }

  /** Topologically order module codes by dependsOn (Kahn's algorithm). */
  resolveOrder(moduleCodes) {
    const set = new Set(moduleCodes)
    // pull in transitive dependencies
    let changed = true
    while (changed) {
      changed = false
      for (const code of [...set]) {
        const m = this.moduleRegistry.get(code)
        if (!m) continue
        for (const dep of m.dependsOn) {
          if (!set.has(dep)) {
            set.add(dep)
            changed = true
          }
        }
      }
    }

    const codes = [...set]
    const indeg = new Map(codes.map((c) => [c, 0]))
    const edges = new Map(codes.map((c) => [c, []]))
    for (const c of codes) {
      const m = this.moduleRegistry.get(c)
      for (const dep of m.dependsOn) {
        if (set.has(dep)) {
          edges.get(dep).push(c)
          indeg.set(c, indeg.get(c) + 1)
        }
      }
    }

    const queue = codes.filter((c) => indeg.get(c) === 0).sort()
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

    if (order.length !== codes.length) {
      throw new Error('Circular dependency detected among modules: ' + codes.join(', '))
    }

    return this._applyConstitutionalRules(order)
  }

  /** Truth (M46) before Advisor (M48); Meta-Brain (M55) always last. */
  _applyConstitutionalRules(order) {
    const arr = [...order]
    const moveBefore = (a, b) => {
      const ia = arr.indexOf(a)
      const ib = arr.indexOf(b)
      if (ia > -1 && ib > -1 && ia > ib) {
        arr.splice(ia, 1)
        arr.splice(arr.indexOf(b), 0, a)
      }
    }
    moveBefore('M46', 'M48') // Truth before Advisor
    if (arr.includes('M55')) {
      arr.splice(arr.indexOf('M55'), 1)
      arr.push('M55') // Orchestrator last
    }
    return arr
  }

  /**
   * Execute a request: discover capabilities for the given module codes (or
   * discover by a free-text need), run them in constitutional order, and fuse.
   */
  async execute({ modules = [], need = null, context = {} } = {}) {
    const execId = `exec_${crypto.randomBytes(5).toString('hex')}`
    let codes = [...modules]

    if (need) {
      const caps = this.capabilityRegistry.discover(need)
      codes.push(...caps.map((c) => c.owner))
    }
    codes = [...new Set(codes)]
    if (!codes.length) throw new Error('Execution requires at least one module or a need to discover')

    const order = this.resolveOrder(codes)
    this.state.startExecution(execId, { modules: order, need })
    this.eventBus.emitSignal('execution.started', { execId, order })

    const results = []
    const priorIntel = [] // accumulated constitutional intelligence for this run
    const packages = []
    for (const code of order) {
      const m = this.moduleRegistry.get(code)
      if (!m || m.health !== 'healthy') {
        results.push({ module: code, skipped: true, reason: 'unavailable' })
        continue
      }
      for (const cap of m.capabilities) {
        try {
          // priorIntel lets constitutional gates work (M46 gates M48; M55 fuses all).
          const intel = await this.comm.invoke(cap.id, { ...context, execId, priorIntel })
          this.graph.sync(intel) // synchronize into the knowledge graph
          priorIntel.push({ module: code, package: intel })
          packages.push(intel)
          results.push({
            module: code, capability: cap.id, confidence: intel.confidence,
            type: intel.type, payload: intel.payload, recommendations: intel.recommendations,
          })
        } catch (e) {
          results.push({ module: code, capability: cap.id, error: e.message })
        }
      }
    }

    this.state.finishExecution(execId, 'completed')
    this.eventBus.emitSignal('execution.completed', { execId })

    const successful = results.filter((r) => !r.error && !r.skipped)
    const fusedConfidence = propagateConfidence(
      successful.map((r) => ({ confidence: r.confidence ?? 0 }))
    )

    return {
      execId,
      executionOrder: order,
      modulesRun: successful.length,
      results,
      fusedConfidence: Math.round(fusedConfidence * 100) / 100,
      constitutionalRules: {
        truthBeforeAdvisor: this._ruleHeld(order, 'M46', 'M48'),
        orchestratorLast: order[order.length - 1] === 'M55' || !order.includes('M55'),
      },
    }
  }

  _ruleHeld(order, a, b) {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 || ib === -1) return true
    return ia < ib
  }
}

module.exports = ExecutionEngine
