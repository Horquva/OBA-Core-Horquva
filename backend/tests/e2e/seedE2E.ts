import { URL } from 'node:url';
import * as graphRepo from '../../src/repositories/graphRepository.js';
import * as settingsRepo from '../../src/repositories/settingsRepository.js';
import * as departureRepo from '../../src/repositories/departureRepository.js';
import { PostgresIdentityQueueAdapter } from '../../src/identity/queue.js';
import { demoState } from '../helpers/fixtureOrg.js';
import { seedDemoHistory } from '../helpers/seedHistory.js';
import { DataService } from '../../src/services/dataService.js';
import { closePool } from '../../src/db/client.js';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+_e2e$/.test(dbName)) {
    throw new Error(`Refusing to seed "${dbName || '(none)'}": the end-to-end database name must end in _e2e.`);
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

  const ds = await DataService.initialize();
  await seedDemoHistory(ds);
  await closePool();
  console.log(`[e2e] ${dbName} seeded with fixture organization.`);
}

main().catch((err) => {
  console.error('[e2e] seed failed:', err.message);
  process.exit(1);
});
