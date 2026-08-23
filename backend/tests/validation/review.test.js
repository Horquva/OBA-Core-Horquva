const assert = require('assert')
const { createReview } = require('../../validation/review')

console.log('\n=== Validation Human Review Test ===')

const accepted = createReview('ACCEPT', 85, {})
assert.strictEqual(accepted.requiresHumanReview, false)
assert.strictEqual(accepted.reviewReason, null)

const review = createReview('REVIEW', 70, {})
assert.strictEqual(review.requiresHumanReview, true)
assert.strictEqual(
  review.reviewReason,
  'Validation score requires human review'
)

const rejected = createReview('REJECT', 40, {})
assert.strictEqual(rejected.requiresHumanReview, true)
assert.strictEqual(
  rejected.reviewReason,
  'Validation score is below acceptance threshold'
)

console.log('✓ Accepted result requires no human review')
console.log('✓ Review result contains review reason')
console.log('✓ Rejected result contains review reason')

console.log('\n=== Result: 3 passed, 0 failed ===\n')