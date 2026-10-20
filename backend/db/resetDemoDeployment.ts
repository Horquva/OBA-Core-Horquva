// =============================================================================
// Horquva Continuity Platform — Load or reset a demo deployment's database
// =============================================================================
// Wipes the database, applies every migration, seeds the 10-person demo org
// (with its snapshot history) and names the org. Run it from your machine
// against the demo deployment's database for the first load and before any
// call where the data should look fresh, then restart the backend so it
// reloads.
//
// Refuses any database that has tables but was not loaded by this script
// (marker table horquva_demo_deployment), so it cannot wipe a real one.
//   DATABASE_URL=postgresql://… npx tsx db/resetDemoDeployment.ts --yes
// Optional: DEMO_COMPANY_NAME (default "Horquva Corp").
// =============================================================================

import pg from 'pg';

const MARKER = 'horquva_demo_deployment';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const target = new URL(url);
  const where = `${target.hostname}${target.pathname}`;
  if (!process.argv.includes('--yes')) {
    throw new Error(`This wipes ${where}. Re-run with --yes to go ahead.`);
  }

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const tables = (await db.query<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).rows.map(
      (r) => r.tablename
    );
    if (tables.length && !tables.includes(MARKER)) {
      throw new Error(`Refusing to wipe ${where}: it has tables but was not loaded by this script.`);
    }
    // Table by table rather than DROP SCHEMA public: managed hosts (Supabase) own that schema.
    await db.query('DROP SCHEMA IF EXISTS pgboss CASCADE');
    for (const t of tables) await db.query(`DROP TABLE IF EXISTS public.${pg.escapeIdentifier(t)} CASCADE`);
    await db.query('DROP FUNCTION IF EXISTS public.horquva_encrypt_secret(text, text)');
    await db.query('DROP FUNCTION IF EXISTS public.horquva_decrypt_secret(bytea, text)');
  } finally {
    await db.end();
  }

  // Imported after the wipe: these open their own pool on DATABASE_URL.
  const { runMigrations } = await import('./migrate.js');
  const { query, closePool } = await import('../src/db/client.js');
  const { DataService } = await import('../src/services/dataService.js');
  try {
    const report = await runMigrations();
    await query(`CREATE TABLE ${MARKER} (seeded_at timestamptz NOT NULL DEFAULT now())`);
    await query(`INSERT INTO ${MARKER} DEFAULT VALUES`);

    const ds = new DataService({ persistent: true });
    await ds.loadFromDatabase({ seedDemo: true });
    const companyName = process.env.DEMO_COMPANY_NAME?.trim() || 'Horquva Corp';
    ds.saveOrganization({ ...ds.getOrganization(), companyName });
    await ds.flushWrites();
    console.log(`[demo] ${where} reset: ${report.appliedCount} migration(s), demo org "${companyName}" seeded.`);
    console.log('[demo] Restart the backend so it reloads the data.');
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error('[demo] reset failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
