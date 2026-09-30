// =============================================================================
// Horquva Continuity Platform — n8n Connector (Public API v1)
// =============================================================================
// Reads workflows, nodes, credentials metadata, users, and execution history.
// Discovers automations, owners, credentials used, and third-party models invoked.
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';
import { BaseConnector } from '../sdk/base.js';
import { ConnectorCapabilities, SyncResult, RawPayloadRecord } from '../sdk/types.js';

export interface N8nConnectorConfig {
  baseUrl: string;
  apiKey: string;
}

export class N8nConnector extends BaseConnector {
  public readonly id: string;
  public readonly type = 'n8n';
  public readonly name: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(id: string, name: string, config: N8nConnectorConfig) {
    const parsed = new URL(config.baseUrl);
    super([parsed.hostname]);
    this.id = id;
    this.name = name;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  public getCapabilities(): ConnectorCapabilities {
    return {
      canDiscoverUsers: true,
      canDiscoverAutomations: true,
      canDiscoverCredentials: true,
      canDiscoverModelCalls: true,
      supportsWebhooks: false,
      pollingIntervalMinutes: 60,
    };
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-N8N-API-KEY': this.apiKey,
      'Accept': 'application/json',
    };
  }

  public async testConnection(): Promise<boolean> {
    const url = `${this.baseUrl}/api/v1/users?limit=1`;
    const res = await this.guard.get(url, { headers: this.getHeaders(), timeoutMs: 8000 });
    return res.status === 200;
  }

  public async sync(): Promise<SyncResult> {
    const entities: CanonicalEntity[] = [];
    const edges: CanonicalEdge[] = [];
    const facts: CanonicalFact[] = [];
    const rawPayloads: RawPayloadRecord[] = [];

    // 1. Fetch Users
    const usersRes = await this.guard.get(`${this.baseUrl}/api/v1/users`, {
      headers: this.getHeaders(),
    });
    const users: any[] = usersRes.data?.data || usersRes.data || [];

    const userEmailMap = new Map<string, string>(); // n8n user id -> email
    for (const u of users) {
      if (!u.email) continue;
      const personId = `person:${u.email.toLowerCase()}`;
      userEmailMap.set(u.id, personId);

      entities.push({
        id: personId,
        kind: 'person',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        externalRefs: { n8n: u.id, email: u.email },
        createdAt: new Date(u.createdAt || Date.now()),
        updatedAt: new Date(u.updatedAt || Date.now()),
      });

      rawPayloads.push({
        resourceType: 'user',
        externalId: u.id,
        payload: u,
      });
    }

    // 2. Fetch Credentials Metadata (never secret values)
    let credentials: any[] = [];
    try {
      const credRes = await this.guard.get(`${this.baseUrl}/api/v1/credentials`, {
        headers: this.getHeaders(),
      });
      credentials = credRes.data?.data || credRes.data || [];
      for (const cred of credentials) {
        const credId = `credential:n8n:${cred.id}`;
        entities.push({
          id: credId,
          kind: 'credential',
          name: cred.name || `Credential ${cred.id}`,
          description: `Type: ${cred.type}`,
          externalRefs: { n8n: cred.id, type: cred.type },
          createdAt: new Date(cred.createdAt || Date.now()),
          updatedAt: new Date(cred.updatedAt || Date.now()),
        });

        rawPayloads.push({
          resourceType: 'credential',
          externalId: cred.id,
          payload: cred,
        });
      }
    } catch (e) {
      console.warn('[N8nConnector] Could not list credentials (requires credential:read scope):', e);
    }

    // 3. Fetch Workflows
    const workflowsRes = await this.guard.get(`${this.baseUrl}/api/v1/workflows`, {
      headers: this.getHeaders(),
    });
    const workflows: any[] = workflowsRes.data?.data || workflowsRes.data || [];

    for (const wfSummary of workflows) {
      // Detailed workflow fetch for node graph
      let wf: any;
      try {
        const wfDetail = await this.guard.get(`${this.baseUrl}/api/v1/workflows/${wfSummary.id}`, {
          headers: this.getHeaders(),
        });
        wf = wfDetail.data;
      } catch (err) {
        wf = wfSummary;
      }

      const workflowEntityId = `automation:n8n:${wf.id}`;
      entities.push({
        id: workflowEntityId,
        kind: 'automation',
        name: wf.name || `Workflow ${wf.id}`,
        description: `n8n Active: ${wf.active}`,
        externalRefs: { n8n: wf.id },
        createdAt: new Date(wf.createdAt || Date.now()),
        updatedAt: new Date(wf.updatedAt || Date.now()),
      });

      rawPayloads.push({
        resourceType: 'workflow',
        externalId: wf.id,
        payload: wf,
      });

      // Status Fact
      facts.push({
        entityId: workflowEntityId,
        attribute: 'status',
        value: wf.active ? 'active' : 'inactive',
        grade: 'stated',
        source: 'connector:n8n',
        sourceRef: `workflow:${wf.id}`,
        validFrom: new Date(),
      });

      // Default initial facts for Attestation Review
      facts.push({
        entityId: workflowEntityId,
        attribute: 'criticality',
        value: 'unknown',
        grade: 'unknown',
        source: 'connector:n8n',
        validFrom: new Date(),
      });
      facts.push({
        entityId: workflowEntityId,
        attribute: 'documented',
        value: false,
        grade: 'unknown',
        source: 'connector:n8n',
        validFrom: new Date(),
      });
      facts.push({
        entityId: workflowEntityId,
        attribute: 'fallback_exists',
        value: false,
        grade: 'unknown',
        source: 'connector:n8n',
        validFrom: new Date(),
      });

      // Ownership Edge (n8n workflow creator/owner)
      const creatorPersonId = wf.ownedBy?.email
        ? `person:${wf.ownedBy.email.toLowerCase()}`
        : userEmailMap.get(wf.userId);

      if (creatorPersonId) {
        edges.push({
          fromId: creatorPersonId,
          toId: workflowEntityId,
          type: 'owns',
          grade: 'stated',
          source: 'connector:n8n',
          sourceRef: `workflow:${wf.id}`,
          validFrom: new Date(),
        });
      }

      // Analyze Nodes for Credential Dependencies & Model Calls
      const nodes: any[] = wf.nodes || [];
      for (const node of nodes) {
        // Check for node credentials
        if (node.credentials) {
          for (const [credType, credRef] of Object.entries(node.credentials)) {
            const credObj = credRef as { id?: string; name?: string };
            if (credObj?.id) {
              const credEntityId = `credential:n8n:${credObj.id}`;
              edges.push({
                fromId: workflowEntityId,
                toId: credEntityId,
                type: 'runs_on_credentials_of',
                grade: 'stated',
                source: 'connector:n8n',
                sourceRef: `workflow:${wf.id}/node:${node.id || node.name}`,
                validFrom: new Date(),
              });
            }
          }
        }

        // Check for AI / LLM Model Nodes
        const nodeType = String(node.type || '').toLowerCase();
        if (
          nodeType.includes('openai') ||
          nodeType.includes('anthropic') ||
          nodeType.includes('langchain') ||
          nodeType.includes('google')
        ) {
          let modelName = node.parameters?.model || node.parameters?.modelName || 'unknown-model';
          let vendor = 'unknown';
          if (nodeType.includes('openai')) vendor = 'openai';
          else if (nodeType.includes('anthropic')) vendor = 'anthropic';
          else if (nodeType.includes('google')) vendor = 'google';

          const modelEntityId = `model:${vendor}:${modelName}`;
          entities.push({
            id: modelEntityId,
            kind: 'model',
            name: `${vendor.toUpperCase()} ${modelName}`,
            externalRefs: { vendor, model: modelName },
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          edges.push({
            fromId: workflowEntityId,
            toId: modelEntityId,
            type: 'calls_model',
            grade: 'stated',
            source: 'connector:n8n',
            sourceRef: `workflow:${wf.id}/node:${node.id || node.name}`,
            validFrom: new Date(),
          });
        }
      }
    }

    // Deduplicate entities by ID
    const uniqueEntities = Array.from(new Map(entities.map((e) => [e.id, e])).values());

    return {
      entities: uniqueEntities,
      edges,
      facts,
      rawPayloads,
      stats: {
        fetched: workflows.length + users.length + credentials.length,
        entitiesCreated: uniqueEntities.length,
        edgesCreated: edges.length,
        factsCreated: facts.length,
        errors: 0,
      },
    };
  }
}
