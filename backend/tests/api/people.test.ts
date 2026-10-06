// =============================================================================
// Horquva Continuity Platform — People & Teams REST API Vitest Suite
// =============================================================================
// Tests SRS UI-04 & UI-05:
// - GET /api/people/teams (Rollup threshold, coverage metrics, concentration)
// - GET /api/people/teams/:id (Team detail and member holdings)
// - GET /api/people/:id (Person detail, holdings, open handovers)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';

describe('People & Teams REST API (SRS UI-04, UI-05)', () => {
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

  it('GET /api/people/teams returns teams summary and minGroupSize', async () => {
    const res = await authedFetch(`${baseUrl}/api/people/teams`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.teams)).toBe(true);
    expect(typeof body.minGroupSize).toBe('number');
    expect(body.teams.length).toBeGreaterThan(0);

    const first = body.teams[0];
    expect(first.id).toBeDefined();
    expect(first.name).toBeDefined();
    expect(typeof first.memberCount).toBe('number');
    expect(first.coverage).toBeDefined();
    expect(typeof first.coverage.total).toBe('number');
    expect(typeof first.coverage.covered).toBe('number');
    expect(typeof first.coverage.exposed).toBe('number');
  });

  it('GET /api/people/teams/:id returns team detail and member asset holdings', async () => {
    const teamsRes = await authedFetch(`${baseUrl}/api/people/teams`);
    const { teams } = (await teamsRes.json()) as any;
    const teamId = teams[0].id;

    const res = await authedFetch(`${baseUrl}/api/people/teams/${encodeURIComponent(teamId)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.team).toBeDefined();
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeGreaterThan(0);

    const firstMember = body.members[0];
    expect(firstMember.person.id).toBeDefined();
    expect(firstMember.person.name).toBeDefined();
    expect(Array.isArray(firstMember.holdings)).toBe(true);
  });

  it('GET /api/people/:id returns person detail with relations and open handovers', async () => {
    const res = await authedFetch(`${baseUrl}/api/people/${encodeURIComponent('person:omar@acme.com')}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.person.id).toBe('person:omar@acme.com');
    expect(body.person.name).toBe('Omar Farooq');
    expect(Array.isArray(body.holdings)).toBe(true);
    // Omar owns 101 and 102
    expect(body.holdings.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(body.openHandovers)).toBe(true);
  });
});
