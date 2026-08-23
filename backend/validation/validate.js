const { validateInput } = require('./pipeline')
const { calculateScore } = require('./scoring')
const { makeDecision } = require('./decision')
const { createReview } = require('./review')
const { createAuditRecord } = require('./audit')
const { normalizeValidationResult } = require('./normalize')

function validate(input) {
  const pipelineResult = validateInput(input)

  const score = calculateScore(input)

  const decision = makeDecision(score)

  const audit = createAuditRecord(input, score, decision)

  const review = createReview(
    decision.decision,
    score,
    pipelineResult
  )

  const result = {
    ...pipelineResult,
    score,
    ...decision,
    ...review,
    audit,
  }

  return normalizeValidationResult(result)
}

module.exports = {
  validate,
}