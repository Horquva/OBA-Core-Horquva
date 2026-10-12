// =============================================================================
// Horquva Continuity Platform — SCD2 Fact Store Engine
// =============================================================================
// Authoritative Fact Store implementing Slowly Changing Dimension Type 2 (SCD2).
// Enforces evidence state hierarchy (DATA-02, DATA-04), explicit unknown semantics
// (DATA-03), temporal audit history (DATA-05), and source drift detection.
// =============================================================================

import crypto from 'node:crypto';
import {
  CanonicalFact,
  FactAttribute,
  EvidenceGrade,
} from '@horquva/types';
import { query, withTransaction } from '../../db/client.js';

export interface FactInput {
  entityId: string;
  attribute: FactAttribute;
  value: any;
  grade: EvidenceGrade;
  source: string;
  sourceRef?: string;
  attestedBy?: string | null;
  validFrom?: Date;
}

export type FactStoreAction = 'created' | 'versioned' | 'retained' | 'drift_detected';

export interface FactStoreResult {
  fact: CanonicalFact;
  action: FactStoreAction;
  priorFact?: CanonicalFact;
}

export interface FactStoreAdapter {
  getActiveFact(entityId: string, attribute: FactAttribute): Promise<CanonicalFact | null>;
  getActiveFactsForEntity(entityId: string): Promise<CanonicalFact[]>;
  getFactHistory(entityId: string, attribute: FactAttribute): Promise<CanonicalFact[]>;
  expireFact(factId: string, validTo: Date): Promise<void>;
  createFact(fact: CanonicalFact): Promise<CanonicalFact>;
}

/**
 * Grade precedence weight table:
 * confirmed (3) > stated (2) >= inferred (1) > unknown (0)
 */
export const GRADE_PRECEDENCE: Record<EvidenceGrade, number> = {
  confirmed: 3,
  stated: 2,
  inferred: 1,
  unknown: 0,
};

/**
 * In-Memory Fact Store Adapter for hermetic unit testing and standalone execution.
 */
export class InMemoryFactStoreAdapter implements FactStoreAdapter {
  private facts: CanonicalFact[] = [];

  public async getActiveFact(entityId: string, attribute: FactAttribute): Promise<CanonicalFact | null> {
    const found = this.facts.find(
      (f) => f.entityId === entityId && f.attribute === attribute && (!f.validTo || f.validTo === null)
    );
    return found ? { ...found } : null;
  }

  public async getActiveFactsForEntity(entityId: string): Promise<CanonicalFact[]> {
    return this.facts
      .filter((f) => f.entityId === entityId && (!f.validTo || f.validTo === null))
      .map((f) => ({ ...f }));
  }

  public async getFactHistory(entityId: string, attribute: FactAttribute): Promise<CanonicalFact[]> {
    return this.facts
      .filter((f) => f.entityId === entityId && f.attribute === attribute)
      .sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())
      .map((f) => ({ ...f }));
  }

  public async expireFact(factId: string, validTo: Date): Promise<void> {
    const target = this.facts.find((f) => f.id === factId);
    if (target) {
      target.validTo = validTo;
    }
  }

  public async createFact(fact: CanonicalFact): Promise<CanonicalFact> {
    const stored: CanonicalFact = {
      ...fact,
      id: fact.id || crypto.randomUUID(),
    };
    this.facts.push(stored);
    return { ...stored };
  }
}

/**
 * PostgreSQL Fact Store Adapter using greenfield 001_initial_schema.sql fact table.
 */
export class PostgresFactStoreAdapter implements FactStoreAdapter {
  public async getActiveFact(entityId: string, attribute: FactAttribute): Promise<CanonicalFact | null> {
    const res = await query(
      `
      SELECT id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to
      FROM fact
      WHERE entity_id = $1 AND attribute = $2 AND valid_to IS NULL
      LIMIT 1;
      `,
      [entityId, attribute]
    );

    if (res.rows.length === 0) return null;
    return this.rowToFact(res.rows[0]);
  }

  public async getActiveFactsForEntity(entityId: string): Promise<CanonicalFact[]> {
    const res = await query(
      `
      SELECT id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to
      FROM fact
      WHERE entity_id = $1 AND valid_to IS NULL;
      `,
      [entityId]
    );

    return res.rows.map((r) => this.rowToFact(r));
  }

  public async getFactHistory(entityId: string, attribute: FactAttribute): Promise<CanonicalFact[]> {
    const res = await query(
      `
      SELECT id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to
      FROM fact
      WHERE entity_id = $1 AND attribute = $2
      ORDER BY valid_from ASC;
      `,
      [entityId, attribute]
    );

    return res.rows.map((r) => this.rowToFact(r));
  }

  public async expireFact(factId: string, validTo: Date): Promise<void> {
    await query(
      `
      UPDATE fact
      SET valid_to = $1
      WHERE id = $2;
      `,
      [validTo, factId]
    );
  }

  public async createFact(fact: CanonicalFact): Promise<CanonicalFact> {
    const res = await query(
      `
      INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to;
      `,
      [
        fact.entityId,
        fact.attribute,
        JSON.stringify(fact.value),
        fact.grade,
        fact.source,
        fact.sourceRef || null,
        fact.attestedBy || null,
        fact.validFrom,
        fact.validTo || null,
      ]
    );

    return this.rowToFact(res.rows[0]);
  }

  private rowToFact(row: any): CanonicalFact {
    return {
      id: row.id,
      entityId: row.entity_id,
      attribute: row.attribute as FactAttribute,
      value: row.value, // pg already decodes JSONB; a string value is the value itself, not JSON text
      grade: row.grade as EvidenceGrade,
      source: row.source,
      sourceRef: row.source_ref || undefined,
      attestedBy: row.attested_by || null,
      validFrom: new Date(row.valid_from),
      validTo: row.valid_to ? new Date(row.valid_to) : null,
    };
  }
}

/**
 * SCD2 FactStore Service
 */
export class FactStore {
  private adapter: FactStoreAdapter;
  private driftFlags = new Set<string>();

  constructor(adapter?: FactStoreAdapter) {
    this.adapter = adapter || new PostgresFactStoreAdapter();
  }

  /**
   * Retrieves the currently active fact for an entity attribute (valid_to IS NULL).
   */
  public async getActiveFact(entityId: string, attribute: FactAttribute): Promise<CanonicalFact | null> {
    return this.adapter.getActiveFact(entityId, attribute);
  }

  /**
   * Retrieves all currently active facts for an entity, mapped by attribute.
   */
  public async getActiveFactsForEntity(entityId: string): Promise<Map<FactAttribute, CanonicalFact>> {
    const list = await this.adapter.getActiveFactsForEntity(entityId);
    const map = new Map<FactAttribute, CanonicalFact>();
    for (const f of list) {
      map.set(f.attribute, f);
    }
    return map;
  }

  /**
   * Retrieves the complete temporal version history of a fact.
   */
  public async getFactHistory(entityId: string, attribute: FactAttribute): Promise<CanonicalFact[]> {
    return this.adapter.getFactHistory(entityId, attribute);
  }

  /**
   * Inserts an incoming fact applying SCD2 temporal versioning and grade precedence rules.
   */
  public async insertFact(input: FactInput): Promise<FactStoreResult> {
    const activeFact = await this.adapter.getActiveFact(input.entityId, input.attribute);
    const validFrom = input.validFrom || new Date();

    // 1. Initial creation if no active fact exists
    if (!activeFact) {
      const newFact: CanonicalFact = {
        entityId: input.entityId,
        attribute: input.attribute,
        value: input.value,
        grade: input.grade,
        source: input.source,
        sourceRef: input.sourceRef,
        attestedBy: input.attestedBy || null,
        validFrom,
        validTo: null,
      };
      const created = await this.adapter.createFact(newFact);
      return { fact: created, action: 'created' };
    }

    // 2. Check for identical value and grade (Idempotence)
    if (this.areValuesEqual(activeFact.value, input.value) && activeFact.grade === input.grade) {
      return { fact: activeFact, action: 'retained' };
    }

    const activePrecedence = GRADE_PRECEDENCE[activeFact.grade];
    const incomingPrecedence = GRADE_PRECEDENCE[input.grade];

    // 3. Source Drift Detection (DATA-04):
    // If active fact is 'confirmed' and incoming fact has lower grade and conflicting value:
    if (activeFact.grade === 'confirmed' && incomingPrecedence < activePrecedence) {
      const driftKey = `${input.entityId}:${input.attribute}`;
      this.driftFlags.add(driftKey);
      return {
        fact: activeFact,
        action: 'drift_detected',
        priorFact: activeFact,
      };
    }

    // 4. Temporal SCD2 versioning:
    // If incoming fact has equal or higher precedence (or replaces active fact of lower grade)
    if (activeFact.id) {
      await this.adapter.expireFact(activeFact.id, validFrom);
    }

    const newFact: CanonicalFact = {
      entityId: input.entityId,
      attribute: input.attribute,
      value: input.value,
      grade: input.grade,
      source: input.source,
      sourceRef: input.sourceRef,
      attestedBy: input.attestedBy || null,
      validFrom,
      validTo: null,
    };

    const created = await this.adapter.createFact(newFact);
    return { fact: created, action: 'versioned', priorFact: activeFact };
  }

  /**
   * Batch inserts an array of facts.
   */
  public async insertBatch(inputs: FactInput[]): Promise<FactStoreResult[]> {
    const results: FactStoreResult[] = [];
    for (const input of inputs) {
      results.push(await this.insertFact(input));
    }
    return results;
  }

  /**
   * Checks whether source drift has been detected for an entity's attribute.
   */
  public hasSourceDrift(entityId: string, attribute: FactAttribute): boolean {
    return this.driftFlags.has(`${entityId}:${attribute}`);
  }

  /**
   * Clears source drift flag once human re-attestation has completed.
   */
  public clearSourceDrift(entityId: string, attribute: FactAttribute): void {
    this.driftFlags.delete(`${entityId}:${attribute}`);
  }

  /**
   * DATA-03 Helper: Strictly checks if a fact is known.
   * Returns false if fact is undefined, null, or has grade/value 'unknown'.
   */
  public static isKnown(fact?: CanonicalFact | null): boolean {
    if (!fact) return false;
    if (fact.grade === 'unknown') return false;
    if (fact.value === 'unknown') return false;
    if (typeof fact.value === 'object' && fact.value !== null && fact.value.status === 'unknown') return false;
    return true;
  }

  /**
   * DATA-03 Helper: Strictly checks if a fact represents a known boolean TRUE.
   * Never evaluates unknown to true.
   */
  public static isTrue(fact?: CanonicalFact | null): boolean {
    if (!this.isKnown(fact)) return false;
    return fact?.value === true;
  }

  /**
   * DATA-03 Helper: Strictly checks if a fact represents an explicit FALSE.
   * Never treats unknown as false.
   */
  public static isExplicitFalse(fact?: CanonicalFact | null): boolean {
    if (!this.isKnown(fact)) return false;
    return fact?.value === false;
  }

  private areValuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
