// =============================================================================
// Horquva Continuity Platform — Connector Secret Encryption (SEC-03)
// =============================================================================
// AES-256-GCM in the application: Postgres only ever sees ciphertext, IV and
// tag, never the plaintext or the key (the old pgcrypto helpers took both as
// query parameters). The record id is bound in as additional authenticated
// data, so a ciphertext copied onto another connection row fails to decrypt.
//
// HORQUVA_SECRET_KEY is 32 random bytes, base64-encoded:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Production refuses to run without it; dev/test fall back to a fixed key.
// =============================================================================

import crypto from 'node:crypto';

export interface EncryptedPayload {
  v: 1;
  iv: string; // base64, 12 bytes
  tag: string; // base64, 16 bytes
  ciphertext: string; // base64
}

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const DEV_KEY = crypto.createHash('sha256').update('horquva-dev-only-connector-key').digest();

export function secretKeyFromEnv(env: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = env.HORQUVA_SECRET_KEY;
  if (!raw) {
    if (env.NODE_ENV === 'production') {
      throw new Error('HORQUVA_SECRET_KEY must be set in production (32 random bytes, base64).');
    }
    return DEV_KEY;
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(`HORQUVA_SECRET_KEY must decode to 32 bytes (got ${key.length}). Generate one with crypto.randomBytes(32).toString('base64').`);
  }
  return key;
}

export function encryptSecret(plainText: string, recordId: string, key: Buffer = secretKeyFromEnv()): EncryptedPayload {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(recordId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

/** Throws if the payload was tampered with, belongs to another record, or the key is wrong. */
export function decryptSecret(payload: EncryptedPayload, recordId: string, key: Buffer = secretKeyFromEnv()): string {
  if (!payload || payload.v !== 1 || !payload.iv || !payload.tag || typeof payload.ciphertext !== 'string') {
    throw new Error('Not an encrypted secret payload.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'));
  decipher.setAAD(Buffer.from(recordId, 'utf8'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export function encryptJson(value: unknown, recordId: string, key?: Buffer): EncryptedPayload {
  return encryptSecret(JSON.stringify(value), recordId, key);
}

export function decryptJson<T = Record<string, unknown>>(payload: EncryptedPayload, recordId: string, key?: Buffer): T {
  return JSON.parse(decryptSecret(payload, recordId, key)) as T;
}
