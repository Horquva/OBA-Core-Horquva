// =============================================================================
// Horquva Continuity Platform — Fresh database for an end-to-end run
// =============================================================================
// Creates the database if needed, drops everything in it (app schema and the
// pg-boss queue schema) and applies all migrations, so each Playwright run
// starts from the same empty state and the backend seeds the demo org into it
// (DEMO_MODE=true). Refuses any database whose name doesn't end in "_e2e".
//   DATABASE_URL=postgresql://…/horquva_e2e npx tsx db/resetForE2E.ts
// =============================================================================

import pg from 'pg';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, '');
  if (!/^[a-z0-9_]+_e2e$/.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName || '(none)'}": the end-to-end database name must end in _e2e.`);
  }

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const server = new pg.Client({ connectionString: admin.toString() });
  await server.connect();
  const exists = await server.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) await server.query(`CREATE DATABASE ${dbName}`);
  await server.end();

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  await db.query('DROP SCHEMA IF EXISTS pgboss CASCADE');
  await db.query('DROP SCHEMA public CASCADE');
  await db.query('CREATE SCHEMA public');
  await db.end();

  // Imported after the reset: the migration runner opens its own pool on DATABASE_URL.
  const { runMigrations } = await import('./migrate.js');
  const { closePool } = await import('../src/db/client.js');
  const report = await runMigrations();
  await closePool();
  console.log(`[e2e] ${dbName} reset; ${report.appliedCount} migration(s) applied.`);
}

main().catch((err) => {
  console.error('[e2e] database reset failed:', err.message);
  process.exit(1);
});
