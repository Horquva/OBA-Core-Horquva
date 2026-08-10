const assert = require('assert')
const { validateInput } = require('../../validation/pipeline')

console.log('\n=== Validation Pipeline Test ===')

const validResult = validateInput({
  logicValid: true,
  industryPatternValid: true,
  internalConsistencyValid: true,
  expectedOutcomeValid: true,
})

assert.strictEqual(validResult.status, 'PASS')
assert.strictEqual(validResult.qualityGate, 'ACCEPTANCE')
assert.strictEqual(validResult.requiresHumanReview, false)

console.log('✓ Valid input passes validation')

const logicFailure = validateInput({
  logicValid: false,
  industryPatternValid: true,
  internalConsistencyValid: true,
  expectedOutcomeValid: true,
})

assert.strictEqual(logicFailure.status, 'FLAGGED')
assert.strictEqual(logicFailure.qualityGate, 'STRICT_VALIDATION')

console.log('✓ Logic failure is flagged')

const consistencyFailure = validateInput({
  logicValid: true,
  industryPatternValid: true,
  internalConsistencyValid: false,
  expectedOutcomeValid: true,
})

assert.strictEqual(consistencyFailure.status, 'FLAGGED')
assert.strictEqual(consistencyFailure.qualityGate, 'STRICT_VALIDATION')

console.log('✓ Internal consistency failure is flagged')

const patternReview = validateInput({
  logicValid: true,
  industryPatternValid: false,
  internalConsistencyValid: true,
  expectedOutcomeValid: true,
})

assert.strictEqual(patternReview.status, 'REVIEW')
assert.strictEqual(patternReview.qualityGate, 'PATTERN_OUTCOME')
assert.strictEqual(patternReview.requiresHumanReview, true)

console.log('✓ Industry pattern mismatch requires review')

const outcomeReview = validateInput({
  logicValid: true,
  industryPatternValid: true,
  internalConsistencyValid: true,
  expectedOutcomeValid: false,
})

assert.strictEqual(outcomeReview.status, 'REVIEW')
assert.strictEqual(outcomeReview.qualityGate, 'PATTERN_OUTCOME')
assert.strictEqual(outcomeReview.requiresHumanReview, true)

console.log('✓ Expected outcome mismatch requires review')

console.log('\n=== Result: 5 passed, 0 failed ===\n')