/*
 * Password & secret hashing (doc §8) — scrypt via Node's built-in crypto.
 * No external dependency. Stored format encodes the parameters so they can evolve:
 *   scrypt$<N>$<r>$<p>$<salt-hex>$<hash-hex>
 * Verification is constant-time. The same primitive protects client secrets.
 */
const crypto = require('crypto')

const N = 16384 // CPU/memory cost
const R = 8
const P = 1
const KEYLEN = 64
const MAXMEM = 64 * 1024 * 1024

function hash(secret) {
  if (secret == null || String(secret).length === 0) throw new Error('cannot hash an empty secret')
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(String(secret), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM })
  return ['scrypt', N, R, P, salt.toString('hex'), derived.toString('hex')].join('$')
}

function verify(secret, stored) {
  try {
    const parts = String(stored).split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, n, r, p, saltHex, hashHex] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const derived = crypto.scryptSync(String(secret), salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM,
    })
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected)
  } catch (_) {
    return false
  }
}

module.exports = { hash, verify, hashSecret: hash, verifySecret: verify }
