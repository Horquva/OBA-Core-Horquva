const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEntityMatches } = require('./entity-matching');

test('resolveEntityMatches - matches exact names and partial query terms', () => {
  const mockEntities = [
    { id: '1', name: 'Bisma Nadeem' },
    { id: '2', name: 'Ahmad Tanveer' },
    { id: '3', name: 'Bisma Khan' }
  ];

  // Exact / Single Match
  const singleResult = resolveEntityMatches('Ahmad', mockEntities);
  assert.equal(singleResult.length, 1);
  assert.equal(singleResult[0].id, '2');

  // Ambiguous / Multiple Matches
  const multiResult = resolveEntityMatches('Bisma', mockEntities);
  assert.equal(multiResult.length, 2);

  // Empty / No Matches
  const noResult = resolveEntityMatches('Nonexistent', mockEntities);
  assert.equal(noResult.length, 0);
});