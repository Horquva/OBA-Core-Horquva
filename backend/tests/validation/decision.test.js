const assert = require('assert')
const { makeDecision } = require('../../validation/decision')

console.log('\n=== Validation Decision Test ===')

const accepted = makeDecision(85)

assert.strictEqual(accepted.decision, 'ACCEPT')
assert.strictEqual(accepted.requiresHumanReview, false)

console.log('✓ High score is accepted')

const review = makeDecision(70)

assert.strictEqual(review.decision, 'REVIEW')
assert.strictEqual(review.requiresHumanReview, true)

console.log('✓ Medium score requires human review')

const rejected = makeDecision(40)

assert.strictEqual(rejected.decision, 'REJECT')
assert.strictEqual(rejected.requiresHumanReview, true)

console.log('✓ Low score is rejected')

assert.throws(
  () => makeDecision('85'),
  /Decision score must be a number/
)

console.log('✓ Non-numeric score is rejected')

console.log('\n=== Result: 4 passed, 0 failed ===\n')