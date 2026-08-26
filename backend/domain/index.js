/**
 * THE DOMAIN LAYER — one import for organizational intelligence
 * -------------------------------------------------------------
 * Every question about the organization is answered from here. Routes parse a
 * request, call a domain function, and shape a response; they do not decide
 * where an answer comes from.
 *
 * Two techniques sit behind this surface, and the boundary between them is
 * deliberate:
 *
 *   STRUCTURAL questions traverse the Knowledge Graph — ownership, dependency
 *   cascades, centrality, single points of failure, cycles. Graph traversal is
 *   the right tool and SQL is a poor one.
 *
 *   AGGREGATE and TEMPORAL questions use SQL — cost, adoption, coverage
 *   percentages, month-over-month trends. The graph has no time dimension and
 *   is not going to grow one; recording change is BUILD_SPEC W5.
 *
 * **Callers do not know or care which ran.** That is the whole point: before
 * this layer existed, `M39` meant one thing through the graph and a different
 * thing through the dataset, and there was no way to tell which a page had
 * called. See docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
 *
 * ONE LOADER. `dataset.js` does not query the organization for itself — it
 * derives its shape from the graph graphLoader already built, and queries SQL
 * only for `decision_history`, `documentation_trend` and `snapshots`. The two
 * used to read 27 tables between them with eight in common. There is now no
 * overlap at all.
 */

const brain = require('../brain')
const { loadOrgDataset } = require('./dataset')
const analyses = require('./analyses')
const derived = require('./derived')
const simulations = require('./simulations')

let supabase = null
try {
  supabase = require('../supabase')
} catch (_) {
  supabase = null
}

function requireSupabase() {
  if (!supabase) throw new Error('domain.intelligence requires Supabase; none is configured')
  return supabase
}

module.exports = {
  // ─── The organization, as data ───
  /** The flat, asset-shaped view: agents, workflows, ai_tools, knowledge_areas, incidents, decisions_log, history. */
  loadDataset: loadOrgDataset,
  /** The Knowledge Graph: load it, ask it, and check where its answers came from. */
  graph: {
    load: brain.loadGraph,
    set: brain.setGraph,
    get: brain.getGraph,
    isReady: brain.isReady,
    source: brain.graphSource,
    run: brain.run,
    runMany: brain.runMany,
    resolveOrder: brain.resolveOrder,
    toCode: brain.toCode,
    analyses: brain.MODULES,
  },

  // ─── Analyses over the dataset (aggregate / temporal) ───
  trendSignals: analyses.trendSignals,
  improvementOpportunities: analyses.improvementOpportunities,
  departmentCapability: analyses.departmentCapability,
  alignmentChecklist: analyses.alignmentChecklist,
  standardClaimChecks: analyses.standardClaimChecks,
  playbookAdvice: analyses.playbookAdvice,
  resilienceScenarios: analyses.resilienceScenarios,

  // ─── Derived intelligence (computed, formerly frozen tables) ───
  /**
   * The six summaries that used to be rows nobody ever wrote:
   * accountability, collaboration, predictive risk, executive memory,
   * the GI/MI/DI pillars, and this month's organizational health.
   *
   * Every one is computed from root tables on demand and carries `computedAt`,
   * `source` and an `inputs` map. Routes should pass that provenance through
   * rather than stripping it — being able to tell a computed answer from a
   * remembered one is the entire point of this layer existing.
   *
   * See derived.js for each metric's definition. The GI/MI/DI pillar formulas
   * are AUTHORED rather than recovered — nothing in this repository ever
   * defined them — and are flagged as such in their own response.
   */
  intelligence: {
    all: (opts) => derived.computeAllCached(requireSupabase(), opts),
    /** Forces a recompute, bypassing the in-process memo. */
    refresh: () => derived.computeAllCached(requireSupabase(), { force: true }),
    invalidate: derived.invalidate,
    /** The raw computations, for callers supplying their own root bundle. */
    compute: {
      loadRoots: () => derived.loadRoots(requireSupabase()),
      accountability: derived.accountability,
      collaboration: derived.collaboration,
      predictiveRisk: derived.predictiveRisk,
      humanDependencyRisk: derived.humanDependencyRisk,
      knowledgeConcentration: derived.knowledgeConcentration,
      orgMemory: derived.orgMemory,
      assetContinuity: derived.assetContinuity,
      executiveMemory: derived.executiveMemory,
      pillars: derived.pillars,
      orgHealth: derived.orgHealth,
      orgHealthByDepartment: derived.orgHealthByDepartment,
      departmentExposure: derived.departmentExposure,
    },
    constants: derived.constants,
  },

  // ─── Simulation (cascade reach, severity, health impact) ───
  simulations: {
    loadRoots: () => derived.loadRoots(requireSupabase()),
    employeeLeaves: simulations.employeeLeaves,
    agentFails: simulations.agentFails,
    platformDown: simulations.platformDown,
    workflowDisruption: simulations.workflowDisruption,
    rankAllScenarios: simulations.rankAllScenarios,
    baselineHealthScore: simulations.baselineHealthScore,
  },
}
