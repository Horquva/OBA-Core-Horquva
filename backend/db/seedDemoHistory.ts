// =============================================================================
// Horquva Continuity Platform — Back-fill demo snapshot history
// =============================================================================
// For a database that was demo-seeded before history seeding existed: adds 60
// days of daily snapshots (ending at today's real counts) so the Overview chart
// has a line. Never overwrites a snapshot. Requires DEMO_MODE=true, which is
// refused in production.
//   npm run seed:demo-history
// =============================================================================

import 'dotenv/config';
import { DataService, demoModeEnabled } from '../src/services/dataService.js';
import { SnapshotService } from '../src/services/snapshot/snapshotService.js';
import { closePool } from '../src/db/client.js';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  if (!demoModeEnabled()) throw new Error('Refusing to seed: demo history is only for DEMO_MODE=true databases.');
  const ds = await DataService.initialize();
  const inserted = await SnapshotService.seedDemoHistory(ds);
  console.log(`Seeded ${inserted} demo snapshot(s); existing days were left untouched.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
