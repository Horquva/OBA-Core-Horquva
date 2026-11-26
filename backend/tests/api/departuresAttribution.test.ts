import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';
import { DataService } from '../../src/services/dataService.js';

describe('GET /api/departures/:id attribution & deduplication', () => {
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
    DataService.resetInstance();
  });

  beforeEach(() => {
    DataService.resetInstance();
  });

  it('attributes currentBackup/suggestion through linked backup account and deduplicates personalCredentialAutomations', async () => {
    const ds = DataService.getInstance();
    const g = ds.getGraph();
    const now = new Date('2026-11-10T12:00:00Z');

    const omar = { id: 'person:entra:dep_omar', kind: 'person' as const, name: 'Omar Leaver', externalRefs: { entraId: 'do1' }, createdAt: now, updatedAt: now };
    const lina = { id: 'person:entra:dep_lina', kind: 'person' as const, name: 'Lina Backup', externalRefs: { entraId: 'dl1' }, createdAt: now, updatedAt: now };
    const omarAcc1 = { id: 'account:n8n:dep_o1', kind: 'account' as const, name: 'Omar n8n 1', externalRefs: { source: 'n8n' }, createdAt: now, updatedAt: now };
    const omarAcc2 = { id: 'account:openai:dep_o2', kind: 'account' as const, name: 'Omar OpenAI 2', externalRefs: { source: 'openai' }, createdAt: now, updatedAt: now };
    const linaAcc = { id: 'account:n8n:dep_l1', kind: 'account' as const, name: 'Lina n8n Backup', externalRefs: { source: 'n8n' }, createdAt: now, updatedAt: now };
    const wfOwned = { id: 'automation:n8n:dep_wf1', kind: 'automation' as const, name: 'Handover Flow', externalRefs: {}, createdAt: now, updatedAt: now };
    const wfCred = { id: 'automation:n8n:dep_wf2', kind: 'automation' as const, name: 'Multi Cred Flow', externalRefs: {}, createdAt: now, updatedAt: now };

    g.addEntity(omar);
    g.addEntity(lina);
    g.addEntity(omarAcc1);
    g.addEntity(omarAcc2);
    g.addEntity(linaAcc);
    g.addEntity(wfOwned);
    g.addEntity(wfCred, [
      { entityId: wfCred.id, attribute: 'run_volume_weekly', value: 420, grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null },
    ]);

    g.addEdge({ id: 'ed1', fromId: omarAcc1.id, toId: wfOwned.id, type: 'owns', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });
    g.addEdge({ id: 'ed2', fromId: linaAcc.id, toId: wfOwned.id, type: 'backs_up', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });
    g.addEdge({ id: 'ed3', fromId: wfCred.id, toId: omarAcc1.id, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });
    g.addEdge({ id: 'ed4', fromId: wfCred.id, toId: omarAcc2.id, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:openai', validFrom: now, validTo: null });

    await ds.getLinkRepository().create({ accountId: omarAcc1.id, personId: omar.id, grade: 'stated', method: 'exact_email', linkedBy: 'autoLink', note: null });
    await ds.getLinkRepository().create({ accountId: omarAcc2.id, personId: omar.id, grade: 'confirmed', method: 'admin_link', linkedBy: 'admin', note: null });
    await ds.getLinkRepository().create({ accountId: linaAcc.id, personId: lina.id, grade: 'confirmed', method: 'admin_link', linkedBy: 'admin', note: null });
    await ds.reattributeGraph();

    const dep = ds.createDeparture({
      personId: omar.id,
      leaveDate: '2026-12-20T00:00:00Z',
      note: 'Departure attribution test',
    });

    const res = await authedFetch(`${baseUrl}/api/departures/${dep.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    const row = body.handover.find((h: any) => h.asset.id === wfOwned.id);
    expect(row).toBeDefined();
    expect(row.currentBackup).toMatchObject({
      state: 'value',
      display: 'Lina Backup',
      ref: { id: lina.id, kind: 'person', name: 'Lina Backup' },
    });
    expect(row.suggestion).toEqual({
      person: { id: lina.id, kind: 'person', name: 'Lina Backup' },
      reason: 'Existing designated backup',
    });

    const credHits = body.personalCredentialAutomations.filter((c: any) => c.workflow.id === wfCred.id);
    expect(credHits).toHaveLength(1);
    expect(credHits[0]).toMatchObject({
      workflow: { id: wfCred.id, name: 'Multi Cred Flow' },
      weeklyRuns: 420,
    });
  });

  it('keeps unlinked account visible as currentBackup when not in linkedAccountIds', async () => {
    const ds = DataService.getInstance();
    const g = ds.getGraph();
    const now = new Date('2026-11-10T12:00:00Z');

    const omar = { id: 'person:entra:dep_omar2', kind: 'person' as const, name: 'Omar Leaver 2', externalRefs: { entraId: 'do2' }, createdAt: now, updatedAt: now };
    const unlinkedBackup = { id: 'account:n8n:unlinked_bk', kind: 'account' as const, name: 'External Backup', externalRefs: { source: 'n8n' }, createdAt: now, updatedAt: now };
    const wfOwned = { id: 'automation:n8n:dep_wf3', kind: 'automation' as const, name: 'Unlinked Backup Flow', externalRefs: {}, createdAt: now, updatedAt: now };

    g.addEntity(omar);
    g.addEntity(unlinkedBackup);
    g.addEntity(wfOwned);
    g.addEdge({ id: 'eu1', fromId: omar.id, toId: wfOwned.id, type: 'owns', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });
    g.addEdge({ id: 'eu2', fromId: unlinkedBackup.id, toId: wfOwned.id, type: 'backs_up', grade: 'stated', source: 'connector:n8n', validFrom: now, validTo: null });

    const dep = ds.createDeparture({
      personId: omar.id,
      leaveDate: '2026-12-20T00:00:00Z',
      note: 'Unlinked backup visibility test',
    });

    const res = await authedFetch(`${baseUrl}/api/departures/${dep.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const row = body.handover.find((h: any) => h.asset.id === wfOwned.id);
    expect(row.currentBackup).toMatchObject({
      state: 'value',
      display: 'External Backup',
      ref: { id: unlinkedBackup.id, kind: 'account', name: 'External Backup' },
    });
  });
});
