/**
 * REALITY-LAYER GRAPH ENDPOINTS (Huzaifa) — M01, M02, M03, M07, M20, M28,
 * M29, M31, M34, M35
 * -------------------------------------------------------------------
 * M28/M29/M31/M34/M35 were wired up 2026-09-02, alongside the 27-module
 * retirement (see brain/README.md's "Known gaps"). These five were audited
 * against the same live-SQL-duplication question every other dead module
 * was checked against, and — unlike the 27 that were retired — each
 * answers something no SQL/derived.js system already computes: they are
 * genuine graph questions (transitive closure, cycle detection, all-type
 * centrality) that only make sense run over the Knowledge Graph. There was
 * simply no route calling them yet.
 *
 * M02/M03/M07 were added the same day, one more pass later: each reads the
 * graph's depends_on/owns/governs edges, which graphLoader.js assembles
 * from MULTIPLE Supabase tables, where each module's nearest SQL analogue
 * reads only one:
 *   - M02 (dependency ranking) / M03 (risk) vs. GET /api/dependencies and
 *     GET /api/risks — both read only the `dependencies` table and (for
 *     risk) only `agents`. The graph's depends_on additionally includes
 *     agent_platform, workflow_tool_dependencies, system_dependencies and
 *     system_agent_usage edges, and spans every asset type, not just agents.
 *   - M07 (AI Tool Intelligence — despite the name, it is scoped to the
 *     graph's `ai_agent` entity type, which covers BOTH automation agents
 *     AND platforms/tools) vs. GET /api/tool-intelligence, which reads only
 *     `ai_platforms` and never covers automation agents at all.
 * See modules/implementations.js's header for the full audit note.
 *
 * M01/M20 were added in a final completeness pass, checking the two
 * remaining reality-layer modules that had no route yet:
 *   - M01 (ownership) is asset-first — every owned/unowned asset across
 *     every asset type. GET /api/ownership (routes/ownership.js) is
 *     owner-first (loops over people, agents only for the primary listing)
 *     and structurally cannot surface an asset with zero owners.
 *   - M20 (accountability) is org-chart reporting structure (reports_to /
 *     manages edges). GET /api/accountability/* (routes/accountability/
 *     accountability.js) is a RACI system (accountability_links: who is
 *     Responsible/Accountable/Consulted/Informed per entity) — the same
 *     word, a genuinely different structure, same distinction API-2 already
 *     drew for M39/M40.
 *
 * No frontend card consumes any of these ten yet — that is a separate,
 * later decision (a card needs a design, not just data). This file makes
 * the capability reachable over HTTP; nothing here shapes a UI.
 *
 * Same runModule()/moduleEndpoint() request shape as prediction.js — see
 * ./_graphEndpoint.js — and the same graph-not-loaded / analysis-failed
 * error handling.
 *
 * Mounted at /api/intelligence (see backend/index.js), alongside
 * prediction.js and constitutional.js.
 */

const express = require('express')
const router = express.Router()
const { moduleEndpoint } = require('./_graphEndpoint')

// GET /api/intelligence/ownership-map — M01 Ownership Intelligence.
// Every asset across every asset type, with its owner(s) or lack thereof —
// asset-first, unlike GET /api/ownership's owner-first (and agent-scoped)
// view. Distinct name from GET /api/intelligence/ownership-coverage (M40,
// a single ratio) so neither is mistaken for the other.
router.get('/ownership-map', moduleEndpoint('ownership'))

// GET /api/intelligence/reporting-chains — M20 Accountability Intelligence.
// Org-chart structure: reports_to chains, manages links, assets with no
// accountable owner. NOT the RACI system at GET /api/accountability/* —
// see the header comment above.
router.get('/reporting-chains', moduleEndpoint('accountability'))

// GET /api/intelligence/dependency-fanin — M02 Dependency Intelligence.
// Fan-in ranking and the critical-dependency list, over depends_on edges
// unified from `dependencies` + agent_platform + workflow_tool_dependencies
// + system_dependencies + system_agent_usage — NOT the same edge set
// GET /api/dependencies reads (that route queries only the `dependencies`
// table). Distinct from M28 at /dependency-graph: this is a ranked/filtered
// analysis of the same edges, not the raw adjacency.
router.get('/dependency-fanin', moduleEndpoint('dependency'))

// GET /api/intelligence/organizational-risk — M03 Risk Intelligence.
// A risk score from single-points-of-failure + critical dependencies across
// EVERY asset type (employees, workflows, systems, tools, knowledge, ...),
// not just agents — the scope of GET /api/risks (which reads only the
// `agents` table and its risk column). Named apart from /api/risks so
// neither can be mistaken for the other.
router.get('/organizational-risk', moduleEndpoint('risk'))

// GET /api/intelligence/ai-agent-governance — M07 AI Tool Intelligence.
// Per-agent detail (owners, dependsOn, governedBy, supports) for every
// graph `ai_agent` entity — automation agents AND platforms both — plus
// which are ungoverned. GET /api/tool-intelligence only ever covers
// ai_platforms ("tools"); it has no automation-agent governance view at
// all, and doesn't expose per-entity dependsOn/supports relationships.
router.get('/ai-agent-governance', moduleEndpoint('ai-tool'))

// GET /api/intelligence/dependency-graph — M28 Universal Dependency Graph.
// Full dependency adjacency, cycle detection, longest dependency chain.
router.get('/dependency-graph', moduleEndpoint('universal-dependency-graph'))

// GET /api/intelligence/relationships — M29 Organizational Relationship
// Intelligence. Relationship-type distribution, collaboration link count,
// entities with no relationships at all.
router.get('/relationships', moduleEndpoint('organizational-relationship'))

// GET /api/intelligence/ecosystem — M31 Organizational Ecosystem
// Intelligence. Internal vs external entity census across every ontology
// type (vendors/customers are external; empty until W2 wires them in — see
// brain/README.md's "Known gaps").
router.get('/ecosystem', moduleEndpoint('organizational-ecosystem'))

// GET /api/intelligence/hidden-dependencies — M34 Hidden Dependency
// Intelligence. Transitive dependencies that are real but not directly
// declared — the "undocumented but real" question M28/M29 build on.
router.get('/hidden-dependencies', moduleEndpoint('hidden-dependency'))

// GET /api/intelligence/network-centrality — M35 Organizational Network
// Intelligence. All-entity-type degree centrality over the full Knowledge
// Graph. NOT the same computation as GET /api/network/centrality
// (routes/network.js), which is people-only, ownership-derived centrality
// read straight from Supabase — two different graphs, named apart on
// purpose so "fix network centrality" can't mean either one.
router.get('/network-centrality', moduleEndpoint('organizational-network'))

// Convenience index, same shape as prediction.js's.
router.get('/reality', (req, res) => {
  res.json({
    endpoints: {
      ownershipMap: '/api/intelligence/ownership-map',
      reportingChains: '/api/intelligence/reporting-chains',
      dependencyFanIn: '/api/intelligence/dependency-fanin',
      organizationalRisk: '/api/intelligence/organizational-risk',
      aiAgentGovernance: '/api/intelligence/ai-agent-governance',
      dependencyGraph: '/api/intelligence/dependency-graph',
      relationships: '/api/intelligence/relationships',
      ecosystem: '/api/intelligence/ecosystem',
      hiddenDependencies: '/api/intelligence/hidden-dependencies',
      networkCentrality: '/api/intelligence/network-centrality',
    },
  })
})

module.exports = router
