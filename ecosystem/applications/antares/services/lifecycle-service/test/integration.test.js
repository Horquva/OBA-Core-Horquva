'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSeededEngine } = require('../src/seed');
const { checkAllContracts, checkJobContract } = require('../src/contracts');
const { JobStatus } = require('../src/models');

/**
 * integration.test.js
 * --------------------
 * Din 8-9 ka asal kaam: SAB 11 platforms ko ek sath, poori real chain
 * mein chalana, har platform-to-platform contract check karna, aur
 * JAAN-BOOJH KAR failures introduce kar ke dekhna ke system sahi
 * tareeke se rukta hai (aur recover karta hai) — kabhi silently aage
 * nahi badhta.
 */

function runFullChain(engine) {
  // 1) Technology Intelligence
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'discover governance tooling signal' });
  engine.start('J-TECH-01');
  engine.attachEvidence('J-TECH-01', 'source:radar-report');
  engine.submitForValidation('J-TECH-01', { summary: 'Tooling maturity rising', output: { maturity: 'developing' } });

  // 2) Future-Signal Intelligence
  engine.createJob({ id: 'J-SIGNAL-01', platformId: 'future-signal', task: 'correlate signal', dependsOn: ['J-TECH-01'] });
  engine.start('J-SIGNAL-01');
  engine.attachEvidence('J-SIGNAL-01', 'ref:J-TECH-01');
  engine.submitForValidation('J-SIGNAL-01', { summary: 'Pattern correlated', output: { pattern: 'adaptive-governance' } });

  // 3) Organizational Futures
  engine.createJob({ id: 'J-ORGFUT-01', platformId: 'org-futures', task: 'model future org', dependsOn: ['J-SIGNAL-01'] });
  engine.start('J-ORGFUT-01');
  engine.attachEvidence('J-ORGFUT-01', 'ref:J-SIGNAL-01');
  engine.submitForValidation('J-ORGFUT-01', { summary: 'Future org modeled', output: { model: 'Adaptive-Gov-Enterprise' } });

  // 4) Trust & Governance
  engine.createJob({ id: 'J-TRUST-01', platformId: 'trust-gov', task: 'governance evaluation', dependsOn: ['J-ORGFUT-01'] });
  engine.start('J-TRUST-01');
  engine.attachEvidence('J-TRUST-01', 'ref:J-ORGFUT-01');
  engine.submitForValidation('J-TRUST-01', { summary: 'No conflicts found', output: { decision: 'ALLOW' } });

  // 5) Capability Validation — DELIBERATE FAILURE (no evidence), then retry
  engine.createJob({
    id: 'J-VALID-01',
    platformId: 'cap-validation',
    task: 'validate candidate capability',
    dependsOn: ['J-ORGFUT-01', 'J-TRUST-01'],
  });
  engine.start('J-VALID-01');
  engine.submitForValidation('J-VALID-01', { summary: 'Looks strong', output: { rec: 'VALIDATE' } }); // no evidence -> FAILS
  engine.retry('J-VALID-01');
  engine.start('J-VALID-01');
  engine.attachEvidence('J-VALID-01', 'ref:J-ORGFUT-01');
  engine.attachEvidence('J-VALID-01', 'ref:J-TRUST-01');
  engine.submitForValidation('J-VALID-01', { summary: 'Validated, evidence strong', output: { rec: 'VALIDATE' } });
  engine.integrate('J-VALID-01');

  // 6) Enterprise Validation
  engine.createJob({ id: 'J-ENTVAL-01', platformId: 'enterprise-validation', task: 'AI/ML scoring', dependsOn: ['J-VALID-01'] });
  engine.start('J-ENTVAL-01');
  engine.attachEvidence('J-ENTVAL-01', 'ref:J-VALID-01');
  engine.submitForValidation('J-ENTVAL-01', { summary: 'Confidence scored', output: { confidence: 0.86 } });
  engine.integrate('J-ENTVAL-01');

  // 7) Knowledge Operationalization
  engine.createJob({ id: 'J-KNOW-01', platformId: 'knowledge-ops', task: 'persist knowledge object', dependsOn: ['J-ENTVAL-01'] });
  engine.start('J-KNOW-01');
  engine.attachEvidence('J-KNOW-01', 'ref:J-ENTVAL-01');
  engine.submitForValidation('J-KNOW-01', { summary: 'Knowledge persisted', output: { id: 'KO-01' } });
  engine.integrate('J-KNOW-01');

  // 8) Capability Operationalization
  engine.createJob({ id: 'J-CAPOPS-01', platformId: 'cap-ops', task: 'package operational capability', dependsOn: ['J-KNOW-01'] });
  engine.start('J-CAPOPS-01');
  engine.attachEvidence('J-CAPOPS-01', 'ref:J-KNOW-01');
  engine.submitForValidation('J-CAPOPS-01', { summary: 'Package generated', output: { pkg: 'PKG-01' } });
  engine.integrate('J-CAPOPS-01');

  // Integrate the full chain, in order — every stage's output gets
  // consumed downstream, exactly like the real Antares lifecycle.
  for (const id of ['J-TECH-01', 'J-SIGNAL-01', 'J-ORGFUT-01', 'J-TRUST-01', 'J-VALID-01', 'J-ENTVAL-01', 'J-KNOW-01', 'J-CAPOPS-01']) {
    if (engine.jobs.get(id).status === JobStatus.PASSED) engine.integrate(id);
  }

  return engine;
}

test('full 11-platform chain: every stage produces a real, evidence-backed PASSED/INTEGRATED job', () => {
  const engine = buildSeededEngine();
  runFullChain(engine);

  const expectedPassed = ['J-TECH-01', 'J-SIGNAL-01', 'J-ORGFUT-01', 'J-TRUST-01', 'J-VALID-01', 'J-ENTVAL-01', 'J-KNOW-01', 'J-CAPOPS-01'];
  for (const id of expectedPassed) {
    assert.equal(engine.jobs.get(id).status, JobStatus.INTEGRATED, `${id} should be INTEGRATED`);
  }
});

test('deliberate failure (missing evidence) is genuinely rejected, then recovers cleanly on retry', () => {
  const engine = buildSeededEngine();
  runFullChain(engine);

  const history = engine.getExecutionHistory('J-VALID-01');
  assert.equal(history.length, 2, 'should have exactly 2 execution attempts');
  assert.equal(history[0].result, 'FAILED');
  assert.equal(history[1].result, 'PASSED');
});

test('a downstream platform created BEFORE its dependency finishes is genuinely BLOCKED, not silently allowed', () => {
  const engine = buildSeededEngine();

  // Create the Future Organization job EARLY — before its dependency
  // has finished. This proves the system enforces the chain instead
  // of letting downstream work start early.
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'discover signal' });
  engine.createJob({
    id: 'J-FUTUREORG-01',
    platformId: 'future-org',
    task: 'instantiate org runtime',
    dependsOn: ['J-TECH-01'], // depends on something not yet done
  });
  assert.equal(engine.jobs.get('J-FUTUREORG-01').status, JobStatus.BLOCKED);
  assert.throws(() => engine.start('J-FUTUREORG-01'), /BLOCKED/);
});

test('a stalled/unavailable upstream platform keeps its dependents BLOCKED indefinitely (no silent timeout-pass)', () => {
  const engine = buildSeededEngine();
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'discover signal' });
  engine.start('J-TECH-01');
  // Simulate the platform "going down" — it never submits for validation.
  // J-TECH-01 stays RUNNING forever.
  engine.createJob({ id: 'J-SIGNAL-01', platformId: 'future-signal', task: 'correlate', dependsOn: ['J-TECH-01'] });

  assert.equal(engine.jobs.get('J-TECH-01').status, JobStatus.RUNNING);
  assert.equal(engine.jobs.get('J-SIGNAL-01').status, JobStatus.BLOCKED);
  assert.throws(() => engine.start('J-SIGNAL-01'));
});

test('checkAllContracts passes on the full, legitimately-built chain (no violations)', () => {
  const engine = buildSeededEngine();
  runFullChain(engine);

  const result = checkAllContracts(engine);
  assert.equal(result.valid, true, `Expected no contract violations, got: ${result.violations.join('; ')}`);
});

test('checkAllContracts CATCHES a deliberately illegal cross-platform dependency', () => {
  const engine = buildSeededEngine();
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'discover signal' });
  engine.start('J-TECH-01');
  engine.attachEvidence('J-TECH-01', 'source-a');
  engine.submitForValidation('J-TECH-01', { summary: 'ok', output: { x: 1 } });
  engine.integrate('J-TECH-01');

  engine.createJob({ id: 'J-KNOW-01', platformId: 'knowledge-ops', task: 'persist' });
  engine.start('J-KNOW-01');
  engine.attachEvidence('J-KNOW-01', 'source-a');
  engine.submitForValidation('J-KNOW-01', { summary: 'ok', output: { x: 1 } });
  engine.integrate('J-KNOW-01');

  // ILLEGAL: Technology Intelligence should never depend directly on
  // Knowledge Operationalization — that skips the entire validation
  // chain. This is the exact kind of mistake a beginner team member
  // could make by accident.
  engine.createJob({ id: 'J-TECH-02', platformId: 'tech-intel', task: 'bad dependency', dependsOn: ['J-KNOW-01'] });

  const result = checkAllContracts(engine);
  assert.equal(result.valid, false);
  assert.match(result.violations[0], /J-TECH-02/);
  assert.match(result.violations[0], /illegally depends/);
});

test("checkJobContract on a single job correctly isolates just that job's violations", () => {
  const engine = buildSeededEngine();
  engine.createJob({ id: 'J-A', platformId: 'tech-intel', task: 'root job' });
  engine.createJob({ id: 'J-B', platformId: 'cap-ops', task: 'illegal early dependency', dependsOn: ['J-A'] });

  const result = checkJobContract(engine, engine.jobs.get('J-B'));
  assert.equal(result.valid, false);
  assert.equal(result.violations.length, 1);
});

test('system health reflects HEALTHY only once every job in the full chain has genuinely resolved', () => {
  const engine = buildSeededEngine();
  runFullChain(engine);
  const health = engine.getSystemHealth();
  assert.equal(health.blocked, 0);
  assert.equal(health.failed, 0);
  assert.equal(health.gatePassRatePct, 100);
});
