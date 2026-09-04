/*
 * F3 — generate production signing + encryption secrets for the identity service.
 * Emits an RS256 keypair (for JWT signing + JWKS), a 64-hex-char AES key (for the
 * Secrets-Service boundary), and ready-to-paste env lines. Writes nothing that is
 * committed — send output to a gitignored file and load it into your secret manager.
 *
 * Usage:
 *   node identity/deploy/generate-secrets.js            # print to stdout
 *   node identity/deploy/generate-secrets.js > deploy/secrets/identity.env   # (gitignored)
 */
const crypto = require('crypto')

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).trim()
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).trim()
const encKey = crypto.randomBytes(32).toString('hex') // 64 hex chars = AES-256
const kid = `rsa-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString('hex')}`

// PEMs are multi-line; encode with \n escapes so they fit on one env line.
const esc = (pem) => pem.replace(/\n/g, '\\n')

console.log('# ---- Sentinel Identity & Trust — generated secrets (KEEP PRIVATE, do not commit) ----')
console.log(`# generated ${new Date().toISOString()}`)
console.log('IDENTITY_JWT_ALG=RS256')
console.log(`IDENTITY_JWT_KID=${kid}`)
console.log(`IDENTITY_JWT_PRIVATE_KEY=${esc(privPem)}`)
console.log(`IDENTITY_JWT_PUBLIC_KEY=${esc(pubPem)}`)
console.log(`IDENTITY_SECRETS_ENC_KEY=${encKey}`)
console.log('# The public key is also served at /api/v1/.well-known/jwks.json for consumer verification.')
