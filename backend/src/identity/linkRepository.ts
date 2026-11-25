// =============================================================================
// Horquva Continuity Platform — Identity Link Repository
// =============================================================================
// Manages temporal, evidence-graded account-to-person links backed by
// PostgreSQL (`identity_link` table from Migration 009) or an in-memory store
// enforcing identical uniqueness and grade constraints for unit & API tests.
// =============================================================================

import crypto from 'node:crypto';
import type { EvidenceGrade, IdentityLink, LinkMethod } from '@horquva/types';
import { query as defaultQuery, withTransaction } from '../db/client.js';
import type { Query } from '../repositories/graphRepository.js';

export type CreateLinkInput = Omit<IdentityLink, 'id' | 'validFrom' | 'validTo'>;

export interface LinkRepository {
  listActive(): Promise<IdentityLink[]>;
  listActiveSuggestions(): Promise<IdentityLink[]>;
  listAllOpen(): Promise<IdentityLink[]>;
  findByIds(ids: string[]): Promise<IdentityLink[]>;
  create(link: CreateLinkInput): Promise<IdentityLink>;
  close(id: string): Promise<void>;
  closeActiveByAccount(accountId: string, methods?: LinkMethod[]): Promise<number>;
  runInTransaction<T>(fn: (txRepo: LinkRepository) => Promise<T>): Promise<T>;
}

const VALID_GRADES = new Set<EvidenceGrade>(['stated', 'confirmed', 'inferred']);
const VALID_METHODS = new Set<LinkMethod>(['exact_email', 'admin_link', 'suggested']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_COLUMNS =
  'id, account_id, person_id, grade, method, linked_by, note, valid_from, valid_to';

const date = (v: unknown): Date => (v instanceof Date ? v : new Date(v as string));

function assertValidLinkInput(link: CreateLinkInput): void {
  if (!VALID_GRADES.has(link.grade)) {
    throw new Error(
      `Invalid identity_link grade "${link.grade}": must be one of stated, confirmed, inferred`
    );
  }
  if (!VALID_METHODS.has(link.method)) {
    throw new Error(
      `Invalid identity_link method "${link.method}": must be one of exact_email, admin_link, suggested`
    );
  }
}

function rowToIdentityLink(row: any): IdentityLink {
  return {
    id: row.id,
    accountId: row.account_id,
    personId: row.person_id,
    grade: row.grade as EvidenceGrade,
    method: row.method as LinkMethod,
    linkedBy: row.linked_by ?? null,
    note: row.note ?? null,
    validFrom: date(row.valid_from),
    validTo: row.valid_to ? date(row.valid_to) : null,
  };
}

function cloneLink(link: IdentityLink): IdentityLink {
  return {
    ...link,
    validFrom: new Date(link.validFrom.getTime()),
    validTo: link.validTo ? new Date(link.validTo.getTime()) : null,
  };
}

export class PostgresLinkRepository implements LinkRepository {
  private readonly q: Query;
  private readonly inTransaction: boolean;

  constructor(q: Query = defaultQuery, inTransaction = false) {
    this.q = q;
    this.inTransaction = inTransaction;
  }

  public async listActive(): Promise<IdentityLink[]> {
    const res = await this.q(
      `SELECT ${SELECT_COLUMNS}
         FROM identity_link
        WHERE valid_to IS NULL AND method <> 'suggested'
        ORDER BY valid_from ASC, id ASC`
    );
    return res.rows.map(rowToIdentityLink);
  }

  public async listActiveSuggestions(): Promise<IdentityLink[]> {
    const res = await this.q(
      `SELECT ${SELECT_COLUMNS}
         FROM identity_link
        WHERE valid_to IS NULL AND method = 'suggested'
        ORDER BY valid_from ASC, id ASC`
    );
    return res.rows.map(rowToIdentityLink);
  }

  public async listAllOpen(): Promise<IdentityLink[]> {
    const res = await this.q(
      `SELECT ${SELECT_COLUMNS}
         FROM identity_link
        WHERE valid_to IS NULL
        ORDER BY valid_from ASC, id ASC`
    );
    return res.rows.map(rowToIdentityLink);
  }

  public async findByIds(ids: string[]): Promise<IdentityLink[]> {
    const validIds = Array.from(new Set(ids.filter((id) => UUID_REGEX.test(id))));
    if (validIds.length === 0) {
      return [];
    }
    const res = await this.q(
      `SELECT ${SELECT_COLUMNS}
         FROM identity_link
        WHERE id = ANY($1::uuid[])`,
      [validIds]
    );
    return res.rows.map(rowToIdentityLink);
  }

  public async create(link: CreateLinkInput): Promise<IdentityLink> {
    assertValidLinkInput(link);
    const res = await this.q(
      `INSERT INTO identity_link (account_id, person_id, grade, method, linked_by, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        link.accountId,
        link.personId,
        link.grade,
        link.method,
        link.linkedBy ?? null,
        link.note ?? null,
      ]
    );
    return rowToIdentityLink(res.rows[0]);
  }

  public async close(id: string): Promise<void> {
    if (!UUID_REGEX.test(id)) {
      return;
    }
    await this.q(
      `UPDATE identity_link
          SET valid_to = NOW()
        WHERE id = $1::uuid AND valid_to IS NULL`,
      [id]
    );
  }

  public async closeActiveByAccount(
    accountId: string,
    methods?: LinkMethod[]
  ): Promise<number> {
    if (methods !== undefined) {
      if (methods.length === 0) {
        return 0;
      }
      const res = await this.q(
        `UPDATE identity_link
            SET valid_to = NOW()
          WHERE account_id = $1 AND valid_to IS NULL AND method = ANY($2::text[])`,
        [accountId, methods]
      );
      return res.rowCount ?? 0;
    }

    const res = await this.q(
      `UPDATE identity_link
          SET valid_to = NOW()
        WHERE account_id = $1 AND valid_to IS NULL`,
      [accountId]
    );
    return res.rowCount ?? 0;
  }

  public async runInTransaction<T>(fn: (txRepo: LinkRepository) => Promise<T>): Promise<T> {
    if (this.inTransaction) {
      const savepoint = `sp_link_${crypto.randomUUID().replace(/-/g, '')}`;
      await this.q(`SAVEPOINT ${savepoint}`);
      try {
        const result = await fn(this);
        await this.q(`RELEASE SAVEPOINT ${savepoint}`);
        return result;
      } catch (err) {
        await this.q(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        throw err;
      }
    }

    return withTransaction(async (client) => {
      const txRepo = new PostgresLinkRepository(client.query.bind(client) as Query, true);
      return fn(txRepo);
    });
  }
}

export class InMemoryLinkRepository implements LinkRepository {
  private rows: IdentityLink[] = [];
  private txMutex: Promise<void> = Promise.resolve();

  constructor(initialRows: IdentityLink[] = []) {
    this.rows = initialRows.map(cloneLink);
  }

  public async listActive(): Promise<IdentityLink[]> {
    return this.rows
      .filter((r) => r.validTo === null && r.method !== 'suggested')
      .map(cloneLink);
  }

  public async listActiveSuggestions(): Promise<IdentityLink[]> {
    return this.rows
      .filter((r) => r.validTo === null && r.method === 'suggested')
      .map(cloneLink);
  }

  public async listAllOpen(): Promise<IdentityLink[]> {
    return this.rows.filter((r) => r.validTo === null).map(cloneLink);
  }

  public async findByIds(ids: string[]): Promise<IdentityLink[]> {
    const idSet = new Set(ids);
    return this.rows.filter((r) => idSet.has(r.id)).map(cloneLink);
  }

  public async create(link: CreateLinkInput): Promise<IdentityLink> {
    assertValidLinkInput(link);

    if (link.method !== 'suggested') {
      const existingActive = this.rows.find(
        (r) => r.validTo === null && r.accountId === link.accountId && r.method !== 'suggested'
      );
      if (existingActive) {
        throw new Error(
          `uq_identity_link_active_account violation: active link already exists for account ${link.accountId}`
        );
      }
    } else {
      const existingSuggestion = this.rows.find(
        (r) =>
          r.validTo === null &&
          r.accountId === link.accountId &&
          r.personId === link.personId &&
          r.method === 'suggested'
      );
      if (existingSuggestion) {
        throw new Error(
          `uq_identity_link_active_suggestion_pair violation: active suggestion already exists for (${link.accountId}, ${link.personId})`
        );
      }
    }

    const created: IdentityLink = {
      id: crypto.randomUUID(),
      accountId: link.accountId,
      personId: link.personId,
      grade: link.grade,
      method: link.method,
      linkedBy: link.linkedBy ?? null,
      note: link.note ?? null,
      validFrom: new Date(),
      validTo: null,
    };
    this.rows.push(created);
    return cloneLink(created);
  }

  public async close(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id && r.validTo === null);
    if (row) {
      row.validTo = new Date();
    }
  }

  public async closeActiveByAccount(
    accountId: string,
    methods?: LinkMethod[]
  ): Promise<number> {
    if (methods !== undefined && methods.length === 0) {
      return 0;
    }
    const methodSet = methods ? new Set<LinkMethod>(methods) : null;
    const now = new Date();
    let count = 0;

    for (const row of this.rows) {
      if (row.validTo === null && row.accountId === accountId) {
        if (!methodSet || methodSet.has(row.method)) {
          row.validTo = now;
          count += 1;
        }
      }
    }
    return count;
  }

  public async runInTransaction<T>(fn: (txRepo: LinkRepository) => Promise<T>): Promise<T> {
    return this.executeWithSavepoint(fn, true);
  }

  private async executeWithSavepoint<T>(
    fn: (txRepo: LinkRepository) => Promise<T>,
    acquireLock: boolean
  ): Promise<T> {
    if (!acquireLock) {
      const snapshot = this.rows.map(cloneLink);
      try {
        return await fn(this.createTxView());
      } catch (err) {
        this.rows = snapshot;
        throw err;
      }
    }

    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.txMutex;
    this.txMutex = prev.then(() => next);
    await prev;

    const snapshot = this.rows.map(cloneLink);
    try {
      return await fn(this.createTxView());
    } catch (err) {
      this.rows = snapshot;
      throw err;
    } finally {
      release();
    }
  }

  private createTxView(): LinkRepository {
    return {
      listActive: () => this.listActive(),
      listActiveSuggestions: () => this.listActiveSuggestions(),
      listAllOpen: () => this.listAllOpen(),
      findByIds: (ids) => this.findByIds(ids),
      create: (link) => this.create(link),
      close: (id) => this.close(id),
      closeActiveByAccount: (accountId, methods) =>
        this.closeActiveByAccount(accountId, methods),
      runInTransaction: (fn) => this.executeWithSavepoint(fn, false),
    };
  }
}

export const linkRepository = new PostgresLinkRepository();
