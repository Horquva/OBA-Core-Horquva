const { resolveEntityMatches } = require('./entity-matching');

const VALID_DEPARTMENTS = new Set(['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS']);
const VALID_ENTITY_TYPES = new Set(['PERSON', 'AGENT', 'WORKFLOW', 'TEAM']);

function createToolResponse(data, source, evidence = {}, notes = []) {
  return {
    data,
    provenance: { source, timestamp: new Date().toISOString() },
    evidence,
    notes
  };
}

async function resolve_entity({ name }, context = {}) {
  const matches = resolveEntityMatches(name, (context && context.entities) || []);
  return createToolResponse(
    matches,
    'resolve_entity',
    { inputQuery: name, matchCount: matches.length },
    matches.length > 1 ? ['Multiple matches found. Clarification required if single entity needed.'] : []
  );
}

async function get_org_snapshot(params, context = {}) {
  const snapshot = (context && context.orgSnapshot) || { totalEntities: ((context && context.entities) || []).length };
  return createToolResponse(snapshot, 'get_org_snapshot', { retrievedAt: new Date().toISOString() });
}

async function get_entity_profile({ entityId }, context = {}) {
  const entity = ((context && context.entities) || []).find(e => e.id === entityId || e.entityId === entityId);
  if (!entity) {
    return createToolResponse(null, 'get_entity_profile', { entityId }, ['Entity with ID ' + entityId + ' not found.']);
  }
  return createToolResponse(entity, 'get_entity_profile', { entityId });
}

async function list_entities({ department, type } = {}, context = {}) {
  const notes = [];
  let filtered = (context && context.entities) || [];

  if (department) {
    const normalizedDept = String(department).toUpperCase();
    if (!VALID_DEPARTMENTS.has(normalizedDept)) {
      notes.push('Invalid department category ' + department + '. Filter ignored.');
    } else {
      filtered = filtered.filter(e => String(e.department).toUpperCase() === normalizedDept);
    }
  }

  if (type) {
    const normalizedType = String(type).toUpperCase();
    if (!VALID_ENTITY_TYPES.has(normalizedType)) {
      notes.push('Invalid entity type category ' + type + '. Filter ignored.');
    } else {
      filtered = filtered.filter(e => String(e.type).toUpperCase() === normalizedType);
    }
  }

  return createToolResponse(filtered, 'list_entities', { totalReturned: filtered.length }, notes);
}

async function get_intelligence({ entityId } = {}, context = {}) {
  const intel = ((context && context.intelligence) || []).filter(i => i.entityId === entityId);
  return createToolResponse(intel, 'get_intelligence', { entityId });
}

async function run_brain_analysis({ targetId } = {}, context = {}) {
  const analysis = (context && context.brainAnalysis) ? context.brainAnalysis[targetId] : { status: 'complete', score: 85 };
  return createToolResponse(analysis, 'run_brain_analysis', { targetId });
}

async function get_metric_definition({ metricKey } = {}, context = {}) {
  const definition = ((context && context.metricGlossary) || {})[metricKey] || null;
  return createToolResponse(
    definition,
    'get_metric_definition',
    { metricKey },
    definition ? [] : ['Metric key ' + metricKey + ' not found in glossary.']
  );
}

module.exports = {
  resolve_entity,
  get_org_snapshot,
  get_entity_profile,
  list_entities,
  get_intelligence,
  run_brain_analysis,
  get_metric_definition
};
