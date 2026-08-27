const { evaluate } = require('./evaluation')

function createValidationReport(predictions) {
  const evaluation = evaluate(predictions)

  let performanceLevel

  if (evaluation.accuracy >= 0.9) {
    performanceLevel = 'EXCELLENT'
  } else if (evaluation.accuracy >= 0.75) {
    performanceLevel = 'GOOD'
  } else if (evaluation.accuracy >= 0.5) {
    performanceLevel = 'NEEDS_IMPROVEMENT'
  } else {
    performanceLevel = 'POOR'
  }

  return {
    generatedAt: new Date().toISOString(),
    performanceLevel,
    evaluation,
  }
}

module.exports = {
  createValidationReport,
}