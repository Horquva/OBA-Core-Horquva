/*
 * Sentinel Identity & Trust — versioned API surface (/api/v1).
 * Owner: Areeb Ahmad (Identity & Trust Platform).
 *
 * This is the ONLY approved contract other Horquva platforms consume for identity,
 * authentication, authorization, and trust. Internals stay behind service boundaries;
 * consumers must not import identity internals or recreate authN/authZ.
 *
 * Surfaces are added phase by phase: health/readiness first, then auth, authz,
 * identity, and trust.
 */
const express = require('express')
const router = express.Router()

const { errorHandler } = require('./deps')

router.get('/', (req, res) => {
  res.json({
    platform: 'Sentinel Identity & Trust',
    version: 'v1',
    owner: 'Areeb Ahmad',
    status: 'operational',
    endpoints: {
      health: '/api/v1/health',
      readiness: '/api/v1/health/ready',
      auth: '/api/v1/auth',
      authz: '/api/v1/authz',
      identity: '/api/v1/identity',
      trust: '/api/v1/trust',
    },
  })
})

router.use('/health', require('./health'))
router.use('/auth', require('./auth'))
router.use('/authz', require('./authz'))
router.use('/identity', require('./identity'))
router.use('/trust', require('./trust'))

// Typed domain errors → HTTP status (must be last).
router.use(errorHandler)

module.exports = router
