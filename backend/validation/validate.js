const { validateInput } = require('./pipeline')
const { calculateScore } = require('./scoring')
const { makeDecision } = require('./decision')
const { createReview } = require('./review')
const { createAuditRecord } = require('./audit')

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

  return {
    ...pipelineResult,
    score,
    ...decision,
    ...review,
    audit,
  }
}

module.exports = {
  validate,
}