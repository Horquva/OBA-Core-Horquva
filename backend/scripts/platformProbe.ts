// =============================================================================
// Horquva Continuity Platform — Phase 0 platform probe CLI (plan Task 0.1)
// =============================================================================
// Reads credentials from backend/.env.connectors (gitignored), probes every
// platform with GET requests (plus the two token exchanges) and prints one
// row per check. Prints statuses only, never a credential value. Exits 0.
//
// Usage:
//   cd backend && npx tsx scripts/platformProbe.ts
// =============================================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { probeAll, type ProbeEnv, type ProbeResult } from '../src/connectors/probe/probes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CONNECTORS_ENV_PATH = path.resolve(here, '../.env.connectors');

/**
 * Platform credentials come only from backend/.env.connectors, parsed into a
 * private object: never process.env, which backend/.env may also fill.
 */
export function loadConnectorsEnv(file = CONNECTORS_ENV_PATH): ProbeEnv {
  if (!existsSync(file)) {
    console.warn(`[probe] ${file} not found: every platform will report "missing".`);
    return {};
  }
  return dotenv.parse(readFileSync(file));
}

/** A fixed-width text table, ready to paste into docs/test-org/phase0-results.md. */
export function formatTable(results: ProbeResult[]): string {
  const rows = [['platform', 'check', 'status', 'http', 'detail'], ...results.map((r) => [r.platform, r.check, r.status, r.httpStatus == null ? '-' : String(r.httpStatus), r.detail.replace(/\s+/g, ' ')])];
  const widths = rows[0].map((_, i) => Math.max(...rows.map((row) => row[i].length)));
  return rows.map((row) => row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i]))).join('  ')).join('\n');
}

async function main(): Promise<void> {
  const results = await probeAll(loadConnectorsEnv(), (url, init) => fetch(url, init));
  console.log(formatTable(results));
  const summary = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log(`\n${Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('[probe] failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
