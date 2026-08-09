/*
 * MFA — TOTP (RFC 6238) + one-time recovery codes (doc §11).
 * TOTP seeds are encrypted at rest (AES-256-GCM via secretbox); recovery codes are
 * stored only as hashes and are single-use. Enrollment is two-step: begin (store
 * seed, MFA still disabled) → confirm (verify a live code, enable MFA, issue
 * recovery codes). Verification accepts a 6-digit TOTP or a recovery code.
 */
const crypto = require('crypto')
const config = require('../config')
const repos = require('../repositories')
const secretbox = require('./secretbox')
const password = require('./password')
const { NotFoundError, ValidationError } = require('../errors')

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD = 30
const DIGITS = 6

function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of buf) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

function base32Decode(s) {
  const clean = s.replace(/=+$/, '').toUpperCase().replace(/\s/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    const idx = B32.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(out)
}

function hotp(keyBuf, counter) {
  const buf = Buffer.alloc(8)
  let c = counter
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c = Math.floor(c / 256) }
  const digest = crypto.createHmac('sha1', keyBuf).update(buf).digest()
  const offset = digest[digest.length - 1] & 0xf
  const bin = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff)
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

/** Current TOTP for a base32 secret (test/dev helper). */
function totp(secretB32, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / PERIOD)
  return hotp(base32Decode(secretB32), counter)
}

/** Verify a TOTP with a ±1 step window. */
function verifyTotp(secretB32, code, atMs = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return false
  const key = base32Decode(secretB32)
  const counter = Math.floor(atMs / 1000 / PERIOD)
  for (let w = -1; w <= 1; w++) {
    if (hotp(key, counter + w) === String(code)) return true
  }
  return false
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20))
}

function provisioningUri(account, secretB32) {
  const label = encodeURIComponent(`${config.mfa.issuer}:${account}`)
  const issuer = encodeURIComponent(config.mfa.issuer)
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`
}

// ── enrollment ────────────────────────────────────────────────────────────────
async function beginEnrollment(exec, { organizationId, userId }) {
  const user = await repos.users.findById(exec, userId, organizationId)
  if (!user) throw new NotFoundError('user not found')
  const secret = generateSecret()
  await repos.users.setMfaSecret(exec, userId, organizationId, secretbox.encrypt(secret, config.mfa.encKey))
  await repos.audit.record(exec, { organizationId, actorPrincipalId: user.principal_id, event: 'mfa.enroll_begin', resource: 'mfa', action: 'enroll', decision: 'ok' })
  // Secret + URI are shown ONCE to the user; never stored or logged in plaintext.
  return { secret, otpauthUri: provisioningUri(user.email, secret) }
}

async function confirmEnrollment(exec, { organizationId, userId, code }) {
  const user = await repos.users.findById(exec, userId, organizationId)
  if (!user) throw new NotFoundError('user not found')
  if (!user.mfa_secret_enc) throw new ValidationError('start MFA enrollment first')
  const secret = secretbox.decrypt(user.mfa_secret_enc, config.mfa.encKey)
  if (!verifyTotp(secret, code)) {
    await repos.audit.record(exec, { organizationId, actorPrincipalId: user.principal_id, event: 'mfa.enroll_confirm', resource: 'mfa', action: 'enroll', decision: 'deny', reason: 'bad_code' })
    throw new ValidationError('invalid verification code')
  }
  await repos.users.enableMfa(exec, userId, organizationId)

  // Fresh single-use recovery codes (returned once, stored hashed).
  await repos.recovery.deleteForUser(exec, userId)
  const codes = Array.from({ length: config.mfa.recoveryCodeCount }, () => crypto.randomBytes(5).toString('hex'))
  await repos.recovery.createMany(exec, userId, codes.map((c) => password.hashSecret(c)))
  await repos.audit.record(exec, { organizationId, actorPrincipalId: user.principal_id, event: 'mfa.enabled', resource: 'mfa', action: 'enroll', decision: 'ok' })
  return { recoveryCodes: codes }
}

async function disable(exec, { organizationId, userId }) {
  const user = await repos.users.findById(exec, userId, organizationId)
  if (!user) throw new NotFoundError('user not found')
  await repos.users.clearMfa(exec, userId, organizationId)
  await repos.recovery.deleteForUser(exec, userId)
  await repos.audit.record(exec, { organizationId, actorPrincipalId: user.principal_id, event: 'mfa.disabled', resource: 'mfa', action: 'disable', decision: 'ok' })
  return true
}

// ── verification (used by the login flow) ─────────────────────────────────────
async function verifyForUser(exec, { user, code }) {
  // 6-digit → TOTP; otherwise treat as a recovery code.
  if (/^\d{6}$/.test(String(code))) {
    if (!user.mfa_secret_enc) return false
    const secret = secretbox.decrypt(user.mfa_secret_enc, config.mfa.encKey)
    return verifyTotp(secret, code)
  }
  const unused = await repos.recovery.listUnused(exec, user.id)
  for (const row of unused) {
    if (password.verifySecret(code, row.code_hash)) {
      await repos.recovery.markUsed(exec, row.id)
      return true
    }
  }
  return false
}

module.exports = {
  beginEnrollment,
  confirmEnrollment,
  disable,
  verifyForUser,
  // exposed for tests/tooling:
  totp,
  verifyTotp,
  generateSecret,
  provisioningUri,
}
