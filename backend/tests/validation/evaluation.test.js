const assert = require('assert')
const { evaluate } = require('../../validation/evaluation')

console.log('\n=== Validation Evaluation Test ===')

const result = evaluate([
  { expected: true, actual: true, latencyMs: 10 },
  { expected: true, actual: true, latencyMs: 20 },
  { expected: false, actual: false, latencyMs: 15 },
  { expected: false, actual: true, latencyMs: 25 },
  { expected: true, actual: false, latencyMs: 30 },
])

assert.strictEqual(result.totalCases, 5)
assert.strictEqual(result.truePositives, 2)
assert.strictEqual(result.trueNegatives, 1)
assert.strictEqual(result.falsePositives, 1)
assert.strictEqual(result.falseNegatives, 1)

assert.strictEqual(result.accuracy, 0.6)
assert.strictEqual(result.precision, 0.6667)
assert.strictEqual(result.recall, 0.6667)
assert.strictEqual(result.f1, 0.6667)
assert.strictEqual(result.averageLatencyMs, 20)

console.log('? Accuracy calculated')
console.log('? Precision calculated')
console.log('? Recall calculated')
console.log('? F1 calculated')
console.log('? False positives/negatives calculated')
console.log('? Latency calculated')

console.log('\n=== Result: 6 passed, 0 failed ===\n')
