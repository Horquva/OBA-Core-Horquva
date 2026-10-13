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
// Two modes:
// - In-memory (tests, and dev without DATABASE_URL): seeded from the 10-person
//   benchmark fixture (handCheckableTruth.json) on construction.
// - Postgres (DataService.initialize() with DATABASE_URL): state is loaded from
//   the database at boot and every change is written through. Reads stay
//   synchronous against the in-memory copy; this is safe because each
//   deployment runs one process for one org. Demo data is seeded only when
//   DEMO_MODE=true outside production and the database has no entities.
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
import { FactStore, FactStoreAdapter, InMemoryFactStoreAdapter, PostgresFactStoreAdapter } from '../domain/facts/factStore.js';
import { IdentityQueueAdapter, IdentityQueueService, InMemoryIdentityQueueAdapter, PostgresIdentityQueueAdapter } from '../identity/queue.js';
import * as graphRepo from '../repositories/graphRepository.js';
import * as departureRepo from '../repositories/departureRepository.js';
import * as actionRepo from '../repositories/actionRepository.js';
import * as settingsRepo from '../repositories/settingsRepository.js';

/** Audit entries kept in memory (Postgres keeps them all; the newest this many are loaded at boot). */
export const AUDIT_LOG_CAPACITY = 20000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DepartureWatchEvent {
  at: string;
  workflow: { id: string; name: string };
  message: string;
  severity: 'info' | 'alert';
  /** Source execution, so re-scans of the same window don't duplicate entries. */
  executionId?: string;
}

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
  /** HND-06 post-departure watch log for 72h monitoring */
  watchLog?: DepartureWatchEvent[];
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

const DEFAULT_ORG: OrgSettings = { companyName: 'Your organization', logoUrl: null, minGroupSize: 5, departmentMappings: [] };

/** Demo content: the fixture graph plus the users, feed, queue item and departure the screens are written against. */
function demoState() {
  const fixturePath = path.resolve(__dirname, '../../tests/fixtures/handCheckableTruth.json');
  const fixture = fs.existsSync(fixturePath)
    ? JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
    : { entities: [], edges: [], facts: [] };
  const users: UserAccount[] = [
    { id: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: 'Head of Operations' },
    { id: 'user:reviewer', name: 'Omar Farooq', email: 'omar@acme.com', role: 'reviewer', isHrManager: false, title: 'Staff Engineer' },
    { id: 'user:chen', name: 'Chen Wei', email: 'chen@acme.com', role: 'reviewer', isHrManager: false, title: 'Senior Engineer' },
    { id: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: 'Lead Architect' },
  ];
  const org: OrgSettings = {
    companyName: 'Acme Corporation',
    logoUrl: null,
    minGroupSize: 5,
    departmentMappings: [
      { raw: 'Eng - Platform', mapped: 'Platform Engineering' },
      { raw: 'RevOps & Growth', mapped: 'Revenue Operations' },
    ],
  };
  const changeEvents: StoredChangeEvent[] = [
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
  const queueItem = {
    externalAccountId: 'ext_usr_9921',
    source: 'n8n',
    displayName: 'D. Miller (n8n Dev)',
    emailCandidate: 'david.dev@acme.com',
    status: 'pending' as const,
  };
  const departure: DepartureRecord = {
    id: 'dep_sarah_001',
    personId: 'person:sarah@acme.com',
    leaveDate: '2025-01-15T00:00:00Z',
    stage: 'initiated',
    note: 'Departed employee from Entra sync.',
    detectedFrom: 'entra',
    stageTimestamps: { initiated: '2025-01-15T00:00:00Z' },
    handovers: [{ id: 'hnd_104', assetId: 'automation:n8n:104', successorId: null, acceptance: 'none', declineReason: null }],
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  };
  return { fixture, users, org, changeEvents, queueItem, departure };
}

/** DEMO_MODE seeds an empty database with demo data; never in production. */
export function demoModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.DEMO_MODE !== 'true') return false;
  if (env.NODE_ENV === 'production') {
    throw new Error('DEMO_MODE=true is not allowed in production: it would seed demo people into a real database.');
  }
  return true;
}

/** Extra state other modules keep alongside DataService (e.g. attestation campaigns), reloaded with it. */
type ReloadHook = () => Promise<void>;
const reloadHooks: ReloadHook[] = [];
export function onDatabaseReload(hook: ReloadHook): void {
  reloadHooks.push(hook);
}

export class DataService {
  private static instance: DataService;

  private graph: ContinuityGraph;
  private factStore: FactStore;
  private factStoreAdapter: FactStoreAdapter;
  private queueService: IdentityQueueService;
  private queueAdapter: IdentityQueueAdapter;

  private departures: Map<string, DepartureRecord> = new Map();
  private actionOverrides: Map<string, ActionRecord> = new Map();
  private changeEvents: StoredChangeEvent[] = [];
  private auditLogs: AuditEntry[] = [];
  private users: Map<string, UserAccount> = new Map();
  private orgSettings: OrgSettings = { ...DEFAULT_ORG };
  private onboardingDismissedAt: string | null = null;
  /** Set when demo data was just seeded: history is back-filled once the graph has loaded. */
  private seedDemoHistoryAfterLoad = false;

  private readonly persistent: boolean;
  /** Serializes Postgres writes so they land in the order the app made the changes. */
  private writeChain: Promise<void> = Promise.resolve();

  constructor(opts: { persistent?: boolean } = {}) {
    this.persistent = opts.persistent ?? false;
    this.graph = new ContinuityGraph();
    if (this.persistent) {
      this.factStoreAdapter = new PostgresFactStoreAdapter();
      this.queueAdapter = new PostgresIdentityQueueAdapter();
    } else {
      this.factStoreAdapter = new InMemoryFactStoreAdapter();
      this.queueAdapter = new InMemoryIdentityQueueAdapter();
    }
    this.factStore = new FactStore(this.factStoreAdapter);
    this.queueService = new IdentityQueueService(this.queueAdapter);
    if (!this.persistent) this.initDefaultState();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  public static resetInstance(): DataService {
    DataService.instance = new DataService();
    return DataService.instance;
  }

  /**
   * Boot entry point. With DATABASE_URL, loads state from Postgres (seeding
   * demo data first if DEMO_MODE allows and the database is empty) and makes
   * that the singleton. Without it, production refuses to start and dev falls
   * back to the in-memory fixture.
   */
  public static async initialize(env: NodeJS.ProcessEnv = process.env): Promise<DataService> {
    if (!env.DATABASE_URL) {
      if (env.NODE_ENV === 'production') throw new Error('DATABASE_URL must be set in production.');
      console.warn('[DataService] No DATABASE_URL: running on the in-memory demo fixture. Nothing will survive a restart.');
      return DataService.getInstance();
    }
    const ds = new DataService({ persistent: true });
    await ds.loadFromDatabase({ seedDemo: demoModeEnabled(env) });
    DataService.instance = ds;
    return ds;
  }

  public isPersistent(): boolean {
    return this.persistent;
  }

  private initDefaultState(): void {
    const demo = demoState();
    this.graph = ContinuityGraph.fromSnapshot(demo.fixture.entities, demo.fixture.edges, demo.fixture.facts);
    for (const fact of demo.fixture.facts) {
      void this.factStoreAdapter.createFact({
        ...fact,
        validFrom: new Date(fact.validFrom || Date.now()),
        validTo: fact.validTo ? new Date(fact.validTo) : null,
      });
    }
    for (const u of demo.users) this.users.set(u.id, u);
    this.orgSettings = demo.org;
    this.changeEvents = demo.changeEvents;
    void this.queueAdapter.enqueue(demo.queueItem);
    this.departures.set(demo.departure.id, demo.departure);
    this.addAuditEntry('system', 'INITIALIZE', 'data_service', 'Benchmark continuity store initialized.');
  }

  private async seedDemoData(): Promise<void> {
    const demo = demoState();
    await graphRepo.insertSnapshot({ entities: demo.fixture.entities, edges: demo.fixture.edges, facts: demo.fixture.facts });
    for (const u of demo.users) await settingsRepo.saveUser(u);
    await settingsRepo.saveOrganization(demo.org);
    for (const c of demo.changeEvents) await settingsRepo.saveChangeEvent(c);
    await this.queueAdapter.enqueue(demo.queueItem);
    await departureRepo.saveDeparture(demo.departure);
    console.warn('[DataService] DEMO_MODE: seeded the empty database with the 10-person demo org.');
    this.seedDemoHistoryAfterLoad = true;
  }

  /** Replaces all in-memory state with what Postgres holds. */
  public async loadFromDatabase(opts: { seedDemo?: boolean } = {}): Promise<void> {
    if (!this.persistent) throw new Error('loadFromDatabase() needs a persistent DataService.');
    if (opts.seedDemo && (await graphRepo.countEntities()) === 0) await this.seedDemoData();

    const [departures, actions, changes, users, org, audit] = await Promise.all([
      departureRepo.listDepartures(),
      actionRepo.listActions(),
      settingsRepo.listChangeEvents(),
      settingsRepo.listUsers(),
      settingsRepo.getOrganization(),
      settingsRepo.listRecentAudit(AUDIT_LOG_CAPACITY),
    ]);
    await this.hydrateGraphFromDatabase();
    this.departures = new Map(departures.map((d) => [d.id, d]));
    this.actionOverrides = new Map(actions.map((a) => [a.id, a]));
    this.changeEvents = changes;
    this.users = new Map(users.map((u) => [u.id, u]));
    if (org) {
      const { onboardingDismissedAt, ...settings } = org;
      this.orgSettings = settings;
      this.onboardingDismissedAt = onboardingDismissedAt;
    } else {
      this.orgSettings = { ...DEFAULT_ORG };
      this.onboardingDismissedAt = null;
    }
    this.auditLogs = audit;
    for (const hook of reloadHooks) await hook();
    if (this.seedDemoHistoryAfterLoad) {
      this.seedDemoHistoryAfterLoad = false;
      const { SnapshotService } = await import('./snapshot/snapshotService.js');
      await SnapshotService.seedDemoHistory(this);
    }
  }

  /**
   * Rebuilds the graph from the active entity/edge/fact rows and swaps it in
   * whole, so requests never read a half-built graph. Called at boot and after
   * every connector sync.
   */
  public async hydrateGraphFromDatabase(): Promise<{ entities: number; edges: number; facts: number; ms: number }> {
    const started = Date.now();
    const snap = await graphRepo.loadActiveGraph();
    const graph = ContinuityGraph.fromSnapshot(snap.entities, snap.edges, snap.facts);
    graph.onChange = (change) => {
      if (change.type === 'edge_added') this.persist(() => graphRepo.insertEdge(change.edge));
      else this.persist(() => graphRepo.closeEdges(change.edges));
    };
    this.graph = graph;
    return { entities: snap.entities.length, edges: snap.edges.length, facts: snap.facts.length, ms: Date.now() - started };
  }

  /**
   * Queues a Postgres write behind every earlier one. Inside a request the
   * promise is registered on the request context so the response waits for it
   * (middleware/persistBeforeRespond.ts). Every failure is logged.
   */
  /** Queues a write behind every earlier one; await the result when the caller must know it landed. */
  public queueWrite(write: () => Promise<void>): Promise<void> {
    return this.persist(write);
  }

  private persist(write: () => Promise<void>): Promise<void> {
    if (!this.persistent) return Promise.resolve();
    const p = this.writeChain.then(write);
    this.writeChain = p.catch((err) => console.error('[DataService] Write to Postgres failed:', err));
    const ctx = currentContext();
    if (ctx) (ctx.pendingWrites ??= []).push(p);
    return p;
  }

  /** Resolves once every write queued so far has landed. */
  public async flushWrites(): Promise<void> {
    await this.writeChain;
  }

  /** Writes a departure (and its handovers) the caller changed in place. */
  public persistDeparture(dep: DepartureRecord): void {
    const snapshot = structuredClone(dep);
    this.persist(() => departureRepo.saveDeparture(snapshot));
  }

  public setActionOverride(record: ActionRecord): void {
    this.actionOverrides.set(record.id, record);
    const snapshot = { ...record };
    this.persist(() => actionRepo.saveAction(snapshot));
  }

  /** Adds a user and waits until they are saved; nothing is kept if the save fails. */
  public async createUser(user: UserAccount): Promise<UserAccount> {
    const u = { ...user, email: user.email.trim().toLowerCase() };
    if (this.getUserByEmail(u.email)) throw new Error(`A user with ${u.email} already exists.`);
    this.users.set(u.id, u);
    try {
      await this.persist(() => settingsRepo.saveUser(u));
    } catch (err) {
      this.users.delete(u.id);
      throw err;
    }
    return u;
  }

  public removeUser(id: string): UserAccount {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found.`);
    this.users.delete(id);
    this.persist(() => settingsRepo.deleteUser(id));
    this.addAuditEntry('user:admin', 'REMOVE_USER', `user:${id}`, `Removed ${user.email}; their sessions stop working immediately.`);
    return user;
  }

  public getOnboardingDismissedAt(): string | null {
    return this.onboardingDismissedAt;
  }

  public dismissOnboarding(): string {
    this.onboardingDismissedAt = new Date().toISOString();
    const org = { ...this.orgSettings, onboardingDismissedAt: this.onboardingDismissedAt };
    this.persist(() => settingsRepo.saveOrganization(org));
    return this.onboardingDismissedAt;
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
      id: `audit_${crypto.randomUUID()}`,
      at: new Date().toISOString(),
      actor: ctx?.user?.id ?? actor,
      action,
      resource,
      details,
    };
    this.auditLogs.unshift(entry);
    this.persist(() => settingsRepo.appendAudit(entry));
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
      declineReason: null,
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
    this.persistDeparture(dep);
    this.addAuditEntry('user:admin', 'INITIATE_DEPARTURE', `departure:${id}`, `Initiated departure for ${input.personId}`);
    return dep;
  }

  public addDepartureWatchEvent(departureId: string, event: DepartureWatchEvent): void {
    const dep = this.departures.get(departureId);
    if (dep) {
      if (!dep.watchLog) dep.watchLog = [];
      dep.watchLog.push(event);
      dep.updatedAt = new Date().toISOString();
      this.persistDeparture(dep);
    }
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
    this.persist(() => settingsRepo.saveChangeEvent(event));
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
      const snapshot = { ...c };
      this.persist(() => settingsRepo.saveChangeEvent(snapshot));
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
        const snapshot = { ...c };
        this.persist(() => settingsRepo.saveChangeEvent(snapshot));
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
    const snapshot = { ...user };
    this.persist(() => settingsRepo.saveUser(snapshot));

    this.addAuditEntry('user:admin', 'UPDATE_USER', `user:${id}`, `Updated user ${id} role/settings.`);
    return user;
  }

  public getOrganization(): OrgSettings {
    return { ...this.orgSettings };
  }

  public saveOrganization(settings: OrgSettings): OrgSettings {
    this.orgSettings = { ...settings };
    const row = { ...this.orgSettings, onboardingDismissedAt: this.onboardingDismissedAt };
    this.persist(() => settingsRepo.saveOrganization(row));
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
}
