const test = require('node:test');
const assert = require('node:assert/strict');
const readTools = require('./read-tools');

test('readTools - exports valid registry array structure', () => {
  assert.ok(Array.isArray(readTools), 'Export should be an array of tools');
  assert.equal(readTools.length, 7, 'Should export exactly 7 read tools');

  for (const tool of readTools) {
    assert.ok(typeof tool.name === 'string', 'Tool must have a string name');
    assert.ok(typeof tool.description === 'string', 'Tool must have a description');
    assert.ok(typeof tool.parameters === 'object', 'Tool must specify parameters schema');
    assert.ok(typeof tool.run === 'function', 'Tool must define an async run method');
  }
});

test('resolve_entity - respects run(ctx, args) signature and envelope shape', async () => {
  const resolveTool = readTools.find(t => t.name === 'resolve_entity');
  const mockContext = {
    entities: [{ id: 'ent-1', name: 'Bisma Nadeem' }]
  };

  const response = await resolveTool.run(mockContext, { name: 'Bisma' });

  assert.ok(response.provenance, 'Response must contain provenance metadata');
  assert.equal(response.provenance.source, 'resolve_entity');
  assert.equal(response.data.length, 1);
  assert.equal(response.data[0].id, 'ent-1');
});

test('get_entity_profile - returns error note when entity is not found', async () => {
  const profileTool = readTools.find(t => t.name === 'get_entity_profile');
  const mockContext = { entities: [] };

  const response = await profileTool.run(mockContext, { entityId: 'invalid-id' });

  assert.equal(response.data, null);
  assert.ok(response.notes.length > 0);
  assert.match(response.notes[0], /not found/i);
});