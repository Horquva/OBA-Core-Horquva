'use strict';

/**
 * Contracts — defines which upstream platforms are allowed to submit validated
 * capabilities into this platform, and checks authorization on intake.
 *
 * In production these tokens would come from a real identity/service-auth system
 * (per antares-repo-structure: contracts/ocos/). This is a mock registry standing
 * in for that until the real one exists, so the pipeline has something real to
 * check against instead of trusting every submission blindly.
 */

const ALLOWED_SUBMITTERS = {
  'zara-capability-validation': 'zara-cvp-token-2026',
  'ammara-knowledge-ops': 'ammara-kop-token-2026',
};

class UnauthorizedSubmissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedSubmissionError';
  }
}

/**
 * Throws UnauthorizedSubmissionError if the contract's submittedBy/authToken pair
 * does not match a known, allowed upstream platform.
 */
function authenticate(contract) {
  const { submittedBy, authToken } = contract || {};
  if (!submittedBy || !authToken) {
    throw new UnauthorizedSubmissionError('missing submittedBy or authToken');
  }
  const expected = ALLOWED_SUBMITTERS[submittedBy];
  if (!expected || expected !== authToken) {
    throw new UnauthorizedSubmissionError(
      `submitter "${submittedBy}" is not an authorized source for this platform`
    );
  }
  return true;
}

module.exports = { ALLOWED_SUBMITTERS, authenticate, UnauthorizedSubmissionError };
