/*
 * Sentinel Identity & Trust — health & readiness (Owner: Areeb Ahmad).
 *   GET /api/v1/health        liveness (process is up)
 *   GET /api/v1/health/ready  readiness (database reachable)
 */
const express = require('express')
const router = express.Router()
const db = require('../../db/pool')

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'sentinel-identity', ts: new Date().toISOString() })
})

router.get('/ready', async (req, res) => {
  try {
    const ok = await db.healthcheck()
    if (!ok) return res.status(503).json({ status: 'not_ready', database: false })
    return res.json({ status: 'ready', database: true })
  } catch (err) {
    // Fail closed: if we cannot prove the DB is reachable, we are not ready.
    return res.status(503).json({ status: 'not_ready', database: false, error: err.message })
  }
})

module.exports = router
