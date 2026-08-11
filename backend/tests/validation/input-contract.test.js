const assert = require('assert')
const { validateInput } = require('../../validation/pipeline')

console.log('\n=== Validation Input Contract Test ===')

assert.throws(
  () => validateInput(null),
  /Validation input must be an object/
)

assert.throws(
  () => validateInput('invalid'),
  /Validation input must be an object/
)

assert.throws(
  () => validateInput({
    logicValid: true,
    industryPatternValid: true,
    internalConsistencyValid: true,
  }),
  /Validation input is missing required fields/
)

assert.throws(
  () => validateInput({
    logicValid: true,
    industryPatternValid: true,
    internalConsistencyValid: true,
    expectedOutcomeValid: 'yes',
  }),
  /Validation input fields must be boolean/
)

console.log('✓ Rejects null input')
console.log('✓ Rejects non-object input')
console.log('✓ Rejects missing required fields')
console.log('✓ Rejects non-boolean validation fields')

console.log('\n=== Result: 4 passed, 0 failed ===\n')