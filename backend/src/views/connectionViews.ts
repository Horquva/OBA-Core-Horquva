// =============================================================================
// Horquva Continuity Platform — Connections read model (CON-10, UI-08)
// =============================================================================
// Two honest answers to "where does our data come from?":
//   1. `connections` — the configured connectors, read from the `connection`
//      table with each one's latest `sync_run`. Without a reachable database
//      there are none, and the response says the store is unavailable rather
//      than inventing "healthy" connectors.
//   2. `sources` — what the graph actually holds, counted per evidence source
//      (entra, n8n, attestation, manual_assignment …) with the latest date.
// Secrets never leave the backend: there is no secret hint at all (SEC-03).
// =============================================================================

import type { ContinuityGraph } from '../domain/graph/index.js';
import { query } from '../db/client.js';

export interface ConnectionStatusView {
  id: string;
  type: string;
  name: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncAt: string | null;
  lastError: string | null;
  lastRun: {
    status: 'running' | 'completed' | 'failed';
    startedAt: string;
    completedAt: string | null;
    stats: Record<string, number>;
    error: string | null;
  } | null;
}

export interface SourceOnRecord {
  source: string;
  relationships: number;
  facts: number;
  latestAt: string | null;
}

const STORE_TIMEOUT_MS = 2000;

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const t = new Date(d as string);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

/** Configured connectors from Postgres; `store: 'unavailable'` when the database can't be reached. */
export async function listConnections(): Promise<{ store: 'database' | 'unavailable'; connections: ConnectionStatusView[] }> {
  const sql = `
    SELECT c.id, c.type, c.name, c.status, c.last_sync_at, c.last_error,
           r.status AS run_status, r.started_at, r.completed_at, r.stats, r.error_message
      FROM connection c
      LEFT JOIN LATERAL (
        SELECT status, started_at, completed_at, stats, error_message
          FROM sync_run WHERE connection_id = c.id ORDER BY started_at DESC LIMIT 1
      ) r ON TRUE
     ORDER BY c.name;`;
  try {
    const res = await Promise.race([
      query(sql),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), STORE_TIMEOUT_MS)),
    ]);
    const connections = res.rows.map((r: any): ConnectionStatusView => ({
      id: r.id,
      type: r.type,
      name: r.name,
      status: ['connected', 'syncing', 'error'].includes(r.status) ? r.status : 'disconnected',
      lastSyncAt: iso(r.last_sync_at),
      lastError: r.last_error ?? null,
      lastRun: r.run_status
        ? {
            status: r.run_status,
            startedAt: iso(r.started_at)!,
            completedAt: iso(r.completed_at),
            stats: r.stats ?? {},
            error: r.error_message ?? null,
          }
        : null,
    }));
    return { store: 'database', connections };
  } catch {
    return { store: 'unavailable', connections: [] };
  }
}

/** Relationships and facts in the graph, grouped by the source that supplied them. */
export function sourcesOnRecord(graph: ContinuityGraph): SourceOnRecord[] {
  const by = new Map<string, SourceOnRecord>();
  const bump = (source: string | undefined, field: 'relationships' | 'facts', at: unknown) => {
    const key = source || 'unknown';
    const row = by.get(key) ?? { source: key, relationships: 0, facts: 0, latestAt: null };
    row[field]++;
    const when = iso(at);
    if (when && (!row.latestAt || when > row.latestAt)) row.latestAt = when;
    by.set(key, row);
  };

  for (const e of graph.getAllEdges()) if (!e.validTo) bump(e.source, 'relationships', e.validFrom);
  for (const n of graph.getAllNodes()) for (const f of n.facts.values()) bump(f.source, 'facts', f.validFrom);

  return [...by.values()].sort((a, b) => b.relationships + b.facts - (a.relationships + a.facts) || a.source.localeCompare(b.source));
}
