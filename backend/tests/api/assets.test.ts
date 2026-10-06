// =============================================================================
// Horquva Continuity Platform — Assets REST API Vitest Suite
// =============================================================================
// Tests SRS UI-03 & DATA-05:
// - GET /api/assets (Asset catalog with FactView evidence badges)
// - GET /api/assets/:id (Asset detail with checks, upstream/downstream, and SCD2 fact history)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';

describe('Assets REST API (SRS UI-03, DATA-05)', () => {
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

  it('GET /api/assets returns asset rows with complete fact states and evidence badges', async () => {
    const res = await fetch(`${baseUrl}/api/assets`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.assets)).toBe(true);
    expect(body.assets.length).toBeGreaterThan(0);

    const asset101 = body.assets.find((a: any) => a.id === 'automation:n8n:101');
    expect(asset101).toBeDefined();
    expect(asset101.name).toBe('Billing Sync to Stripe');
    expect(asset101.isCritical).toBe(true);
    expect(asset101.owner.state).toBe('value');
    expect(asset101.owner.display).toBe('Omar Farooq');
    expect(asset101.backup.state).toBe('none');
    expect(asset101.criticality.level).toBe('critical');
    expect(asset101.runsPerWeek.display).toBe('500');
  });

  it('GET /api/assets/:id returns asset detail with SCD2 temporal history and checks', async () => {
    const res = await fetch(`${baseUrl}/api/assets/${encodeURIComponent('automation:n8n:101')}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.asset).toBeDefined();
    expect(body.asset.id).toBe('automation:n8n:101');
    expect(Array.isArray(body.checks)).toBe(true);
    expect(Array.isArray(body.upstream)).toBe(true);
    expect(Array.isArray(body.downstream)).toBe(true);
    expect(Array.isArray(body.history)).toBe(true);
    expect(body.history.length).toBeGreaterThan(0);

    const firstHistory = body.history[0];
    expect(firstHistory.attribute).toBeDefined();
    expect(firstHistory.grade).toBeDefined();
    expect(firstHistory.validFrom).toBeDefined();
  });
});
