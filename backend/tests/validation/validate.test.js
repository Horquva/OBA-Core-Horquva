const assert = require('assert')
const { validate } = require('../../validation/validate')

console.log('\n=== Validation Flow Integration Test ===')

const result = validate({
  logicValid: true,
  industryPatternValid: true,
  internalConsistencyValid: true,
  expectedOutcomeValid: true,
  evidenceQuality: 90,
  relevance: 90,
  completeness: 90,
  risk: 10,
  confidence: 90,
})

assert.strictEqual(result.qualityGate, 'ACCEPTANCE')
assert.strictEqual(typeof result.score, 'number')
assert.strictEqual(result.decision, 'ACCEPT')
assert.strictEqual(result.requiresHumanReview, false)

console.log('✓ Validation pipeline executes')
console.log('✓ Score is calculated')
console.log('✓ Decision is generated')
console.log('✓ High-quality validation is accepted')

console.log('\n=== Result: 4 passed, 0 failed ===\n')