// =============================================================================
// Horquva Continuity Platform — Actions REST API Vitest Suite
// =============================================================================
// Tests SRS SIM-08 & Action Surface:
// - Deterministic action ranking: Criticality -> Missing Backup -> Weekly Volume
// - Demotion of accepted risks to bottom
// - Action remediation (assign backup)
// - Risk acceptance with audit trail
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';
import { DataService } from '../../src/services/dataService.js';

describe('Actions REST API (SRS SIM-08)', () => {
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

  it('GET /api/actions returns actions ranked by criticality, backup state, and weekly volume', async () => {
    const res = await authedFetch(`${baseUrl}/api/actions`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Array.isArray(body.actions)).toBe(true);
    expect(body.actions.length).toBeGreaterThan(0);

    const first = body.actions[0];
    expect(first.rank).toBe(1);
    expect(first.asset).toBeDefined();
    expect(first.checkId).toBeDefined();
    expect(first.primary).toBeDefined();

    // The top action should be a critical unbacked asset
    const graph = DataService.getInstance().getGraph();
    const topNode = graph.getNode(first.asset.id);
    const topCrit = topNode?.facts.get('criticality')?.value;
    expect(topCrit).toBe('critical');
  });

  it('POST /api/actions/:id/assign-backup resolves the action and adds backup edge', async () => {
    const res = await authedFetch(`${baseUrl}/api/actions`);
    const { actions } = (await res.json()) as any;
    const targetAction = actions.find((a: any) => a.type === 'assign_backup' && a.status === 'open');
    expect(targetAction).toBeDefined();

    const patchRes = await authedFetch(`${baseUrl}/api/actions/${encodeURIComponent(targetAction.id)}/assign-backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'person:chen@acme.com' }),
    });

    expect(patchRes.status).toBe(200);

    // Verify action is resolved
    const afterRes = await authedFetch(`${baseUrl}/api/actions?status=resolved`);
    const afterBody = (await afterRes.json()) as any;
    const resolvedAction = afterBody.actions.find((a: any) => a.id === targetAction.id);
    expect(resolvedAction).toBeDefined();
    expect(resolvedAction.status).toBe('resolved');
  });

  it('POST /api/actions/:id/accept-risk sets status to accepted_risk and demotes to bottom of rank', async () => {
    const res = await authedFetch(`${baseUrl}/api/actions?status=open`);
    const { actions } = (await res.json()) as any;
    const targetAction = actions[0];
    expect(targetAction).toBeDefined();

    const acceptRiskRes = await authedFetch(`${baseUrl}/api/actions/${encodeURIComponent(targetAction.id)}/accept-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: 'Legacy migration scheduled for next quarter.',
        expiresAt: '2026-12-31T23:59:59Z',
      }),
    });

    expect(acceptRiskRes.status).toBe(200);

    // Re-fetch all actions
    const allRes = await authedFetch(`${baseUrl}/api/actions`);
    const allActions = (await allRes.json()) as any;
    const updatedAction = allActions.actions.find((a: any) => a.id === targetAction.id);
    expect(updatedAction.status).toBe('accepted_risk');
    expect(updatedAction.acceptedRisk.reason).toContain('Legacy migration');

    // Demoted to bottom: rank should be after open actions
    const openActions = allActions.actions.filter((a: any) => a.status === 'open');
    if (openActions.length > 0) {
      expect(updatedAction.rank).toBeGreaterThan(openActions[0].rank);
    }
  });
});
