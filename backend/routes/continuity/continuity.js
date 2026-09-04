const express = require('express')
const router = express.Router()
const domain = require('../../domain')

/*
 * GET /api/continuity
 *
 * The per-asset disruption-survival/governance heuristic (D-61) --
 * domain/derived.js's assetContinuity(). Was frontend/lib/continuityRisk.ts's
 * computeContinuityRisk(), computed client-side. Deliberately NOT the same
 * thing as GET /api/intelligence/continuity (M18) or /governance (M19),
 * which are real brain-module org/department aggregates over a different
 * formula -- see assetContinuity()'s own header comment. The /continuity
 * page fetches this alongside those two and shows them as separate,
 * distinctly-labeled numbers, not one merged answer.
 */
router.get('/', async (req, res) => {
  try {
    const intel = await domain.intelligence.all()
    res.json(intel.assetContinuity)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
