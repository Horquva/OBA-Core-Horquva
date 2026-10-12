// =============================================================================
// NFR-01/02 at 20,000 nodes on a real Postgres: connector sync (cold, unchanged,
// 1% churn), graph hydration from the database, and the deterministic checks.
// Prints the timings; budgets are set well above measured values on a dev laptop
// so the suite catches regressions (an O(n) query loop) without being flaky.
// =============================================================================

import { describe, it, expect, beforeAll } from 'vitest';
import type { CanonicalEdge, CanonicalEntity, CanonicalFact } from '@horquva/types';
import { BaseConnector } from '../../src/connectors/sdk/base.js';
import type { ConnectorCapabilities, SyncResult } from '../../src/connectors/sdk/types.js';
import { DataService } from '../../src/services/dataService.js';
import { evaluateAllChecks } from '../../src/domain/checks/index.js';
import { query } from '../../src/db/client.js';
import { resetDatabase } from './db.js';

const PEOPLE = 2_000;
const AUTOMATIONS = 5_000;
const CREDENTIALS = 13_000;
const CONNECTION = 'conn_bench';

class SyntheticConnector extends BaseConnector {
  public readonly id = CONNECTION;
  public readonly type = 'n8n';
  public readonly name = 'synthetic';
  constructor(private result: SyncResult) {
    super([]);
  }
  async testConnection() { return true; }
  async sync() { return this.result; }
  getCapabilities(): ConnectorCapabilities {
    return { canDiscoverUsers: true, canDiscoverAutomations: true, canDiscoverCredentials: true, canDiscoverModelCalls: false, supportsWebhooks: false, pollingIntervalMinutes: 60 };
  }
}

/** 20,000 entities, ~25,000 edges, ~15,000 facts. `ownerShift` reassigns that many automations. */
function syntheticOrg(ownerShift = 0): SyncResult {
  const now = new Date();
  const entities: CanonicalEntity[] = [];
  const edges: CanonicalEdge[] = [];
  const facts: CanonicalFact[] = [];
  const e = (id: string, kind: CanonicalEntity['kind'], name: string) => entities.push({ id, kind, name, externalRefs: {}, createdAt: now, updatedAt: now });
  const edge = (fromId: string, toId: string, type: CanonicalEdge['type']) => edges.push({ fromId, toId, type, grade: 'stated', source: 'connector:n8n', validFrom: now });

  for (let p = 1; p <= PEOPLE; p++) e(`person:p${p}@bench.test`, 'person', `Person ${p}`);
  for (let c = 1; c <= CREDENTIALS; c++) e(`credential:bench:${c}`, 'credential', `Credential ${c}`);
  for (let a = 1; a <= AUTOMATIONS; a++) {
    const id = `automation:bench:${a}`;
    e(id, 'automation', `Workflow ${a}`);
    const owner = ((a + (a <= ownerShift ? 1 : 0)) % PEOPLE) + 1;
    edge(`person:p${owner}@bench.test`, id, 'owns');
    if (a % 3 === 0) edge(`person:p${((a + 7) % PEOPLE) + 1}@bench.test`, id, 'backs_up');
    edge(id, `credential:bench:${(a % CREDENTIALS) + 1}`, 'runs_on_credentials_of');
    edge(id, `credential:bench:${((a * 7) % CREDENTIALS) + 1}`, 'runs_on_credentials_of');
    if (a > 1 && a % 5 === 0) edge(id, `automation:bench:${a - 1}`, 'depends_on');
    facts.push({ entityId: id, attribute: 'criticality', value: a % 4 === 0 ? 'critical' : 'medium', grade: 'stated', source: 'connector:n8n', validFrom: now });
    facts.push({ entityId: id, attribute: 'documented', value: a % 2 === 0, grade: 'stated', source: 'connector:n8n', validFrom: now });
    facts.push({ entityId: id, attribute: 'status', value: 'active', grade: 'stated', source: 'connector:n8n', validFrom: now });
  }
  return { entities, edges, facts, rawPayloads: [], stats: { fetched: entities.length, entitiesCreated: entities.length, edgesCreated: edges.length, factsCreated: facts.length, errors: 0 } };
}

async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<{ ms: number; value: T }> {
  const t = performance.now();
  const value = await fn();
  const ms = Math.round(performance.now() - t);
  console.log(`[bench] ${label}: ${ms} ms`);
  return { ms, value };
}

async function syncRun(): Promise<string> {
  return (await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'running') RETURNING id`, [CONNECTION])).rows[0].id;
}

beforeAll(async () => {
  await resetDatabase();
  await query(`INSERT INTO connection (id, type, name, config_encrypted) VALUES ($1, 'n8n', 'synthetic', '{}')`, [CONNECTION]);
}, 120_000);

describe('20,000-node org on Postgres', () => {
  it('syncs, re-syncs, hydrates and checks within budget', async () => {
    const org = syntheticOrg();
    expect(org.entities).toHaveLength(PEOPLE + AUTOMATIONS + CREDENTIALS);

    const cold = await timed('cold sync (persistSync, empty database)', async () => new SyntheticConnector(org).persistSync(org, await syncRun()));
    expect(cold.value.entitiesUpserted).toBe(20_000);
    expect(cold.value.edgesCreated).toBe(org.edges.length);

    const same = await timed('re-sync, nothing changed', async () => new SyntheticConnector(org).persistSync(org, await syncRun()));
    expect(same.value.edgesCreated).toBe(0);
    expect(same.value.edgesClosed).toBe(0);
    expect(same.value.factsVersioned).toBe(0);

    const churned = syntheticOrg(50); // 1% of automations change owner
    const churn = await timed('re-sync, 1% owners changed', async () => new SyntheticConnector(churned).persistSync(churned, await syncRun()));
    expect(churn.value.edgesCreated).toBe(50);
    expect(churn.value.edgesClosed).toBe(50);

    const ds = new DataService({ persistent: true });
    const hydrate = await timed('hydrate graph from Postgres', () => ds.hydrateGraphFromDatabase());
    expect(hydrate.value.entities).toBe(20_000);
    expect(hydrate.value.edges).toBe(org.edges.length);

    const checks = await timed('evaluate all checks (C1–C4)', () => evaluateAllChecks(ds.getGraph()));
    expect(checks.value.length).toBeGreaterThan(0);

    console.log(`[bench] edges ${org.edges.length}, facts ${org.facts.length}`);
    // Budgets ≈ 3-4x a dev laptop (Postgres 18, Windows): cold 2.5 s, re-sync 1.0 s,
    // hydrate 0.5 s, checks 0.03 s. Before migration 006 a cold sync took 23 s.
    expect(cold.ms).toBeLessThan(10_000);
    expect(same.ms).toBeLessThan(4_000);
    expect(churn.ms).toBeLessThan(4_000);
    expect(hydrate.ms).toBeLessThan(2_000);
    expect(checks.ms).toBeLessThan(1_500); // NFR-02
  }, 180_000);
});
