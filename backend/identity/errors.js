/*
 * Sentinel Identity & Trust — typed domain errors.
 * Services throw these; the API layer (Phase 10) maps `.status` to HTTP codes.
 * Cross-tenant access surfaces as NotFound (fail closed, never leak existence).
 */
class DomainError extends Error {
  constructor(message, code, status) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
  }
}

class ValidationError extends DomainError {
  constructor(message = 'Invalid request') { super(message, 'validation_error', 400) }
}
class NotFoundError extends DomainError {
  constructor(message = 'Not found') { super(message, 'not_found', 404) }
}
class ConflictError extends DomainError {
  constructor(message = 'Already exists') { super(message, 'conflict', 409) }
}
class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') { super(message, 'forbidden', 403) }
}
class InvalidTransitionError extends DomainError {
  constructor(from, to) {
    super(`Invalid lifecycle transition: ${from} → ${to}`, 'invalid_transition', 409)
  }
}

module.exports = {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InvalidTransitionError,
}
