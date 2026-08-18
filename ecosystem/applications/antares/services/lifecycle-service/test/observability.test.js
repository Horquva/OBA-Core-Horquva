'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { EngineeringOperationsEngine } = require('../src/engine');
const { recordCiRun, getEngineeringHealth } = require('../src/ciHistory');
const { getFullObservability, getPlatformHealthAll } = require('../src/observability');

function tempHistoryPath() {
  return path.join(os.tmpdir(), `antares-ci-history-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

test('getEngineeringHealth returns nulls when no CI runs are recorded yet', () => {
  const p = tempHistoryPath();
  const health = getEngineeringHealth(20, p);
  assert.equal(health.runsTracked, 0);
  assert.equal(health.overallPassRate, null);
});

test('recordCiRun + getEngineeringHealth computes correct pass rates', () => {
  const p = tempHistoryPath();
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: true, overallPassed: true }, p);
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: false, overallPassed: false }, p);
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: true, overallPassed: true }, p);

  const health = getEngineeringHealth(20, p);
  assert.equal(health.runsTracked, 3);
  assert.equal(health.lintPassRate, 100);
  assert.equal(health.buildPassRate, 100);
  assert.equal(health.testPassRate, 67); // 2 of 3 passed, rounded
  assert.equal(health.overallPassRate, 67);

  fs.unlinkSync(p);
});

test('getEngineeringHealth only looks at the last windowSize runs', () => {
  const p = tempHistoryPath();
  // 2 failing runs, then 3 passing runs — window of 3 should only see the passing ones
  recordCiRun({ lintPassed: false, buildPassed: false, testsPassed: false, overallPassed: false }, p);
  recordCiRun({ lintPassed: false, buildPassed: false, testsPassed: false, overallPassed: false }, p);
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: true, overallPassed: true }, p);
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: true, overallPassed: true }, p);
  recordCiRun({ lintPassed: true, buildPassed: true, testsPassed: true, overallPassed: true }, p);

  const health = getEngineeringHealth(3, p);
  assert.equal(health.runsTracked, 3);
  assert.equal(health.overallPassRate, 100);

  fs.unlinkSync(p);
});

test('getPlatformHealthAll returns one entry per registered platform', () => {
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  engine.registerPlatform({ id: 'p2', name: 'Platform Two', owner: 'Owner Two' });
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });

  const all = getPlatformHealthAll(engine);
  assert.equal(all.length, 2);
  const p1Health = all.find((h) => h.platformId === 'p1');
  assert.equal(p1Health.totalJobs, 1);
});

test('getFullObservability combines system, engineering, and platform health', () => {
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'p1', name: 'Platform One', owner: 'Owner One' });
  engine.createJob({ id: 'j1', platformId: 'p1', task: 'do work' });

  const obs = getFullObservability(engine);
  assert.ok(obs.systemHealth);
  assert.ok(obs.engineeringHealth);
  assert.ok(Array.isArray(obs.platformHealth));
  assert.ok(Array.isArray(obs.recentEvents));
});
