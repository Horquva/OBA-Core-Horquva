'use strict'

const assert = require('assert')

let passed = 0
let failed = 0

function check(name, condition, detail) {
  if (condition) {
    passed++
    console.log('  ?', name)
  } else {
    failed++
    console.error('  ?', name, detail !== undefined ? `\n      got: ${JSON.stringify(detail)}` : '')
  }
}

const ENV_NAMES = [
  'AGENT_ENABLED',
  'AGENT_PROVIDER',
  'AGENT_MODEL',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AGENT_MAX_ITERATIONS',
  'AGENT_TURN_TIMEOUT_MS',
  'AGENT_DAILY_TURN_BUDGET',
]

function loadConfig(overrides = {}) {
  const previous = {}

  for (const name of ENV_NAMES) {
    previous[name] = process.env[name]
    delete process.env[name]
  }

  Object.assign(process.env, overrides)

  delete require.cache[require.resolve('../agent/config')]
  const config = require('../agent/config')

  for (const name of ENV_NAMES) {
    if (previous[name] === undefined) delete process.env[name]
    else process.env[name] = previous[name]
  }

  delete require.cache[require.resolve('../agent/config')]

  return config
}

console.log('\n=== OBA Core — Agent Config Unit Test ===\n')

{
  const c = loadConfig()

  check('default enabled is false', c.enabled === false)
  check('default provider is gemini', c.provider === 'gemini')
  check('default model is gemini-3.7-flash', c.model === 'gemini-3.7-flash')
  check('default max iterations is 8', c.maxIterations === 8)
  check('default turn timeout is 120000', c.turnTimeoutMs === 120000)
  check('default daily budget is 40', c.dailyTurnBudget === 40)
  check('disabled agent is not ready', c.isReady() === false)
  check('disabled agent has no readiness error', c.readinessError() === null)
  check('config is frozen', Object.isFrozen(c) === true)
}

{
  const c = loadConfig({
    AGENT_ENABLED: 'true',
    AGENT_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
  })

  check('gemini provider is recognized', c.provider === 'gemini')
  check('gemini with key is ready', c.isReady() === true)
  check('gemini with key has no readiness error', c.readinessError() === null)
}

{
  const c = loadConfig({
    AGENT_ENABLED: 'true',
    AGENT_PROVIDER: 'gemini',
  })

  check('missing gemini key reports not-ready', c.isReady() === false)
  check('missing gemini key reports an error', typeof c.readinessError() === 'string')
}

{
  const c = loadConfig({
    AGENT_ENABLED: 'true',
    AGENT_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'test-key',
  })

  check('anthropic provider is recognized', c.provider === 'anthropic')
  check('anthropic with key is ready', c.isReady() === true)
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exitCode = failed === 0 ? 0 : 1
