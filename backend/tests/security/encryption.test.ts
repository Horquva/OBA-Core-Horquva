import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, encryptJson, decryptJson, secretKeyFromEnv } from '../../src/security/encryption.js';

const key = crypto.randomBytes(32);

describe('connector secret encryption (AES-256-GCM)', () => {
  it('round-trips, including empty strings and unicode', () => {
    for (const plain of ['n8n_api_key_123', '', 'clé secrète 🔐']) {
      expect(decryptSecret(encryptSecret(plain, 'conn_1', key), 'conn_1', key)).toBe(plain);
    }
  });

  it('never stores the plaintext and uses a fresh IV each time', () => {
    const a = encryptSecret('super-secret-token', 'conn_1', key);
    const b = encryptSecret('super-secret-token', 'conn_1', key);
    expect(JSON.stringify(a)).not.toContain('super-secret-token');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(Buffer.from(a.iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(a.tag, 'base64')).toHaveLength(16);
  });

  it('rejects tampered ciphertext and tags', () => {
    const p = encryptSecret('value', 'conn_1', key);
    const flipped = Buffer.from(p.ciphertext, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decryptSecret({ ...p, ciphertext: flipped.toString('base64') }, 'conn_1', key)).toThrow();
    expect(() => decryptSecret({ ...p, tag: crypto.randomBytes(16).toString('base64') }, 'conn_1', key)).toThrow();
  });

  it('binds the ciphertext to its record id (copying it to another row fails)', () => {
    const p = encryptSecret('value', 'conn_1', key);
    expect(() => decryptSecret(p, 'conn_2', key)).toThrow();
  });

  it('fails with the wrong key', () => {
    const p = encryptSecret('value', 'conn_1', key);
    expect(() => decryptSecret(p, 'conn_1', crypto.randomBytes(32))).toThrow();
  });

  it('round-trips JSON configs', () => {
    const cfg = { baseUrl: 'https://n8n.acme.com', apiKey: 'k' };
    expect(decryptJson(encryptJson(cfg, 'c', key), 'c', key)).toEqual(cfg);
  });

  it('refuses to run in production without a key, and rejects malformed keys', () => {
    expect(() => secretKeyFromEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow(/must be set in production/);
    expect(() => secretKeyFromEnv({ HORQUVA_SECRET_KEY: 'short' } as NodeJS.ProcessEnv)).toThrow(/32 bytes/);
    expect(secretKeyFromEnv({ HORQUVA_SECRET_KEY: key.toString('base64') } as NodeJS.ProcessEnv).equals(key)).toBe(true);
    expect(secretKeyFromEnv({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toHaveLength(32);
  });
});
