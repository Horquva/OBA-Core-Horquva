'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { EngineeringOperationsEngine } = require('../src/engine');
const { saveState, loadState, loadOrCreate } = require('../src/persistence');

function tempStorePath() {
  return path.join(os.tmpdir(), `antares-test-store-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

test('loadState returns null when no file exists yet', () => {
  const p = tempStorePath();
  assert.equal(loadState(p), null);
});

test('saveState then loadState round-trips platforms and jobs correctly', () => {
  const storePath = tempStorePath();
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do the thing' });
  engine.start('j1');
  engine.attachEvidence('j1', 'source-a');
  engine.submitForValidation('j1', { summary: 'clean', output: { x: 1 } });

  saveState(engine, storePath);
  const restored = loadState(storePath);

  assert.equal(restored.platforms.size, 1);
  assert.equal(restored.jobs.size, 1);
  const restoredJob = restored.jobs.get('j1');
  assert.equal(restoredJob.status, 'PASSED');
  assert.equal(restoredJob.evidence.length, 1);
  assert.equal(restoredJob.evidence[0].ref, 'source-a');

  fs.unlinkSync(storePath);
});

test('restored engine keeps working — dependency logic still functions after reload', () => {
  const storePath = tempStorePath();
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  engine.registerPlatform({ id: 'p2', name: 'Platform Two', owner: 'Owner Two' });
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'first' });
  engine.createJob({ id: 'j2', platformId: 'p2', task: 'second', dependsOn: ['j1'] });

  saveState(engine, storePath);
  const restored = loadState(storePath);

  assert.equal(restored.jobs.get('j2').status, 'BLOCKED');

  // finish j1 on the restored engine, confirm j2 auto-unblocks
  restored.start('j1');
  restored.attachEvidence('j1', 'source-a');
  restored.submitForValidation('j1', { summary: 'ok', output: { x: 1 } });
  restored.integrate('j1');
  assert.equal(restored.jobs.get('j2').status, 'QUEUED');

  fs.unlinkSync(storePath);
});

test('loadOrCreate returns a fresh empty engine when nothing is saved', () => {
  const p = tempStorePath();
  const engine = loadOrCreate(p);
  assert.equal(engine.platforms.size, 0);
  assert.equal(engine.jobs.size, 0);
});
