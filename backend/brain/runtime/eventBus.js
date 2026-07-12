/**
 * EVENT & SIGNAL BUS (Kamran — Runtime component)
 * ----------------------------------------------
 * The event-driven backbone of the Organizational Brain. Modules and runtime
 * components communicate through signals rather than direct calls, giving the
 * Brain loose coupling and observability. Every signal is logged for tracing.
 */

const { EventEmitter } = require('events')

class EventSignalBus {
  constructor() {
    this._emitter = new EventEmitter()
    this._emitter.setMaxListeners(500)
    this._journal = []
    this._seq = 0
  }

  /** Publish a signal. type e.g. 'module.registered', 'capability.invoked'. */
  emitSignal(type, payload = {}) {
    const signal = {
      seq: ++this._seq,
      type,
      payload,
      at: new Date().toISOString(),
    }
    this._journal.push(signal)
    if (this._journal.length > 1000) this._journal.shift()
    this._emitter.emit(type, signal)
    this._emitter.emit('*', signal)
    return signal
  }

  on(type, handler) {
    this._emitter.on(type, handler)
    return () => this._emitter.off(type, handler)
  }

  once(type, handler) {
    this._emitter.once(type, handler)
  }

  journal(limit = 100) {
    return this._journal.slice(-limit)
  }

  stats() {
    return { totalSignals: this._seq, journalled: this._journal.length }
  }
}

module.exports = EventSignalBus
