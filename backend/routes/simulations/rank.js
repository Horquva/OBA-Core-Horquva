const express = require('express')
const router = express.Router()
const domain = require('../../domain')

router.get('/', async (req, res) => {
  try {
    const roots = await domain.simulations.loadRoots()
    const scenarios = domain.simulations.rankAllScenarios(roots)
    res.json({ scenarios })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
