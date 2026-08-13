const assert = require('assert')
const { createAuditRecord } = require('../../validation/audit')

console.log('\n=== Validation Audit Test ===')

const input = {
  evidenceQuality: 80,
  relevance: 90,
  completeness: 85,
  risk: 20,
  confidence: 88,
}

const decision = {
  decision: 'ACCEPT',
  requiresHumanReview: false,
  reason: 'Score meets acceptance threshold',
}

const record = createAuditRecord(input, 85, decision)

assert.ok(record.timestamp)
assert.strictEqual(record.score, 85)
assert.strictEqual(record.decision, 'ACCEPT')
assert.strictEqual(record.requiresHumanReview, false)
assert.strictEqual(record.reason, 'Score meets acceptance threshold')
assert.strictEqual(record.input.evidenceQuality, 80)
assert.strictEqual(record.input.risk, 20)

console.log('✓ Audit record contains timestamp')
console.log('✓ Audit record contains score')
console.log('✓ Audit record contains decision')
console.log('✓ Audit record contains review status')
console.log('✓ Audit record contains decision reason')
console.log('✓ Audit record preserves validation inputs')

console.log('\n=== Result: 6 passed, 0 failed ===\n')