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
    }
  }
}

module.exports = { BrainStateManager, PHASES }
