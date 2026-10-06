// =============================================================================
// Horquva Continuity Platform — Central Data Service Layer
// =============================================================================
// Authoritative data service managing:
// - ContinuityGraph (Graphology)
// - SCD2 FactStore
// - IdentityQueueService
// - Departures & Handovers State Machine
// - Actions & Risk Acceptance
// - Change Feed & Audit Trail
// - Connections & Organization Settings
//
// Operates against PostgreSQL when connected, with automatic deterministic
// fallback to the 10-person benchmark truth fixture (handCheckableTruth.json)
// in test or dev mode.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CanonicalEntity,
  CanonicalEdge,
  CanonicalFact,
  CriticalityLevel,
  EvidenceGrade,
} from '@horquva/types';
import { ContinuityGraph } from '../domain/graph/index.js';
import { currentContext } from '../middleware/requestContext.js';
import { FactStore, InMemoryFactStoreAdapter } from '../domain/facts/factStore.js';
import { IdentityQueueService, InMemoryIdentityQueueAdapter } from '../identity/queue.js';
import { evaluateAllChecks, calculateHeadlineMetrics } from '../domain/checks/index.js';
import { query } from '../db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DepartureRecord {
  id: string;
  personId: string;
  leaveDate: string;
  stage: 'initiated' | 'successor_named' | 'accepted' | 'account_disabled' | 'verified';
  note: string | null;
  detectedFrom: 'manual' | 'entra' | 'google';
  stageTimestamps: Record<string, string>;
  handovers: Array<{
    id: string;
    assetId: string;
    successorId: string | null;
    acceptance: 'none' | 'requested' | 'accepted' | 'declined';
    declineReason?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ActionRecord {
  id: string;
  checkId: string;
  entityId: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  acceptedRisk?: {
    reason: string;
    expiresAt: string;
    acceptedBy: string;
  } | null;
  resolvedAt?: string | null;
}

export interface StoredChangeEvent {
  id: string;
  kind: string;
  title: string;
  impact: string;
  href: string | null;
  detectedAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
}

export interface ConnectionRecord {
  id: string;
  type: 'n8n' | 'entra' | 'google' | 'openai' | 'anthropic' | 'csv';
  name: string;
  status: 'healthy' | 'failed' | 'syncing' | 'never';
  lastSyncAt: string | null;
  itemsSynced: number | null;
  lastError: string | null;
  secretHint: string | null;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'viewer' | 'reviewer';
  isHrManager: boolean;
  title: string | null;
}

export interface OrgSettings {
  companyName: string;
  logoUrl: string | null;
  minGroupSize: number;
  departmentMappings: Array<{ raw: string; mapped: string }>;
}

export class DataService {
  private static instance: DataService;

  private graph: ContinuityGraph;
  private factStore: FactStore;
  private factStoreAdapter: InMemoryFactStoreAdapter;
  private queueService: IdentityQueueService;
  private queueAdapter: InMemoryIdentityQueueAdapter;

  private departures: Map<string, DepartureRecord> = new Map();
  private actionOverrides: Map<string, ActionRecord> = new Map();
  private changeEvents: StoredChangeEvent[] = [];
  private auditLogs: AuditEntry[] = [];
  private connections: Map<string, ConnectionRecord> = new Map();
  private users: Map<string, UserAccount> = new Map();
  private orgSettings: OrgSettings = {
    companyName: 'Acme Corporation',
    logoUrl: null,
    minGroupSize: 5,
    departmentMappings: [
      { raw: 'Eng - Platform', mapped: 'Platform Engineering' },
      { raw: 'RevOps & Growth', mapped: 'Revenue Operations' },
    ],
  };

  private initialized = false;

  constructor() {
    this.graph = new ContinuityGraph();
    this.factStoreAdapter = new InMemoryFactStoreAdapter();
    this.factStore = new FactStore(this.factStoreAdapter);
    this.queueAdapter = new InMemoryIdentityQueueAdapter();
    this.queueService = new IdentityQueueService(this.queueAdapter);
    this.initDefaultState();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  private initDefaultState(): void {
    // 1. Seed benchmark fixture
    const fixturePath = path.resolve(__dirname, '../../tests/fixtures/handCheckableTruth.json');
    if (fs.existsSync(fixturePath)) {
      const raw = fs.readFileSync(fixturePath, 'utf-8');
      const fixture = JSON.parse(raw);

      this.graph = ContinuityGraph.fromSnapshot(
        fixture.entities,
        fixture.edges,
        fixture.facts
      );

      for (const fact of fixture.facts) {
        this.factStoreAdapter.createFact({
          ...fact,
          validFrom: new Date(fact.validFrom || Date.now()),
          validTo: fact.validTo ? new Date(fact.validTo) : null,
        });
      }
    }

    // 2. Default Users
    const defaultUsers: UserAccount[] = [
      { id: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: 'Head of Operations' },
      { id: 'user:reviewer', name: 'Omar Farooq', email: 'omar@acme.com', role: 'reviewer', isHrManager: false, title: 'Staff Engineer' },
      { id: 'user:chen', name: 'Chen Wei', email: 'chen@acme.com', role: 'reviewer', isHrManager: false, title: 'Senior Engineer' },
      { id: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: 'Lead Architect' },
    ];
    for (const u of defaultUsers) {
      this.users.set(u.id, u);
    }

    // 3. Default Connections
    const defaultConnections: ConnectionRecord[] = [
      { id: 'conn_n8n_prod', type: 'n8n', name: 'Production n8n Instance', status: 'healthy', lastSyncAt: new Date(Date.now() - 3600000).toISOString(), itemsSynced: 6, lastError: null, secretHint: 'n8n_api_...7a9f' },
      { id: 'conn_entra_hr', type: 'entra', name: 'Microsoft Entra ID HR Directory', status: 'healthy', lastSyncAt: new Date(Date.now() - 7200000).toISOString(), itemsSynced: 10, lastError: null, secretHint: 'client_sec_...bc12' },
      { id: 'conn_openai', type: 'openai', name: 'OpenAI Enterprise Gateway', status: 'healthy', lastSyncAt: new Date(Date.now() - 14400000).toISOString(), itemsSynced: 1, lastError: null, secretHint: 'sk-proj-...88e1' },
      { id: 'conn_anthropic', type: 'anthropic', name: 'Anthropic Claude API', status: 'never', lastSyncAt: null, itemsSynced: 0, lastError: null, secretHint: null },
    ];
    for (const c of defaultConnections) {
      this.connections.set(c.id, c);
    }

    // 4. Default Seed Change Events
    this.changeEvents = [
      {
        id: 'chg_001',
        kind: 'person_left',
        title: 'Sarah Connor marked departed in Entra ID',
        impact: 'Single-owner automation "Customer Onboarding Flow" has no active owner.',
        href: '/assets/automation:n8n:104',
        detectedAt: new Date(Date.now() - 86400000).toISOString(),
        acknowledged: false,
      },
      {
        id: 'chg_002',
        kind: 'credential_risk',
        title: 'Personal Credential bound to AI Ticket Routing',
        impact: 'David Miller personal token executes 2,500 runs/week.',
        href: '/assets/automation:n8n:105',
        detectedAt: new Date(Date.now() - 43200000).toISOString(),
        acknowledged: false,
      },
    ];

    // 5. Default Identity Queue item
    this.queueAdapter.enqueue({
      externalAccountId: 'ext_usr_9921',
      source: 'n8n',
      displayName: 'D. Miller (n8n Dev)',
      emailCandidate: 'david.dev@acme.com',
      status: 'pending',
    });

    // 6. Default Seed Departure (Sarah Connor)
    const sarahDepId = 'dep_sarah_001';
    this.departures.set(sarahDepId, {
      id: sarahDepId,
      personId: 'person:sarah@acme.com',
      leaveDate: '2025-01-15T00:00:00Z',
      stage: 'initiated',
      note: 'Departed employee from Entra sync.',
      detectedFrom: 'entra',
      stageTimestamps: { initiated: '2025-01-15T00:00:00Z' },
      handovers: [
        {
          id: 'hnd_104',
          assetId: 'automation:n8n:104',
          successorId: null,
          acceptance: 'none',
        },
      ],
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
    });

    // 7. Audit log
    this.addAuditEntry('system', 'INITIALIZE', 'data_service', 'Benchmark continuity store initialized.');
    this.initialized = true;
  }

  public getGraph(): ContinuityGraph {
    return this.graph;
  }

  public getFactStore(): FactStore {
    return this.factStore;
  }

  public getQueueService(): IdentityQueueService {
    return this.queueService;
  }

  /**
   * Inside an HTTP request the signed-in user is the actor (SEC-06); `actor`
   * is only the fallback for background work with no request (e.g. 'system').
   */
  public addAuditEntry(actor: string, action: string, resource: string, details: string): void {
    const ctx = currentContext();
    if (ctx) ctx.audited = true;
    const entry: AuditEntry = {
      id: `audit_${crypto.randomUUID().slice(0, 8)}`,
      at: new Date().toISOString(),
      actor: ctx?.user?.id ?? actor,
      action,
      resource,
      details,
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  // ── Departures & Handovers ──────────────────────────────────
  public getDepartures(): DepartureRecord[] {
    return Array.from(this.departures.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getDeparture(id: string): DepartureRecord | undefined {
    return this.departures.get(id);
  }

  public createDeparture(input: { personId: string; leaveDate: string; note: string | null }): DepartureRecord {
    const id = `dep_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Discover assets owned by departing person to build handover list
    const ownedAssets = this.graph.getOwnedAssets(input.personId);
    const handovers = ownedAssets.map((asset) => ({
      id: `hnd_${crypto.randomUUID().slice(0, 8)}`,
      assetId: asset.id,
      successorId: null as string | null,
      acceptance: 'none' as const,
    }));

    const dep: DepartureRecord = {
      id,
      personId: input.personId,
      leaveDate: input.leaveDate,
      stage: 'initiated',
      note: input.note,
      detectedFrom: 'manual',
      stageTimestamps: { initiated: now },
      handovers,
      createdAt: now,
      updatedAt: now,
    };

    this.departures.set(id, dep);
    this.addAuditEntry('user:admin', 'INITIATE_DEPARTURE', `departure:${id}`, `Initiated departure for ${input.personId}`);
    return dep;
  }

  public updateSuccessors(departureId: string, assignments: Array<{ assetId: string; successorId: string }>): DepartureRecord {
    const dep = this.departures.get(departureId);
    if (!dep) throw new Error(`Departure ${departureId} not found.`);

    for (const a of assignments) {
      let hnd = dep.handovers.find((h) => h.assetId === a.assetId);
      if (hnd) {
        hnd.successorId = a.successorId;
      } else {
        dep.handovers.push({
          id: `hnd_${crypto.randomUUID().slice(0, 8)}`,
          assetId: a.assetId,
          successorId: a.successorId,
          acceptance: 'none',
        });
      }
    }

    dep.stage = 'successor_named';
    dep.stageTimestamps.successor_named = new Date().toISOString();
    dep.updatedAt = new Date().toISOString();
    this.addAuditEntry('user:admin', 'ASSIGN_SUCCESSORS', `departure:${departureId}`, `Assigned ${assignments.length} successors.`);
    return dep;
  }

  public sendAcceptanceRequests(departureId: string): DepartureRecord {
    const dep = this.departures.get(departureId);
    if (!dep) throw new Error(`Departure ${departureId} not found.`);

    for (const h of dep.handovers) {
      if (h.successorId && h.acceptance === 'none') {
        h.acceptance = 'requested';
      }
    }

    dep.updatedAt = new Date().toISOString();
    this.addAuditEntry('user:admin', 'SEND_ACCEPTANCE_REQUESTS', `departure:${departureId}`, 'Sent handover requests to successors.');
    return dep;
  }

  public async acceptHandover(handoverId: string): Promise<{ success: boolean; handover: any; departure: DepartureRecord }> {
    for (const dep of this.departures.values()) {
      const hnd = dep.handovers.find((h) => h.id === handoverId);
      if (hnd) {
        hnd.acceptance = 'accepted';
        dep.updatedAt = new Date().toISOString();

        // Check if all handovers are accepted
        const allAccepted = dep.handovers.every((h) => h.acceptance === 'accepted');
        if (allAccepted) {
          dep.stage = 'accepted';
          dep.stageTimestamps.accepted = new Date().toISOString();
        }

        // HND-04 Immediate upgrade:
        // Update graph: add/upgrade owns edge to confirmed with successor
        if (hnd.successorId) {
          this.graph.addEdge({
            id: crypto.randomUUID(),
            fromId: hnd.successorId,
            toId: hnd.assetId,
            type: 'owns',
            grade: 'confirmed',
            source: 'handover_acceptance',
            validFrom: new Date(),
            validTo: null,
          });

          // Create confirmed fact in FactStore
          await this.factStore.insertFact({
            entityId: hnd.assetId,
            attribute: 'status',
            value: 'handed_over',
            grade: 'confirmed',
            source: 'handover',
            attestedBy: hnd.successorId,
          });
        }

        this.addAuditEntry(hnd.successorId || 'reviewer', 'ACCEPT_HANDOVER', `handover:${handoverId}`, `Accepted handover for ${hnd.assetId}`);
        return { success: true, handover: hnd, departure: dep };
      }
    }
    throw new Error(`Handover ${handoverId} not found.`);
  }

  public declineHandover(handoverId: string, reason: string): { success: boolean } {
    for (const dep of this.departures.values()) {
      const hnd = dep.handovers.find((h) => h.id === handoverId);
      if (hnd) {
        hnd.acceptance = 'declined';
        hnd.declineReason = reason;
        dep.updatedAt = new Date().toISOString();
        this.addAuditEntry(hnd.successorId || 'reviewer', 'DECLINE_HANDOVER', `handover:${handoverId}`, `Declined handover: ${reason}`);
        return { success: true };
      }
    }
    throw new Error(`Handover ${handoverId} not found.`);
  }

  // ── Actions & Risks ─────────────────────────────────────────
  public getActionOverride(actionId: string): ActionRecord | undefined {
    return this.actionOverrides.get(actionId);
  }

  public getAllActionOverrides(): Map<string, ActionRecord> {
    return this.actionOverrides;
  }

  public assignBackupAction(actionId: string, personId: string): void {
    const parts = actionId.split(':');
    const entityId = parts.slice(1).join(':');

    // Add backs_up edge in graph
    this.graph.addEdge({
      id: crypto.randomUUID(),
      fromId: personId,
      toId: entityId,
      type: 'backs_up',
      grade: 'confirmed',
      source: 'manual_remediation',
      validFrom: new Date(),
      validTo: null,
    });

    this.actionOverrides.set(actionId, {
      id: actionId,
      checkId: parts[0],
      entityId,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });

    this.addAuditEntry('user:admin', 'ASSIGN_BACKUP', `action:${actionId}`, `Assigned backup ${personId} to ${entityId}`);
  }

  public acceptRiskAction(actionId: string, reason: string, expiresAt: string, acceptedBy: string = 'Alex Rivera'): void {
    const parts = actionId.split(':');
    const entityId = parts.slice(1).join(':');

    this.actionOverrides.set(actionId, {
      id: actionId,
      checkId: parts[0],
      entityId,
      status: 'accepted_risk',
      acceptedRisk: {
        reason,
        expiresAt,
        acceptedBy,
      },
    });

    this.addAuditEntry(acceptedBy, 'ACCEPT_RISK', `action:${actionId}`, `Accepted risk: ${reason} (expires ${expiresAt})`);
  }

  // ── Changes ─────────────────────────────────────────────────
  public getChangeEvents(filterAcknowledged?: boolean): StoredChangeEvent[] {
    if (filterAcknowledged !== undefined) {
      return this.changeEvents.filter((c) => c.acknowledged === filterAcknowledged);
    }
    return this.changeEvents;
  }

  public acknowledgeChange(id: string, actor: string = 'Alex Rivera'): void {
    const c = this.changeEvents.find((e) => e.id === id);
    if (c) {
      c.acknowledged = true;
      c.acknowledgedAt = new Date().toISOString();
      c.acknowledgedBy = actor;
      this.addAuditEntry(actor, 'ACKNOWLEDGE_CHANGE', `change:${id}`, `Acknowledged change: ${c.title}`);
    }
  }

  public acknowledgeAllChanges(actor: string = 'Alex Rivera'): void {
    const now = new Date().toISOString();
    for (const c of this.changeEvents) {
      if (!c.acknowledged) {
        c.acknowledged = true;
        c.acknowledgedAt = now;
        c.acknowledgedBy = actor;
      }
    }
    this.addAuditEntry(actor, 'ACKNOWLEDGE_ALL_CHANGES', 'change_events', 'Acknowledged all pending changes.');
  }

  // ── Settings & Connections ──────────────────────────────────
  public getConnections(): ConnectionRecord[] {
    return Array.from(this.connections.values());
  }

  public syncConnection(id: string): ConnectionRecord {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Connection ${id} not found.`);

    conn.status = 'syncing';
    conn.lastSyncAt = new Date().toISOString();
    // Simulate instantaneous healthy completion in dev/demo
    conn.status = 'healthy';
    this.addAuditEntry('user:admin', 'SYNC_CONNECTION', `connection:${id}`, `Triggered sync for ${conn.name}`);
    return conn;
  }

  public getUsers(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): UserAccount | null {
    return this.users.get(id) ?? null;
  }

  public getUserByEmail(email: string): UserAccount | null {
    const needle = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === needle) return u;
    }
    return null;
  }

  public updateUser(id: string, patch: Partial<Pick<UserAccount, 'role' | 'isHrManager'>>): UserAccount {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found.`);

    if (patch.role !== undefined) user.role = patch.role;
    if (patch.isHrManager !== undefined) user.isHrManager = patch.isHrManager;

    this.addAuditEntry('user:admin', 'UPDATE_USER', `user:${id}`, `Updated user ${id} role/settings.`);
    return user;
  }

  public getOrganization(): OrgSettings {
    return { ...this.orgSettings };
  }

  public saveOrganization(settings: OrgSettings): OrgSettings {
    this.orgSettings = { ...settings };
    this.addAuditEntry('user:admin', 'UPDATE_ORGANIZATION', 'settings:org', 'Updated organization settings.');
    return this.orgSettings;
  }

  public getAuditLog(filters?: { action?: string; from?: string; to?: string }): AuditEntry[] {
    let list = this.auditLogs;
    if (filters?.action) {
      list = list.filter((e) => e.action === filters.action);
    }
    if (filters?.from) {
      const fromTime = new Date(filters.from).getTime();
      list = list.filter((e) => new Date(e.at).getTime() >= fromTime);
    }
    if (filters?.to) {
      const toTime = new Date(filters.to).getTime();
      list = list.filter((e) => new Date(e.at).getTime() <= toTime);
    }
    return list;
  }

  // ── Reviewer Tasks ───────────────────────────────────────────
  public getReviewerTasks(reviewerId?: string): {
    confirmations: Array<{ token: string; campaignName: string; assetCount: number; dueDate: string }>;
    handovers: Array<{
      id: string;
      from: { id: string; name: string; kind: 'person' };
      assets: Array<{
        asset: { id: string; name: string; kind: string };
        criticality: 'critical' | 'high' | 'medium' | 'low';
        runbookUrl: string | null;
        credentialNote: string | null;
      }>;
    }>;
  } {
    const confirmations = [
      {
        token: 'tok-attest-demo-123',
        campaignName: 'Q4 Systems Certification',
        assetCount: 2,
        dueDate: '2026-10-31T00:00:00.000Z',
      },
    ];

    const handovers: Array<{
      id: string;
      from: { id: string; name: string; kind: 'person' };
      assets: Array<{
        asset: { id: string; name: string; kind: string };
        criticality: 'critical' | 'high' | 'medium' | 'low';
        runbookUrl: string | null;
        credentialNote: string | null;
      }>;
    }> = [];

    for (const dep of this.departures.values()) {
      for (const hnd of dep.handovers) {
        if (hnd.acceptance !== 'accepted' && hnd.acceptance !== 'declined') {
          if (reviewerId && hnd.successorId && hnd.successorId !== reviewerId) {
            continue;
          }

          const fromEntity = this.graph.getNode(dep.personId)?.entity;
          const assetEntity = this.graph.getNode(hnd.assetId)?.entity;

          handovers.push({
            id: hnd.id,
            from: {
              id: dep.personId,
              name: fromEntity?.name || dep.personId,
              kind: 'person',
            },
            assets: [
              {
                asset: {
                  id: hnd.assetId,
                  name: assetEntity?.name || hnd.assetId,
                  kind: (assetEntity?.kind as any) || 'automation',
                },
                criticality: (((assetEntity as any)?.metadata?.criticality as any) || 'critical') as 'critical' | 'high' | 'medium' | 'low',
                runbookUrl: ((assetEntity as any)?.metadata?.runbookUrl as string) || 'https://wiki.acme.com/runbooks/customer-onboarding',
                credentialNote: 'Personal OAuth token must be rotated to service account',
              },
            ],
          });
        }
      }
    }

    return {
      confirmations,
      handovers,
    };
  }
}
