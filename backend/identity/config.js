/*
 * Sentinel Identity & Trust — configuration (Owner: Areeb Ahmad).
 * Env-driven; safe local defaults for development. Loaded from backend/.env.
 */
const path = require('path')
const crypto = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const num = (name, def) => parseInt(process.env[name] || String(def), 10)

// Parse "kid:secret,kid2:secret2" into retired verification keys (for rotation).
function parsePrevKeys(s) {
  if (!s) return []
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(':')
    return { kid: pair.slice(0, i), secret: pair.slice(i + 1) }
  })
}

// Normalize a PEM supplied via env (single-line with escaped "\n" is common).
const pem = (v) => (v ? v.replace(/\\n/g, '\n') : null)

// Retired RS256 PUBLIC keys still accepted for verification (RS256 rotation overlap).
// Format: "kid:base64(PEM),kid2:base64(PEM)" — base64 avoids newline/comma issues in env.
function parsePrevPublicKeys(s) {
  if (!s) return []
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(':')
    return { kid: pair.slice(0, i), publicKey: Buffer.from(pair.slice(i + 1), 'base64').toString('utf8') }
  })
}

// Single data-encryption key for the Secrets-Service boundary (reversible secrets:
// TOTP seeds, provider secrets). Provide a real 64-hex-char key via
// IDENTITY_SECRETS_ENC_KEY; dev derives one deterministically.
const SECRETS_ENC_KEY = process.env.IDENTITY_SECRETS_ENC_KEY
  ? Buffer.from(process.env.IDENTITY_SECRETS_ENC_KEY, 'hex')
  : process.env.IDENTITY_MFA_ENC_KEY
    ? Buffer.from(process.env.IDENTITY_MFA_ENC_KEY, 'hex')
    : crypto.scryptSync(process.env.IDENTITY_JWT_SECRET || 'dev-insecure', 'identity-secrets-kek', 32)

const config = {
  env: process.env.NODE_ENV || 'development',

  api: {
    prefix: '/api/v1',
  },

  db: {
    // Dedicated, isolated local Postgres database for the Identity & Trust platform.
    url: process.env.IDENTITY_DATABASE_URL || 'postgresql://admin:admin@127.0.0.1:5432/oba_identity',
    poolMax: num('IDENTITY_DB_POOL_MAX', 10),
    idleTimeoutMs: num('IDENTITY_DB_IDLE_MS', 30000),
  },

  jwt: {
    // Phase 1 uses HS256 (symmetric). Token engineering (Phase 6) adds key rotation
    // and an RS256 + JWKS path for cross-platform verification. See DECISIONS.md.
    // HS256 (symmetric) is the dev default. Set IDENTITY_JWT_ALG=RS256 with
    // IDENTITY_JWT_PRIVATE_KEY / IDENTITY_JWT_PUBLIC_KEY (PEM) to sign asymmetrically
    // and publish public keys via /api/v1/.well-known/jwks.json for local verification
    // by consumer services (e.g. AI Security). See DECISIONS.md.
    algorithm: process.env.IDENTITY_JWT_ALG || 'HS256',
    secret: process.env.IDENTITY_JWT_SECRET || 'dev-insecure-identity-secret-change-me',
    kid: process.env.IDENTITY_JWT_KID || 'k1',
    privateKey: pem(process.env.IDENTITY_JWT_PRIVATE_KEY), // RS256 signing key (PEM)
    publicKey: pem(process.env.IDENTITY_JWT_PUBLIC_KEY), // RS256 verify/JWKS key (PEM)
    previousKeys: parsePrevKeys(process.env.IDENTITY_JWT_PREV_KEYS), // retired HS256 keys still accepted for verify
    previousPublicKeys: parsePrevPublicKeys(process.env.IDENTITY_JWT_PREV_PUBLIC_KEYS), // retired RS256 public keys
    issuer: process.env.IDENTITY_JWT_ISSUER || 'sentinel-identity',
    audience: process.env.IDENTITY_JWT_AUDIENCE || 'horquva-platforms',
    accessTtlSec: num('IDENTITY_ACCESS_TTL', 900), // 15 minutes
    refreshTtlSec: num('IDENTITY_REFRESH_TTL', 604800), // 7 days
  },

  auth: {
    maxFailedAttempts: num('IDENTITY_MAX_FAILED_ATTEMPTS', 5),
    lockoutMinutes: num('IDENTITY_LOCKOUT_MINUTES', 15),
  },

  session: {
    // 0 = unlimited concurrent sessions per identity; >0 revokes oldest beyond the cap.
    maxConcurrent: num('IDENTITY_MAX_CONCURRENT_SESSIONS', 0),
  },

  mfa: {
    issuer: process.env.IDENTITY_MFA_ISSUER || 'Sentinel Identity',
    challengeTtlSec: num('IDENTITY_MFA_CHALLENGE_TTL', 300), // pending-MFA window
    recoveryCodeCount: num('IDENTITY_MFA_RECOVERY_CODES', 8),
    // 32-byte AES-256-GCM key for encrypting TOTP seeds at rest. Provide a real
    // 64-hex-char key via IDENTITY_MFA_ENC_KEY; dev falls back to a derived key.
    encKey: SECRETS_ENC_KEY,
  },

  secrets: {
    // The one place key material is resolved. Swap this for Vault/cloud KMS by
    // changing only the Secrets-Service boundary (services/secrets.js).
    encKey: SECRETS_ENC_KEY,
  },
}

module.exports = config
