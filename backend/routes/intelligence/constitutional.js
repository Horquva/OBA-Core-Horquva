// ─────────────────────────────────────────────────────────────
// Organizational analyses over the company dataset
// Owner: Kamran
//
// Thin routing over the domain layer. The analyses are pure functions of one
// shared shape (agents, workflows, ai_tools, knowledge_areas, incidents,
// decisions_log, history) assembled by domain/dataset.js — shared with
// voice/voice.js so the same real joins aren't duplicated.
//
// Two data gaps here are real, not bugs: no per-agent/workflow "documented" or
// "backup_owner" column exists without a join (see domain/dataset.js), and no
// incidents table with resolution/lesson tracking exists at all — `incidents`
// is always [] rather than fabricated. Analyses must report that as unknown,
// never score it; see alignmentChecklist().
//
// ─── These are NOT the brain's analyses ───
// Until 2026-08-24 the seven functions below were labelled M36/M38/M39/M40/
// M46/M48/M54, and five of those codes were ALSO implemented in
// backend/brain/modules/implementations.js over the Knowledge Graph. They
// compute different things — the brain's M39 returns capability *counts*, this
// file's returned per-department capability *scores* — so "fix M39" had two
// possible meanings and no way to tell which reached a screen.
//
// The codes were dropped here rather than there: the brain's catalog is a
// coherent registry that drives dependency ordering, while these were labels.
// Each function is now named for what it computes.
//
// The other four brain codes that had the same problem — M21
// (routes/avatar/index.js), M51 (routes/selfHealing/index.js), M52 and M53
// (routes/automation/index.js) — got the identical fix the same day: each
// route is named for what it computes and no longer reports a `module: 'Mxx'`
// field that isn't its own. e.g. the brain's M52 returns governance coverage
// from the graph (complianceRate, governanceGaps) while
// /api/automation/governance returns pending approvals from
// `pending_decisions` — two real answers, now under two distinct names.
// See docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
// ─────────────────────────────────────────────────────────────

const express = require('express')
const router = express.Router()
const {
  loadDataset: loadData,
  trendSignals, improvementOpportunities, departmentCapability,
  alignmentChecklist, standardClaimChecks, playbookAdvice, resilienceScenarios,
} = require('../../domain')

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
const wrap = (fn) => async (req, res) => {
  try { res.json(fn(await loadData())) } catch (err) { res.status(500).json({ error: err.message }) }
}

router.get('/signals', wrap(trendSignals))
router.get('/opportunities', wrap(improvementOpportunities))
router.get('/capability', wrap(departmentCapability))
router.get('/alignment', wrap(alignmentChecklist))
router.get('/advisor', wrap(playbookAdvice))
router.get('/simulation-universe', wrap(resilienceScenarios))

// ⚠ No '/truth' route here. index.js mounts routes/truth/truth.js at the more
// specific /api/intelligence/truth, which is registered first and therefore
// wins. A handler used to sit here and was silently unreachable. The
// standardClaimChecks() analysis is still used — playbookAdvice() gates on it.
//
// Nothing for brain-core or orchestrator either: index.js mounts brainCore.js
// and orchestrator.js at their own more specific prefixes, so this router never
// sees those paths. Duplicate handlers used to sit here, also unreachable.

// Index of the endpoints this router serves.
router.get('/', (req, res) => {
  res.json({
    source: 'company dataset (domain/dataset.js)',
    note: 'Graph-derived analyses are served separately under /api/intelligence/{pattern,dna,culture,maturity,behavior,benchmark,strategic-alignment,capability-by-dept}.',
    owner: 'Kamran',
    endpoints: {
      'Trend signals': 'GET /api/intelligence/signals',
      'Improvement opportunities': 'GET /api/intelligence/opportunities',
      'Department capability': 'GET /api/intelligence/capability',
      'Alignment checklist': 'GET /api/intelligence/alignment',
      'Playbook advice': 'GET /api/intelligence/advisor',
      'Resilience scenarios': 'GET /api/intelligence/simulation-universe',
    },
    servedElsewhere: {
      'Claim verification': 'GET /api/intelligence/truth (routes/truth/truth.js)',
      'Brain core index': 'GET /api/intelligence/brain-core (routes/intelligence/brainCore.js)',
      'Orchestrator score': 'GET /api/intelligence/orchestrator (routes/intelligence/orchestrator.js)',
    },
  })
})

module.exports = router
