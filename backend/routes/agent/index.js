const express = require('express')

const { isConfigured } = require('../../agent/providers')

const router = express.Router()

const agentEnabled =
  process.env.AGENT_ENABLED === 'true' && isConfigured()

if (agentEnabled) {
  router.use('/', require('./chat'))
}

module.exports = router
