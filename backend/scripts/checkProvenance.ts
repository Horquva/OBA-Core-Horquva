// =============================================================================
// Horquva Continuity Platform — Trust Guard T7: Provenance Verification CLI
// =============================================================================
// Runs findUnbackedEntities() against DATABASE_URL.
// Exits 0 when every entity traces to evidence, 1 with a table otherwise.
//
// Usage:
//   npm run check:provenance
// =============================================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { findUnbackedEntities } from '../src/security/provenance.js';
import { closePool, query as defaultQuery } from '../src/db/client.js';
import type { Query } from '../src/repositories/graphRepository.js';

dotenv.config();

/** The CLI's exit code: 0 when every entity is backed, 1 otherwise. */
export async function runProvenanceCheck(q: Query = defaultQuery, log: Pick<Console, 'log' | 'error' | 'table'> = console): Promise<0 | 1> {
  const unbacked = await findUnbackedEntities(q);
  if (unbacked.length === 0) {
    log.log('[check:provenance] Every entity traces to evidence.');
    return 0;
  }
  log.error(`[check:provenance] FAILED: ${unbacked.length} unbacked entit${unbacked.length === 1 ? 'y' : 'ies'}:`);
  log.table(unbacked);
  return 1;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('[check:provenance] DATABASE_URL is not set.');
    process.exit(1);
  }
  const code = await runProvenanceCheck();
  await closePool();
  process.exit(code);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(async (err) => {
    console.error('[check:provenance] Error:', err instanceof Error ? err.message : err);
    await closePool().catch(() => undefined);
    process.exit(1);
  });
}
