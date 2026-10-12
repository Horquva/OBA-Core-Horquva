// =============================================================================
// Horquva Continuity Platform — Connector Runner (CON-10, CON-11)
// =============================================================================
// Owns the `connection` and `sync_run` rows:
// - connection configs are validated per type and stored encrypted
//   (security/encryption.ts, connection id as AAD); they are only decrypted
//   here, to build a connector;
// - a sync is claimed atomically (status <> 'syncing'), so the hourly job and
//   a manual "Sync now" can't run the same connection twice at once;
// - the sync_run row exists before the work starts, so a failed run is
//   recorded as failed rather than rolled away;
// - after a successful sync the in-memory graph is rebuilt from Postgres.
// CSV imports are one-off: the file content goes straight to the sync and the
// raw landing zone, never into the connection's stored config.
// =============================================================================

import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../../db/client.js';
import { encryptJson, decryptJson, type EncryptedPayload } from '../../security/encryption.js';
import { N8nConnector } from '../n8n/index.js';
import { EntraConnector } from '../entra/index.js';
import { GoogleWorkspaceConnector } from '../google/index.js';
import { AiAdminConnector } from '../ai_admin/index.js';
import { CsvConnector } from '../csv/index.js';
import type { BaseConnector } from './base.js';
import type { PersistStats } from './types.js';
import { DataService } from '../../services/dataService.js';

export const CONFIG_SCHEMAS = {
  n8n: z.object({ baseUrl: z.string().url(), apiKey: z.string().min(1) }),
  entra: z.object({ tenantId: z.string().min(1), clientId: z.string().min(1), clientSecret: z.string().min(1) }),
  google: z.object({ adminEmail: z.string().email(), serviceAccountKeyJson: z.string().min(1) }),
  ai_admin: z.object({ vendor: z.enum(['openai', 'anthropic']), adminApiKey: z.string().min(1), organizationId: z.string().optional() }),
} as const;

export type SyncableType = keyof typeof CONFIG_SCHEMAS;
export type ConnectorType = SyncableType | 'csv';
export const CONNECTOR_TYPES = Object.keys(CONFIG_SCHEMAS) as SyncableType[];

export class ConnectorError extends Error {
  constructor(public status: 400 | 404 | 409 | 502, message: string) {
    super(message);
    this.name = 'ConnectorError';
  }
}

export const CSV_CONNECTION_ID = 'conn_csv';

function validateConfig(type: string, config: unknown): Record<string, unknown> {
  const schema = CONFIG_SCHEMAS[type as SyncableType];
  if (!schema) throw new ConnectorError(400, `Unsupported connector type: ${type}.`);
  const parsed = schema.safeParse(config);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.') || type).join(', ');
    throw new ConnectorError(400, `Check these settings: ${fields}.`);
  }
  return parsed.data;
}

function build(id: string, type: ConnectorType, name: string, config: any): BaseConnector {
  switch (type) {
    case 'n8n': return new N8nConnector(id, name, config);
    case 'entra': return new EntraConnector(id, name, config);
    case 'google': return new GoogleWorkspaceConnector(id, name, config);
    case 'ai_admin': return new AiAdminConnector(id, name, config);
    case 'csv': return new CsvConnector(id, name, config);
    default: throw new ConnectorError(400, `Unsupported connector type: ${type}.`);
  }
}

/** One-line, secret-free description of why a connector call failed. */
function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/(api[_-]?key|secret|token|password)=[^&\s]+/gi, '$1=***').slice(0, 500);
}

export class ConnectorRunner {
  static async createConnection(input: { type: string; name: string; config: unknown }): Promise<{ id: string }> {
    const config = validateConfig(input.type, input.config);
    const id = `conn_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await query(
      `INSERT INTO connection (id, type, name, config_encrypted, status) VALUES ($1, $2, $3, $4, 'disconnected')`,
      [id, input.type, input.name.trim(), JSON.stringify(encryptJson(config, id))]
    );
    DataService.getInstance().addAuditEntry('system', 'CONNECTION_CREATED', `connection:${id}`, `Added ${input.type} connection "${input.name.trim()}".`);
    return { id };
  }

  /** Renames and/or replaces the whole config (secrets are never read back, so there is nothing to merge with). */
  static async updateConnection(id: string, input: { name?: string; config?: unknown }): Promise<void> {
    const row = await ConnectorRunner.row(id);
    if (row.type === 'csv') throw new ConnectorError(400, 'CSV imports have no settings to change; upload a new file instead.');
    const config = input.config === undefined ? null : validateConfig(row.type, input.config);
    await query(
      `UPDATE connection SET name = COALESCE($2, name), config_encrypted = COALESCE($3, config_encrypted), updated_at = NOW() WHERE id = $1`,
      [id, input.name?.trim() || null, config ? JSON.stringify(encryptJson(config, id)) : null]
    );
    DataService.getInstance().addAuditEntry('system', 'CONNECTION_UPDATED', `connection:${id}`, config ? 'Connection settings replaced.' : 'Connection renamed.');
  }

  /** Tries credentials without saving them (onboarding "Test connection"). */
  static async testConfig(type: string, config: unknown): Promise<{ ok: boolean; error: string | null }> {
    const valid = validateConfig(type, config);
    return ConnectorRunner.tryConnector(build('conn_test', type as SyncableType, 'test', valid));
  }

  static async testConnection(id: string): Promise<{ ok: boolean; error: string | null }> {
    return ConnectorRunner.tryConnector(await ConnectorRunner.load(id));
  }

  private static async tryConnector(connector: BaseConnector): Promise<{ ok: boolean; error: string | null }> {
    try {
      const ok = await connector.testConnection();
      return { ok, error: ok ? null : 'The service answered but refused these credentials.' };
    } catch (err) {
      return { ok: false, error: describe(err) };
    }
  }

  private static async row(id: string): Promise<{ id: string; type: ConnectorType; name: string; config_encrypted: EncryptedPayload; status: string }> {
    const res = await query(`SELECT id, type, name, config_encrypted, status FROM connection WHERE id = $1`, [id]);
    if (res.rows.length === 0) throw new ConnectorError(404, `Connection ${id} not found.`);
    return res.rows[0];
  }

  static async load(id: string, configOverride?: Record<string, unknown>): Promise<BaseConnector> {
    const row = await ConnectorRunner.row(id);
    const config = configOverride ?? decryptJson(row.config_encrypted, row.id);
    return build(row.id, row.type, row.name, config);
  }

  /**
   * Claims the connection for one sync and records a queued sync_run.
   * 409 if a sync is already running for it.
   */
  static async queueSync(connectionId: string): Promise<{ syncRunId: string }> {
    const claimed = await query(
      `UPDATE connection SET status = 'syncing', updated_at = NOW() WHERE id = $1 AND status <> 'syncing' RETURNING id`,
      [connectionId]
    );
    if (claimed.rowCount === 0) {
      await ConnectorRunner.row(connectionId); // 404 if it doesn't exist
      throw new ConnectorError(409, 'A sync is already running for this connection.');
    }
    const run = await query(`INSERT INTO sync_run (connection_id, status) VALUES ($1, 'queued') RETURNING id`, [connectionId]);
    return { syncRunId: run.rows[0].id };
  }

  /** Runs a claimed sync to completion. Never throws: the outcome is on the sync_run and connection rows. */
  static async executeSync(connectionId: string, syncRunId: string, configOverride?: Record<string, unknown>): Promise<{ ok: boolean; stats?: PersistStats; error?: string }> {
    await query(`UPDATE sync_run SET status = 'running', started_at = NOW() WHERE id = $1`, [syncRunId]);
    try {
      const connector = await ConnectorRunner.load(connectionId, configOverride);
      const result = await connector.sync();
      const stats = await connector.persistSync(result, syncRunId);
      await query(`UPDATE sync_run SET status = 'completed', completed_at = NOW(), stats = $2 WHERE id = $1`, [syncRunId, JSON.stringify(stats)]);
      // Rebuild the graph before releasing the claim, so a client polling for "connected" sees the new data.
      const ds = DataService.getInstance();
      if (ds.isPersistent()) await ds.hydrateGraphFromDatabase();
      await query(
        `UPDATE connection SET status = 'connected', last_sync_at = NOW(), last_error = NULL, updated_at = NOW() WHERE id = $1`,
        [connectionId]
      );
      ds.addAuditEntry(
        'system',
        'CONNECTOR_SYNC_COMPLETED',
        `connection:${connectionId}`,
        `${connector.name}: ${stats.entitiesUpserted} entities, +${stats.edgesCreated}/-${stats.edgesClosed} relationships, +${stats.factsCreated + stats.factsVersioned}/-${stats.factsClosed} facts.`
      );
      return { ok: true, stats };
    } catch (err) {
      const error = describe(err);
      await query(`UPDATE sync_run SET status = 'failed', completed_at = NOW(), error_message = $2 WHERE id = $1`, [syncRunId, error]);
      await query(`UPDATE connection SET status = 'error', last_error = $2, updated_at = NOW() WHERE id = $1`, [connectionId, error]);
      DataService.getInstance().addAuditEntry('system', 'CONNECTOR_SYNC_FAILED', `connection:${connectionId}`, error);
      return { ok: false, error };
    }
  }

  /** CSV upload: one-off sync of the given files; their content is not stored in the connection. */
  static async importCsv(input: { peopleCsv?: string; automationsCsv?: string }): Promise<{ syncRunId: string; ok: boolean; stats?: PersistStats; error?: string }> {
    if (!input.peopleCsv && !input.automationsCsv) throw new ConnectorError(400, 'Upload a people CSV, an automations CSV, or both.');
    await query(
      `INSERT INTO connection (id, type, name, config_encrypted, status) VALUES ($1, 'csv', 'CSV import', $2, 'disconnected') ON CONFLICT (id) DO NOTHING`,
      [CSV_CONNECTION_ID, JSON.stringify(encryptJson({}, CSV_CONNECTION_ID))]
    );
    const { syncRunId } = await ConnectorRunner.queueSync(CSV_CONNECTION_ID);
    const outcome = await ConnectorRunner.executeSync(CSV_CONNECTION_ID, syncRunId, {
      peopleCsvContent: input.peopleCsv,
      automationsCsvContent: input.automationsCsv,
    });
    return { syncRunId, ...outcome };
  }

  /** Hourly job: every scheduled connector that isn't already syncing. */
  static async syncAll(): Promise<number> {
    const res = await query(`SELECT id FROM connection WHERE type <> 'csv' AND status <> 'syncing' ORDER BY id`);
    let started = 0;
    for (const { id } of res.rows) {
      try {
        const { syncRunId } = await ConnectorRunner.queueSync(id);
        started++;
        await ConnectorRunner.executeSync(id, syncRunId);
      } catch (err) {
        if (!(err instanceof ConnectorError && err.status === 409)) console.error(`[ConnectorRunner] Scheduled sync of ${id} failed to start:`, err);
      }
    }
    return started;
  }

  /** At boot: a sync that was running when the process stopped will never finish. */
  static async recoverInterruptedSyncs(): Promise<number> {
    await query(
      `UPDATE sync_run SET status = 'failed', completed_at = NOW(), error_message = 'Interrupted by a server restart.'
        WHERE status IN ('queued', 'running')`
    );
    const res = await query(
      `UPDATE connection SET status = 'error', last_error = 'The last sync was interrupted by a server restart.', updated_at = NOW()
        WHERE status = 'syncing'`
    );
    return res.rowCount ?? 0;
  }
}
