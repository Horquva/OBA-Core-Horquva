'use strict'

function envString(name, fallback = '') {
  const value = process.env[name]
  return value == null ? fallback : String(value).trim()
}

function envBoolean(name, fallback = false) {
  const value = envString(name, '')
  if (!value) return fallback

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function envPositiveInt(name, fallback) {
  const value = Number.parseInt(envString(name, ''), 10)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

const provider = envString('AGENT_PROVIDER', 'gemini').toLowerCase()

const config = Object.freeze({
  enabled: envBoolean('AGENT_ENABLED', false),
  provider,
  model: envString('AGENT_MODEL', 'gemini-3.7-flash'),

  geminiApiKey: envString('GEMINI_API_KEY', ''),
  anthropicApiKey: envString('ANTHROPIC_API_KEY', ''),

  maxIterations: envPositiveInt('AGENT_MAX_ITERATIONS', 8),
  turnTimeoutMs: envPositiveInt('AGENT_TURN_TIMEOUT_MS', 120000),
  dailyTurnBudget: envPositiveInt('AGENT_DAILY_TURN_BUDGET', 40),

  getProviderKey() {
    if (provider === 'gemini') return this.geminiApiKey
    if (provider === 'anthropic') return this.anthropicApiKey
    return ''
  },

  isReady() {
    if (!this.enabled) return false
    return Boolean(this.getProviderKey())
  },

  readinessError() {
    if (!this.enabled) return null

    if (!['gemini', 'anthropic'].includes(this.provider)) {
      return `Unsupported agent provider: ${this.provider}`
    }

    if (!this.getProviderKey()) {
      const keyName = this.provider === 'gemini'
        ? 'GEMINI_API_KEY'
        : 'ANTHROPIC_API_KEY'

      return `${keyName} is required when AGENT_ENABLED=true`
    }

    return null
  },
})

module.exports = config
