// =============================================================================
// Horquva Continuity Platform — n8n Connector (Public API v1)
// =============================================================================
// Reads workflows, nodes, credentials metadata, users, and execution history.
// Discovers automations, owners, credentials used, and third-party models invoked.
// =============================================================================

import { CanonicalEntity, CanonicalEdge, CanonicalFact } from '@horquva/types';
import { BaseConnector } from '../sdk/base.js';
import { ConnectorCapabilities, SyncResult, RawPayloadRecord } from '../sdk/types.js';

/** n8n's documented maximum page size for list endpoints. */
const PAGE_LIMIT = 250;

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

  /**
   * Failed executions of one workflow started at or after `since` (HND-06 post-departure watch).
   * Read-only: GET /api/v1/executions, newest first.
   */
  public async fetchFailedExecutions(
    workflowId: string,
    since: string
  ): Promise<Array<{ id: string; workflowId: string; startedAt: string; stoppedAt?: string; errorMessage: string | null }>> {
    const params = new URLSearchParams({ workflowId, status: 'error', includeData: 'true', limit: '100' });
    const res = await this.guard.get(`${this.baseUrl}/api/v1/executions?${params}`, { headers: this.getHeaders() });
    const rows: any[] = res.data?.data || [];
    const sinceMs = new Date(since).getTime();
    return rows
      .filter((e) => new Date(e.startedAt).getTime() >= sinceMs)
      .map((e) => ({
        id: String(e.id),
        workflowId: String(e.workflowId ?? workflowId),
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt ?? undefined,
        errorMessage: e.data?.resultData?.error?.message ?? null,
      }));
  }

  /** Every item of a list endpoint, following nextCursor (n8n pages at 100 by default, 250 max). */
  private async listAll(pathname: string, params: Record<string, string> = {}): Promise<any[]> {
    const items: any[] = [];
    let cursor: string | null = null;
    do {
      const qs = new URLSearchParams({ ...params, limit: String(PAGE_LIMIT) });
      if (cursor) qs.set('cursor', cursor);
      const res = await this.guard.get(`${this.baseUrl}${pathname}?${qs}`, { headers: this.getHeaders() });
      const body = res.data;
      items.push(...(Array.isArray(body) ? body : body?.data ?? []));
      cursor = Array.isArray(body) ? null : body?.nextCursor ?? null;
    } while (cursor);
    return items;
  }

  /**
   * The one person behind a project, or null when it has several members (a
   * team project) or none we know. n8n's public API owns workflows and
   * credentials by project, not by user; GET /users?projectId= is not
   * licence-gated, unlike the /projects endpoints.
   */
  private async projectPerson(projectId: string, cache: Map<string, Promise<string | null>>): Promise<string | null> {
    if (!cache.has(projectId)) {
      cache.set(
        projectId,
        this.listAll('/api/v1/users', { projectId }).then((members) =>
          members.length === 1 && members[0].email ? `person:${String(members[0].email).toLowerCase()}` : null
        )
      );
    }
    return cache.get(projectId)!;
  }

  public async sync(): Promise<SyncResult> {
    const entities: CanonicalEntity[] = [];
    const edges: CanonicalEdge[] = [];
    const facts: CanonicalFact[] = [];
    const rawPayloads: RawPayloadRecord[] = [];
    const projectPeople = new Map<string, Promise<string | null>>();

    // 1. Fetch Users
    const users = await this.listAll('/api/v1/users');

    for (const u of users) {
      if (!u.email) continue;
      const personId = `person:${u.email.toLowerCase()}`;

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
    const credentialPerson = new Map<string, string>(); // n8n credential id -> person whose personal credential it is
    try {
      credentials = await this.listAll('/api/v1/credentials');
      for (const cred of credentials) {
        const credId = `credential:n8n:${cred.id}`;
        // shared[].id is the project id; the owner role is credential:owner.
        const ownerProject = (cred.shared ?? []).find((s: any) => s.role === 'credential:owner')?.id;
        const person = ownerProject ? await this.projectPerson(ownerProject, projectPeople) : null;
        if (person) credentialPerson.set(String(cred.id), person);
        entities.push({
          id: credId,
          kind: 'credential',
          name: cred.name || `Credential ${cred.id}`,
          description: `Type: ${cred.type}`,
          externalRefs: { n8n: cred.id, type: cred.type, ...(ownerProject ? { n8nProject: ownerProject } : {}) },
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

    // 3. Fetch Workflows (the list already carries nodes and shared[])
    const workflows = await this.listAll('/api/v1/workflows', { excludePinnedData: 'true' });

    for (const wfSummary of workflows) {
      let wf: any = wfSummary;
      if (!Array.isArray(wf.nodes)) {
        try {
          wf = (await this.guard.get(`${this.baseUrl}/api/v1/workflows/${wfSummary.id}`, { headers: this.getHeaders() })).data;
        } catch {
          wf = wfSummary;
        }
      }

      // activeVersionId replaces the deprecated `active` flag; archived workflows never run.
      const active = !wf.isArchived && ('activeVersionId' in wf ? wf.activeVersionId != null : Boolean(wf.active));
      const ownerProject: string | undefined = (wf.shared ?? []).find((s: any) => s.role === 'workflow:owner')?.projectId;

      const workflowEntityId = `automation:n8n:${wf.id}`;
      entities.push({
        id: workflowEntityId,
        kind: 'automation',
        name: wf.name || `Workflow ${wf.id}`,
        description: `n8n Active: ${active}`,
        externalRefs: { n8n: wf.id, ...(ownerProject ? { n8nProject: ownerProject } : {}) },
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
        value: active ? 'active' : 'inactive',
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

      // Ownership Edge: the workflow:owner project, when one person stands behind it.
      // A team project gets no edge: its owner is unknown until someone confirms it.
      const ownerPersonId = ownerProject ? await this.projectPerson(ownerProject, projectPeople) : null;

      if (ownerPersonId) {
        edges.push({
          fromId: ownerPersonId,
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
      const seenEdges = new Set<string>(); // one edge per workflow and target, however many nodes share it
      for (const node of nodes) {
        // Check for node credentials: the workflow depends on the credential, and
        // runs on the credentials of whoever owns it personally.
        if (node.credentials) {
          for (const credRef of Object.values(node.credentials)) {
            const credObj = credRef as { id?: string; name?: string };
            if (!credObj?.id) continue;
            const sourceRef = `workflow:${wf.id}/node:${node.id || node.name}`;
            const credEntityId = `credential:n8n:${credObj.id}`;
            if (!seenEdges.has(`d|${credEntityId}`)) {
              seenEdges.add(`d|${credEntityId}`);
              edges.push({ fromId: workflowEntityId, toId: credEntityId, type: 'depends_on', grade: 'stated', source: 'connector:n8n', sourceRef, validFrom: new Date() });
            }
            const credOwner = credentialPerson.get(String(credObj.id));
            if (credOwner && !seenEdges.has(`c|${credOwner}`)) {
              seenEdges.add(`c|${credOwner}`);
              edges.push({ fromId: workflowEntityId, toId: credOwner, type: 'runs_on_credentials_of', grade: 'stated', source: 'connector:n8n', sourceRef, validFrom: new Date() });
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
