// =============================================================================
// Horquva Continuity Platform — CSV Import Connector
// =============================================================================
// Streaming CSV parser with schema validation for people and automations catalogs.
// Enables rapid onboarding and offline/manual continuity data ingestion.
// =============================================================================

import { parse } from 'csv-parse/sync';
import { CanonicalEntity, CanonicalEdge, CanonicalFact, CriticalityLevel } from '@horquva/types';
import { BaseConnector } from '../sdk/base.js';
import { ConnectorCapabilities, SyncResult, RawPayloadRecord } from '../sdk/types.js';

export interface CsvConnectorConfig {
  peopleCsvContent?: string;
  automationsCsvContent?: string;
}

export class CsvConnector extends BaseConnector {
  public readonly id: string;
  public readonly type = 'csv';
  public readonly name: string;
  private peopleCsvContent?: string;
  private automationsCsvContent?: string;

  constructor(id: string, name: string, config: CsvConnectorConfig) {
    super([]);
    this.id = id;
    this.name = name;
    this.peopleCsvContent = config.peopleCsvContent;
    this.automationsCsvContent = config.automationsCsvContent;
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      canDiscoverUsers: true,
      canDiscoverAutomations: true,
      canDiscoverCredentials: false,
      canDiscoverModelCalls: false,
      supportsWebhooks: false,
      pollingIntervalMinutes: 0, // Manual/on-demand
    };
  }

  public async testConnection(): Promise<boolean> {
    return Boolean(this.peopleCsvContent || this.automationsCsvContent);
  }

  public async sync(): Promise<SyncResult> {
    const entities: CanonicalEntity[] = [];
    const edges: CanonicalEdge[] = [];
    const facts: CanonicalFact[] = [];
    const rawPayloads: RawPayloadRecord[] = [];

    // 1. Process People CSV if provided
    if (this.peopleCsvContent) {
      const records = parse(this.peopleCsvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<{
        email: string;
        name?: string;
        department?: string;
        job_title?: string;
        manager_email?: string;
        status?: string;
      }>;

      for (const row of records) {
        if (!row.email) continue;
        const email = row.email.toLowerCase().trim();
        const personId = `person:${email}`;

        entities.push({
          id: personId,
          kind: 'person',
          name: row.name || email,
          description: `${row.job_title || ''} (${row.department || ''})`.trim(),
          externalRefs: {
            email,
            department: row.department || '',
            jobTitle: row.job_title || '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        rawPayloads.push({
          resourceType: 'csv_person',
          externalId: email,
          payload: row,
        });

        const status = row.status?.toLowerCase() === 'departed' ? 'departed' : 'active';
        facts.push({
          entityId: personId,
          attribute: 'status',
          value: status,
          grade: 'stated',
          source: 'connector:csv',
          sourceRef: `row:${email}`,
          validFrom: new Date(),
        });

        if (row.manager_email) {
          const managerEmail = row.manager_email.toLowerCase().trim();
          edges.push({
            fromId: personId,
            toId: `person:${managerEmail}`,
            type: 'member_of',
            grade: 'stated',
            source: 'connector:csv',
            sourceRef: `row:${email}`,
            validFrom: new Date(),
          });
        }
      }
    }

    // 2. Process Automations CSV if provided
    if (this.automationsCsvContent) {
      const records = parse(this.automationsCsvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<{
        id: string;
        name: string;
        owner_email: string;
        backup_owner_email?: string;
        criticality?: string;
        is_documented?: string;
        doc_url?: string;
        fallback_exists?: string;
        weekly_runs?: string;
      }>;

      for (const row of records) {
        if (!row.id || !row.name) continue;
        const automationEntityId = `automation:csv:${row.id.trim()}`;

        entities.push({
          id: automationEntityId,
          kind: 'automation',
          name: row.name.trim(),
          description: 'Imported via CSV',
          externalRefs: { csvId: row.id.trim() },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        rawPayloads.push({
          resourceType: 'csv_automation',
          externalId: row.id.trim(),
          payload: row,
        });

        // Ownership Edge
        if (row.owner_email) {
          const ownerEmail = row.owner_email.toLowerCase().trim();
          edges.push({
            fromId: `person:${ownerEmail}`,
            toId: automationEntityId,
            type: 'owns',
            grade: 'stated',
            source: 'connector:csv',
            sourceRef: `row:${row.id}`,
            validFrom: new Date(),
          });
        }

        // Backup Edge
        if (row.backup_owner_email) {
          const backupEmail = row.backup_owner_email.toLowerCase().trim();
          edges.push({
            fromId: `person:${backupEmail}`,
            toId: automationEntityId,
            type: 'backs_up',
            grade: 'confirmed',
            source: 'connector:csv',
            sourceRef: `row:${row.id}`,
            validFrom: new Date(),
          });
        }

        // Criticality Fact
        const rawCrit = (row.criticality || 'unknown').toLowerCase();
        const crit: CriticalityLevel =
          rawCrit === 'critical' || rawCrit === 'high' || rawCrit === 'medium' || rawCrit === 'low'
            ? (rawCrit as CriticalityLevel)
            : 'unknown';

        facts.push({
          entityId: automationEntityId,
          attribute: 'criticality',
          value: crit,
          grade: crit === 'unknown' ? 'unknown' : 'confirmed',
          source: 'connector:csv',
          sourceRef: `row:${row.id}`,
          validFrom: new Date(),
        });

        // Documentation Fact
        const isDoc = row.is_documented?.toLowerCase() === 'true' || row.is_documented === '1';
        facts.push({
          entityId: automationEntityId,
          attribute: 'documented',
          value: isDoc,
          grade: isDoc ? 'confirmed' : 'unknown',
          source: 'connector:csv',
          sourceRef: row.doc_url || `row:${row.id}`,
          validFrom: new Date(),
        });

        // Fallback Fact
        const hasFallback = row.fallback_exists?.toLowerCase() === 'true' || row.fallback_exists === '1';
        facts.push({
          entityId: automationEntityId,
          attribute: 'fallback_exists',
          value: hasFallback,
          grade: hasFallback ? 'confirmed' : 'unknown',
          source: 'connector:csv',
          sourceRef: `row:${row.id}`,
          validFrom: new Date(),
        });

        // Weekly Runs Fact
        if (row.weekly_runs) {
          const runs = parseInt(row.weekly_runs, 10);
          if (!isNaN(runs)) {
            facts.push({
              entityId: automationEntityId,
              attribute: 'run_volume_weekly',
              value: runs,
              grade: 'stated',
              source: 'connector:csv',
              sourceRef: `row:${row.id}`,
              validFrom: new Date(),
            });
          }
        }
      }
    }

    const uniqueEntities = Array.from(new Map(entities.map((e) => [e.id, e])).values());

    return {
      entities: uniqueEntities,
      edges,
      facts,
      rawPayloads,
      stats: {
        fetched: rawPayloads.length,
        entitiesCreated: uniqueEntities.length,
        edgesCreated: edges.length,
        factsCreated: facts.length,
        errors: 0,
      },
    };
  }
}
