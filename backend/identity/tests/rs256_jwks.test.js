/*
 * F2 — RS256 signing + JWKS distribution (doc §9; AI-Security integration).
 *
 * Proves the platform can issue RS256 tokens and publish public keys as a JWKS so a
 * consumer service verifies signatures LOCALLY (no round-trip), while HS256 secrets
 * are never published and algorithm-confusion attacks are rejected.
 */
const crypto = require('crypto')
const token = require('../services/token')
const { createKeyring } = require('../services/keyring')
const { jwks } = require('../services/jwks')
const { assert, assertEqual, assertThrows } = require('./helpers')

// Generate one RSA keypair for the whole suite (module load; keeps tests fast).
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const pubPem = publicKey.export({ type: 'spki', format: 'pem' })

const rsKeyring = createKeyring([{ kid: 'rsa-1', alg: 'RS256', privateKey: privPem, publicKey: pubPem, active: true }])
const headerOf = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString('utf8'))

// RS256 tokens sign under the private key and verify under the public key.
async function rs256SignAndVerify() {
  const t = token.sign({ sub: 'agent-1', typ: 'access' }, { keyring: rsKeyring, ttlSec: 60 })
  assertEqual(headerOf(t).alg, 'RS256', 'header advertises RS256')
  assertEqual(headerOf(t).kid, 'rsa-1', 'header carries the kid')
  const claims = token.verify(t, { keyring: rsKeyring })
  assertEqual(claims.sub, 'agent-1', 'verifies under the RS256 keyring')
}

// JWKS publishes the RS256 public key, and a consumer can verify the token from it.
async function jwksEnablesLocalVerification() {
  const set = jwks(rsKeyring)
  assertEqual(set.keys.length, 1, 'one public key published')
  const jwk = set.keys[0]
  assertEqual(jwk.kty, 'RSA'); assertEqual(jwk.kid, 'rsa-1'); assertEqual(jwk.alg, 'RS256'); assertEqual(jwk.use, 'sig')
  assert(jwk.n && jwk.e, 'JWK carries modulus and exponent')
  assert(!('d' in jwk) && !('p' in jwk), 'JWK is PUBLIC only — no private components')

  // Consumer side: rebuild the public key from the JWK and verify the signature independently.
  const t = token.sign({ sub: 'agent-2', typ: 'access' }, { keyring: rsKeyring, ttlSec: 60 })
  const [h, p, sig] = t.split('.')
  const consumerKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const ok = crypto.verify('sha256', Buffer.from(`${h}.${p}`), consumerKey, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
  assert(ok, 'a consumer verifies the token using only the published JWKS')
}

// HS256 secrets are symmetric and must NEVER appear in the JWKS.
async function jwksNeverLeaksSymmetricSecrets() {
  const hsKeyring = createKeyring([{ kid: 'k1', alg: 'HS256', secret: 'top-secret', active: true }])
  assertEqual(jwks(hsKeyring).keys.length, 0, 'HS256 keys are not published')

  // Mixed keyring: only the RS256 public key is published.
  const mixed = createKeyring([
    { kid: 'rsa-1', alg: 'RS256', publicKey: pubPem, active: true },
    { kid: 'k1', alg: 'HS256', secret: 'top-secret', active: false },
  ])
  const set = jwks(mixed)
  assertEqual(set.keys.length, 1, 'only the asymmetric key is published')
  assertEqual(set.keys[0].kid, 'rsa-1')
}

// Algorithm-confusion: an RS256 token whose header is rewritten to HS256 is rejected.
async function algorithmConfusionRejected() {
  const t = token.sign({ sub: 'x', typ: 'access' }, { keyring: rsKeyring, ttlSec: 60 })
  const [, p, sig] = t.split('.')
  const forgedHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'rsa-1' })).toString('base64url')
  const forged = `${forgedHeader}.${p}.${sig}`
  await assertThrows(() => token.verify(forged, { keyring: rsKeyring }), 'invalid_token')

  // A token signed under a kid the keyring does not know is rejected.
  const foreign = createKeyring([{ kid: 'other', alg: 'RS256', privateKey: privPem, active: true }])
  const ft = token.sign({ sub: 'x', typ: 'access' }, { keyring: foreign, ttlSec: 60 })
  await assertThrows(() => token.verify(ft, { keyring: rsKeyring }), 'invalid_token')
}

// RS256 rotation overlap: retired public key still verifies its tokens; removed key does not.
async function rs256RotationOverlap() {
  const tOld = token.sign({ sub: 'x', typ: 'access' }, { keyring: rsKeyring, ttlSec: 60 })

  const { privateKey: pk2, publicKey: pub2 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const rotated = createKeyring([
    { kid: 'rsa-2', alg: 'RS256', privateKey: pk2.export({ type: 'pkcs8', format: 'pem' }), active: true },
    { kid: 'rsa-1', alg: 'RS256', publicKey: pubPem, active: false }, // retired: verify-only
  ])
  assert(token.verify(tOld, { keyring: rotated }), 'retired public key still verifies during overlap')
  assertEqual(jwks(rotated).keys.length, 2, 'both public keys published during overlap')

  const newOnly = createKeyring([{ kid: 'rsa-2', alg: 'RS256', publicKey: pub2.export({ type: 'spki', format: 'pem' }), active: true }])
  await assertThrows(() => token.verify(tOld, { keyring: newOnly }), 'invalid_token')
}

module.exports = {
  'RS256 sign + verify': rs256SignAndVerify,
  'JWKS enables local verification by a consumer': jwksEnablesLocalVerification,
  'JWKS never leaks symmetric (HS256) secrets': jwksNeverLeaksSymmetricSecrets,
  'algorithm-confusion / unknown-kid rejected': algorithmConfusionRejected,
  'RS256 rotation overlap (retired key verify-only, removed key rejected)': rs256RotationOverlap,
}
