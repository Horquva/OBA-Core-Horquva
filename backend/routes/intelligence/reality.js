/**
 * REALITY-LAYER GRAPH ENDPOINTS (Huzaifa) — M28, M29, M31, M34, M35
 * -------------------------------------------------------------------
 * Wired up 2026-09-02, alongside the 27-module retirement (see
 * brain/README.md's "Known gaps"). These five were audited against the same
 * live-SQL-duplication question every other dead module was checked
 * against, and — unlike the 27 that were retired — each answers something
 * no SQL/derived.js system already computes: they are genuine graph
 * questions (transitive closure, cycle detection, all-type centrality) that
 * only make sense run over the Knowledge Graph. There was simply no route
 * calling them yet.
 *
 * No frontend card consumes these yet — that is a separate, later decision
 * (a card needs a design, not just data). This file makes the capability
 * reachable over HTTP; nothing here shapes a UI.
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
      dependencyGraph: '/api/intelligence/dependency-graph',
      relationships: '/api/intelligence/relationships',
      ecosystem: '/api/intelligence/ecosystem',
      hiddenDependencies: '/api/intelligence/hidden-dependencies',
      networkCentrality: '/api/intelligence/network-centrality',
    },
  })
})

module.exports = router
