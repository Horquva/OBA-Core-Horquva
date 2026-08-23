'use strict';

/**
 * Capability Operationalization Platform — Data Model
 * Fields here match platform-specification.md and data-model-and-foundation-flow.md exactly.
 */

const READINESS_STATES = [
  'Ready',
  'Conditionally Ready',
  'Blocked',
  'Dependency Missing',
  'Validation Reference Missing',
  'Failed',
  'Requires Revision',
];

/**
 * Validates the shape of an incoming raw submission (a "contract" from an upstream
 * platform such as Zara's Capability Validation service). This is intentionally strict —
 * a malformed contract must be rejected before it ever reaches persistence.
 *
 * Returns { valid: boolean, errors: string[] }
 */
function validateContractShape(contract) {
  const errors = [];

  if (!contract || typeof contract !== 'object') {
    return { valid: false, errors: ['contract must be an object'] };
  }

  if (!contract.name || typeof contract.name !== 'string') {
    errors.push('missing or invalid "name"');
  }

  if (!contract.purpose || typeof contract.purpose !== 'string') {
    errors.push('missing or invalid "purpose"');
  }

  // Note: an absent or incomplete validationReference is NOT a shape/malformed-contract
  // error — it's a legitimate pipeline outcome ("Validation Reference Missing" is one of
  // the platform's defined readiness states). We only reject the shape here if the field
  // was supplied but isn't even an object.
  if (contract.validationReference !== undefined && typeof contract.validationReference !== 'object') {
    errors.push('"validationReference" must be an object if present');
  }

  if (contract.dependencies !== undefined) {
    if (!Array.isArray(contract.dependencies)) {
      errors.push('"dependencies" must be an array if present');
    } else {
      contract.dependencies.forEach((dep, i) => {
        if (!dep || typeof dep !== 'object' || !dep.id) {
          errors.push(`dependencies[${i}] must be an object with an "id"`);
        }
      });
    }
  }

  if (!contract.submittedBy || typeof contract.submittedBy !== 'string') {
    errors.push('missing "submittedBy" (submitting platform identity)');
  }

  if (!contract.authToken || typeof contract.authToken !== 'string') {
    errors.push('missing "authToken"');
  }

  return { valid: errors.length === 0, errors };
}

function isValidReadinessState(state) {
  return READINESS_STATES.includes(state);
}

module.exports = { READINESS_STATES, validateContractShape, isValidReadinessState };
