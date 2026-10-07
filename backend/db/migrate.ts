// =============================================================================
// Horquva Continuity Platform — Database Migration Runner (G-18)
// =============================================================================
// Idempotent migration runner for PostgreSQL.
// - Tracks applied migrations in `schema_migrations`
// - Executes *.sql migrations sequentially from `backend/db/migrations/`
// - Supports `--up` (default) and `--status` CLI modes
// - Safe: Transactions wrap each migration; rerun is a clean no-op
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { query, pool } from '../src/db/client.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationFile {
  name: string;
  filePath: string;
  content: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt: string | null;
}

export interface MigrationReport {
  appliedCount: number;
  migrationsApplied: string[];
  alreadyAppliedCount: number;
}

export interface MigrationOptions {
  migrationsDir?: string;
  queryFn?: typeof query;
}

/**
 * Ensures the schema_migrations table exists in the target database.
 */
export async function ensureMigrationTable(queryFn = query): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await queryFn(sql);
}

/**
 * Discovers and parses all .sql migration files in the migrations directory in sorted order.
 */
export function discoverMigrationFiles(migrationsDir?: string): MigrationFile[] {
  const dir = migrationsDir || path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  return files.map((name) => {
    const filePath = path.join(dir, name);
    const content = fs.readFileSync(filePath, 'utf-8');
    return { name, filePath, content };
  });
}

/**
 * Returns the status of all available migrations.
 */
export async function getMigrationStatus(options: MigrationOptions = {}): Promise<MigrationStatus[]> {
  const queryFn = options.queryFn || query;
  await ensureMigrationTable(queryFn);

  const availableFiles = discoverMigrationFiles(options.migrationsDir);
  const res = await queryFn('SELECT name, applied_at FROM schema_migrations ORDER BY name ASC');
  const appliedMap = new Map<string, string>();
  for (const row of res.rows) {
    appliedMap.set(row.name, row.applied_at ? new Date(row.applied_at).toISOString() : null);
  }

  return availableFiles.map((file) => ({
    name: file.name,
    applied: appliedMap.has(file.name),
    appliedAt: appliedMap.get(file.name) ?? null,
  }));
}

/**
 * Executes unapplied migrations sequentially in order.
 * Idempotent: safe to run multiple times without failure or duplicated state.
 */
export async function runMigrations(options: MigrationOptions = {}): Promise<MigrationReport> {
  const queryFn = options.queryFn || query;
  await ensureMigrationTable(queryFn);

  const availableFiles = discoverMigrationFiles(options.migrationsDir);
  const res = await queryFn('SELECT name FROM schema_migrations');
  const alreadyApplied = new Set<string>(res.rows.map((r: any) => r.name));

  const toApply = availableFiles.filter((f) => !alreadyApplied.has(f.name));
  const migrationsApplied: string[] = [];

  for (const file of toApply) {
    if (process.env.DEBUG_MIGRATIONS === 'true') {
      console.log(`[Migrate] Applying ${file.name}...`);
    }

    // Execute the SQL file statements
    await queryFn(file.content);

    // Record in schema_migrations
    await queryFn('INSERT INTO schema_migrations (name, applied_at) VALUES ($1, NOW())', [file.name]);
    migrationsApplied.push(file.name);
  }

  return {
    appliedCount: migrationsApplied.length,
    migrationsApplied,
    alreadyAppliedCount: alreadyApplied.size,
  };
}

// ── CLI Runner ─────────────────────────────────────────────────────────────
async function cliMain() {
  const arg = process.argv[2] ?? '--up';

  try {
    if (arg === '--status') {
      const statuses = await getMigrationStatus();
      console.log('\n--- Horquva Database Migration Status ---');
      console.table(
        statuses.map((s) => ({
          Migration: s.name,
          Status: s.applied ? 'APPLIED' : 'PENDING',
          AppliedAt: s.appliedAt ?? '—',
        }))
      );
    } else if (arg === '--up') {
      console.log('\n--- Executing Horquva Database Migrations ---');
      const report = await runMigrations();
      if (report.appliedCount === 0) {
        console.log(`[Migrate] Database schema is already up to date (${report.alreadyAppliedCount} applied).`);
      } else {
        console.log(`[Migrate] Successfully applied ${report.appliedCount} migration(s):`);
        report.migrationsApplied.forEach((m) => console.log(`  ✓ ${m}`));
      }
    } else {
      console.log(`Unknown flag: ${arg}. Use --up or --status.`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[Migrate Error]:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only execute CLI if file is run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cliMain();
}
