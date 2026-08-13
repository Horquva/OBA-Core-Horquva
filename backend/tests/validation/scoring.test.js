const assert = require('assert')
const { calculateScore } = require('../../validation/scoring')

console.log('\n=== Validation Scoring Test ===')

const highScore = calculateScore({
  evidenceQuality: 80,
  relevance: 90,
  completeness: 85,
  risk: 20,
  confidence: 88,
})

assert.strictEqual(highScore, 85)

const lowScore = calculateScore({
  evidenceQuality: 40,
  relevance: 50,
  completeness: 45,
  risk: 80,
  confidence: 50,
})

assert.strictEqual(lowScore, 42)

console.log('✓ High-quality evidence produces expected score')
console.log('✓ Low-quality/high-risk evidence produces lower score')

console.log('\n=== Result: 2 passed, 0 failed ===\n')