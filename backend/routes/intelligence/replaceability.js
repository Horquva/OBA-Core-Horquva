const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// GET /api/intelligence/replaceability — Feature 1 (Phase 2.1).
//
// K_i = 0.40·S_doc + 0.30·S_alt + 0.30·S_bench for every agent, workflow and
// platform, plus the 2×2 quadrant assignment (VULNERABLE_CORE / etc.)
// crossing K_i with Engine A's blast radius. The math and its honesty notes
// live in domain/replaceability.js; this route is the tenant-scoped read.
router.get('/', async (req, res) => {
  try {
    const roots = await domain.intelligence.compute.loadRoots()
    res.json(domain.replaceability(roots))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
