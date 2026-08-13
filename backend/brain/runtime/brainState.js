/**
 * BRAIN STATE MANAGER (Kamran — Runtime component)
 * -----------------------------------------------
 * Owns the runtime state of the Organizational Brain: lifecycle phase, module
 * health, in-flight executions, and the last Boot Report. Statelessness and
 * observability are constitutional principles — all state is centralized here
 * and queryable.
 */

const PHASES = ['offline', 'booting', 'assembling', 'ready', 'degraded', 'halted']

class BrainStateManager {
  constructor(eventBus) {
    this.eventBus = eventBus
    this._phase = 'offline'
    this._moduleHealth = new Map() // code -> 'healthy' | 'unhealthy'
    this._executions = new Map() // execId -> record
    this._bootReport = null
    this._startedAt = null
    // Graph provenance. The brain boots on a synthetic demo graph and swaps in
    // the real Supabase one asynchronously, so "which data am I actually
    // serving" is a genuine runtime question — not knowable from `phase`, which
    // reads `ready` either way. Tracked here so it is queryable, per the
    // observability principle above.
    this._graph = {
      source: 'none', // 'none' | 'demo-seed' | 'supabase'
      entities: 0,
      relationships: 0,
      loadedAt: null,
      syncAttempts: 0,
      syncFailures: 0,
      lastSyncError: null,
    }
  }

  setPhase(phase) {
    if (!PHASES.includes(phase)) throw new Error(`Unknown brain phase: ${phase}`)
    const prev = this._phase
    this._phase = phase
    if (phase === 'booting') this._startedAt = new Date().toISOString()
    if (this.eventBus) this.eventBus.emitSignal('brain.phase', { from: prev, to: phase })
    return phase
  }

  get phase() {
    return this._phase
  }

  isReady() {
    return this._phase === 'ready'
  }

  setModuleHealth(code, health) {
    this._moduleHealth.set(code, health)
    if (this.eventBus) this.eventBus.emitSignal('module.health', { code, health })
  }

  moduleHealth() {
    return Object.fromEntries(this._moduleHealth)
  }

  startExecution(execId, meta) {
    this._executions.set(execId, { execId, status: 'running', startedAt: Date.now(), ...meta })
  }

  finishExecution(execId, status = 'completed') {
    const e = this._executions.get(execId)
    if (e) {
      e.status = status
      e.durationMs = Date.now() - e.startedAt
    }
  }

  activeExecutions() {
    return [...this._executions.values()].filter((e) => e.status === 'running')
  }

  setBootReport(report) {
    this._bootReport = report
  }

  bootReport() {
    return this._bootReport
  }

  /** Record which graph is now being served. `source` is 'demo-seed' or 'supabase'. */
  setGraphSource(source, stats = {}) {
    this._graph.source = source
    this._graph.entities = stats.entities ?? 0
    this._graph.relationships = stats.relationships ?? 0
    this._graph.loadedAt = new Date().toISOString()
    if (source === 'supabase') {
      this._graph.syncAttempts += 1
      this._graph.lastSyncError = null
    }
    if (this.eventBus) this.eventBus.emitSignal('brain.graph.source', { source, ...stats })
    return this._graph
  }

  /**
   * A Supabase graph load failed. The brain keeps serving whatever it already
   * had — which on a boot-time failure is the demo graph — so this has to be
   * visible rather than only logged, or a permanent fallback to synthetic data
   * looks identical to a healthy start.
   */
  recordGraphSyncFailure(err) {
    this._graph.syncAttempts += 1
    this._graph.syncFailures += 1
    this._graph.lastSyncError = {
      message: err && err.message ? err.message : String(err),
      at: new Date().toISOString(),
    }
    if (this.eventBus) this.eventBus.emitSignal('brain.graph.syncFailed', this._graph.lastSyncError)
    return this._graph
  }

  /** Graph provenance, including whether the data being served is real. */
  graph() {
    const g = this._graph
    const live = g.source === 'supabase'
    return {
      ...g,
      live,
      servingDemoData: g.source === 'demo-seed',
      warning: live
        ? null
        : 'Serving the synthetic demo graph, NOT real organizational data. Every number derived from it is fiction.',
    }
  }

  snapshot() {
    const health = [...this._moduleHealth.values()]
    return {
      phase: this._phase,
      startedAt: this._startedAt,
      modules: {
        total: this._moduleHealth.size,
        healthy: health.filter((h) => h === 'healthy').length,
      },
      activeExecutions: this.activeExecutions().length,
      graph: this.graph(),
    }
  }
}

module.exports = { BrainStateManager, PHASES }
