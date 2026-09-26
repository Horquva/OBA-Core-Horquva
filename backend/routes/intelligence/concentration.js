const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// GET /api/intelligence/concentration — Feature 2 (Phase 2.2).
//
// Per-class (humans / models / vendors) criticality-weighted exposure,
// HHI with DOJ/FTC banding, Gini + normalized entropy, top nodes, and
// typed chokepoint alerts with evidence. The math lives in
// domain/concentration.js; this route is the tenant-scoped read.
router.get('/', async (req, res) => {
  try {
    const roots = await domain.intelligence.compute.loadRoots()
    res.json(domain.concentration(roots))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
