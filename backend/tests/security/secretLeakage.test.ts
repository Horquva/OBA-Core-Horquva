import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SEC-03: Zero Secret Leakage Security Hardening', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const SENSITIVE_KEYS = [
    'apiKey',
    'api_key',
    'clientSecret',
    'client_secret',
    'password',
    'config_encrypted',
    'private_key',
    'secret_key',
    'master_key',
  ];

  function assertNoSecretKeys(obj: any, pathStr = ''): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => assertNoSecretKeys(item, `${pathStr}[${idx}]`));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = pathStr ? `${pathStr}.${key}` : key;
      for (const secretKey of SENSITIVE_KEYS) {
        expect(key.toLowerCase(), `Found sensitive key "${key}" at ${currentPath}`).not.toBe(
          secretKey.toLowerCase()
        );
      }
      assertNoSecretKeys(value, currentPath);
    }
  }

  it('GET /api/connections never exposes credentials, encrypted config, or API keys', async () => {
    const res = await authedFetch(`${baseUrl}/api/connections`);
    expect(res.status).toBe(200);
    const body = await res.json();
    assertNoSecretKeys(body);
  });

  it('GET /api/settings/organization never leaks secrets or internal keys', async () => {
    const res = await authedFetch(`${baseUrl}/api/settings/organization`);
    expect(res.status).toBe(200);
    const body = await res.json();
    assertNoSecretKeys(body);
  });

  it('GET /api/users never exposes password hashes or secret tokens', async () => {
    const res = await authedFetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(200);
    const body = await res.json();
    assertNoSecretKeys(body);
  });

  it('GET /api/departures never exposes credentials in handover packs or summaries', async () => {
    const res = await authedFetch(`${baseUrl}/api/departures`);
    expect(res.status).toBe(200);
    const body = await res.json();
    assertNoSecretKeys(body);
  });

  it('GET /api/assets never exposes credentials or raw keys', async () => {
    const res = await authedFetch(`${baseUrl}/api/assets`);
    expect(res.status).toBe(200);
    const body = await res.json();
    assertNoSecretKeys(body);
  });

  it('static source audit: backend route files never output plain text secrets to res.json()', () => {
    const routesDir = path.resolve(__dirname, '../../src/routes');
    const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'));

    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');

      // Check for forbidden literal patterns that would leak secrets in responses
      expect(content).not.toMatch(/res\.json\(\s*\{[^}]*api_key\s*:/);
      expect(content).not.toMatch(/res\.json\(\s*\{[^}]*apiKey\s*:/);
      expect(content).not.toMatch(/res\.json\(\s*\{[^}]*password\s*:/);
      expect(content).not.toMatch(/res\.json\(\s*\{[^}]*client_secret\s*:/);
      expect(content).not.toMatch(/res\.json\(\s*\{[^}]*config_encrypted\s*:/);
    }
  });
});
