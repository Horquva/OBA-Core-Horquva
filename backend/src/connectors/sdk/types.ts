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
  errors: number;
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
