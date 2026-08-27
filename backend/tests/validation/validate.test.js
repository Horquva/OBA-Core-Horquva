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

  requiredEvidence: 2,

  evidence: [
    {
      claimId: 'claim-1',
      supports: true,
      strength: 90,
      text: 'The evidence strongly supports the expected outcome',
    },
    {
      claimId: 'claim-2',
      supports: true,
      strength: 85,
      text: 'The validation process confirms the objective',
    },
  ],
})

// Existing validation tests
assert.strictEqual(result.qualityGate, 'ACCEPTANCE')
assert.strictEqual(typeof result.score, 'number')
assert.strictEqual(result.decision, 'ACCEPT')
assert.strictEqual(result.requiresHumanReview, false)

// Audit tests
assert.ok(result.audit)
assert.ok(result.audit.timestamp)
assert.strictEqual(result.audit.score, result.score)
assert.strictEqual(result.audit.decision, result.decision)

// Advanced validation tests
assert.ok(result.advanced)
assert.ok(result.advanced.evidenceSummary)
assert.strictEqual(result.advanced.evidenceSummary.total, 2)
assert.strictEqual(result.advanced.contradictions.length, 0)
assert.strictEqual(result.advanced.validationGaps.length, 0)
assert.strictEqual(
  typeof result.advanced.calibratedConfidence,
  'number'
)

// Intelligence tests
assert.ok(result.intelligence)
assert.strictEqual(
  result.intelligence.normalizedEvidence.length,
  2
)
assert.strictEqual(
  typeof result.intelligence.relevanceScore,
  'number'
)
assert.strictEqual(
  typeof result.intelligence.completenessScore,
  'number'
)
assert.strictEqual(
  typeof result.intelligence.intelligenceConfidence,
  'number'
)

console.log('✓ Validation pipeline executes')
console.log('✓ Score is calculated')
console.log('✓ Decision is generated')
console.log('✓ High-quality validation is accepted')

console.log('✓ Audit record is generated')
console.log('✓ Audit timestamp is present')
console.log('✓ Audit score matches validation score')
console.log('✓ Audit decision matches validation decision')

console.log('✓ Advanced validation executes')
console.log('✓ Evidence summary is generated')
console.log('✓ No contradictions detected')
console.log('✓ No validation gaps detected')
console.log('✓ Confidence is calibrated')

console.log('✓ Evidence intelligence executes')
console.log('✓ Evidence is normalized')
console.log('✓ Relevance score is calculated')
console.log('✓ Completeness score is calculated')
console.log('✓ Intelligence confidence is calculated')

console.log('\n=== Result: Integration tests completed successfully ===\n')