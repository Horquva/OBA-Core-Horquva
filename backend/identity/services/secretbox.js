/*
 * Authenticated encryption for secrets at rest (AES-256-GCM).
 * Used to protect TOTP seeds now (Phase 7) and reversible secrets generally
 * (Phase 9). Output is base64(iv[12] || tag[16] || ciphertext). The key comes
 * from the Secrets-Service-backed config (config.mfa.encKey for TOTP seeds).
 */
const crypto = require('crypto')

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

function decrypt(payload, key) {
  const raw = Buffer.from(payload, 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const enc = raw.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

module.exports = { encrypt, decrypt }
