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
// Calls into entity-matching.js's resolveEntityMatches(), which now
// returns { candidates, ambiguous } (fixed to match §10.3's contract —
// see that file's own header) rather than a bare array.

const { resolveEntityMatches } = require('./entity-matching')
const { getMetricDefinition } = require('../domain/metricGlossary')
const { spofVerdict } = require('../domain/definitions')
const domain = require('../domain')

const VALID_DEPARTMENTS = new Set(['ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS'])
const VALID_ENTITY_TYPES = new Set(['EMPLOYEE', 'AGENT', 'WORKFLOW', 'PLATFORM'])

// assetContinuity()/ownedAssetBase() (domain/derived.js) tag each asset with
// a lowercase `type` — 'agent' | 'workflow' | 'tool' (platforms are tagged
// 'tool' there, NOT 'platform' — see ownedAssetBase()'s ai_platforms loop).
// Our own tool schemas use the uppercase VALID_ENTITY_TYPES enum with
// 'PLATFORM'. One place to convert between the two rather than getting the
// platform case wrong in every caller.
const CONTINUITY_TYPE = { AGENT: 'agent', WORKFLOW: 'workflow', PLATFORM: 'tool' }

// Real, currently-implemented graph analyses only (Appendix A: "analysis
// enum of live module slugs") — built from the live registry, not
// hardcoded, so it can never list an analysis the graph doesn't actually have.
const BRAIN_ANALYSIS_SLUGS = Object.values(domain.graph.analyses || {})
  .map((m) => m && m.slug)
  .filter(Boolean)

/**
 * Pull whatever domain/derived.js has already computed for one entity,
 * instead of reading a raw column that mostly doesn't exist on the roots
 * tables (I-4: criticality/SPOF status come from definitions.js, never a
 * raw column). Returns null fields rather than throwing when an entity type
 * has no corresponding computed product (e.g. no SPOF concept for a person).
 *
 * @param {object} ctx         frozen turn context — needs ctx.intel
 * @param {string} entityType  EMPLOYEE | AGENT | WORKFLOW | PLATFORM
 * @param {number} entityId
 */
function derivedFactsFor(ctx, entityType, entityId) {
  const intel = ctx.intel || {}

  if (entityType === 'EMPLOYEE') {
    const profile = (intel.humanDependencyRisk || []).find((p) => p.employeeId === entityId) || null
    return {
      criticality: null, // employees own assets; they don't carry a criticality of their own
      spofVerdict: null,
      owner: null,
      backupOwner: null,
      documented: null,
      survivalStatus: null,
      governanceScore: null,
      humanDependencyRisk: profile,
      predictedRisk: null,
    }
  }

  const continuityType = CONTINUITY_TYPE[entityType]
  // assetContinuity()'s own `id` is type-prefixed ("agent-10", not 10) so
  // agents/workflows/platforms sharing a raw numeric id can't collide in
  // one array (ocos/develop commit 0612f8a, landed independently of this
  // workstream) — match on that same shape rather than the bare id.
  const continuityId = `${continuityType}-${entityId}`
  const continuity = ((intel.assetContinuity && intel.assetContinuity.assets) || [])
    .find((a) => a.id === continuityId) || null

  const predicted = entityType === 'AGENT'
    ? ((intel.predictiveRisk && intel.predictiveRisk.scores) || []).find((s) => s.agentId === entityId) || null
    : null

  const verdict = continuity
    ? spofVerdict({
        criticality: continuity.criticality,
        ownerCount: continuity.owner && continuity.owner !== 'None' ? 1 : 0,
        hasBackup: Boolean(continuity.backup_owner),
      })
    : null

  return {
    criticality: continuity ? continuity.criticality : null,
    spofVerdict: verdict,
    owner: continuity ? continuity.owner : null,
    backupOwner: continuity ? continuity.backup_owner : null,
    documented: continuity ? continuity.documented : null,
    survivalStatus: continuity ? continuity.survivalStatus : null,
    governanceScore: continuity ? continuity.governanceScore : null,
    humanDependencyRisk: null,
    predictedRisk: predicted,
  }
}

// Flattens ctx.roots' separate tables into one array entity-matching.js
// can search, tagging each with its real source type and table id —
// callers (get_entity_profile, list_entities) need both to look the
// record back up in its real table.
//
// `department` is only a real column on `employees` and `workflows`
// (sql/01_schema_migration.sql). Agents and platforms have no column of
// their own — their department is their OWNER's department, which
// domain/derived.js's ownedAssetBase() already resolves into
// ctx.intel.assetContinuity.assets[].department. Reading a raw
// `a.department`/`p.department` here (as the original version did) is
// always undefined in production and silently drops agents/platforms out
// of any department-filtered list_entities call.
function flattenEntities(ctx) {
  const roots = ctx.roots || {}
  // Keyed by assetContinuity()'s own (already type-prefixed) `id` — see
  // derivedFactsFor()'s comment above on why a raw numeric id can't be
  // used to look this up.
  const continuityByKey = new Map(
    ((ctx.intel && ctx.intel.assetContinuity && ctx.intel.assetContinuity.assets) || [])
      .map((a) => [a.id, a]),
  )
  const ownerDepartment = (type, id) => {
    const hit = continuityByKey.get(`${CONTINUITY_TYPE[type]}-${id}`)
    return hit ? hit.department : undefined
  }

  const employees = (roots.employees || []).map((e) => ({
    id: e.id, type: 'EMPLOYEE', name: e.name, department: e.department, _row: e,
  }))
  const agents = (roots.agents || []).map((a) => ({
    id: a.id, type: 'AGENT', name: a.name, department: ownerDepartment('AGENT', a.id), _row: a,
  }))
  const workflows = (roots.workflows || []).map((w) => ({
    id: w.id, type: 'WORKFLOW', name: w.name, department: w.department, _row: w,
  }))
  const platforms = (roots.ai_platforms || []).map((p) => ({
    id: p.id, type: 'PLATFORM', name: p.name, department: ownerDepartment('PLATFORM', p.id), _row: p,
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
    const flat = flattenEntities(ctx)
    const { candidates, ambiguous } = resolveEntityMatches(args.query, flat)
    const results = candidates.map((c) => ({ id: c.id, type: c.type, name: c.name, confidence: c.confidence }))
    return {
      data: results,
      notes: ambiguous ? ['Multiple matches found — ask the user to clarify which one they mean.'] : [],
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
    const flat = flattenEntities(ctx)
    const found = flat.find((e) => e.id === args.entityId && e.type === args.entityType)
    if (!found) {
      return { data: null, notes: [`No ${args.entityType} found with id ${args.entityId}.`] }
    }

    const facts = derivedFactsFor(ctx, args.entityType, args.entityId)
    return {
      data: {
        id: found.id,
        type: found.type,
        name: found.name,
        department: found.department,
        record: found._row, // the raw identity/ownership row, unmodified
        criticality: facts.criticality,
        spofVerdict: facts.spofVerdict,
        owner: facts.owner,
        backupOwner: facts.backupOwner,
        documented: facts.documented,
        survivalStatus: facts.survivalStatus,
        governanceScore: facts.governanceScore,
        predictedRisk: facts.predictedRisk,
        humanDependencyRisk: facts.humanDependencyRisk,
      },
      notes: [],
    }
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
    let flat = flattenEntities(ctx)
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
    // Thin on purpose: intelligence itself is computed in domain/derived.js
    // and domain/definitions.js (ctx.intel) — this tool's job is to look the
    // entity up and hand back what's already been computed there, never to
    // read a raw column or recompute anything itself (I-4).
    const flat = flattenEntities(ctx)
    const found = flat.find((e) => e.id === args.entityId && e.type === args.entityType)
    if (!found) {
      return { data: null, notes: [`No ${args.entityType} found with id ${args.entityId}.`] }
    }

    const facts = derivedFactsFor(ctx, args.entityType, args.entityId)
    const hasSignal = facts.spofVerdict || facts.predictedRisk || facts.humanDependencyRisk

    return {
      data: {
        id: found.id,
        type: found.type,
        name: found.name,
        criticality: facts.criticality,
        spofVerdict: facts.spofVerdict,
        predictedRisk: facts.predictedRisk,
        humanDependencyRisk: facts.humanDependencyRisk,
      },
      notes: hasSignal ? [] : [`No computed intelligence is available yet for this ${args.entityType.toLowerCase()}.`],
    }
  },
}

const runBrainAnalysisTool = {
  name: 'run_brain_analysis',
  description: 'Call for a deeper, computed analysis (e.g. ownership intelligence, dependency cascade, org health impact) beyond what get_intelligence returns. targetId is optional and only meaningful for entity-scoped analyses.',
  parameters: {
    type: 'object',
    properties: {
      analysisType: { type: 'string', enum: BRAIN_ANALYSIS_SLUGS },
      targetId: { type: 'integer' },
    },
    required: ['analysisType'],
  },
  async run(ctx, args) {
    // §11.2: "must degrade honestly... never an empty payload, which reads
    // as 'nothing found'." graphLoadedAt is already stamped onto every
    // result's provenance by the registry envelope (ctx.graphSource).
    if (!domain.graph.isReady()) {
      return {
        data: null,
        notes: ['The knowledge graph has not finished loading yet — this analysis is temporarily unavailable, not empty. Try again shortly, or answer from get_intelligence instead.'],
        evidence: { status: 'insufficient_evidence', coverage: 0, covered: 0, total: 1, threshold: 1 },
      }
    }

    try {
      const context = args.targetId != null ? { targetId: args.targetId } : {}
      const result = await domain.graph.run(args.analysisType, context)
      return {
        data: {
          analysisType: args.analysisType,
          payload: result.payload,
          confidence: result.confidence,
          recommendations: result.recommendations,
          // The module's own authored/measured judgement — surfaced inside
          // `data` since the registry envelope's top-level `authored` flag
          // is intentionally static (agentRegistry.unit.test.js).
          authored: Boolean(result.authored),
        },
        notes: [],
      }
    } catch (err) {
      return {
        data: null,
        notes: [`run_brain_analysis("${args.analysisType}") failed: ${err.message}`],
        toolError: { code: 'BRAIN_ANALYSIS_FAILED', message: err.message },
      }
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
