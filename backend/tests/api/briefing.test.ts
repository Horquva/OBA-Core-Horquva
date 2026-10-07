// =============================================================================
// GET /api/continuity/briefing — one generator, honest about who wrote it (D16)
// =============================================================================
// Tests never reach the AI model (vitest blanks GEMINI_API_KEY), so the briefing
// is the deterministic template and must say so. Figures match the headline the
// prose was written from (fixture: 4 critical assets, 1 covered).
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${(server.address() as any).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Weekly briefing endpoint', () => {
  it('says the template wrote it, when, and from which figures', async () => {
    const before = Date.now();
    const res = await authedFetch(`${baseUrl}/api/continuity/briefing`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    expect(body.writtenBy).toBe('template');
    expect(new Date(body.generatedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);

    const h = body.figures.headline;
    expect(h).toMatchObject({ totalCriticalAssets: 4, coveredCount: 1 });
    expect(h.coveredCount + h.exposedCount + h.unknownCount).toBe(h.totalCriticalAssets);
    // The prose states the same numbers it reports.
    expect(body.briefing).toContain(`${h.coveredCount} of ${h.totalCriticalAssets} critical assets are fully covered`);
    expect(body.briefing).not.toContain('undefined');
    // No raw markdown emphasis or broken plurals in the template.
    expect(body.briefing).not.toContain('**');
    expect(body.briefing).not.toMatch(/\b1 (departures|handovers|automations|critical assets)\b/);
    for (const k of ['upcomingDepartures', 'overdueDepartures', 'singlePointsOfFailure', 'personalCredentialAutomations', 'recentFailures']) {
      expect(typeof body.figures[k]).toBe('number');
    }
  });
});
