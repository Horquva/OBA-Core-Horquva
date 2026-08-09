/*
 * Secrets Service boundary (doc §12).
 * The SINGLE place the platform performs secret cryptography and resolves key
 * material. Everything else (MFA, federation, credentials) depends on this
 * interface, never on raw keys — so swapping the local key store for an external
 * Secrets Service / KMS is a change here only.
 *
 *   encrypt/decrypt  reversible protection (TOTP seeds, provider secrets)
 *   hash/verify      one-way protection (client secrets, passwords)
 *   generate*        high-entropy secret/recovery-code generation
 *   signingKeyring   JWT signing keys (raw key material never leaves this boundary)
 */
const crypto = require('crypto')
const config = require('../config')
const secretbox = require('./secretbox')
const password = require('./password')
const { defaultKeyring } = require('./keyring')

module.exports = {
  encrypt: (plaintext) => secretbox.encrypt(plaintext, config.secrets.encKey),
  decrypt: (ciphertext) => secretbox.decrypt(ciphertext, config.secrets.encKey),
  hash: (secret) => password.hashSecret(secret),
  verify: (secret, stored) => password.verifySecret(secret, stored),
  generateClientSecret: () => crypto.randomBytes(24).toString('base64url'),
  generateRecoveryCode: () => crypto.randomBytes(5).toString('hex'),
  signingKeyring: () => defaultKeyring,
}
