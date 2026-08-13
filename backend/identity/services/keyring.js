/*
 * Signing keyring (doc §9 — key lifecycle & rotation).
 * One ACTIVE key signs new tokens; any number of retired keys remain valid for
 * verification (matched by the token's `kid`) until they age out. Rotation is:
 * add a new active key, demote the old one to retired, remove it after the max
 * token lifetime has elapsed. (HS256 today; the same shape holds RS256 keys, at
 * which point public keys are published via JWKS — see DECISIONS.md.)
 */
const config = require('../config')

function createKeyring(keys) {
  if (!keys.length) throw new Error('keyring requires at least one key')
  const byKid = new Map(keys.map((k) => [k.kid, k]))
  const active = keys.find((k) => k.active) || keys[0]
  return {
    active: () => active,
    get: (kid) => byKid.get(kid) || null,
    all: () => keys,
  }
}

const defaultKeyring = createKeyring([
  { kid: config.jwt.kid, secret: config.jwt.secret, active: true },
  ...config.jwt.previousKeys.map((k) => ({ ...k, active: false })),
])

module.exports = { createKeyring, defaultKeyring }
