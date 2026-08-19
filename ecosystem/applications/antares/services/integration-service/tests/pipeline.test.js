'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertEqual, run } = require('./run-tests');
const { runPipeline } = require('../src/pipeline');
const persistence = require('../src/persistence');

const VALID_SUBMITTER = { submittedBy: 'zara-capability-validation', authToken: 'zara-cvp-token-2026' };

function baseContract(overrides = {}) {
  return {
    name: 'Test Capability',
    purpose: 'Does something useful for testing.',
    validationReference: { reportId: 'EV-2026-999', validator: 'Zara Fatima', date: 'Aug 2026' },
    inputs: ['some input'],
    outputs: ['some output'],
    dependencies: [],
    ...VALID_SUBMITTER,
    ...overrides,
  };
}

// Re-seed a clean registry with COP-0001..0004 before running the suite, so tests
// are independent of whatever `node seed.js` left on disk from manual runs.
function reseed() {
  fs.rmSync(persistence.RECORDS_DIR, { recursive: true, force: true });
  fs.rmSync(persistence.REGISTRY_PATH, { force: true });
  persistence.ensureDirs();
  const reg = persistence.loadRegistry();
  reg.capabilities['COP-0001'] = { name: 'Automated Compliance Risk Scoring', readinessState: 'Conditionally Ready', version: '0.1', dependencies: [] };
  persistence.saveRegistry(reg);
  fs.writeFileSync(
    path.join(persistence.RECORDS_DIR, 'COP-0001.json'),
    JSON.stringify({ id: 'COP-0001', name: 'Automated Compliance Risk Scoring', version: '0.1', readinessState: 'Conditionally Ready', dependencies: [] }, null, 2)
  );
}

test('happy path: valid contract, no dependencies -> Conditionally Ready package', async () => {
  reseed();
  const result = await runPipeline(baseContract({ id: 'COP-TEST-01' }));
  assert(result.errors.length === 0, `unexpected errors: ${result.errors}`);
  assertEqual(result.capability.readinessState, 'Conditionally Ready');
  assertEqual(result.package.consumable, true);
});

test('missing dependency -> readiness state "Dependency Missing"', async () => {
  reseed();
  const result = await runPipeline(
    baseContract({ id: 'COP-TEST-02', dependencies: [{ id: 'COP-9999-DOES-NOT-EXIST', type: 'capability' }] })
  );
  assert(result.errors.length === 0);
  assertEqual(result.capability.readinessState, 'Dependency Missing');
  assertEqual(result.package.consumable, false);
});

test('circular dependency -> readiness state "Blocked"', async () => {
  reseed();
  // COP-A depends on COP-B, COP-B depends on COP-A.
  await runPipeline(baseContract({ id: 'COP-CYCLE-A', name: 'Cycle A', dependencies: [{ id: 'COP-CYCLE-B', type: 'capability' }] }));
  const result = await runPipeline(
    baseContract({ id: 'COP-CYCLE-B', name: 'Cycle B', dependencies: [{ id: 'COP-CYCLE-A', type: 'capability' }] })
  );
  assert(result.errors.length === 0);
  assertEqual(result.capability.readinessState, 'Blocked');
  assert(result.capability.lifecycleTransitions.some((t) => t.to === 'Blocked'), 'expected a transition into Blocked');
});

test('incompatible dependency version -> "Blocked"', async () => {
  reseed();
  const result = await runPipeline(
    baseContract({
      id: 'COP-TEST-03',
      dependencies: [{ id: 'COP-0001', type: 'capability', versionRequirement: '^9.0' }],
    })
  );
  assert(result.errors.length === 0);
  assertEqual(result.capability.readinessState, 'Blocked');
});

test('malformed contract (missing purpose and validationReference) -> rejected before persistence', async () => {
  reseed();
  const result = await runPipeline({ name: 'Broken', ...VALID_SUBMITTER });
  assertEqual(result.capability, null);
  assert(result.errors.length > 0);
  assertEqual(result.stage, 'Intake');
});

test('duplicate submission (same ID twice) -> second one rejected', async () => {
  reseed();
  const first = await runPipeline(baseContract({ id: 'COP-DUP-01' }));
  assert(first.errors.length === 0);
  const second = await runPipeline(baseContract({ id: 'COP-DUP-01' }));
  assertEqual(second.capability, null);
  assert(second.errors[0].includes('already been submitted'));
});

test('timeout during dependency resolution -> capability marked "Failed", pipeline does not crash', async () => {
  reseed();
  const result = await runPipeline(
    baseContract({ id: 'COP-TEST-04', dependencies: [{ id: 'COP-0001', type: 'capability' }] }),
    { timeoutMs: 20, simulatedDelayMs: 200 } // lookup deliberately slower than the timeout
  );
  assert(result.errors.length === 0, 'pipeline should complete, not throw, on a dependency timeout');
  assertEqual(result.capability.readinessState, 'Failed');
});

test('unauthorized request (bad token) -> rejected at Intake, no record created', async () => {
  reseed();
  const result = await runPipeline(
    baseContract({ id: 'COP-TEST-05', submittedBy: 'zara-capability-validation', authToken: 'wrong-token' })
  );
  assertEqual(result.capability, null);
  assertEqual(result.stage, 'Intake');
  assert(result.errors[0].toLowerCase().includes('not an authorized source') || result.errors[0].toLowerCase().includes('unauthorized'));
  assertEqual(persistence.recordExists('COP-TEST-05'), false);
});

test('unknown submitter entirely -> rejected', async () => {
  reseed();
  const result = await runPipeline(baseContract({ id: 'COP-TEST-06', submittedBy: 'random-unknown-platform', authToken: 'anything' }));
  assertEqual(result.capability, null);
  assert(result.errors.length > 0);
});

test('missing validation reference -> readiness state "Validation Reference Missing", no dependency work attempted', async () => {
  reseed();
  const contract = baseContract({ id: 'COP-TEST-07' });
  delete contract.validationReference;
  const result = await runPipeline(contract);
  assert(result.errors.length === 0);
  assertEqual(result.capability.readinessState, 'Validation Reference Missing');
});

run();
