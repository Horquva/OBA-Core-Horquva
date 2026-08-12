const { validateInput } = require('./pipeline')
const { calculateScore } = require('./scoring')
const { makeDecision } = require('./decision')

function validate(input) {
  const pipelineResult = validateInput(input)

  const score = calculateScore(input)

  const decision = makeDecision(score)

  return {
    ...pipelineResult,
    score,
    ...decision,
  }
}

module.exports = {
  validate,
}