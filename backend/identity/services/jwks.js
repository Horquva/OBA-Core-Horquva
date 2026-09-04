/*
 * JWKS builder (doc §9 — verification-key distribution).
 * Publishes the RS256 PUBLIC keys of a keyring as a JSON Web Key Set so consumer
 * services (e.g. AI Security's agent_identity_service) can verify token signatures
 * locally without a round-trip. HS256 keys are symmetric secrets and are NEVER
 * published. Active and retired public keys are both listed (rotation overlap).
 */
const { defaultKeyring } = require('./keyring')

function jwks(keyring = defaultKeyring) {
  const keys = []
  for (const k of keyring.all()) {
    if (k.alg === 'RS256' && k.publicKey) {
      const jwk = k.publicKey.export({ format: 'jwk' }) // { kty:'RSA', n, e }
      keys.push({ ...jwk, kid: k.kid, use: 'sig', alg: 'RS256' })
    }
  }
  return { keys }
}

module.exports = { jwks }
