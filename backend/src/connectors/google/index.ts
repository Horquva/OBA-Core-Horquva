// =============================================================================
// Horquva Continuity Platform — Google Workspace Directory Connector
// =============================================================================
// Authoritative directory spine for Google Workspace organizations:
// - Discovers users, suspension status (leaver indicator), org units
// - Discovers manager relations for escalation pathways
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';
import { BaseConnector } from '../sdk/base.js';
import { ConnectorCapabilities, SyncResult, RawPayloadRecord } from '../sdk/types.js';
import { GuardResponse } from '../sdk/guard.js';

export interface GoogleConnectorConfig {
  adminEmail: string;
  serviceAccountKeyJson: string; // Service Account JSON with domain-wide delegation
  apiBaseUrl?: string;
}

export class GoogleWorkspaceConnector extends BaseConnector {
  public readonly id: string;
  public readonly type = 'google';
  public readonly name: string;
  private adminEmail: string;
  private serviceAccountKey: any;
  private apiBaseUrl: string;
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(id: string, name: string, config: GoogleConnectorConfig) {
    super(['admin.googleapis.com', 'oauth2.googleapis.com']);
    this.id = id;
    this.name = name;
    this.adminEmail = config.adminEmail;
    try {
      this.serviceAccountKey = typeof config.serviceAccountKeyJson === 'string'
        ? JSON.parse(config.serviceAccountKeyJson)
        : config.serviceAccountKeyJson;
    } catch (e) {
      this.serviceAccountKey = {};
    }
    this.apiBaseUrl = (config.apiBaseUrl || 'https://admin.googleapis.com/admin/directory/v1').replace(/\/+$/, '');
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      canDiscoverUsers: true,
      canDiscoverAutomations: false,
      canDiscoverCredentials: false,
      canDiscoverModelCalls: false,
      supportsWebhooks: false,
      pollingIntervalMinutes: 30,
    };
  }

  /**
   * Generates a signed JWT and exchanges for OAuth2 bearer token with subject delegation.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedAccessToken;
    }

    if (!this.serviceAccountKey.client_email || !this.serviceAccountKey.private_key) {
      // In sandbox/mock mode without private keys, provide dummy token
      return 'google-sandbox-token';
    }

    // Google JWT Bearer Grant exchange
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: this.serviceAccountKey.client_email,
      sub: this.adminEmail,
      scope: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // For Node.js without heavy external dependencies, we use standard crypto sign
    const crypto = await import('node:crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(this.serviceAccountKey.private_key, 'base64url');
    const assertion = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[GoogleWorkspaceConnector] Failed to exchange token: ${res.status} ${err}`);
    }

    const data: any = await res.json();
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    return this.cachedAccessToken!;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  }

  public async testConnection(): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const url = `${this.apiBaseUrl}/users?customer=my_customer&maxResults=1`;
    const res = await this.guard.get(url, { headers, timeoutMs: 8000 });
    return res.status === 200;
  }

  public async sync(): Promise<SyncResult> {
    const entities: CanonicalEntity[] = [];
    const edges: CanonicalEdge[] = [];
    const facts: CanonicalFact[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const headers = await this.getAuthHeaders();

    let pageToken: string | null = null;
    do {
      const queryParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const url = `${this.apiBaseUrl}/users?customer=my_customer&maxResults=100&projection=full${queryParam}`;
      const res: GuardResponse = await this.guard.get(url, { headers });
      const users: any[] = res.data?.users || [];

      for (const u of users) {
        const email = (u.primaryEmail || '').toLowerCase();
        if (!email) continue;

        const personId = `person:${email}`;
        const isDeparted = Boolean(u.suspended);

        entities.push({
          id: personId,
          kind: 'person',
          name: u.name?.fullName || email,
          description: `Google Workspace (${u.orgUnitPath || '/'})`,
          externalRefs: {
            googleId: u.id,
            primaryEmail: email,
            orgUnitPath: u.orgUnitPath || '/',
          },
          createdAt: new Date(u.creationTime || Date.now()),
          updatedAt: new Date(),
        });

        rawPayloads.push({
          resourceType: 'google_user',
          externalId: u.id,
          payload: u,
        });

        facts.push({
          entityId: personId,
          attribute: 'status',
          value: isDeparted ? 'departed' : 'active',
          grade: 'stated',
          source: 'connector:google',
          sourceRef: `user:${u.id}`,
          validFrom: new Date(),
        });

        // Manager relation if available
        if (Array.isArray(u.relations)) {
          const managerRelation = u.relations.find((r: any) => r.type === 'manager');
          if (managerRelation?.value) {
            const managerEmail = managerRelation.value.toLowerCase();
            edges.push({
              fromId: personId,
              toId: `person:${managerEmail}`,
              type: 'member_of',
              grade: 'stated',
              source: 'connector:google',
              sourceRef: `user:${u.id}/manager`,
              validFrom: new Date(),
            });
          }
        }
      }

      pageToken = res.data?.nextPageToken || null;
    } while (pageToken);

    return {
      entities,
      edges,
      facts,
      rawPayloads,
      stats: {
        fetched: rawPayloads.length,
        entitiesCreated: entities.length,
        edgesCreated: edges.length,
        factsCreated: facts.length,
        errors: 0,
      },
    };
  }
}
