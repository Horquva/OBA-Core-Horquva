// Shared setup for the Postgres suites: wipe the test database and migrate it.

import crypto from 'node:crypto';
import http from 'node:http';
import { query } from '../../src/db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { app } from '../../src/server.js';
import * as graphRepo from '../../src/repositories/graphRepository.js';
import * as settingsRepo from '../../src/repositories/settingsRepository.js';
import * as departureRepo from '../../src/repositories/departureRepository.js';
import { PostgresIdentityQueueAdapter } from '../../src/identity/queue.js';
import { DataService } from '../../src/services/dataService.js';
import { SnapshotService } from '../../src/services/snapshot/snapshotService.js';
import { demoState } from '../helpers/fixtureOrg.js';

export async function resetDatabase(): Promise<void> {
  await query('DROP SCHEMA public CASCADE');
  await query('CREATE SCHEMA public');
  await runMigrations();
}

export async function seedFixtureOrgToPg(opts?: { withHistory?: boolean }): Promise<DataService> {
  const dbUrl = process.env.DATABASE_URL || process.env.PG_TEST_URL || '';
  if (!/\/[^/?]+_test(\?|$)/.test(dbUrl)) {
    throw new Error(
      `Refusing to seed "${dbUrl || '(unset)'}": database name must end in _test.`
    );
  }

  const demo = demoState();
  await graphRepo.insertSnapshot({
    entities: demo.fixture.entities,
    edges: demo.fixture.edges,
    facts: demo.fixture.facts,
  });
  for (const u of demo.users) await settingsRepo.saveUser(u);
  await settingsRepo.saveOrganization(demo.org);
  for (const c of demo.changeEvents) await settingsRepo.saveChangeEvent(c);
  const queueAdapter = new PostgresIdentityQueueAdapter();
  await queueAdapter.enqueue(demo.queueItem);
  await departureRepo.saveDeparture(demo.departure);

  if (opts?.withHistory) {
    const ds = await DataService.initialize({ ...process.env, DATABASE_URL: dbUrl });
    const { headline, teamConcentration, automationFailures } = SnapshotService.computeMetrics(ds);
    const total = headline.totalCriticalAssets;
    const coveredStart = Math.max(0, Math.round(headline.coveredCount * 0.4) - 1);
    const unknownStart = Math.min(total - coveredStart, headline.unknownCount + Math.ceil(total * 0.25));
    const days = 60;
    const now = new Date();
    for (let i = days; i >= 1; i--) {
      const snapshotDate = new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10);
      const f = (days - i) / days;
      const covered = Math.round(coveredStart + (headline.coveredCount - coveredStart) * f * f);
      const unknown = Math.round(unknownStart + (headline.unknownCount - unknownStart) * f);
      const exposed = Math.max(0, total - covered - unknown);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const head = { ...headline, coveredCount: covered, unknownCount: unknown, exposedCount: exposed };
      await query(
        `INSERT INTO daily_snapshot (id, snapshot_date, headline, team_concentration, automation_failures, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (snapshot_date) DO NOTHING`,
        [id, snapshotDate, JSON.stringify(head), JSON.stringify(teamConcentration), JSON.stringify(automationFailures), createdAt],
      );
    }
  }

  return await DataService.initialize({ ...process.env, DATABASE_URL: dbUrl });
}

export async function startServer(): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as any;
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
}

export const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
