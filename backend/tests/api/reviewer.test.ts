import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('Reviewer Tasks API (B-16)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /api/me/tasks returns active confirmations and pending handovers', async () => {
    const res = await authedFetch(`${baseUrl}/api/me/tasks`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data).toHaveProperty('confirmations');
    expect(data).toHaveProperty('handovers');
    expect(Array.isArray(data.confirmations)).toBe(true);
    expect(Array.isArray(data.handovers)).toBe(true);

    if (data.confirmations.length > 0) {
      const conf = data.confirmations[0];
      expect(conf).toHaveProperty('token');
      expect(conf).toHaveProperty('campaignName');
      expect(conf).toHaveProperty('assetCount');
      expect(conf).toHaveProperty('dueDate');
    }

    if (data.handovers.length > 0) {
      const ho = data.handovers[0];
      expect(ho).toHaveProperty('id');
      expect(ho).toHaveProperty('from');
      expect(ho.from).toHaveProperty('id');
      expect(ho.from).toHaveProperty('name');
      expect(ho.from.kind).toBe('person');
      expect(Array.isArray(ho.assets)).toBe(true);

      const firstAsset = ho.assets[0];
      expect(firstAsset).toHaveProperty('asset');
      expect(firstAsset.asset).toHaveProperty('id');
      expect(firstAsset).toHaveProperty('criticality');
      expect(firstAsset).toHaveProperty('runbookUrl');
      expect(firstAsset).toHaveProperty('credentialNote');
    }
  });

  it('POST /api/handovers/:id/accept updates handover and removes it from pending tasks', async () => {
    // 1. Fetch current pending handovers
    const initialRes = await authedFetch(`${baseUrl}/api/me/tasks`);
    const initialData = (await initialRes.json()) as any;
    const targetHandover = initialData.handovers[0];
    expect(targetHandover).toBeDefined();

    // 2. Accept the handover
    const acceptRes = await authedFetch(`${baseUrl}/api/handovers/${targetHandover.id}/accept`, {
      method: 'POST',
    });
    expect(acceptRes.status).toBe(200);

    // 3. Fetch again and verify target handover is no longer pending in reviewer queue
    const updatedRes = await authedFetch(`${baseUrl}/api/me/tasks`);
    const updatedData = (await updatedRes.json()) as any;
    const exists = updatedData.handovers.some((h: any) => h.id === targetHandover.id);
    expect(exists).toBe(false);
  });
});
