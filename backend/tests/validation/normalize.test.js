const assert = require('assert')
const { normalizeValidationResult } = require('../../validation/normalize')

console.log('\n=== Validation Result Normalization Test ===')

const result = normalizeValidationResult({
  qualityGate: 'ACCEPTANCE',
  score: 85,
  decision: 'ACCEPT',
  requiresHumanReview: false,
  reason: 'Score meets acceptance threshold',
  audit: {
    timestamp: '2026-08-12T10:00:00.000Z',
  },
  extraField: 'ignored',
})

assert.strictEqual(result.qualityGate, 'ACCEPTANCE')
assert.strictEqual(result.score, 85)
assert.strictEqual(result.decision, 'ACCEPT')
assert.strictEqual(result.requiresHumanReview, false)
assert.strictEqual(result.reason, 'Score meets acceptance threshold')
assert.ok(result.audit)
assert.strictEqual(result.extraField, undefined)

console.log('✓ Preserves validation gate')
console.log('✓ Preserves score')
console.log('✓ Preserves decision')
console.log('✓ Preserves human-review status')
console.log('✓ Preserves reason')
console.log('✓ Preserves audit information')
console.log('✓ Removes unsupported fields')

console.log('\n=== Result: 7 passed, 0 failed ===\n')