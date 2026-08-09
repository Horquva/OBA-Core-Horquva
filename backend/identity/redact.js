/*
 * Leakage prevention (doc §12): deep-redact known-sensitive fields before anything
 * is logged, audited, or serialized. Used by the audit repository and available
 * for any logging path.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'client_secret',
  'client_secret_hash',
  'client_secret_enc',
  'mfa_secret',
  'mfa_secret_enc',
  'secret',
  'refresh_token',
  'refresh_token_hash',
  'access_token',
  'token',
  'authorization',
  'code_hash',
  'recovery_code',
  'enckey',
])

function redact(value, seen = new WeakSet()) {
  if (Array.isArray(value)) return value.map((v) => redact(v, seen))
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, seen)
    }
    return out
  }
  return value
}

module.exports = { redact, SENSITIVE_KEYS }
