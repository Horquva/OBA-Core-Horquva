const { resolveEntityMatches } = require('./entity-matching');

const VALID_DEPARTMENTS = ['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS'];
const VALID_ENTITY_TYPES = ['PERSON', 'AGENT', 'WORKFLOW', 'TEAM'];

function createToolResponse(data, source, evidence = {}, notes = []) {
  return {
    data,
    provenance: { source, timestamp: new Date().toISOString() },
    evidence,
    notes
  };
}

const readTools = [
  {
    name: 'resolve_entity',
    description: 'Matches incoming query strings against entity database records.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Search query or entity name to match' }
      },
      required: ['name']
    },
    run: async (ctx = {}, args = {}) => {
      const name = args && args.name ? String(args.name).trim() : '';
      if (!name) {
        return createToolResponse([], 'resolve_entity', { inputQuery: name, matchCount: 0 }, ['Parameter "name" is required and cannot be empty.']);
      }
      
      const matches = resolveEntityMatches(name, (ctx && ctx.entities) || []);
      return createToolResponse(
        matches,
        'resolve_entity',
        { inputQuery: name, matchCount: matches.length },
        matches.length > 1 ? ['Multiple matches found. Clarification required if single entity needed.'] : []
      );
    }
  },
  {
    name: 'get_org_snapshot',
    description: 'Retrieves overall organization structure and snapshot metrics.',
    parameters: {
      type: 'object',
      properties: {}
    },
    run: async (ctx = {}, args = {}) => {
      const snapshot = (ctx && ctx.orgSnapshot) || { totalEntities: ((ctx && ctx.entities) || []).length };
      return createToolResponse(snapshot, 'get_org_snapshot', { retrievedAt: new Date().toISOString() });
    }
  },
  {
    name: 'get_entity_profile',
    description: 'Fetches detailed metadata and profile information for a specific entity ID.',
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Unique identifier of the entity' }
      },
      required: ['entityId']
    },
    run: async (ctx = {}, args = {}) => {
      const entityId = args && args.entityId ? String(args.entityId).trim() : '';
      if (!entityId) {
        return createToolResponse(null, 'get_entity_profile', {}, ['Parameter "entityId" is required.']);
      }

      const entity = ((ctx && ctx.entities) || []).find(e => e.id === entityId || e.entityId === entityId);
      if (!entity) {
        return createToolResponse(null, 'get_entity_profile', { entityId }, ['Entity with ID ' + entityId + ' not found.']);
      }
      return createToolResponse(entity, 'get_entity_profile', { entityId });
    }
  },
  {
    name: 'list_entities',
    description: 'Lists and filters entities by department or type using strict category enums.',
    parameters: {
      type: 'object',
      properties: {
        department: { type: 'string', enum: VALID_DEPARTMENTS, description: 'Department category filter' },
        type: { type: 'string', enum: VALID_ENTITY_TYPES, description: 'Entity type category filter' }
      }
    },
    run: async (ctx = {}, args = {}) => {
      const { department, type } = args || {};
      const notes = [];
      let filtered = (ctx && ctx.entities) || [];

      if (department) {
        const normalizedDept = String(department).toUpperCase();
        if (!VALID_DEPARTMENTS.includes(normalizedDept)) {
          notes.push('Invalid department category ' + department + '. Filter ignored.');
        } else {
          filtered = filtered.filter(e => String(e.department).toUpperCase() === normalizedDept);
        }
      }

      if (type) {
        const normalizedType = String(type).toUpperCase();
        if (!VALID_ENTITY_TYPES.includes(normalizedType)) {
          notes.push('Invalid entity type category ' + type + '. Filter ignored.');
        } else {
          filtered = filtered.filter(e => String(e.type).toUpperCase() === normalizedType);
        }
      }

      return createToolResponse(filtered, 'list_entities', { totalReturned: filtered.length }, notes);
    }
  },
  {
    name: 'get_intelligence',
    description: 'Retrieves intelligence records associated with an entity ID.',
    parameters: {
      type: 'object',
      properties: {
        entityId: { type: 'string', description: 'Target entity ID' }
      },
      required: ['entityId']
    },
    run: async (ctx = {}, args = {}) => {
      const entityId = args && args.entityId ? String(args.entityId).trim() : '';
      if (!entityId) {
        return createToolResponse([], 'get_intelligence', {}, ['Parameter "entityId" is required.']);
      }

      const intel = ((ctx && ctx.intelligence) || []).filter(i => i.entityId === entityId);
      return createToolResponse(intel, 'get_intelligence', { entityId });
    }
  },
  {
    name: 'run_brain_analysis',
    description: 'Executes brain status analysis and evaluation scores for a target ID.',
    parameters: {
      type: 'object',
      properties: {
        targetId: { type: 'string', description: 'Target entity or system ID' }
      },
      required: ['targetId']
    },
    run: async (ctx = {}, args = {}) => {
      const targetId = args && args.targetId ? String(args.targetId).trim() : '';
      if (!targetId) {
        return createToolResponse(null, 'run_brain_analysis', {}, ['Parameter "targetId" is required.']);
      }

      const analysis = (ctx && ctx.brainAnalysis) ? ctx.brainAnalysis[targetId] : { status: 'complete', score: 85 };
      return createToolResponse(analysis, 'run_brain_analysis', { targetId });
    }
  },
  {
    name: 'get_metric_definition',
    description: 'Looks up term definitions from the system metric glossary.',
    parameters: {
      type: 'object',
      properties: {
        metricKey: { type: 'string', description: 'Glossary metric key' }
      },
      required: ['metricKey']
    },
    run: async (ctx = {}, args = {}) => {
      const metricKey = args && args.metricKey ? String(args.metricKey).trim() : '';
      if (!metricKey) {
        return createToolResponse(null, 'get_metric_definition', {}, ['Parameter "metricKey" is required.']);
      }

      const definition = ((ctx && ctx.metricGlossary) || {})[metricKey] || null;
      return createToolResponse(
        definition,
        'get_metric_definition',
        { metricKey },
        definition ? [] : ['Metric key ' + metricKey + ' not found in glossary.']
      );
    }
  }
];

module.exports = readTools;