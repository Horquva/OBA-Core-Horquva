// =============================================================================
// Horquva Continuity Platform — Connector SDK Interfaces
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';

export interface RawPayloadRecord {
  resourceType: string;
  externalId: string;
  payload: Record<string, any>;
}

export interface SyncStats {
  fetched: number;
  entitiesCreated: number;
  edgesCreated: number;
  factsCreated: number;
  /** Core-module failures; > 0 means the sync is partial and closes nothing. */
  errors: number;
  /** One line per core-module failure (see sdk/issues.ts). */
  errorReasons?: string[];
  /** One line per optional enrichment that failed; its facts were omitted. */
  warnings?: string[];
}

/** What persistSync() actually changed in Postgres (stored on the sync_run). */
export interface PersistStats extends SyncStats {
  entitiesUpserted: number;
  edgesSuperseded: number;
  edgesClosed: number;
  factsVersioned: number;
  factsClosed: number;
  orphansSkipped: number;
  /** True when closing vanished rows was skipped (errors or empty result). */
  vanishedCheckSkipped: boolean;
}

export interface SyncResult {
  entities: CanonicalEntity[];
  edges: CanonicalEdge[];
  facts: CanonicalFact[];
  rawPayloads: RawPayloadRecord[];
  stats: SyncStats;
}

export interface ConnectorCapabilities {
  canDiscoverUsers: boolean;
  canDiscoverAutomations: boolean;
  canDiscoverCredentials: boolean;
  canDiscoverModelCalls: boolean;
  supportsWebhooks: boolean;
  pollingIntervalMinutes: number;
}

export interface Connector {
  readonly id: string;
  readonly type: string;
  readonly name: string;

  /**
   * Tests the connection with given configuration/credentials.
   * Returns true if connection succeeds, throws Error with description otherwise.
   */
  testConnection(): Promise<boolean>;

  /**
   * Performs an authoritative sync run, fetching upstream resources in read-only mode,
   * parsing them into canonical entities, edges, SCD2 facts, and raw landing payloads.
   */
  sync(): Promise<SyncResult>;

  /**
   * Returns metadata and capabilities of this connector.
   */
  getCapabilities(): ConnectorCapabilities;
}
