const { validate } = require('./validation/validate')
const { runEvidenceIntelligence } = require('./validation/intelligence')
const { advancedValidate } = require('./validation/advanced')

console.log('')
console.log('========================================')
console.log(' OBA CORE — ENTERPRISE VALIDATION DEMO')
console.log('========================================')

const input = {
  logicValid: true,
  industryPatternValid: true,
  internalConsistencyValid: true,
  expectedOutcomeValid: true,
  evidenceQuality: 90,
  relevance: 90,
  completeness: 90,
  risk: 10,
  confidence: 90,

  claim: 'Customer payment risk is low',
  requiredEvidence: 2,

  evidence: [
    {
      id: 'E1',
      claimId: 'C1',
      supports: true,
      strength: 95,
      text: 'Customer payment history shows strong repayment performance',
    },
    {
      id: 'E2',
      claimId: 'C1',
      supports: true,
      strength: 90,
      text: 'Customer has consistently paid invoices on time',
    },
  ],
}

console.log('\n[1] Validation input')
console.log('    Evidence:', input.evidence.length)

const intelligence = runEvidenceIntelligence(input)

console.log('\n[2] Evidence intelligence')
console.log('    Relevance:', intelligence.relevanceScore)
console.log('    Strength:', intelligence.averageStrength)
console.log('    Completeness:', intelligence.completenessScore)
console.log('    Contradictions:', intelligence.contradictions.length)
console.log('    Intelligence confidence:', intelligence.intelligenceConfidence)

const advanced = advancedValidate(input)

console.log('\n[3] Advanced validation')
console.log('    Gaps:', advanced.validationGaps.length)
console.log('    Calibrated confidence:', advanced.calibratedConfidence)
console.log('    Human review:', advanced.requiresHumanReview)

const result = validate(input)

console.log('\n[4] Final validation decision')
console.log('    Score:', result.score)
console.log('    Decision:', result.decision)
console.log('    Human review:', result.requiresHumanReview)

console.log('\n========================================')
console.log(' DEMO COMPLETE')
console.log('========================================')
