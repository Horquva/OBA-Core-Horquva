const { resolveEntityMatches } = require('./entityMatching');

// Enums for fixed category filtering (Rule requirement)
const VALID_DEPARTMENTS = new Set(['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS']);
const VALID_ENTITY_TYPES = new Set(['PERSON', 'AGENT', 'WORKFLOW', 'TEAM']);

/**
 * Helper to wrap responses in standard tool contract shape
 */
function createToolResponse(data, source, evidence = {}, notes = []) {
  return {
    data,
    provenance: {
      source,
      timestamp: new Date().toISOString()
    },
    evidence,
    notes
  };
}

// 1. resolve_entity
async function resolve_entity({ name }, context) {
  const matches = resolveEntityMatches(name, context.entities || []);
  return createToolResponse(
    matches,
    'resolve_entity',
    { inputQuery: name, matchCount: matches.length },
    matches.length > 1 ? ['Multiple matches found. Clarification required if single entity needed.'] : []
  );
}

// 2. get_org_snapshot
async function get_org_snapshot(params, context) {
  const snapshot = context.orgSnapshot || { totalEntities: (context.entities || []).length };
  return createToolResponse(snapshot, 'get_org_snapshot', { retrievedAt: new Date().toISOString() });
}

// 3. get_entity_profile
async function get_entity_profile({ entityId }, context) {
  const entity = (context.entities || []).find(e => e.id === entityId || e.entityId === entityId);
  if (!entity) {
    return createToolResponse(null, 'get_entity_profile', { entityId }, [`Entity with ID ${entityId} not found.`]);
  }
  return createToolResponse(entity, 'get_entity_profile', { entityId });
}

// 4. list_entities (Strict Enum/Category filtering only)
async function list_entities({ department, type }, context) {
  const notes = [];
  let filtered = context.entities || [];

  if (department) {
    const normalizedDept = String(department).toUpperCase();
    if (!VALID_DEPARTMENTS.has(normalizedDept)) {
      notes.push(`Invalid department category '${department}'. Ignored.`);
    } else {
      filtered = filtered.filter(e => String(e.department).toUpperCase() === normalizedDept);
    }
  }

  if (type) {
    const normalizedType = String(type).toUpperCase();
    if (!VALID_ENTITY_TYPES.has(normalizedType)) {
      notes.push(`Invalid entity type category '${type}'. Ignored.`);
    } else {
      filtered = filtered.filter(e => String(e.type).toUpperCase() === normalizedType);
    }
  }

  return createToolResponse(filtered, 'list_entities', { totalReturned: filtered.length }, notes);
}

// 5. get_intelligence
async function get_intelligence({ entityId }, context) {
  const intel = (context.intelligence || []).filter(i => i.entityId === entityId);
  return createToolResponse(intel, 'get_intelligence', { entityId });
}

// 6. run_brain_analysis
async function run_brain_analysis({ targetId }, context) {
  const analysis = context.brainAnalysis ? context.brainAnalysis[targetId] : { status: 'complete', score: 85 };
  return createToolResponse(analysis, 'run_brain_analysis', { targetId });
}

// 7. get_metric_definition
async function get_metric_definition({ metricKey }, context) {
  const definition = (context.metricGlossary || {})[metricKey] || null;
  return createToolResponse(
    definition,
    'get_metric_definition',
    { metricKey },
    definition ? [] : [`Metric key '${metricKey}' not found in glossary.`]
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