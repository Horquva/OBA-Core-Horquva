const assert = require('assert')
const { createValidationReport } = require('../../validation/report')

console.log('\n=== Validation Report Test ===')

const result = createValidationReport([
  { expected: true, actual: true, latencyMs: 10 },
  { expected: true, actual: true, latencyMs: 20 },
  { expected: false, actual: false, latencyMs: 15 },
  { expected: true, actual: true, latencyMs: 25 },
  { expected: false, actual: false, latencyMs: 30 },
])

assert.ok(result.generatedAt)

assert.strictEqual(
  result.performanceLevel,
  'EXCELLENT'
)

assert.ok(result.evaluation)

assert.strictEqual(result.evaluation.totalCases, 5)

assert.strictEqual(result.evaluation.accuracy, 1)

assert.strictEqual(result.evaluation.precision, 1)

assert.strictEqual(result.evaluation.recall, 1)

assert.strictEqual(result.evaluation.f1, 1)

assert.strictEqual(result.evaluation.averageLatencyMs, 20)

console.log('✓ Report generation works')
console.log('✓ Timestamp is generated')
console.log('✓ Performance level is EXCELLENT')
console.log('✓ Evaluation data is included')
console.log('✓ Accuracy is calculated correctly')
console.log('✓ Precision is calculated correctly')
console.log('✓ Recall is calculated correctly')
console.log('✓ F1 score is calculated correctly')
console.log('✓ Average latency is calculated correctly')

console.log('\n=== Result: 9 passed, 0 failed ===\n')