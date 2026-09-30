// =============================================================================
// Horquva Continuity Platform — Server & Route Integration Vitest Suite
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';

describe('Server & API Routes Integration', () => {
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

  it('GET /health returns healthy status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('horquva-continuity-platform');
  });

  it('POST /api/v0/n8n-check validates request schema', async () => {
    const res = await fetch(`${baseUrl}/api/v0/n8n-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ n8nUrl: 'invalid-url' }), // missing n8nApiKey and invalid url
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Invalid request');
  });

  it('POST /api/continuity/simulations/leaver validates request schema', async () => {
    const res = await fetch(`${baseUrl}/api/continuity/simulations/leaver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('departingPersonIds');
  });

  it('POST /api/attestation/campaigns validates request schema', async () => {
    const res = await fetch(`${baseUrl}/api/attestation/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Q4 Review' }), // missing dueDate and tasks
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Invalid campaign');
  });
});
