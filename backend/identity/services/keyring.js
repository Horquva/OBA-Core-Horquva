/*
 * Signing keyring (doc §9 — key lifecycle & rotation).
 * One ACTIVE key signs new tokens; any number of retired keys remain valid for
 * verification (matched by the token's `kid`) until they age out. Rotation is:
 * add a new active key, demote the old one to retired, remove it after the max
 * token lifetime has elapsed.
 *
 * Keys are algorithm-tagged:
 *   - HS256 (symmetric): { kid, alg:'HS256', secret }
 *   - RS256 (asymmetric): { kid, alg:'RS256', privateKey?, publicKey? }  (PEM in, KeyObject out)
 * Retired RS256 keys typically carry only the public key (verify-only). Public keys
 * are what gets published via JWKS; symmetric secrets never are.
 */
const crypto = require('crypto')
const config = require('../config')

const toKeyObject = (v, kind) => {
  if (!v) return null
  if (typeof v === 'object' && v.asymmetricKeyType) return v // already a KeyObject
  return kind === 'private' ? crypto.createPrivateKey(v) : crypto.createPublicKey(v)
}

// Normalize a raw key spec into a resolved key with an explicit `alg` and material.
function normalize(key) {
  const alg = key.alg || (key.secret ? 'HS256' : 'RS256')
  if (alg === 'HS256') {
    if (!key.secret) throw new Error(`HS256 key "${key.kid}" requires a secret`)
    return { kid: key.kid, alg, active: !!key.active, secret: key.secret }
  }
  if (alg === 'RS256') {
    const privateKey = toKeyObject(key.privateKey, 'private')
    let publicKey = toKeyObject(key.publicKey, 'public')
    if (!publicKey && privateKey) publicKey = crypto.createPublicKey(privateKey)
    if (!privateKey && !publicKey) throw new Error(`RS256 key "${key.kid}" requires PEM key material`)
    return { kid: key.kid, alg, active: !!key.active, privateKey, publicKey }
  }
  throw new Error(`unsupported key algorithm: ${alg}`)
}

function createKeyring(keys) {
  if (!keys.length) throw new Error('keyring requires at least one key')
  const norm = keys.map(normalize)
  const byKid = new Map(norm.map((k) => [k.kid, k]))
  const active = norm.find((k) => k.active) || norm[0]
  return {
    active: () => active,
    get: (kid) => byKid.get(kid) || null,
    all: () => norm,
  }
}

// Build the active key from config according to the configured algorithm.
const activeKey =
  config.jwt.algorithm === 'RS256'
    ? { kid: config.jwt.kid, alg: 'RS256', privateKey: config.jwt.privateKey, publicKey: config.jwt.publicKey, active: true }
    : { kid: config.jwt.kid, alg: 'HS256', secret: config.jwt.secret, active: true }

const retiredKeys = [
  ...config.jwt.previousKeys.map((k) => ({ kid: k.kid, alg: 'HS256', secret: k.secret, active: false })),
  ...config.jwt.previousPublicKeys.map((k) => ({ kid: k.kid, alg: 'RS256', publicKey: k.publicKey, active: false })),
]

const defaultKeyring = createKeyring([activeKey, ...retiredKeys])

module.exports = { createKeyring, defaultKeyring }
