// backend/tools/read-tools.js
//
// Task 11.2 — Read tools (resolve_entity, get_org_snapshot,
// get_entity_profile, list_entities, get_intelligence,
// run_brain_analysis, get_metric_definition).
//
// Each tool matches the registry contract from agent/registry.js:
// { name, description, parameters, run(ctx, args) }. run() returns
// { data, notes, evidence?, toolError? } — envelope() (in registry.js)
// wraps this, so tools never build the envelope themselves.
//
// Reuses Bisma's 10.3 matching logic (entity-matching.js) unchanged —
// it already takes a flat array + query, so the fix here is building
// that flat array correctly from ctx.roots, not touching 10.3's logic.

const { resolveEntityMatches } = require('./entity-matching')
const { getMetricDefinition } = require('../domain/metricGlossary')

const VALID_DEPARTMENTS = new Set(['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS'])
const VALID_ENTITY_TYPES = new Set(['EMPLOYEE', 'AGENT', 'WORKFLOW', 'PLATFORM'])

// Flattens ctx.roots' separate tables into one array entity-matching.js
// can search, tagging each with its real source type and table id —
// callers (get_entity_profile, list_entities) need both to look the
// record back up in its real table.
function flattenEntities(roots) {
  const employees = (roots.employees || []).map((e) => ({
    id: e.id, type: 'EMPLOYEE', name: e.name, department: e.department, _row: e,
  }))
  const agents = (roots.agents || []).map((a) => ({
    id: a.id, type: 'AGENT', name: a.name, department: a.department, _row: a,
  }))
  const workflows = (roots.workflows || []).map((w) => ({
    id: w.id, type: 'WORKFLOW', name: w.name, department: w.department, _row: w,
  }))
  const platforms = (roots.ai_platforms || []).map((p) => ({
    id: p.id, type: 'PLATFORM', name: p.name, department: p.department, _row: p,
  }))
  return [...employees, ...agents, ...workflows, ...platforms]
}

const resolveEntityTool = {
  name: 'resolve_entity',
  description: 'Call before using any person/agent/workflow/platform name mentioned by the user, to resolve it to a real record. If multiple matches come back, ask the user which one they mean rather than guessing.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  run(ctx, args) {
    const flat = flattenEntities(ctx.roots)
    const matches = resolveEntityMatches(args.query, flat)
    const results = matches.map((m) => ({ id: m.id, type: m.type, name: m.name }))
    return {
      data: results,
      notes: results.length > 1 ? ['Multiple matches found — ask the user to clarify which one they mean.'] : [],
    }
  },
}

const getOrgSnapshotTool = {
  name: 'get_org_snapshot',
  description: 'Call for a high-level count of the organization — how many employees, agents, workflows, platforms exist right now.',
  parameters: { type: 'object', properties: {}, required: [] },
  run(ctx) {
    const r = ctx.roots
    return {
      data: {
        employees: (r.employees || []).length,
        agents: (r.agents || []).length,
        workflows: (r.workflows || []).length,
        platforms: (r.ai_platforms || []).length,
      },
      notes: [],
    }
  },
}

const getEntityProfileTool = {
  name: 'get_entity_profile',
  description: 'Call to get full details on ONE specific person/agent/workflow/platform, after resolve_entity has given you a real id.',
  parameters: {
    type: 'object',
    properties: {
      entityId: { type: 'integer' },
      entityType: { type: 'string', enum: [...VALID_ENTITY_TYPES] },
    },
    required: ['entityId', 'entityType'],
  },
  run(ctx, args) {
    const flat = flattenEntities(ctx.roots)
    const found = flat.find((e) => e.id === args.entityId && e.type === args.entityType)
    if (!found) {
      return { data: null, notes: [`No ${args.entityType} found with id ${args.entityId}.`] }
    }
    return { data: found._row, notes: [] }
  },
}

const listEntitiesTool = {
  name: 'list_entities',
  description: 'Call to browse entities by type and/or department. Filters use fixed categories only — never pass free-text search here.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: [...VALID_ENTITY_TYPES] },
      department: { type: 'string', enum: [...VALID_DEPARTMENTS] },
    },
    required: [],
  },
  run(ctx, args) {
    let flat = flattenEntities(ctx.roots)
    const notes = []
    if (args.type) flat = flat.filter((e) => e.type === args.type)
    if (args.department) flat = flat.filter((e) => e.department === args.department)
    return { data: flat.map((e) => ({ id: e.id, type: e.type, name: e.name })), notes }
  },
}

const getIntelligenceTool = {
  name: 'get_intelligence',
  description: 'Call to pull computed insights/analysis (risk, criticality, SPOF status) for one specific entity, after resolve_entity has given you a real id.',
  parameters: {
    type: 'object',
    properties: {
      entityId: { type: 'integer' },
      entityType: { type: 'string', enum: [...VALID_ENTITY_TYPES] },
    },
    required: ['entityId', 'entityType'],
  },
  run(ctx, args) {
    // Intentionally thin: intelligence itself is computed in domain/derived.js
    // and domain/definitions.js — this tool's job is just to look the entity
    // up and hand back what's already been computed, not recompute anything.
    const flat = flattenEntities(ctx.roots)
    const found = flat.find((e) => e.id === args.entityId && e.type === args.entityType)
    if (!found) {
      return { data: null, notes: [`No ${args.entityType} found with id ${args.entityId}.`] }
    }
    return { data: { id: found.id, type: found.type, name: found.name, risk: found._row.risk ?? null, criticality: found._row.criticality ?? null }, notes: [] }
  },
}

const runBrainAnalysisTool = {
  name: 'run_brain_analysis',
  description: 'Call for a deeper, computed analysis (e.g. dependency cascade, org health impact) on one entity, beyond what get_intelligence returns.',
  parameters: {
    type: 'object',
    properties: {
      targetId: { type: 'integer' },
      analysisType: { type: 'string' },
    },
    required: ['targetId', 'analysisType'],
  },
  run(ctx, args) {
    // Placeholder pending which domain/derived.js analysis this should
    // dispatch to for each analysisType — flagged rather than guessed.
    return {
      data: null,
      notes: [`run_brain_analysis is not yet wired to a domain/derived.js analysis for type "${args.analysisType}" — needs follow-up before this tool is usable.`],
    }
  },
}

const getMetricDefinitionTool = {
  name: 'get_metric_definition',
  description: 'Call when the user asks what a metric or score means, before quoting or explaining it.',
  parameters: {
    type: 'object',
    properties: { metricName: { type: 'string' } },
    required: ['metricName'],
  },
  run(ctx, args) {
    const def = getMetricDefinition(args.metricName)
    if (!def) {
      return { data: null, notes: [`No glossary entry found for metric "${args.metricName}".`] }
    }
    return { data: def, notes: [] }
  },
}

module.exports = [
  resolveEntityTool,
  getOrgSnapshotTool,
  getEntityProfileTool,
  listEntitiesTool,
  getIntelligenceTool,
  runBrainAnalysisTool,
  getMetricDefinitionTool,
]
