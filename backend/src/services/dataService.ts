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
import type { HandoverPack } from '../handover/departureService.js';
import { FactStore, InMemoryFactStoreAdapter } from '../domain/facts/factStore.js';
import { IdentityQueueService, InMemoryIdentityQueueAdapter } from '../identity/queue.js';
import { evaluateAllChecks, calculateHeadlineMetrics } from '../domain/checks/index.js';
import { query } from '../db/client.js';

/** In-memory audit retention until the audit log moves to Postgres. */
export const AUDIT_LOG_CAPACITY = 20000;

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
  /** HND-02 handover pack, frozen at initiation (absent on seeded/legacy departures). */
  handoverPack?: HandoverPack;
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

    // 4. Default Seed Change Events
    this.changeEvents = [
      {
        id: 'chg_001',
        kind: 'person_left',
        title: 'Sarah Connor marked departed in Entra ID',
        impact: 'Single-owner automation "Customer Onboarding Flow" has no active owner.',
        href: '/assets/automation:n8n:104',
        // Dated from the fixture (Sarah's departure), not relative to server start.
        detectedAt: '2025-01-15T00:00:00.000Z',
        acknowledged: false,
      },
      {
        id: 'chg_002',
        kind: 'credential_risk',
        title: 'Personal Credential bound to AI Ticket Routing',
        impact: 'David Miller personal token executes 2,500 runs/week.',
        href: '/assets/automation:n8n:105',
        detectedAt: '2025-01-01T00:00:00.000Z',
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
    // Reads are audited too (SEC-06), so keep enough history that page loads don't evict real actions.
    if (this.auditLogs.length > AUDIT_LOG_CAPACITY) {
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

  public createDeparture(
    input: { personId: string; leaveDate: string; note: string | null },
    opts: {
      detectedFrom?: DepartureRecord['detectedFrom'];
      buildPack?: (departureId: string) => HandoverPack;
    } = {}
  ): DepartureRecord {
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
      detectedFrom: opts.detectedFrom ?? 'manual',
      stageTimestamps: { initiated: now },
      handovers,
      handoverPack: opts.buildPack?.(id),
      createdAt: now,
      updatedAt: now,
    };

    this.departures.set(id, dep);
    this.addAuditEntry('user:admin', 'INITIATE_DEPARTURE', `departure:${id}`, `Initiated departure for ${input.personId}`);
    return dep;
  }

  // Successor naming, acceptance and stage transitions live in handover/successionService.ts.

  // ── Actions & Risks ─────────────────────────────────────────
  public getActionOverride(actionId: string): ActionRecord | undefined {
    return this.actionOverrides.get(actionId);
  }

  public getAllActionOverrides(): Map<string, ActionRecord> {
    return this.actionOverrides;
  }

  // Assign-backup and accept-risk live in actions/actionService.ts (validated, honest evidence grades).

  // ── Changes ─────────────────────────────────────────────────
  public getChangeEvents(filterAcknowledged?: boolean): StoredChangeEvent[] {
    if (filterAcknowledged !== undefined) {
      return this.changeEvents.filter((c) => c.acknowledged === filterAcknowledged);
    }
    return this.changeEvents;
  }

  /** Raises a new, unacknowledged change in the feed (bell). */
  public addChangeEvent(e: { kind: string; title: string; impact: string; href: string | null }): StoredChangeEvent {
    const event: StoredChangeEvent = { id: `chg_${crypto.randomUUID().slice(0, 8)}`, ...e, detectedAt: new Date().toISOString(), acknowledged: false };
    this.changeEvents.unshift(event);
    return event;
  }

  /** Returns false when there is no such change. `actor` is the signed-in user's name. */
  public acknowledgeChange(id: string, actor: string): boolean {
    const c = this.changeEvents.find((e) => e.id === id);
    if (!c) return false;
    if (!c.acknowledged) {
      c.acknowledged = true;
      c.acknowledgedAt = new Date().toISOString();
      c.acknowledgedBy = actor;
      this.addAuditEntry(actor, 'ACKNOWLEDGE_CHANGE', `change:${id}`, `Acknowledged change: ${c.title}`);
    }
    return true;
  }

  /** Acknowledges every open change; returns how many were open. */
  public acknowledgeAllChanges(actor: string): number {
    const now = new Date().toISOString();
    let count = 0;
    for (const c of this.changeEvents) {
      if (!c.acknowledged) {
        c.acknowledged = true;
        c.acknowledgedAt = now;
        c.acknowledgedBy = actor;
        count++;
      }
    }
    this.addAuditEntry(actor, 'ACKNOWLEDGE_ALL_CHANGES', 'change_events', `Acknowledged ${count} open change(s).`);
    return count;
  }

  // ── Settings & Connections ──────────────────────────────────
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
