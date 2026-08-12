'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { EngineeringOperationsEngine } = require('../src/engine');

function seededEngine() {
  const engine = new EngineeringOperationsEngine();
  engine.registerPlatform({ id: 'cap-validation', name: 'Capability Validation', owner: 'Zara Fatima' });
  engine.registerPlatform({ id: 'tech-intel', name: 'Technology Intelligence', owner: 'Aurangzeb Malik' });
  engine.createJob({ id: 'j1', platformId: 'tech-intel', task: 'discover signal' });
  engine.createJob({ id: 'j2', platformId: 'cap-validation', task: 'validate capability', dependsOn: ['j1'] });
  return engine;
}

test('findBlockedPlatforms groups blocked jobs by their owning platform', () => {
  const engine = seededEngine();
  const blocked = engine.findBlockedPlatforms();
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].platformId, 'cap-validation');
  assert.equal(blocked[0].owner, 'Zara Fatima');
  assert.equal(blocked[0].blockedJobs.length, 1);
});

test('explainPlatformBlockage names the platform and its blocked job', () => {
  const engine = seededEngine();
  const explanation = engine.explainPlatformBlockage('cap-validation');
  assert.match(explanation, /Capability Validation/);
  assert.match(explanation, /Zara Fatima/);
  assert.match(explanation, /j2/);
});

test('explainPlatformBlockage reports clean status when nothing is blocked', () => {
  const engine = seededEngine();
  const explanation = engine.explainPlatformBlockage('tech-intel');
  assert.match(explanation, /koi job blocked nahi hai/);
});

test('askAssistant answers "kaunsa platform blocked hai" by platform name, not just job id', () => {
  const engine = seededEngine();
  const answer = engine.askAssistant('Capability Validation blocked hai kya?');
  assert.match(answer, /Capability Validation/);
  assert.match(answer, /Zara Fatima/);
  assert.doesNotMatch(answer, /Technology Intelligence/); // should NOT mention the unrelated platform
});

test('askAssistant answers "kaunsa platform blocked hai" by owner name (first name match)', () => {
  const engine = seededEngine();
  const answer = engine.askAssistant('Zara ka kaam blocked hai kya?');
  assert.match(answer, /Zara Fatima/);
  assert.match(answer, /j2/);
});

test('askAssistant falls back to a system-wide grouped answer when no platform is named', () => {
  const engine = seededEngine();
  const answer = engine.askAssistant('kya kuch blocked hai?');
  assert.match(answer, /Capability Validation/);
  assert.match(answer, /Zara Fatima/);
});

test('askAssistant returns a clean-status message for a named platform with nothing blocked', () => {
  const engine = seededEngine();
  const answer = engine.askAssistant('Aurangzeb ka kaam blocked hai kya?');
  assert.match(answer, /Technology Intelligence/);
  assert.match(answer, /koi job blocked nahi hai/);
});

test('askAssistant health question can be scoped to a named platform', () => {
  const engine = seededEngine();
  const answer = engine.askAssistant('Zara ka health kya hai?');
  assert.match(answer, /Capability Validation/);
  assert.match(answer, /BLOCKED:1/);
});
