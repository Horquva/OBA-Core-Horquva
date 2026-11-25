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
// - In-memory (tests, and dev without DATABASE_URL): starts empty unless populated
//   via an initial state provider registered in the test harness.
// - Postgres (DataService.initialize() with DATABASE_URL): state is loaded from
//   the database at boot and every change is written through. Reads stay
//   synchronous against the in-memory copy; this is safe because each
//   deployment runs one process for one org. Demo data is seeded only when
//   DEMO_MODE=true outside production and the database has no entities.
// =============================================================================

import crypto from 'node:crypto';
import {
  CanonicalEntity,
  CanonicalEdge,
  CanonicalFact,
  CriticalityLevel,
  EvidenceGrade,
  IdentityQueueItem,
} from '@horquva/types';
import { ContinuityGraph } from '../domain/graph/index.js';
import { currentContext } from '../middleware/requestContext.js';
import type { HandoverPack } from '../handover/departureService.js';
import { FactStore, FactStoreAdapter, InMemoryFactStoreAdapter, PostgresFactStoreAdapter } from '../domain/facts/factStore.js';
import { InMemoryLinkRepository, PostgresLinkRepository, type LinkRepository } from '../identity/linkRepository.js';
import { IdentityQueueAdapter, IdentityQueueService, InMemoryIdentityQueueAdapter, PostgresIdentityQueueAdapter } from '../identity/queue.js';
import * as graphRepo from '../repositories/graphRepository.js';
import * as departureRepo from '../repositories/departureRepository.js';
import * as actionRepo from '../repositories/actionRepository.js';
import * as settingsRepo from '../repositories/settingsRepository.js';

/** Audit entries kept in memory (Postgres keeps them all; the newest this many are loaded at boot). */
export const AUDIT_LOG_CAPACITY = 20000;

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

export interface InitialState {
  entities: CanonicalEntity[];
  edges: CanonicalEdge[];
  facts: CanonicalFact[];
  users: UserAccount[];
  org: OrgSettings;
  changeEvents: StoredChangeEvent[];
  queueItems: IdentityQueueItem[];
  departures: DepartureRecord[];
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
  private linkRepository: LinkRepository;

  private departures: Map<string, DepartureRecord> = new Map();
  private actionOverrides: Map<string, ActionRecord> = new Map();
  private changeEvents: StoredChangeEvent[] = [];
  private auditLogs: AuditEntry[] = [];
  private users: Map<string, UserAccount> = new Map();
  private orgSettings: OrgSettings = { ...DEFAULT_ORG };
  private onboardingDismissedAt: string | null = null;

  private readonly persistent: boolean;
  /** Serializes Postgres writes so they land in the order the app made the changes. */
  private writeChain: Promise<void> = Promise.resolve();

  private static initialStateProvider: (() => InitialState) | null = null;

  public static useInitialStateProvider(provider: (() => InitialState) | null): void {
    DataService.initialStateProvider = provider;
  }

  constructor(opts: { persistent?: boolean } = {}) {
    this.persistent = opts.persistent ?? false;
    this.graph = new ContinuityGraph();
    if (this.persistent) {
      this.factStoreAdapter = new PostgresFactStoreAdapter();
      this.queueAdapter = new PostgresIdentityQueueAdapter();
      this.linkRepository = new PostgresLinkRepository();
    } else {
      this.factStoreAdapter = new InMemoryFactStoreAdapter();
      this.queueAdapter = new InMemoryIdentityQueueAdapter();
      this.linkRepository = new InMemoryLinkRepository();
    }
    this.factStore = new FactStore(this.factStoreAdapter);
    this.queueService = new IdentityQueueService(this.queueAdapter);
    if (!this.persistent && DataService.initialStateProvider) {
      this.applyInitialState(DataService.initialStateProvider());
    }
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
   * Boot entry point. Mandates DATABASE_URL: Horquva has no offline data.
   * Loads state from Postgres and makes that the singleton.
   */
  public static async initialize(env: NodeJS.ProcessEnv = process.env): Promise<DataService> {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set: Horquva has no offline data.');
    }
    const ds = new DataService({ persistent: true });
    await ds.loadFromDatabase();
    DataService.instance = ds;
    return ds;
  }

  public isPersistent(): boolean {
    return this.persistent;
  }

  private applyInitialState(state: InitialState): void {
    this.graph = ContinuityGraph.fromSnapshot(state.entities, state.edges, state.facts);
    for (const fact of state.facts) {
      void this.factStoreAdapter.createFact({
        ...fact,
        validFrom: new Date(fact.validFrom || Date.now()),
        validTo: fact.validTo ? new Date(fact.validTo) : null,
      });
    }
    for (const u of state.users) this.users.set(u.id, u);
    this.orgSettings = state.org;
    this.changeEvents = state.changeEvents;
    for (const q of state.queueItems) void this.queueAdapter.enqueue(q);
    for (const d of state.departures) this.departures.set(d.id, d);
    this.addAuditEntry('system', 'INITIALIZE', 'data_service', 'Benchmark continuity store initialized.');
  }

  /** Replaces all in-memory state with what Postgres holds. */
  public async loadFromDatabase(): Promise<void> {
    if (!this.persistent) throw new Error('loadFromDatabase() needs a persistent DataService.');

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

  public getLinkRepository(): LinkRepository {
    return this.linkRepository;
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
