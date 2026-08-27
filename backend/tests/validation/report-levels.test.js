const assert = require('assert')
const { createValidationReport } = require('../../validation/report')

console.log('\n=== Validation Report Performance Levels Test ===')

// EXCELLENT — 100% accuracy
const excellent = createValidationReport([
  { expected: true, actual: true },
  { expected: false, actual: false },
])

assert.strictEqual(
  excellent.performanceLevel,
  'EXCELLENT'
)

// GOOD — 75% accuracy
const good = createValidationReport([
  { expected: true, actual: true },
  { expected: true, actual: true },
  { expected: false, actual: false },
  { expected: true, actual: false },
])

assert.strictEqual(
  good.performanceLevel,
  'GOOD'
)

// NEEDS_IMPROVEMENT — 50% accuracy
const needsImprovement = createValidationReport([
  { expected: true, actual: true },
  { expected: false, actual: false },
  { expected: true, actual: false },
  { expected: false, actual: true },
])

assert.strictEqual(
  needsImprovement.performanceLevel,
  'NEEDS_IMPROVEMENT'
)

// POOR — below 50% accuracy
const poor = createValidationReport([
  { expected: true, actual: false },
  { expected: false, actual: true },
  { expected: true, actual: false },
  { expected: false, actual: false },
])

assert.strictEqual(
  poor.performanceLevel,
  'POOR'
)

console.log('✓ EXCELLENT performance level works')
console.log('✓ GOOD performance level works')
console.log('✓ NEEDS_IMPROVEMENT performance level works')
console.log('✓ POOR performance level works')

console.log('\n=== Result: 4 passed, 0 failed ===\n')