// ─────────────────────────────────────────────────────────────
// Phase 6 — Constitutional Intelligence & Meta-Brain (M36–M55)
// Owner: Kamran
//
// These endpoints expose the constitutional intelligence modules over HTTP,
// reading live from Supabase like the other 54 route files. The nine scoring
// functions below are pure functions of one shared shape (agents, workflows,
// ai_tools, knowledge_areas, incidents, decisions_log, history) assembled by
// lib/orgDataset.js's loadOrgDataset() — shared with voice/voice.js, so the
// same real joins aren't duplicated. Two gaps are real, not bugs: no
// per-agent/workflow "documented" or "backup_owner" column exists without a
// join (see orgDataset.js), and no incidents table with resolution/lesson
// tracking exists at all — `incidents` is always [] rather than fabricated.
//
// NOTE - module-code overlap: M39, M40, M46, M48 and M54 are ALSO implemented
// in backend/brain/modules/implementations.js and reachable via
// intelligence/prediction.js, which computes them from the brain's knowledge
// graph instead of this file's orgDataset.js pipeline. That's a deliberate
// two-pipeline architecture (this file predates the brain runtime and was kept
// because voice.js shares its dataset loader), but it means these five module
// codes can return two different answers depending on which route you call.
// Neither implementation is "the bug" - the duplication itself is the risk.
// If you're touching M39/M40/M46/M48/M54 logic, check both files.
// ─────────────────────────────────────────────────────────────

const express = require('express')
const router = express.Router()
const { loadOrgDataset: loadData } = require('../../lib/orgDataset')

const {
  signalIntelligence, opportunityIntelligence, capabilityIntelligence,
  strategicAlignment, truthIntelligence, autonomousAdvisor, simulationUniverse,
} = require('../../lib/orgAnalyses')

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
const wrap = (fn) => async (req, res) => {
  try { res.json(fn(await loadData())) } catch (err) { res.status(500).json({ error: err.message }) }
}

router.get('/signals', wrap(signalIntelligence))            // M36
router.get('/opportunities', wrap(opportunityIntelligence)) // M38
router.get('/capability', wrap(capabilityIntelligence))     // M39
router.get('/alignment', wrap(strategicAlignment))          // M40
// ⚠ No '/truth' route here. index.js mounts routes/truth/truth.js at the more
// specific /api/intelligence/truth, which is registered first and therefore
// wins. A handler used to sit here and was silently unreachable. The
// truthIntelligence() analysis is still used — autonomousAdvisor() gates on it.
router.get('/advisor', wrap(autonomousAdvisor))             // M48
router.get('/simulation-universe', wrap(simulationUniverse))// M54
// M50 and M55 are NOT served here. index.js mounts brainCore.js and
// orchestrator.js at the more specific /api/intelligence/brain-core and
// /api/intelligence/orchestrator prefixes, so this router never sees those
// paths. Duplicate handlers used to sit here and were silently unreachable.

// Index of all Phase 6 constitutional intelligence endpoints
router.get('/', (req, res) => {
  res.json({
    phase: 'Phase 6 — Constitutional Intelligence & Meta-Brain (M36–M55)',
    owner: 'Kamran',
    endpoints: {
      'M36 Signal Intelligence': 'GET /api/intelligence/signals',
      'M38 Opportunity Intelligence': 'GET /api/intelligence/opportunities',
      'M39 Capability Intelligence': 'GET /api/intelligence/capability',
      'M40 Strategic Alignment': 'GET /api/intelligence/alignment',
      'M46 Truth Intelligence': 'GET /api/intelligence/truth (served by routes/truth/truth.js)',
      'M48 Autonomous Advisor': 'GET /api/intelligence/advisor',
      'M54 Simulation Universe': 'GET /api/intelligence/simulation-universe',
      'M50 Brain Core Logic': 'GET /api/intelligence/brain-core (served by brainCore.js)',
      'M55 Intelligence Orchestrator': 'GET /api/intelligence/orchestrator (served by orchestrator.js)',
    },
  })
})

module.exports = router
