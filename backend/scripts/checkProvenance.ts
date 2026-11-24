// =============================================================================
// Horquva Continuity Platform — Trust Guard T7: Provenance Verification CLI
// =============================================================================
// Runs findUnbackedEntities() against the active database.
// Exits 0 if all entities trace to verifiable evidence.
// Exits 1 with an error report table if unbacked (fabricated) entities exist.
//
// Usage:
//   npx tsx scripts/checkProvenance.ts
// =============================================================================

import dotenv from 'dotenv';
import { findUnbackedEntities } from '../src/security/provenance.js';
import { closePool } from '../src/db/client.js';

dotenv.config();

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[check:provenance] DATABASE_URL is not set: cannot check provenance without database.');
    process.exit(1);
  }

  const unbacked = await findUnbackedEntities();
  if (unbacked.length === 0) {
    console.log('[check:provenance] All entities trace to evidence (T7 Provenance Guard passed).');
    process.exit(0);
  }

  console.error(`[check:provenance] FAILED: Found ${unbacked.length} unbacked entity/entities:`);
  console.table(unbacked);
  process.exit(1);
}

main()
  .catch((err) => {
    console.error('[check:provenance] Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => closePool());
