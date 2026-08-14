'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { EngineeringOperationsEngine } = require('../src/engine');
const { handleCommand } = require('../src/cli');

function freshEngine() {
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  return engine;
}

// ---------------- Execution tracking ----------------

test('start() creates an Execution record with a triggeredBy actor', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1', 'zara');
  const history = engine.getExecutionHistory('j1');
  assert.equal(history.length, 1);
  assert.equal(history[0].triggeredBy, 'zara');
  assert.equal(history[0].endedAt, null);
});

test('submitForValidation closes the open execution with a result', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1', 'zara');
  engine.attachEvidence('j1', 'source-a');
  engine.submitForValidation('j1', { summary: 'clean', output: { x: 1 } });
  const history = engine.getExecutionHistory('j1');
  assert.equal(history.length, 1);
  assert.notEqual(history[0].endedAt, null);
  assert.equal(history[0].result, 'PASSED');
});

test('a retry produces a SECOND, separate execution record — history is not overwritten', () => {
  const engine = freshEngine();
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });
  engine.start('j1', 'zara');
  engine.submitForValidation('j1', { summary: 's', output: { x: 1 } }); // fails, no evidence
  engine.retry('j1');
  engine.start('j1', 'zara');
  engine.attachEvidence('j1', 'source-a');
  engine.submitForValidation('j1', { summary: 'clean', output: { x: 1 } });

  const history = engine.getExecutionHistory('j1');
  assert.equal(history.length, 2);
  assert.equal(history[0].result, 'FAILED');
  assert.equal(history[1].result, 'PASSED');
});

// ---------------- CLI ----------------

test('CLI register-platform + create-job works end to end', () => {
  const engine = new EngineeringOperationsEngine();
  const r1 = handleCommand(['register-platform', 'p1', 'Platform One', 'Owner One'], engine);
  assert.equal(r1.ok, true);
  const r2 = handleCommand(['create-job', 'j1', 'p1', 'do the thing'], engine);
  assert.equal(r2.ok, true);
  assert.equal(engine.jobs.get('j1').status, 'QUEUED');
});

test('CLI full lifecycle: start, evidence, submit, integrate, release', () => {
  const engine = new EngineeringOperationsEngine();
  handleCommand(['register-platform', 'p1', 'Platform One', 'Owner One'], engine);
  handleCommand(['create-job', 'j1', 'p1', 'do the thing'], engine);
  handleCommand(['start', 'j1', 'kamil'], engine);
  handleCommand(['evidence', 'j1', 'source-a'], engine);
  const submitResult = handleCommand(['submit', 'j1', 'clean output summary'], engine);
  assert.match(submitResult.message, /PASSED/);
  handleCommand(['integrate', 'j1'], engine);
  const releaseResult = handleCommand(['release', 'j1'], engine);
  assert.match(releaseResult.message, /RELEASE_READY/);
});

test('CLI returns ok:false with a usage message for bad input, never throws', () => {
  const engine = new EngineeringOperationsEngine();
  const result = handleCommand(['create-job'], engine);
  assert.equal(result.ok, false);
  assert.match(result.message, /Usage/);
});

test('CLI unknown command lists available commands instead of crashing', () => {
  const engine = new EngineeringOperationsEngine();
  const result = handleCommand(['not-a-real-command'], engine);
  assert.equal(result.ok, false);
  assert.match(result.message, /Available/);
});

test('CLI ask routes to the real rule-based assistant', () => {
  const engine = new EngineeringOperationsEngine();
  handleCommand(['register-platform', 'p1', 'Platform One', 'Owner One'], engine);
  handleCommand(['create-job', 'j1', 'p1', 'first'], engine);
  handleCommand(['create-job', 'j2', 'p1', 'second', 'j1'], engine);
  const result = handleCommand(['ask', 'is', 'anything', 'blocked?'], engine);
  assert.match(result.message, /j2/);
});
