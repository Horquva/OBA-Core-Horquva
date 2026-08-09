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

router.get('/', (req, res) => {
  res.json({
    platform: 'Sentinel Identity & Trust',
    version: 'v1',
    owner: 'Areeb Ahmad',
    status: 'foundation',
    endpoints: {
      health: '/api/v1/health',
      readiness: '/api/v1/health/ready',
    },
    note: 'Authentication, authorization, identity, and trust surfaces are added phase by phase.',
  })
})

router.use('/health', require('./health'))
// Added in later phases:
//   router.use('/auth', require('./auth'))
//   router.use('/authz', require('./authz'))
//   router.use('/identity', require('./identity'))
//   router.use('/trust', require('./trust'))

module.exports = router
