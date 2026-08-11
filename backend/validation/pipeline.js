function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Validation input must be an object')
  }

  const requiredFields = [
    'logicValid',
    'industryPatternValid',
    'internalConsistencyValid',
    'expectedOutcomeValid',
  ]

  const missingFields = requiredFields.filter(
    (field) => !(field in input)
  )

  if (missingFields.length > 0) {
    throw new Error(
      `Validation input is missing required fields: ${missingFields.join(', ')}`
    )
  }

  const invalidFields = requiredFields.filter(
    (field) => typeof input[field] !== 'boolean'
  )

  if (invalidFields.length > 0) {
    throw new Error(
      `Validation input fields must be boolean: ${invalidFields.join(', ')}`
    )
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