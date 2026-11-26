// =============================================================================
// Horquva Continuity Platform — Identity Review Queue Service
// =============================================================================
// Handles unmatched external accounts per SRS ID-02 and ID-03.
// Enqueues unresolved candidate accounts with status='pending' (never 'no owner').
// Supports administrative resolutions ('link', 'mark_service_account', 'mark_departed',
// 'ignore') and writes tamper-evident audit log entries per SEC-06.
// =============================================================================

import crypto from 'node:crypto';
import type { IdentityLink, IdentityQueueItem } from '@horquva/types';
import { query as defaultQuery } from '../db/client.js';
import type { Query } from '../repositories/graphRepository.js';
import type { ContinuityGraph } from '../domain/graph/index.js';
import { InMemoryLinkRepository, type LinkRepository } from './linkRepository.js';
import { IdentityMatcher, type MatchCandidate } from './matcher.js';
import { parseEmailAliases } from './syncHook.js';

export class IdentityQueueError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'IdentityQueueError';
    this.status = status;
  }
}

export class IdentityQueueNotFoundError extends IdentityQueueError {
  constructor(message: string) {
    super(404, message);
    this.name = 'IdentityQueueNotFoundError';
  }
}

export class IdentityQueueConflictError extends IdentityQueueError {
  constructor(message: string) {
    super(409, message);
    this.name = 'IdentityQueueConflictError';
  }
}

export function toCanonicalAccountId(source: string, externalAccountId: string): string {
  return externalAccountId.startsWith('account:')
    ? externalAccountId
    : `account:${source}:${externalAccountId}`;
}

export interface QueueSuggestionView {
  linkId: string | null;
  person: {
    id: string;
    kind: 'person';
    name: string;
  };
  reason: string;
}

export interface IdentityQueueItemEnriched {
  id: string;
  accountId: string;
  source: string;
  displayName: string | null;
  emailCandidate: string | null;
  suggestion: QueueSuggestionView | null;
  suggestions: QueueSuggestionView[];
}

function getPgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const rec = err as { code?: unknown; cause?: unknown };
  if (typeof rec.code === 'string') return rec.code;
  if (rec.cause && typeof rec.cause === 'object') {
    const causeCode = (rec.cause as { code?: unknown }).code;
    if (typeof causeCode === 'string') return causeCode;
  }
  return undefined;
}

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface IdentityQueueAdapter {
  enqueue(item: Omit<IdentityQueueItem, 'id' | 'createdAt'>): Promise<IdentityQueueItem>;
  findPendingByCandidate(source: string, externalAccountId: string): Promise<IdentityQueueItem | null>;
  list(filter?: QueueItemFilter): Promise<IdentityQueueItem[]>;
  findById(id: string): Promise<IdentityQueueItem | null>;
  findByIdForUpdate?(id: string): Promise<IdentityQueueItem | null>;
  update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem>;
  recordAuditLog(log: AuditLogEntry): Promise<void>;
  withQuery?(q: Query): IdentityQueueAdapter;
  markLinkedByAccounts?(
    accountIds: string[],
    reviewedBy: string,
    reviewedAt: Date
  ): Promise<IdentityQueueItem[]>;
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

  public async findByIdForUpdate(id: string): Promise<IdentityQueueItem | null> {
    return this.findById(id);
  }

  public async update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
    }
    this.items[index] = {
      ...this.items[index],
      ...updates,
    };
    return { ...this.items[index] };
  }

  public async markLinkedByAccounts(
    accountIds: string[],
    reviewedBy: string,
    reviewedAt: Date
  ): Promise<IdentityQueueItem[]> {
    if (accountIds.length === 0) return [];
    const accountSet = new Set(accountIds);
    const updated: IdentityQueueItem[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.status !== 'pending') continue;
      const canonical = toCanonicalAccountId(item.source, item.externalAccountId);
      if (accountSet.has(item.externalAccountId) || accountSet.has(canonical)) {
        this.items[i] = {
          ...item,
          status: 'linked',
          reviewedBy,
          reviewedAt,
        };
        updated.push({ ...this.items[i] });
      }
    }
    return updated;
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
  private readonly q: Query;

  constructor(q: Query = defaultQuery) {
    this.q = q;
  }

  public withQuery(q: Query): PostgresIdentityQueueAdapter {
    return new PostgresIdentityQueueAdapter(q);
  }

  public async enqueue(data: Omit<IdentityQueueItem, 'id' | 'createdAt'>): Promise<IdentityQueueItem> {
    const res = await this.q(
      `
      INSERT INTO identity_queue (external_account_id, source, display_name, email_candidate, status, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, external_account_id, source, display_name, email_candidate, status,
                notes, reviewed_by, reviewed_at, created_at;
      `,
      [data.externalAccountId, data.source, data.displayName || null, data.emailCandidate || null, data.status]
    );

    return this.rowToQueueItem(res.rows[0]);
  }

  public async findPendingByCandidate(source: string, externalAccountId: string): Promise<IdentityQueueItem | null> {
    const res = await this.q(
      `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             notes, reviewed_by, reviewed_at, created_at
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
             notes, reviewed_by, reviewed_at, created_at
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

    const res = await this.q(sql, params);
    return res.rows.map((r) => this.rowToQueueItem(r));
  }

  public async findById(id: string): Promise<IdentityQueueItem | null> {
    if (!UUID_REGEX.test(id)) return null;
    const res = await this.q(
      `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             notes, reviewed_by, reviewed_at, created_at
      FROM identity_queue
      WHERE id = $1;
      `,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.rowToQueueItem(res.rows[0]);
  }

  public async findByIdForUpdate(id: string): Promise<IdentityQueueItem | null> {
    if (!UUID_REGEX.test(id)) return null;
    const res = await this.q(
      `
      SELECT id, external_account_id, source, display_name, email_candidate, status,
             notes, reviewed_by, reviewed_at, created_at
      FROM identity_queue
      WHERE id = $1
      FOR UPDATE;
      `,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.rowToQueueItem(res.rows[0]);
  }

  public async update(id: string, updates: Partial<IdentityQueueItem>): Promise<IdentityQueueItem> {
    if (!UUID_REGEX.test(id)) {
      throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
    }
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
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

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
      }
      return existing;
    }

    values.push(id);
    const sql = `
      UPDATE identity_queue
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, external_account_id, source, display_name, email_candidate, status,
                notes, reviewed_by, reviewed_at, created_at;
    `;

    const res = await this.q(sql, values);
    if (res.rows.length === 0) {
      throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
    }
    return this.rowToQueueItem(res.rows[0]);
  }

  public async markLinkedByAccounts(
    accountIds: string[],
    reviewedBy: string,
    reviewedAt: Date
  ): Promise<IdentityQueueItem[]> {
    const uniqueAccountIds = Array.from(new Set(accountIds)).sort();
    if (uniqueAccountIds.length === 0) return [];
    const res = await this.q(
      `
      UPDATE identity_queue
      SET status = 'linked',
          reviewed_by = $2,
          reviewed_at = $3
      WHERE status = 'pending'
        AND (
          external_account_id = ANY($1::text[])
          OR ('account:' || source || ':' || external_account_id) = ANY($1::text[])
        )
      RETURNING id, external_account_id, source, display_name, email_candidate, status,
                notes, reviewed_by, reviewed_at, created_at;
      `,
      [uniqueAccountIds, reviewedBy, reviewedAt]
    );
    return res.rows.map((r) => this.rowToQueueItem(r));
  }

  public async recordAuditLog(log: AuditLogEntry): Promise<void> {
    await this.q(
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
  private linkRepo: LinkRepository;

  constructor(adapter?: IdentityQueueAdapter, linkRepo?: LinkRepository) {
    this.adapter = adapter || new PostgresIdentityQueueAdapter();
    this.linkRepo = linkRepo || new InMemoryLinkRepository();
  }

  private adapterFor(txRepo: LinkRepository): IdentityQueueAdapter {
    if (this.adapter.withQuery && txRepo.getQuery) {
      return this.adapter.withQuery(txRepo.getQuery());
    }
    return this.adapter;
  }

  private async runLinkTransaction<T>(fn: (txRepo: LinkRepository) => Promise<T>): Promise<T> {
    try {
      return await this.linkRepo.runInTransaction(fn);
    } catch (err) {
      if (err instanceof IdentityQueueError) {
        throw err;
      }
      const code = getPgErrorCode(err);
      if (code === '23505') {
        throw new IdentityQueueConflictError(
          'Account already has a conflicting active identity link.'
        );
      }
      if (code === '23503') {
        throw new IdentityQueueError(
          400,
          'Referenced account or person entity does not exist.'
        );
      }
      throw err;
    }
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
   * Lists pending queue items that do not have an active non-suggested link,
   * enriched with stored `suggested` links (falling back to IdentityMatcher
   * only when no stored suggestion exists for that account).
   */
  public async listPendingWithSuggestions(graph: ContinuityGraph): Promise<IdentityQueueItemEnriched[]> {
    const [pending, activeLinks, activeSuggestions] = await Promise.all([
      this.adapter.list({ status: 'pending' }),
      this.linkRepo.listActive(),
      this.linkRepo.listActiveSuggestions(),
    ]);

    const activeAccountIds = new Set(
      activeLinks
        .filter((l) => l.validTo === null && l.method !== 'suggested')
        .map((l) => l.accountId)
    );

    const suggestionsByAccount = new Map<string, IdentityLink[]>();
    for (const sug of activeSuggestions) {
      const list = suggestionsByAccount.get(sug.accountId) ?? [];
      list.push(sug);
      suggestionsByAccount.set(sug.accountId, list);
    }

    let matcher: IdentityMatcher | null = null;
    const getMatcher = () => {
      if (matcher) return matcher;
      const peopleNodes = graph.getAllNodes().filter((n) => n.entity.kind === 'person');
      const directoryPeople = peopleNodes.map((n) => {
        const refs = (n.entity.externalRefs ?? {}) as Record<string, unknown>;
        const primaryEmail =
          (typeof refs.email === 'string' && refs.email.trim()) ||
          (typeof refs.primaryEmail === 'string' && refs.primaryEmail.trim()) ||
          n.entity.id.replace(/^person:/, '');
        return {
          id: n.entity.id,
          primaryEmail,
          displayName: n.entity.name,
          aliases: parseEmailAliases(refs.emails, primaryEmail),
          status: ((n.facts.get('status')?.value as 'active' | 'departed') || 'active'),
        };
      });
      matcher = new IdentityMatcher(directoryPeople);
      return matcher;
    };

    const enriched: IdentityQueueItemEnriched[] = [];

    for (const item of pending) {
      const accountId = toCanonicalAccountId(item.source, item.externalAccountId);
      if (activeAccountIds.has(accountId)) {
        continue;
      }

      const stored = suggestionsByAccount.get(accountId) ?? [];
      let suggestions: QueueSuggestionView[];

      if (stored.length > 0) {
        suggestions = stored.map((link) => {
          const personNode = graph.getNode(link.personId);
          return {
            linkId: link.id,
            person: {
              id: link.personId,
              kind: 'person' as const,
              name: personNode?.entity.name || link.personId,
            },
            reason: link.note || 'Suggested match',
          };
        });
      } else if (item.emailCandidate || item.displayName) {
        const match = getMatcher().match({
          source: item.source,
          externalAccountId: item.externalAccountId,
          email: item.emailCandidate || undefined,
          displayName: item.displayName || undefined,
        });
        if (match.matched && match.directoryPersonId) {
          const matchedNode = graph.getNode(match.directoryPersonId);
          suggestions = [
            {
              linkId: null,
              person: {
                id: match.directoryPersonId,
                kind: 'person' as const,
                name: matchedNode?.entity.name || match.directoryPersonId,
              },
              reason: match.reasons.join('; ') || 'Name/email similarity match',
            },
          ];
        } else {
          suggestions = [];
        }
      } else {
        suggestions = [];
      }

      enriched.push({
        id: item.id,
        accountId,
        source: item.source,
        displayName: item.displayName ?? null,
        emailCandidate: item.emailCandidate ?? null,
        suggestion: suggestions[0] ?? null,
        suggestions,
      });
    }

    return enriched;
  }

  /**
   * Action 'link': Transactionally links an account to a confirmed directory person ID.
   */
  public async resolveLink(id: string, personEntityId: string, adminUserId: string): Promise<IdentityQueueItem> {
    return this.runLinkTransaction(async (txRepo) => {
      const txAdapter = this.adapterFor(txRepo);
      const item = await txAdapter.findById(id);
      if (!item) {
        throw new IdentityQueueNotFoundError(`Identity queue item ${id} not found.`);
      }
      if (item.status !== 'pending') {
        throw new IdentityQueueConflictError(`Identity queue item ${id} is already resolved (${item.status}).`);
      }

      const accountId = toCanonicalAccountId(item.source, item.externalAccountId);
      const existingActive = await txRepo.findActiveByAccounts([accountId]);
      if (existingActive.some((link) => link.method === 'admin_link')) {
        throw new IdentityQueueConflictError(`Account ${accountId} already has an active admin link.`);
      }

      await txRepo.closeActiveByAccount(accountId, ['exact_email', 'suggested']);

      const now = new Date();
      const createdLink = await txRepo.create({
        accountId,
        personId: personEntityId,
        grade: 'confirmed',
        method: 'admin_link',
        linkedBy: adminUserId,
        note: `Linked via identity queue (${id})`,
      });

      if (txAdapter.findByIdForUpdate) {
        const locked = await txAdapter.findByIdForUpdate(id);
        if (!locked) {
          throw new IdentityQueueNotFoundError(`Identity queue item ${id} not found.`);
        }
        if (locked.status !== 'pending') {
          throw new IdentityQueueConflictError(
            `Identity queue item ${id} is already resolved (${locked.status}).`
          );
        }
      }

      const updated = await txAdapter.update(id, {
        status: 'linked',
        reviewedBy: adminUserId,
        reviewedAt: now,
      });

      await txAdapter.recordAuditLog({
        userId: adminUserId,
        action: 'identity_queue.resolve_link',
        resourceType: 'identity_queue',
        resourceId: id,
        details: {
          externalAccountId: updated.externalAccountId,
          source: updated.source,
          accountId,
          personId: personEntityId,
          linkId: createdLink.id,
        },
      });

      return updated;
    });
  }

  /**
   * Bulk confirms active suggested links into confirmed admin_links in one transaction.
   */
  public async confirmSuggestions(linkIds: string[], adminUserId: string): Promise<IdentityLink[]> {
    if (linkIds.length === 0) {
      throw new IdentityQueueError(400, 'At least one linkId is required.');
    }

    const seenIds = new Set<string>();
    for (const id of linkIds) {
      if (seenIds.has(id)) {
        throw new IdentityQueueConflictError(`Duplicate linkId "${id}" in confirmation batch.`);
      }
      seenIds.add(id);
    }

    return this.runLinkTransaction(async (txRepo) => {
      const txAdapter = this.adapterFor(txRepo);
      const foundLinks = await txRepo.findByIds(linkIds);
      const byId = new Map(foundLinks.map((l) => [l.id, l]));

      const missingIds = linkIds.filter((id) => !byId.has(id));
      if (missingIds.length > 0) {
        throw new IdentityQueueNotFoundError(`Suggested link(s) not found: ${missingIds.join(', ')}`);
      }

      const requestedLinks = linkIds.map((id) => byId.get(id)!);
      const seenAccounts = new Set<string>();
      for (const link of requestedLinks) {
        if (link.validTo !== null) {
          throw new IdentityQueueConflictError(`Suggested link ${link.id} is already closed.`);
        }
        if (link.method !== 'suggested') {
          throw new IdentityQueueConflictError(
            `Link ${link.id} cannot be confirmed because its method is "${link.method}" (expected "suggested").`
          );
        }
        if (seenAccounts.has(link.accountId)) {
          throw new IdentityQueueConflictError(
            `Multiple suggestions for account ${link.accountId} cannot be confirmed in the same batch.`
          );
        }
        seenAccounts.add(link.accountId);
      }

      const accountIds = Array.from(seenAccounts).sort();
      const existingActive = await txRepo.findActiveByAccounts(accountIds);
      const conflictingAdmin = existingActive.find((l) => l.method === 'admin_link');
      if (conflictingAdmin) {
        throw new IdentityQueueConflictError(
          `Account ${conflictingAdmin.accountId} already has an active admin link.`
        );
      }

      await txRepo.closeActiveByAccounts(accountIds, ['suggested', 'exact_email']);

      const sortedLinks = [...requestedLinks].sort((a, b) =>
        a.accountId < b.accountId ? -1 : a.accountId > b.accountId ? 1 : 0
      );
      const createdLinksSorted = await txRepo.createMany(
        sortedLinks.map((sug) => ({
          accountId: sug.accountId,
          personId: sug.personId,
          grade: 'confirmed',
          method: 'admin_link',
          linkedBy: adminUserId,
          note: sug.note ? `Confirmed suggestion: ${sug.note}` : `Confirmed suggestion (${sug.id})`,
        }))
      );
      const createdByAccount = new Map(createdLinksSorted.map((l) => [l.accountId, l]));
      const createdLinks = requestedLinks.map((sug) => createdByAccount.get(sug.accountId)!);

      const now = new Date();
      if (txAdapter.markLinkedByAccounts) {
        await txAdapter.markLinkedByAccounts(accountIds, adminUserId, now);
      } else {
        const pending = await txAdapter.list({ status: 'pending' });
        for (const item of pending) {
          const canonical = toCanonicalAccountId(item.source, item.externalAccountId);
          if (seenAccounts.has(item.externalAccountId) || seenAccounts.has(canonical)) {
            await txAdapter.update(item.id, {
              status: 'linked',
              reviewedBy: adminUserId,
              reviewedAt: now,
            });
          }
        }
      }

      await txAdapter.recordAuditLog({
        userId: adminUserId,
        action: 'identity_queue.confirm_suggestions',
        resourceType: 'identity_link',
        resourceId: createdLinks.map((l) => l.id).join(','),
        details: {
          confirmedCount: createdLinks.length,
          confirmedSuggestionIds: linkIds,
          createdLinkIds: createdLinks.map((l) => l.id),
          accountIds,
        },
      });

      return createdLinks;
    });
  }

  private async resolveNonLink(
    id: string,
    status: 'service_account' | 'departed' | 'ignored',
    auditAction: string,
    adminUserId: string,
    notes?: string
  ): Promise<IdentityQueueItem> {
    return this.runLinkTransaction(async (txRepo) => {
      const txAdapter = this.adapterFor(txRepo);
      const item = await txAdapter.findById(id);
      if (!item) {
        throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
      }
      if (item.status !== 'pending') {
        throw new IdentityQueueConflictError(
          `Identity queue item ${id} is already resolved (${item.status}).`
        );
      }

      const accountId = toCanonicalAccountId(item.source, item.externalAccountId);
      await txRepo.closeActiveByAccount(accountId, ['suggested']);

      if (txAdapter.findByIdForUpdate) {
        const locked = await txAdapter.findByIdForUpdate(id);
        if (!locked) {
          throw new IdentityQueueNotFoundError(`Queue item with ID ${id} not found.`);
        }
        if (locked.status !== 'pending') {
          throw new IdentityQueueConflictError(
            `Identity queue item ${id} is already resolved (${locked.status}).`
          );
        }
      }

      const updated = await txAdapter.update(id, {
        status,
        notes: notes || null,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      });

      await txAdapter.recordAuditLog({
        userId: adminUserId,
        action: auditAction,
        resourceType: 'identity_queue',
        resourceId: id,
        details: {
          externalAccountId: updated.externalAccountId,
          source: updated.source,
          accountId,
          notes,
        },
      });

      return updated;
    });
  }

  /**
   * Action 'mark_service_account': Classifies account as programmatic service account.
   */
  public async resolveMarkServiceAccount(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    return this.resolveNonLink(
      id,
      'service_account',
      'identity_queue.mark_service_account',
      adminUserId,
      notes
    );
  }

  /**
   * Action 'mark_departed': Confirms account belonged to a departed employee.
   */
  public async resolveMarkDeparted(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    return this.resolveNonLink(
      id,
      'departed',
      'identity_queue.mark_departed',
      adminUserId,
      notes
    );
  }

  /**
   * Action 'ignore': Ignores unneeded candidate account.
   */
  public async resolveIgnore(id: string, adminUserId: string, notes?: string): Promise<IdentityQueueItem> {
    return this.resolveNonLink(
      id,
      'ignored',
      'identity_queue.ignore',
      adminUserId,
      notes
    );
  }
}
