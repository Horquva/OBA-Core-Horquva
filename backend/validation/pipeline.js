function validateInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Validation input must be an object')
  }

  const checks = {
    logic: runLogicCheck(input),
    industryPattern: runIndustryPatternCheck(input),
    internalConsistency: runInternalConsistencyCheck(input),
    expectedOutcome: runExpectedOutcomeCheck(input),
  }

  const strictChecksPassed =
    checks.logic.status === 'PASS' &&
    checks.internalConsistency.status === 'PASS'

  const reviewChecksPassed =
    checks.industryPattern.status === 'PASS' &&
    checks.expectedOutcome.status === 'PASS'

  let status = 'PASS'
  let qualityGate = 'ACCEPTANCE'
  let requiresHumanReview = false

  if (!strictChecksPassed) {
    status = 'FLAGGED'
    qualityGate = 'STRICT_VALIDATION'
  } else if (!reviewChecksPassed) {
    status = 'REVIEW'
    qualityGate = 'PATTERN_OUTCOME'
    requiresHumanReview = true
  }

  return {
    status,
    qualityGate,
    requiresHumanReview,
    checks,
  }
}

function runLogicCheck(input) {
  if (input.logicValid === false) {
    return {
      status: 'FAIL',
      reason: 'Logic validation failed',
    }
  }

  return {
    status: 'PASS',
    reason: 'Logic validation passed',
  }
}

function runIndustryPatternCheck(input) {
  if (input.industryPatternValid === false) {
    return {
      status: 'REVIEW',
      reason: 'Industry pattern requires review',
    }
  }

  return {
    status: 'PASS',
    reason: 'Industry pattern is acceptable',
  }
}

function runInternalConsistencyCheck(input) {
  if (input.internalConsistencyValid === false) {
    return {
      status: 'FAIL',
      reason: 'Internal consistency validation failed',
    }
  }

  return {
    status: 'PASS',
    reason: 'Internal consistency validation passed',
  }
}

function runExpectedOutcomeCheck(input) {
  if (input.expectedOutcomeValid === false) {
    return {
      status: 'REVIEW',
      reason: 'Expected outcome requires review',
    }
  }

  return {
    status: 'PASS',
    reason: 'Expected outcome is acceptable',
  }
}

module.exports = {
  validateInput,
}