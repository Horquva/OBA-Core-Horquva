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
}
