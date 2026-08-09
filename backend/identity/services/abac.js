/*
 * ABAC condition evaluator (doc §4 ABAC).
 * Conditions are attribute comparisons evaluated against a context built from
 * subject / resource / environment attributes. Conditions on a policy are ANDed.
 *
 * Condition shape (either form):
 *   { attribute: 'subject.clearance', operator: 'eq', value: 'high' }
 *   { namespace: 'subject', key: 'clearance', operator: 'eq', value: 'high' }
 *
 * Semantics:
 *   - Missing attribute → condition is FALSE (except exists/not_exists).
 *   - Unknown operator / malformed condition → throws (caller fails closed).
 */
const { ValidationError } = require('../errors')

const toNum = (v) => {
  const n = Number(v)
  if (Number.isNaN(n)) throw new ValidationError(`non-numeric value in comparison: ${v}`)
  return n
}

const OPERATORS = {
  eq: (a, b) => String(a) === String(b),
  ne: (a, b) => String(a) !== String(b),
  in: (a, b) => Array.isArray(b) && b.map(String).includes(String(a)),
  nin: (a, b) => Array.isArray(b) && !b.map(String).includes(String(a)),
  gt: (a, b) => toNum(a) > toNum(b),
  gte: (a, b) => toNum(a) >= toNum(b),
  lt: (a, b) => toNum(a) < toNum(b),
  lte: (a, b) => toNum(a) <= toNum(b),
  contains: (a, b) => String(a).includes(String(b)),
}

function resolvePath(cond) {
  if (cond.attribute) {
    const [namespace, ...rest] = String(cond.attribute).split('.')
    return { namespace, key: rest.join('.') }
  }
  return { namespace: cond.namespace, key: cond.key }
}

/** Evaluate a single condition against the context. */
function evaluateCondition(cond, context) {
  if (!cond || typeof cond !== 'object') throw new ValidationError('malformed condition')
  const { namespace, key } = resolvePath(cond)
  if (!namespace || !key) throw new ValidationError('condition missing attribute path')
  const bag = context[namespace] || {}
  const present = Object.prototype.hasOwnProperty.call(bag, key)

  const op = cond.operator
  if (op === 'exists') return present
  if (op === 'not_exists') return !present
  if (!present) return false // missing-attribute behavior

  const fn = OPERATORS[op]
  if (!fn) throw new ValidationError(`unknown operator: ${op}`)
  return fn(bag[key], cond.value)
}

/** All conditions must hold (AND). Empty condition set → true. */
function evaluateConditions(conditions, context) {
  if (!Array.isArray(conditions)) throw new ValidationError('conditions must be an array')
  return conditions.every((c) => evaluateCondition(c, context))
}

module.exports = { evaluateCondition, evaluateConditions, OPERATORS }
