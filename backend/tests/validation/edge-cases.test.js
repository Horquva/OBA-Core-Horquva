const assert = require('assert')
const { validate } = require('../../validation/validate')

console.log('\n=== Validation Edge Cases Test ===')

// 1. Null input
assert.throws(
  () => validate(null),
  /Validation input must be an object/
)
console.log('✓ Null input is rejected')

// 2. Empty object
assert.throws(
  () => validate({}),
  /Validation input is missing required fields/
)
console.log('✓ Empty object is rejected')

// 3. Invalid validation field type
assert.throws(
  () =>
    validate({
      logicValid: 'true',
      industryPatternValid: true,
      internalConsistencyValid: true,
      expectedOutcomeValid: true,
      evidenceQuality: 90,
      relevance: 90,
      completeness: 90,
      risk: 10,
      confidence: 90,
    }),
  /Validation input fields must be boolean/
)
console.log('✓ Invalid validation field type is rejected')

// 4. Missing required validation field
assert.throws(
  () =>
    validate({
      logicValid: true,
      industryPatternValid: true,
      internalConsistencyValid: true,
      evidenceQuality: 90,
      relevance: 90,
      completeness: 90,
      risk: 10,
      confidence: 90,
    }),
  /Validation input is missing required fields/
)
console.log('✓ Missing validation field is rejected')

// 5. Valid input still succeeds
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

assert.strictEqual(typeof result.score, 'number')
assert.ok(result.decision)
console.log('✓ Valid input remains accepted')

console.log('\n=== Result: 5 passed, 0 failed ===\n')