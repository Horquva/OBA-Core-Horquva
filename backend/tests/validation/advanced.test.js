const assert = require('assert')

const {
  advancedValidate,
  analyzeEvidence,
  detectContradictions,
  detectValidationGaps,
  calibrateConfidence,
} = require('../../validation/advanced')

console.log('\n=== Advanced Validation Analysis Test ===')

// --------------------------------------------------
// Evidence analysis
// --------------------------------------------------

const evidence = [
  {
    id: 'E1',
    claimId: 'C1',
    supports: true,
    strength: 90,
  },
  {
    id: 'E2',
    claimId: 'C1',
    supports: true,
    strength: 80,
  },
  {
    id: 'E3',
    claimId: 'C2',
    supports: false,
    strength: 70,
  },
]

const summary = analyzeEvidence(evidence)

assert.strictEqual(summary.total, 3)
assert.strictEqual(summary.supporting, 2)
assert.strictEqual(summary.contradicting, 1)
assert.strictEqual(summary.usable, 3)
assert.strictEqual(summary.averageStrength, 80)

console.log('✓ Evidence is analyzed')

// --------------------------------------------------
// Contradiction detection
// --------------------------------------------------

const contradictionEvidence = [
  {
    id: 'E1',
    claimId: 'C1',
    supports: true,
    strength: 90,
  },
  {
    id: 'E2',
    claimId: 'C1',
    supports: false,
    strength: 80,
  },
]

const contradictions =
  detectContradictions(contradictionEvidence)

assert.strictEqual(contradictions.length, 1)
assert.strictEqual(contradictions[0].claimId, 'C1')

console.log('✓ Contradicting evidence is detected')

// --------------------------------------------------
// Validation gap detection
// --------------------------------------------------

const gapResult = detectValidationGaps(
  {
    requiredEvidence: 5,
  },
  {
    total: 2,
    supporting: 0,
    contradicting: 0,
    usable: 2,
    averageStrength: 40,
  }
)

assert.ok(
  gapResult.includes('No supporting evidence supplied')
)

assert.ok(
  gapResult.includes(
    'Evidence strength is below the minimum threshold'
  )
)

assert.ok(
  gapResult.includes(
    'Required evidence coverage is incomplete'
  )
)

console.log('✓ Validation gaps are detected')

// --------------------------------------------------
// Confidence calibration
// --------------------------------------------------

const calibrated = calibrateConfidence(
  {
    confidence: 80,
  },
  {
    total: 2,
    supporting: 2,
    contradicting: 0,
    usable: 2,
    averageStrength: 90,
  },
  [],
  []
)

assert.strictEqual(calibrated, 100)

console.log('✓ Confidence is calibrated')

// --------------------------------------------------
// Full advanced validation
// --------------------------------------------------

const result = advancedValidate({
  confidence: 80,
  requiredEvidence: 2,
  evidence: [
    {
      id: 'E1',
      claimId: 'C1',
      supports: true,
      strength: 90,
    },
    {
      id: 'E2',
      claimId: 'C1',
      supports: true,
      strength: 85,
    },
  ],
})

assert.strictEqual(result.evidenceSummary.total, 2)
assert.strictEqual(result.contradictions.length, 0)
assert.strictEqual(result.validationGaps.length, 0)
assert.strictEqual(result.calibratedConfidence, 100)
assert.strictEqual(result.requiresHumanReview, false)

console.log('✓ Full advanced validation succeeds')

// --------------------------------------------------
// Contradictory result requires review
// --------------------------------------------------

const reviewResult = advancedValidate({
  confidence: 80,
  evidence: [
    {
      id: 'E1',
      claimId: 'C1',
      supports: true,
      strength: 90,
    },
    {
      id: 'E2',
      claimId: 'C1',
      supports: false,
      strength: 90,
    },
  ],
})

assert.strictEqual(reviewResult.contradictions.length, 1)
assert.strictEqual(reviewResult.requiresHumanReview, true)

console.log('✓ Contradictory evidence requires human review')

// --------------------------------------------------
// Invalid input
// --------------------------------------------------

assert.throws(
  () => advancedValidate(null),
  /Advanced validation input must be an object/
)

assert.throws(
  () => advancedValidate({}),
  /Evidence must be an array/
)

console.log('✓ Invalid advanced validation input is rejected')

console.log('\n=== Result: 7 passed, 0 failed ===\n')