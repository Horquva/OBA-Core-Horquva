const test = require('node:test');
const assert = require('node:assert/strict');
const { computeReplaceability } = require('../tools/replaceability');

test('AI-3: High rating when all 3 factors are present', () => {
  const entity = { id: 'sys-1', backupExists: true, alternativeExists: true, isDocumented: true };
  const result = computeReplaceability(entity);
  
  assert.equal(result.rating, 'High');
  assert.equal(result.factors.backupExists, true);
  assert.equal(result.factors.alternativeExists, true);
  assert.equal(result.factors.isDocumented, true);
});

test('AI-3: Medium rating when exactly 1 factor is missing', () => {
  const entity = { id: 'agent-1', backupExists: true, alternativeExists: false, isDocumented: true };
  const result = computeReplaceability(entity);
  
  assert.equal(result.rating, 'Medium');
});

test('AI-3: Low rating when 2 or 3 factors are missing', () => {
  // 2 missing
  const entity2Missing = { id: 'vendor-1', backupExists: false, alternativeExists: false, isDocumented: true };
  const result2 = computeReplaceability(entity2Missing);
  assert.equal(result2.rating, 'Low');

  // 3 missing
  const entity3Missing = { id: 'person-1', backupExists: false, alternativeExists: false, isDocumented: false };
  const result3 = computeReplaceability(entity3Missing);
  assert.equal(result3.rating, 'Low');
});