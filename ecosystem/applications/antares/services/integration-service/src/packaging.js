'use strict';

/**
 * Din 6 — Operational Capability Packaging.
 * Builds the machine-readable package this platform hands to downstream Antares
 * components and OBA. `consumable` is the one field a downstream integrator should
 * check first: it's only true when the readiness state means "safe to pull".
 */

const CONSUMABLE_STATES = ['Ready', 'Conditionally Ready'];

function buildOperationalPackage(capability, depResolution, readinessState) {
  return {
    identity: { id: capability.id, name: capability.name },
    version: capability.version || '0.1',
    purpose: capability.purpose,
    inputs: capability.inputs || [],
    outputs: capability.outputs || [],
    constraints: capability.constraints || [],
    governanceRequirements: capability.governanceRequirements || [],
    dependencies: depResolution.resolved,
    readinessState,
    validationReference: capability.validationReference,
    consumable: CONSUMABLE_STATES.includes(readinessState),
    packagedAt: new Date().toISOString(),
  };
}

module.exports = { buildOperationalPackage, CONSUMABLE_STATES };
