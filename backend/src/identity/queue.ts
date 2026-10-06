// =============================================================================
// Horquva Continuity Platform — Identity Review Queue Service
// =============================================================================
// Handles unmatched external accounts per SRS ID-02 and ID-03.
// Enqueues unresolved candidate accounts with status='pending' (never 'no owner').
// Supports administrative resolutions ('link', 'mark_service_account', 'mark_departed',
// 'ignore') and writes tamper-evident audit log entries per SEC-06.
// =============================================================================

import crypto from 'node:crypto';
import { IdentityQueueItem } from '@horquva/types';
import { query } from '../db/client.js';
import { MatchCandidate } from './matcher.js';

export interface QueueItemFilter {
  status?: 'pending' | 'linked' | 'service_account' | 'departed' | 'ignored';
  source?: string;
}

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  createdAt?: Date;
}

export interface IdentityQueueAdapter {
  enqueue(item: Omit<IdentityQueueItem, 'id' | 'createdAt'>): Promise<IdentityQueueItem>;
  findPendingByCandidate(source: string, externalAccountId: string): Promise<IdentityQueueItem | null>;
  list(filter?: QueueItemFilter): Promise<IdentityQueueItem[]>;
  findById(id: string): Promise<IdentityQueueItem | null>;
  update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem>;
  recordAuditLog(log: AuditLogEntry): Promise<void>;
}

/**
 * In-Memory Review Queue Adapter for isolated testing.
 */
export class InMemoryIdentityQueueAdapter implements IdentityQueueAdapter {
  private items: IdentityQueueItem[] = [];
  private auditLogs: AuditLogEntry[] = [];

  public async enqueue(data: Omit<IdentityQueueItem, 'id' | 'createdAt'>): Promise<IdentityQueueItem> {
    const item: IdentityQueueItem = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.items.push(item);
    return { ...item };
  }

  public async findPendingByCandidate(source: string, externalAccountId: string): Promise<IdentityQueueItem | null> {
    const found = this.items.find(
      (i) => i.source === source && i.externalAccountId === externalAccountId && i.status === 'pending'
    );
    return found ? { ...found } : null;
  }

  public async list(filter?: QueueItemFilter): Promise<IdentityQueueItem[]> {
    let result = [...this.items];
    if (filter?.status) {
      result = result.filter((i) => i.status === filter.status);
    }
    if (filter?.source) {
      result = result.filter((i) => i.source === filter.source);
    }
    return result.map((i) => ({ ...i }));
  }

  public async findById(id: string): Promise<IdentityQueueItem | null> {
    const found = this.items.find((i) => i.id === id);
    return found ? { ...found } : null;
  }

  public async update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new Error(`Queue item with ID ${id} not found.`);
    }
    this.items[index] = {
      ...this.items[index],
      ...updates,
    };
    return { ...this.items[index] };
  }

  public async recordAuditLog(log: AuditLogEntry): Promise<void> {
    this.auditLogs.push({
      ...log,
      createdAt: log.createdAt || new Date(),
    });
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }
}

/**
 * PostgreSQL Review Queue Adapter using 001_initial_schema.sql tables.
 */
export class PostgresIdentityQueueAdapter implements IdentityQueueAdapter {
  public async enqueue(data: Omit<IdentityQueueItem, 'id' | 'createdAt'>): Promise<IdentityQueueItem> {
    const res = await query(
      `
      INSERT INTO identity_queue (external_account_id, source, display_name, email_candidate, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, external_account_id, source, display_name, email_candidate, status,
                linked_person_id, notes, reviewed_by, reviewed_at, created_at;
      `,
      [data.externalAccountId, data.source, data.displayName || null, data.emailCandidate || null, data.status]
    );

    return this.rowToQueueItem(res.rows[0]);
  }

  public async findPendingByCandidate(source: string, externalAccountId: string): Promise<IdentityQueueItem | null> {
    const res = await query(
      `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             linked_person_id, notes, reviewed_by, reviewed_at, created_at
      FROM identity_queue
      WHERE source = $1 AND external_account_id = $2 AND status = 'pending'
      LIMIT 1;
      `,
      [source, externalAccountId]
    );

    if (res.rows.length === 0) return null;
    return this.rowToQueueItem(res.rows[0]);
  }

  public async list(filter?: QueueItemFilter): Promise<IdentityQueueItem[]> {
    let sql = `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             linked_person_id, notes, reviewed_by, reviewed_at, created_at
      FROM identity_queue
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filter?.source) {
      params.push(filter.source);
      sql += ` AND source = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC;`;

    const res = await query(sql, params);
    return res.rows.map((r) => this.rowToQueueItem(r));
  }

  public async findById(id: string): Promise<IdentityQueueItem | null> {
    const res = await query(
      `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             linked_person_id, notes, reviewed_by, reviewed_at, created_at
      FROM identity_queue
      WHERE id = $1;
      `,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.rowToQueueItem(res.rows[0]);
  }

  public async update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.linkedPersonId !== undefined) {
      fields.push(`linked_person_id = $${idx++}`);
      values.push(updates.linkedPersonId);
    }
    if (updates.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(updates.notes);
    }
    if (updates.reviewedBy !== undefined) {
      fields.push(`reviewed_by = $${idx++}`);
      values.push(updates.reviewedBy);
    }
    if (updates.reviewedAt !== undefined) {
      fields.push(`reviewed_at = $${idx++}`);
      values.push(updates.reviewedAt);
    }

    values.push(id);
    const sql = `
      UPDATE identity_queue
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, external_account_id, source, display_name, email_candidate, status,
                linked_person_id, notes, reviewed_by, reviewed_at, created_at;
    `;

    const res = await query(sql, values);
    return this.rowToQueueItem(res.rows[0]);
  }

  public async recordAuditLog(log: AuditLogEntry): Promise<void> {
    await query(
      `
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW());
      `,
      [log.userId || null, log.action, log.resourceType, log.resourceId, JSON.stringify(log.details)]
    );
  }

  private rowToQueueItem(row: any): IdentityQueueItem {
    return {
      id: row.id,
      externalAccountId: row.external_account_id,
      source: row.source,
      displayName: row.display_name || null,
      emailCandidate: row.email_candidate || null,
      status: row.status,
      linkedPersonId: row.linked_person_id || null,
      notes: row.notes || null,
      reviewedBy: row.reviewed_by || null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
      createdAt: new Date(row.created_at),
    };
  }
}

/**
 * Identity Review Queue Service
 */
export class IdentityQueueService {
  private adapter: IdentityQueueAdapter;

  constructor(adapter?: IdentityQueueAdapter) {
    this.adapter = adapter || new PostgresIdentityQueueAdapter();
  }

  /**
   * Enqueues an unmatched account. Returns existing pending item if already present.
   */
  public async enqueueUnmatched(candidate: MatchCandidate): Promise<IdentityQueueItem> {
    const existing = await this.adapter.findPendingByCandidate(candidate.source, candidate.externalAccountId);
    if (existing) {
      return existing;
    }

    return this.adapter.enqueue({
      externalAccountId: candidate.externalAccountId,
      source: candidate.source,
      displayName: candidate.displayName || null,
      emailCandidate: candidate.email || null,
      status: 'pending',
      linkedPersonId: null,
      notes: null,
      reviewedBy: null,
      reviewedAt: null,
    });
  }

  public async listQueue(filter?: QueueItemFilter): Promise<IdentityQueueItem[]> {
    return this.adapter.list(filter);
  }

  public async getQueueItem(id: string): Promise<IdentityQueueItem | null> {
    return this.adapter.findById(id);
  }

  /**
   * Action 'link': Assigns external account to a confirmed directory person ID.
   */
  public async resolveLink(id: string, personEntityId: string, adminUserId: string): Promise<IdentityQueueItem> {
    const updated = await this.adapter.update(id, {
      status: 'linked',
      linkedPersonId: personEntityId,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    });

    await this.adapter.recordAuditLog({
      userId: adminUserId,
      action: 'identity_queue.resolve_link',
      resourceType: 'identity_queue',
      resourceId: id,
      details: {
        externalAccountId: updated.externalAccountId,
        source: updated.source,
        linkedPersonId: personEntityId,
      },
    });

    return updated;
  }

  /**
   * Action 'mark_service_account': Classifies account as programmatic service account.
   */
  public async resolveMarkServiceAccount(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    const updated = await this.adapter.update(id, {
      status: 'service_account',
      notes: notes || null,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    });

    await this.adapter.recordAuditLog({
      userId: adminUserId,
      action: 'identity_queue.mark_service_account',
      resourceType: 'identity_queue',
      resourceId: id,
      details: {
        externalAccountId: updated.externalAccountId,
        source: updated.source,
        notes,
      },
    });

    return updated;
  }

  /**
   * Action 'mark_departed': Confirms account belonged to a departed employee.
   */
  public async resolveMarkDeparted(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    const updated = await this.adapter.update(id, {
      status: 'departed',
      notes: notes || null,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    });

    await this.adapter.recordAuditLog({
      userId: adminUserId,
      action: 'identity_queue.mark_departed',
      resourceType: 'identity_queue',
      resourceId: id,
      details: {
        externalAccountId: updated.externalAccountId,
        source: updated.source,
        notes,
      },
    });

    return updated;
  }

  /**
   * Action 'ignore': Ignores unneeded candidate account.
   */
  public async resolveIgnore(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    const updated = await this.adapter.update(id, {
      status: 'ignored',
      notes: notes || null,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    });

    await this.adapter.recordAuditLog({
      userId: adminUserId,
      action: 'identity_queue.ignore',
      resourceType: 'identity_queue',
      resourceId: id,
      details: {
        externalAccountId: updated.externalAccountId,
        source: updated.source,
        notes,
      },
    });

    return updated;
  }
}
