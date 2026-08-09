'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { EngineeringOperationsEngine } = require('../src/engine');
const { JobStatus } = require('../src/models');

function freshEngine() {
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  engine.registerPlatform({ id: 'p2', name: 'Platform Two', owner: 'Owner Two' });
  return engine;
}

test('registerPlatform rejects duplicate platform ids', () => {
  const engine = freshEngine();
  assert.throws(() => engine.registerPlatform({ id: 'p1', name: 'dup', owner: 'x' }));
});

test('createJob rejects unknown platform', () => {
  const engine = freshEngine();
  assert.throws(() => engine.createJob({ id: 'j1', platformId: 'nope', task: 'x' }));
});

test('job with no dependencies starts QUEUED, not BLOCKED', () => {
  const engine = freshEngine();
  const job = engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  assert.equal(job.status, JobStatus.QUEUED);
});

test('job with unmet dependency is BLOCKED', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  const job2 = engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });
  assert.equal(job2.status, JobStatus.BLOCKED);
});

test('starting a BLOCKED job throws', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });
  assert.throws(() => engine.start('j2'));
});

test('quality gate FAILS a job with no evidence attached', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1');
  const job = engine.submitForValidation('j1', { summary: 's', output: { x: 1 } });
  assert.equal(job.status, JobStatus.FAILED);
  assert.equal(job.qualityGateResult.passed, false);
});

test('quality gate FAILS a job containing forbidden mock markers', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1');
  engine.attachEvidence('j1', 'some-source');
  const job = engine.submitForValidation('j1', { summary: 'this uses mock data for now', output: { x: 1 } });
  assert.equal(job.status, JobStatus.FAILED);
});

test('quality gate PASSES a clean job with evidence and required fields', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1');
  engine.attachEvidence('j1', 'source-a');
  const job = engine.submitForValidation('j1', { summary: 'clean summary', output: { x: 1 } });
  assert.equal(job.status, JobStatus.PASSED);
  assert.equal(job.qualityGateResult.passed, true);
});

test('retry moves a FAILED job back to QUEUED', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1');
  engine.submitForValidation('j1', { summary: 's', output: { x: 1 } }); // fails (no evidence)
  const job = engine.retry('j1');
  assert.equal(job.status, JobStatus.QUEUED);
});

test('dependent job auto-unblocks once dependency PASSES and INTEGRATES', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  const j2 = engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });
  assert.equal(j2.status, JobStatus.BLOCKED);

  engine.start('j1');
  engine.attachEvidence('j1', 'source-a');
  engine.submitForValidation('j1', { summary: 's', output: { x: 1 } });
  engine.integrate('j1');

  const j2After = engine.jobs.get('j2');
  assert.equal(j2After.status, JobStatus.QUEUED);
});

test('full lifecycle: QUEUED -> RUNNING -> VALIDATING -> PASSED -> INTEGRATED -> RELEASE_READY', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1');
  engine.attachEvidence('j1', 'source-a');
  engine.submitForValidation('j1', { summary: 's', output: { x: 1 } });
  engine.integrate('j1');
  const job = engine.releaseReady('j1');
  assert.equal(job.status, JobStatus.RELEASE_READY);
});

test('illegal transition is rejected (cannot integrate a QUEUED job)', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  assert.throws(() => engine.integrate('j1'));
});

test('getSystemHealth reports ATTENTION_NEEDED when something is blocked', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });
  const health = engine.getSystemHealth();
  assert.equal(health.healthLabel, 'ATTENTION_NEEDED');
  assert.equal(health.blocked, 1);
});

test('askAssistant answers block/fail/health/recent questions from real state, not fabricated', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });

  const blockAnswer = engine.askAssistant('kya kuch blocked hai?');
  assert.match(blockAnswer, /j2/);

  const healthAnswer = engine.askAssistant('system health kya hai?');
  assert.match(healthAnswer, /ATTENTION_NEEDED/);
});

test('explainBlock names the exact unmet dependency', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  const j2 = engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });
  const explanation = engine.explainBlock('j2');
  assert.match(explanation, /j1/);
  assert.equal(j2.status, JobStatus.BLOCKED);
});
