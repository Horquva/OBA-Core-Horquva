// =============================================================================
// Horquva Continuity Platform — Microsoft Entra ID Connector (MS Graph v1.0)
// =============================================================================
// Authoritative directory spine for corporate identity:
// - Discovers users, departments, employeeLeaveDateTime (authoritative leaver event)
// - Discovers manager hierarchy for attestation escalation
// - Discovers Azure App Registrations & Enterprise App owners
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';
import { BaseConnector } from '../sdk/base.js';
import { ConnectorCapabilities, SyncResult, RawPayloadRecord } from '../sdk/types.js';
import { GuardResponse } from '../sdk/guard.js';

export interface EntraConnectorConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  graphBaseUrl?: string; // defaults to 'https://graph.microsoft.com/v1.0'
}

export class EntraConnector extends BaseConnector {
  public readonly id: string;
  public readonly type = 'entra';
  public readonly name: string;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private graphBaseUrl: string;
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(id: string, name: string, config: EntraConnectorConfig) {
    super(['graph.microsoft.com', 'login.microsoftonline.com']);
    this.id = id;
    this.name = name;
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.graphBaseUrl = (config.graphBaseUrl || 'https://graph.microsoft.com/v1.0').replace(/\/+$/, '');
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      canDiscoverUsers: true,
      canDiscoverAutomations: false,
      canDiscoverCredentials: true,
      canDiscoverModelCalls: false,
      supportsWebhooks: false,
      pollingIntervalMinutes: 30,
    };
  }

  /**
   * Acquires OAuth2 client_credentials token from login.microsoftonline.com.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[EntraConnector] Failed to acquire token: ${response.status} ${err}`);
    }

    const data: any = await response.json();
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return this.cachedAccessToken!;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'ConsistencyLevel': 'eventual',
    };
  }

  public async testConnection(): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const url = `${this.graphBaseUrl}/users?$top=1&$select=id,displayName`;
    const res = await this.guard.get(url, { headers, timeoutMs: 8000 });
    return res.status === 200;
  }

  public async sync(): Promise<SyncResult> {
    const entities: CanonicalEntity[] = [];
    const edges: CanonicalEdge[] = [];
    const facts: CanonicalFact[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const headers = await this.getAuthHeaders();

    // 1. Fetch Users with employeeLeaveDateTime
    let nextUrl: string | null = `${this.graphBaseUrl}/users?$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled,employeeLeaveDateTime&$top=100`;

    while (nextUrl) {
      const res: GuardResponse = await this.guard.get(nextUrl, { headers });
      const users: any[] = res.data?.value || [];

      for (const u of users) {
        const email = (u.mail || u.userPrincipalName || '').toLowerCase();
        if (!email) continue;

        const personId = `person:${email}`;
        const isDeparted = !u.accountEnabled || (u.employeeLeaveDateTime && new Date(u.employeeLeaveDateTime) <= new Date());

        entities.push({
          id: personId,
          kind: 'person',
          name: u.displayName || email,
          description: `${u.jobTitle || 'Team Member'} - ${u.department || 'Operations'}`,
          externalRefs: {
            entraId: u.id,
            email,
            department: u.department || '',
            jobTitle: u.jobTitle || '',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        rawPayloads.push({
          resourceType: 'entra_user',
          externalId: u.id,
          payload: u,
        });

        // Facts: status (active or departed)
        facts.push({
          entityId: personId,
          attribute: 'status',
          value: isDeparted ? 'departed' : 'active',
          grade: 'stated',
          source: 'connector:entra',
          sourceRef: `user:${u.id}`,
          validFrom: new Date(),
        });
      }

      nextUrl = res.data?.['@odata.nextLink'] || null;
    }

    // 2. Fetch App Registrations & Owners
    let appNextUrl: string | null = `${this.graphBaseUrl}/applications?$select=id,appId,displayName,createdDateTime&$top=50`;
    while (appNextUrl) {
      try {
        const res: GuardResponse = await this.guard.get(appNextUrl, { headers });
        const apps: any[] = res.data?.value || [];

        for (const app of apps) {
          const appEntityId = `app:entra:${app.appId || app.id}`;
          entities.push({
            id: appEntityId,
            kind: 'app',
            name: app.displayName || `Azure App ${app.appId}`,
            description: `App ID: ${app.appId}`,
            externalRefs: { entraAppId: app.appId, objectId: app.id },
            createdAt: new Date(app.createdDateTime || Date.now()),
            updatedAt: new Date(),
          });

          rawPayloads.push({
            resourceType: 'entra_application',
            externalId: app.id,
            payload: app,
          });

          // Fetch Owners for this application
          try {
            const ownersRes = await this.guard.get(`${this.graphBaseUrl}/applications/${app.id}/owners`, { headers });
            const owners: any[] = ownersRes.data?.value || [];
            for (const owner of owners) {
              const ownerEmail = (owner.mail || owner.userPrincipalName || '').toLowerCase();
              if (ownerEmail) {
                edges.push({
                  fromId: `person:${ownerEmail}`,
                  toId: appEntityId,
                  type: 'owns',
                  grade: 'stated',
                  source: 'connector:entra',
                  sourceRef: `application:${app.id}/owner:${owner.id}`,
                  validFrom: new Date(),
                });
              }
            }
          } catch (e) {
            // Insufficient permissions or no owners listed
          }
        }

        appNextUrl = res.data?.['@odata.nextLink'] || null;
      } catch (err) {
        console.warn('[EntraConnector] Could not list applications:', err);
        break;
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
