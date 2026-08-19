'use strict';

const { validateContractShape } = require('./models');
const { authenticate, UnauthorizedSubmissionError } = require('./contracts');
const persistence = require('./persistence');
const depEngine = require('./dependencyEngine');
const { buildOperationalPackage } = require('./packaging');

/**
 * Din 3-4 — Operationalization Pipeline
 * Intake -> Identity Verification -> Validation Reference Check -> Metadata
 * Normalization -> Dependency Resolution -> Readiness Evaluation -> Transformation
 * -> Record Creation -> Status Publish.
 *
 * Every step that changes state is logged to lifecycleTransitions with a timestamp,
 * satisfying the Din 2 data model's Lifecycle Transitions field.
 */

class MalformedContractError extends Error {
  constructor(errors) {
    super(`malformed contract: ${errors.join('; ')}`);
    this.name = 'MalformedContractError';
    this.errors = errors;
  }
}

function transition(capability, from, to, note) {
  capability.lifecycleTransitions = capability.lifecycleTransitions || [];
  capability.lifecycleTransitions.push({ date: new Date().toISOString(), from, to, note });
  capability.readinessState = to;
}

/**
 * Runs a raw incoming contract through all 9 steps. Returns
 * { capability, package, errors } — errors is non-empty only when the pipeline
 * had to stop early (auth failure, malformed contract, duplicate submission).
 * A pipeline that completes with a non-Ready/Conditionally-Ready state is NOT
 * an error — that's the engine correctly saying "not safe to consume yet".
 */
async function runPipeline(rawContract, opts = {}) {
  // Step 1: Intake — authenticate the submitter before touching anything else.
  try {
    authenticate(rawContract);
  } catch (err) {
    if (err instanceof UnauthorizedSubmissionError) {
      return { capability: null, package: null, errors: [err.message], stage: 'Intake' };
    }
    throw err;
  }

  // Step 1b: shape validation — reject malformed contracts before they become records.
  const shapeCheck = validateContractShape(rawContract);
  if (!shapeCheck.valid) {
    return {
      capability: null,
      package: null,
      errors: [new MalformedContractError(shapeCheck.errors).message],
      stage: 'Intake',
    };
  }

  // Step 2: Identity Verification — register (assigns/validates ID, rejects duplicates).
  let capability;
  try {
    capability = persistence.register({
      id: rawContract.id,
      name: rawContract.name,
      description: rawContract.description || '',
      owner: rawContract.owner || null,
      capabilityType: rawContract.capabilityType || null,
      version: rawContract.version || '0.1',
      changeHistory: rawContract.changeHistory || [],
      validationReference: rawContract.validationReference,
      purpose: rawContract.purpose,
      inputs: rawContract.inputs || [],
      outputs: rawContract.outputs || [],
      constraints: rawContract.constraints || [],
      governanceRequirements: rawContract.governanceRequirements || [],
      dependencies: rawContract.dependencies || [],
      fullyTested: !!rawContract.fullyTested,
      requiresRevision: !!rawContract.requiresRevision,
      readinessNotes: rawContract.readinessNotes || '',
      futureIntegrationConsiderations: rawContract.futureIntegrationConsiderations || '',
      additionalEngineeringConsiderations: rawContract.additionalEngineeringConsiderations || '',
      lifecycleTransitions: [],
    });
  } catch (err) {
    if (err instanceof persistence.DuplicateSubmissionError) {
      return { capability: null, package: null, errors: [err.message], stage: 'Identity Verification' };
    }
    throw err;
  }
  transition(capability, null, 'Intake', `Received from ${rawContract.submittedBy} (${rawContract.validationReference?.reportId || 'no report id'})`);

  // Step 3: Validation Reference Check
  const vr = capability.validationReference;
  if (!vr || !vr.reportId || !vr.validator || !vr.date) {
    transition(capability, 'Intake', 'Validation Reference Missing', 'Validation reference incomplete at intake.');
    persistence.persist(capability);
    const pkg = buildOperationalPackage(capability, { resolved: [], missing: [], incompatibleVersions: [], failed: [], circular: null }, capability.readinessState);
    return { capability, package: pkg, errors: [], stage: 'Validation Reference Check' };
  }

  // Step 4: Metadata Normalization (light — trim strings, ensure arrays)
  capability.name = (capability.name || '').trim();
  capability.purpose = (capability.purpose || '').trim();
  capability.inputs = Array.isArray(capability.inputs) ? capability.inputs : [];
  capability.outputs = Array.isArray(capability.outputs) ? capability.outputs : [];

  // Step 5: Dependency Resolution
  const depResolution = await depEngine.resolveDependencies(capability, opts);

  // Step 6: Readiness Evaluation
  const readinessState = depEngine.evaluateReadiness(capability, depResolution);
  transition(capability, 'Intake', readinessState, 'Evaluated after dependency resolution and metadata normalization.');
  capability.dependencies = depResolution.resolved;

  // Step 7: Transformation + Step 6(pkg)/Din 6 — build the operational package
  const pkg = buildOperationalPackage(capability, depResolution, readinessState);

  // Step 8: Record Creation (persist final state)
  persistence.persist(capability);

  // Step 9: Status Publish — in this environment, "publish" means the record is now
  // discoverable via persistence.findByReadiness(); a real event bus hook goes here later.
  return { capability, package: pkg, errors: [], stage: 'Status Publish' };
}

module.exports = { runPipeline, MalformedContractError, transition };
