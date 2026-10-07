import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverMigrationFiles,
  ensureMigrationTable,
  getMigrationStatus,
  runMigrations,
} from '../../db/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('G-18: Database Migration Runner', () => {
  it('discovers and orders all migrations in ascending alphanumeric sequence', () => {
    const migrationsDir = path.resolve(__dirname, '../../db/migrations');
    const files = discoverMigrationFiles(migrationsDir);

    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files[0].name).toBe('001_initial_schema.sql');
    expect(files[1].name).toBe('002_sprint_2_tables.sql');
    expect(files[2].name).toBe('003_daily_snapshot.sql');

    expect(files[0].content).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    expect(files[1].content).toContain('CREATE TABLE IF NOT EXISTS departure');
    expect(files[2].content).toContain('CREATE TABLE IF NOT EXISTS daily_snapshot');
  });

  it('runs migrations and tracks applied status idempotently with mock query engine', async () => {
    // In-memory mock database state
    const tables = new Set<string>();
    const appliedMigrations = new Map<string, string>();
    const executedQueries: string[] = [];

    const mockQuery = async (text: string, params?: any[]) => {
      executedQueries.push(text);

      if (text.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) {
        tables.add('schema_migrations');
        return { rows: [] } as any;
      }

      if (text.includes('SELECT name, applied_at FROM schema_migrations')) {
        const rows = Array.from(appliedMigrations.entries()).map(([name, applied_at]) => ({
          name,
          applied_at,
        }));
        return { rows } as any;
      }

      if (text.includes('SELECT name FROM schema_migrations')) {
        const rows = Array.from(appliedMigrations.keys()).map((name) => ({ name }));
        return { rows } as any;
      }

      if (text.includes('INSERT INTO schema_migrations')) {
        const name = params?.[0];
        if (name) {
          appliedMigrations.set(name, new Date().toISOString());
        }
        return { rows: [] } as any;
      }

      // Plain DDL query execution
      return { rows: [] } as any;
    };

    // 1. Initial status: all 3 migrations pending
    const initialStatus = await getMigrationStatus({ queryFn: mockQuery as any });
    expect(initialStatus.length).toBe(3);
    expect(initialStatus.every((s) => !s.applied)).toBe(true);

    // 2. First run: applies all 3 migrations
    const firstRunReport = await runMigrations({ queryFn: mockQuery as any });
    expect(firstRunReport.appliedCount).toBe(3);
    expect(firstRunReport.migrationsApplied).toEqual([
      '001_initial_schema.sql',
      '002_sprint_2_tables.sql',
      '003_daily_snapshot.sql',
    ]);

    // 3. Status check: all 3 now applied
    const postStatus = await getMigrationStatus({ queryFn: mockQuery as any });
    expect(postStatus.every((s) => s.applied)).toBe(true);
    expect(postStatus.every((s) => s.appliedAt !== null)).toBe(true);

    // 4. Second run (Idempotency test): applies 0 migrations
    const secondRunReport = await runMigrations({ queryFn: mockQuery as any });
    expect(secondRunReport.appliedCount).toBe(0);
    expect(secondRunReport.migrationsApplied.length).toBe(0);
    expect(secondRunReport.alreadyAppliedCount).toBe(3);
  });

  it('rolls a failing migration back and does not record it', async () => {
    const executed: string[] = [];
    const recorded: string[] = [];
    const mockQuery = async (text: string, params?: any[]) => {
      executed.push(text.trim().split(/\s+/).slice(0, 2).join(' '));
      if (text.includes('CREATE TABLE IF NOT EXISTS daily_snapshot')) throw new Error('boom');
      if (text.includes('INSERT INTO schema_migrations')) recorded.push(params?.[0]);
      return { rows: [] } as any;
    };
    await expect(runMigrations({ queryFn: mockQuery as any })).rejects.toThrow('003_daily_snapshot.sql: boom');
    expect(recorded).toEqual(['001_initial_schema.sql', '002_sprint_2_tables.sql']);
    expect(executed.at(-1)).toBe('ROLLBACK');
  });

  it('refuses a schema_migrations table owned by another migration system', async () => {
    const mockQuery = async (text: string) =>
      text.includes('information_schema.columns')
        ? ({ rows: [{ column_name: 'filename' }, { column_name: 'applied_at' }] } as any)
        : ({ rows: [] } as any);
    await expect(ensureMigrationTable(mockQuery as any)).rejects.toThrow(/different migration system/);
  });
});
