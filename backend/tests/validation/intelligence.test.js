const assert = require('assert')

const {
  similarity,
  normalizeEvidence,
  detectMissingEvidence,
  runEvidenceIntelligence,
} = require('../../validation/intelligence')

console.log('\n=== Validation Intelligence Test ===')

assert.ok(similarity('customer payment risk', 'payment risk analysis') > 0)

const evidence = normalizeEvidence([
  {
    id: 'E1',
    claimId: 'C1',
    supports: true,
    strength: 90,
    text: 'Customer payment history is strong',
  },
])

assert.strictEqual(evidence.length, 1)
assert.strictEqual(evidence[0].strength, 90)

const missing = detectMissingEvidence(
  { requiredEvidence: 3 },
  evidence
)

assert.strictEqual(missing.missing, true)

const result = runEvidenceIntelligence({
  claim: 'customer payment risk',
  requiredEvidence: 1,
  evidence: [
    {
      id: 'E1',
      claimId: 'C1',
      supports: true,
      strength: 90,
      text: 'Customer payment risk is low',
    },
  ],
})

assert.ok(result.relevanceScore >= 0)
assert.strictEqual(result.completenessScore, 100)
assert.strictEqual(result.contradictions.length, 0)
assert.ok(result.intelligenceConfidence > 0)

console.log('? Evidence normalization works')
console.log('? Relevance analysis works')
console.log('? Missing evidence detection works')
console.log('? Confidence intelligence works')
console.log('? Intelligence pipeline succeeds')

console.log('\n=== Result: 5 passed, 0 failed ===\n')
