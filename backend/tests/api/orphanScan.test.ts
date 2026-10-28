// GET /api/continuity/orphan-scan: the scan on the hydrated graph, as JSON or CSV.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { app } from '../../src/server.js';
import { authedFetch } from '../helpers/session.js';
import { DataService } from '../../src/services/dataService.js';

describe('GET /api/continuity/orphan-scan', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // A vendor key owned by someone the directory has disabled: the scan's headline case.
    const graph = DataService.getInstance().getGraph();
    const now = new Date();
    graph.addEntity(
      { id: 'person:gone@acme.com', kind: 'person', name: 'Gone Person', externalRefs: { entraId: 'e-gone', accountEnabled: 'false' }, createdAt: now, updatedAt: now },
      [{ entityId: 'person:gone@acme.com', attribute: 'status', value: 'departed', grade: 'stated', source: 'connector:entra', validFrom: now }]
    );
    graph.addEntity(
      { id: 'credential:openai:key_gone', kind: 'credential', name: 'Forgotten key', externalRefs: { vendor: 'openai' }, createdAt: now, updatedAt: now },
      [{ entityId: 'credential:openai:key_gone', attribute: 'cost_30d_usd', value: 99, grade: 'stated', source: 'connector:ai_admin', validFrom: now }]
    );
    graph.addEdge({ fromId: 'person:gone@acme.com', toId: 'credential:openai:key_gone', type: 'owns', grade: 'stated', source: 'connector:ai_admin', ownerKind: 'key_principal', validFrom: now });

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${(server.address() as any).port}`;
        resolve();
      });
    });
  });

  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('returns the result shape with the key finding first', async () => {
    const res = await authedFetch(`${baseUrl}/api/continuity/orphan-scan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(Object.keys(body).sort()).toEqual(['connectionsScanned', 'directoryConnected', 'findings', 'scannedAt', 'totals']);
    expect(body.directoryConnected).toBe(true);
    expect(Object.keys(body.totals.byKind).sort()).toEqual(['app_secret_expiring_unowned', 'automation_on_gone_identity', 'key_owner_gone', 'owner_not_in_directory']);
    expect(body.findings[0]).toEqual({
      kind: 'key_owner_gone',
      severity: 'high',
      asset: { id: 'credential:openai:key_gone', kind: 'credential', name: 'Forgotten key', vendor: 'openai' },
      owner: { id: 'person:gone@acme.com', name: 'Gone Person', reason: 'account_disabled' },
      cost30dUsd: 99,
      lastUsedAt: null,
      evidence: ['Key is owned by departed person(s): Gone Person.'],
    });
  });

  it('exports CSV as a download', async () => {
    const res = await authedFetch(`${baseUrl}/api/continuity/orphan-scan?format=csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/csv/);
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="orphan-scan-\d{4}-\d{2}-\d{2}\.csv"/);
    const [header, first] = (await res.text()).split('\r\n');
    expect(header).toBe('severity,kind,asset_id,asset_name,asset_kind,vendor,owner_id,owner_name,owner_reason,cost_30d_usd,last_used_at,evidence');
    expect(first.startsWith('high,key_owner_gone,credential:openai:key_gone,Forgotten key,credential,openai,person:gone@acme.com,Gone Person,account_disabled,99,')).toBe(true);
  });

  it('requires a session', async () => {
    expect((await fetch(`${baseUrl}/api/continuity/orphan-scan`)).status).toBe(401);
  });
});
