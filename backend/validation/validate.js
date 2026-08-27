const { validateInput } = require('./pipeline')
const { calculateScore } = require('./scoring')
const { makeDecision } = require('./decision')
const { createReview } = require('./review')
const { createAuditRecord } = require('./audit')
const { normalizeValidationResult } = require('./normalize')
const { advancedValidate } = require('./advanced')
const { runEvidenceIntelligence } = require('./intelligence')

function validate(input) {
  // Basic validation
  const pipelineResult = validateInput(input)

  // Score calculation
  const score = calculateScore(input)

  // Decision
  const decision = makeDecision(score)

  // Audit record
  const audit = createAuditRecord(input, score, decision)

  // Human review
  const review = createReview(
    decision.decision,
    score,
    pipelineResult
  )

  // Advanced evidence validation
  const advanced = Array.isArray(input.evidence)
    ? advancedValidate(input)
    : null

  // Evidence intelligence
  const intelligence = Array.isArray(input.evidence)
    ? runEvidenceIntelligence(input)
    : null

  const result = {
    ...pipelineResult,
    score,
    ...decision,
    ...review,
    audit,
    advanced,
    intelligence,
  }

  return normalizeValidationResult(result)
}

module.exports = {
  validate,
}