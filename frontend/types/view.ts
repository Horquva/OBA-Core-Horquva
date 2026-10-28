import type {
  CheckResult, CheckStatus, ChangeEventKind, CriticalityLevel, EdgeType, EntityKind, EvidenceGrade,
} from '@horquva/types';

export type { CheckResult, CheckStatus, ChangeEventKind, CriticalityLevel, EdgeType, EntityKind, EvidenceGrade };

// ── Identity & session ─────────────────────────────────────
export type Role = 'admin' | 'viewer' | 'reviewer';
export interface Session {
  userId: string; name: string; email: string; role: Role; isHrManager: boolean; title: string | null;
}
export type AuthProvider = 'microsoft' | 'google';

export interface EntityRef { id: string; kind: EntityKind; name: string }

// ── Facts ──────────────────────────────────────────────────
export type FactState = 'value' | 'unknown' | 'none';
export interface FactView {
  state: FactState;
  display: string | null;
  grade: EvidenceGrade;
  source: string | null;
  observedAt: string | null;
  ref?: EntityRef | null;
}
export interface CriticalityView { level: CriticalityLevel; grade: EvidenceGrade; source: string | null; observedAt: string | null }

// ── Coverage & overview ────────────────────────────────────
export interface CoverageMetrics {
  total: number; covered: number; exposed: number;
  /** null until backend B-01 partitions unknown out of exposed */
  unknown: number | null;
  definition: string;
}
/** Counted deltas vs. the daily snapshot at least 7 days old; null until one exists. */
export interface CoverageTrend { comparedTo: string; covered: number; exposed: number; unknown: number }
/** Distinct assets failing one check; an asset can fail several, so causes don't sum to "exposed". */
export interface ExposureCause { checkId: string; label: string; assets: number }
export interface OverviewCoverage extends CoverageMetrics { trend: CoverageTrend | null; exposureByCause: ExposureCause[] }
export interface HistoryPoint { date: string; covered: number; exposed: number; unknown: number; total: number }
/** null counts = not tracked yet by the backend (never shown as 0). */
export interface ChangeSummary {
  since: string | null; sinceKind?: 'last_sign_in' | 'first_visit_window';
  peopleLeft: number; backupsLost: number | null; newlyExposed: number | null; resolved: number;
}
/** GET /api/continuity/orphan-scan (mirrors backend services/orphanScan). A ranked list, no score. */
export type OrphanFindingKind = 'key_owner_gone' | 'automation_on_gone_identity' | 'app_secret_expiring_unowned' | 'owner_not_in_directory';
export type OrphanOwnerReason = 'account_disabled' | 'leave_date_passed' | 'departure_recorded' | 'marked_departed' | 'lost_project_access' | 'not_in_directory';
export interface OrphanFinding {
  kind: OrphanFindingKind;
  severity: 'high' | 'medium' | 'low';
  asset: { id: string; kind: EntityKind; name: string; vendor: string | null };
  owner: { id: string; name: string; reason: OrphanOwnerReason } | null;
  cost30dUsd: number | null;
  lastUsedAt: string | null;
  evidence: string[];
}
export interface OrphanScanResult {
  scannedAt: string;
  directoryConnected: boolean;
  connectionsScanned: Array<{ id: string; type: string; name: string }>;
  totals: { byKind: Record<OrphanFindingKind, number>; monthlyCostUsd: number };
  findings: OrphanFinding[];
}
export interface SpofAsset { asset: EntityRef; reason: string; dependsOn: EntityRef; runsPerWeek: number | null }
/** identityPending is null for non-admins (they can't see the queue). */
export interface NavCounts { departuresSoon: number; openCriticalActions: number; identityPending: number | null }

// ── Changes (bell) ─────────────────────────────────────────
export interface ChangeEventView {
  id: string; kind: ChangeEventKind | 'post_departure_alert'; title: string; impact: string;
  href: string | null; detectedAt: string;
}

// ── Assets ─────────────────────────────────────────────────
export interface AssetRow {
  id: string; kind: EntityKind; name: string; isCritical: boolean;
  owner: FactView; backup: FactView; criticality: CriticalityView;
  documented: FactView; fallback: FactView; runsPerWeek: FactView;
  checkStatus: CheckStatus;
}
export interface FactHistoryEntry {
  attribute: string; display: string | null; state: FactState; grade: EvidenceGrade;
  source: string | null; changedBy: string | null; validFrom: string; validTo: string | null;
}
export interface AssetDetail {
  asset: AssetRow; checks: CheckResult[]; upstream: EntityRef[]; downstream: EntityRef[]; history: FactHistoryEntry[];
}

// ── Actions ────────────────────────────────────────────────
export type ActionType = 'assign_backup' | 'confirm_facts' | 'name_successor' | 'move_credential' | 'document' | 'add_fallback';
export type ActionStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
export type ActionPrimary = { kind: 'assign_backup' } | { kind: 'link'; label: string; href: string };
export interface ActionView {
  id: string; rank: number; type: ActionType; status: ActionStatus; problem: string;
  asset: EntityRef; failingFact: string; criticalAssetsAffected: number; checkId: string;
  primary: ActionPrimary;
  acceptedRisk: { reason: string; expiresAt: string; acceptedBy: string } | null;
  resolvedAt: string | null;
}

// ── Confirmations ──────────────────────────────────────────
export interface CampaignSummary { id: string; name: string; status: string; dueDate: string; createdAt: string; totalTasks: number; completedTasks: number }
export interface CampaignDetail {
  id: string;
  reviewers: Array<{ person: EntityRef; completed: number; total: number }>;
  reminderAt: string | null; escalationAt: string | null;
}
export type CampaignScope =
  | { kind: 'all_unknown_critical' }
  | { kind: 'department'; department: string }
  | { kind: 'leaver'; personId: string }
  | { kind: 'selected'; assetIds: string[] };
export interface CampaignPreview {
  emailCount: number; questionCount: number;
  /** Assets in scope with no current owner on record: nobody to ask (they go to identity review). */
  unassignedAssets: EntityRef[];
  reviewers: Array<{ person: EntityRef; email: string; assetCount: number; viaManager: boolean }>;
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
  email: { subject: string; bodyText: string };
}
/** emailDelivery 'logged' = no SMTP configured: nothing was emailed; links are only in the server log. */
/** One reviewer's email, rendered by the code that sends it (link is a placeholder). */
export interface CampaignEmailPreview {
  to: { person: EntityRef; email: string };
  reviewerCount: number;
  subject: string; html: string; text: string;
}
/** GET /api/continuity/briefing — written on request; says who wrote it and from what. */
export interface BriefingDetail {
  text: string;
  writtenBy: 'ai' | 'template';
  generatedAt: string;
  figures: {
    headline: { coveredCount: number; exposedCount: number; unknownCount: number; totalCriticalAssets: number };
    upcomingDepartures: number;
    overdueDepartures: number;
    singlePointsOfFailure: number;
    personalCredentialAutomations: number;
    recentFailures: number;
  };
}
export interface CampaignCreated { campaignId: string; reviewers: number; emailsSent: number; emailDelivery: 'smtp' | 'logged' }
export interface CreateCampaignInput {
  name: string; dueDate: string; sendAt: string | null; introLine: string | null;
  email: { subject: string; bodyText: string } | null;
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
}

// ── Departures ─────────────────────────────────────────────
export type DepartureStage = 'initiated' | 'successor_named' | 'accepted' | 'account_disabled' | 'verified';
export const DEPARTURE_STAGES: DepartureStage[] = ['initiated', 'successor_named', 'accepted', 'account_disabled', 'verified'];
export const STAGE_LABEL: Record<DepartureStage, string> = {
  initiated: 'Initiated', successor_named: 'Successor named', accepted: 'Accepted',
  account_disabled: 'Account disabled', verified: 'Post-departure verified',
};
export interface DepartureSummary {
  id: string; person: EntityRef; role: string | null; team: string | null; leaveDate: string;
  stage: DepartureStage; assetsTotal: number; assetsHandedOver: number; hasAlert: boolean;
  detectedFrom: 'manual' | 'entra' | 'google'; group: 'upcoming' | 'in_handover' | 'departed';
}
/** A critical asset a departing person leaves without cover (GET /api/departures/at-risk). */
export interface AtRiskAsset {
  asset: EntityRef; criticality: CriticalityLevel | null; owner: EntityRef; departureId: string; leaveDate: string;
  /** null = not recorded. */
  runsPerWeek: number | null;
  noSuccessor: boolean; personalCredential: boolean;
  /** An AI vendor key the leaver owns: rotate or revoke it (no successor). */
  vendorKey: boolean;
  successor: EntityRef | null; acceptance: 'none' | 'requested' | 'accepted' | 'declined' | null;
}
export interface WorkAtRisk {
  assets: AtRiskAsset[];
  totals: { assets: number; runsPerWeek: number; unknownRuns: number; personalCredential: number; keys: number; people: number };
}
export interface SuccessorSuggestion { person: EntityRef; reason: string }
export interface HandoverAsset {
  /** Handover row id: the target of accept / decline / reassign. */
  id: string;
  asset: EntityRef; criticality: CriticalityLevel; currentBackup: FactView;
  successor: EntityRef | null; suggestion: SuccessorSuggestion | null;
  acceptance: 'none' | 'requested' | 'accepted' | 'declined';
  /** The successor's reason, when they declined (HND-05). */
  declineReason?: string | null;
}
export interface WatchLogEntry { at: string; workflow: EntityRef; message: string; severity: 'info' | 'alert' }
export interface DepartureDetail extends DepartureSummary {
  stageTimestamps: Partial<Record<DepartureStage, string>>;
  handover: HandoverAsset[];
  personalCredentialAutomations: Array<{ workflow: EntityRef; weeklyRuns: number | null }>;
  undocumented: EntityRef[];
  watchLog: WatchLogEntry[];
}
export interface SuccessorAssignment { assetId: string; successorId: string }
export interface SuccessionLoad {
  successor: EntityRef; totalCriticalAssetsOwned: number; shareOfCompanyCriticalAutomationsPct: number; overloadWarning: boolean;
}
export interface SuccessionPlanResult { coveredCount: number; stillExposedCount: number; loads: SuccessionLoad[] }

// ── People & teams ─────────────────────────────────────────
export interface TeamSummary {
  id: string; name: string; memberCount: number; rolledUp: boolean; coverage: CoverageMetrics;
  concentration: { sentence: string; total: number; holders: Array<{ person: EntityRef; count: number; sharePct: number }> } | null;
}
export interface Holding { asset: EntityRef; relation: 'owns' | 'backs_up' | 'credential'; criticality: CriticalityLevel; backup: FactView }
export interface TeamMember { person: EntityRef; title: string | null; holdings: Holding[] }
export interface TeamDetail { team: TeamSummary; members: TeamMember[] }
export interface PersonDetail {
  person: EntityRef; title: string | null; team: EntityRef | null; holdings: Holding[];
  openHandovers: Array<{ departureId: string; from: EntityRef; assetCount: number }>;
  /** null = not counted by the backend yet (never shown as "all verified"). */
  pendingConfirmations: number | null;
}

// ── Graph ──────────────────────────────────────────────────
export interface GraphNodeView { id: string; kind: EntityKind; name: string; ring: 'fail' | 'unknown' | null }
export interface GraphEdgeView { id: string; from: string; to: string; type: EdgeType; grade: EvidenceGrade }
export interface Neighbourhood { rootId: string; nodes: GraphNodeView[]; edges: GraphEdgeView[] }
/** downstream = what stops if the root fails; upstream = what the root relies on. */
export interface BlastRadius { rootId: string; downstream: EntityRef[]; upstream: EntityRef[] }

// ── What-If ────────────────────────────────────────────────
export interface ScenarioSelection { people: EntityRef[]; unavailable: EntityRef[]; failing: EntityRef[] }
export interface ScenarioResult {
  orphanedCriticalAssets: Array<{ asset: EntityRef; priorOwner: EntityRef | null; criticality: CriticalityLevel }>;
  /** weeklyRuns is null when the run volume is unknown (DATA-03: never shown as 0). */
  stoppedAutomations: Array<{ workflow: EntityRef; credentialOwner: EntityRef | null; weeklyRuns: number | null }>;
  /** Sum of the known volumes only; runsUnknownCount says how many were missing. */
  runsPerWeekAffected: number;
  runsUnknownCount: number;
  downstream: EntityRef[];
  unknownFactsEncountered: number;
}
export interface SuccessionTestView {
  coveredCount: number; stillExposedCount: number; totalCriticalAssetsOwned: number; sharePct: number; overloadWarning: boolean;
}
export interface WorstLosses {
  vendorsAndModels: Array<{ entity: EntityRef; automationsHalted: number; runsPerWeekAffected: number; runsUnknownCount: number }>;
  peopleHoldingManyUnbacked: number; threshold: number;
}

// ── Ask OBA ────────────────────────────────────────────────
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  /** The entities the answer cites (from the graph). */
  sources: Array<{ label: string; detail: string; entity?: EntityRef }>;
  /** Assistant only: 'ai' = the model answered, 'graph' = computed directly from the graph. */
  answeredBy?: 'ai' | 'graph' | null;
  createdAt: string;
}
export interface Conversation { id: string; title: string; updatedAt: string }

// ── Attestation ────────────────────────────────────────────
export interface AttestAsset { taskId: string; asset: EntityRef; status: 'todo' | 'saved' }
export interface AttestSession {
  token: string;
  reviewer: { name: string; email: string };
  requestedBy: string | null;
  company: { name: string; logoUrl: string | null } | null;
  expired: boolean; submitted: boolean;
  assets: AttestAsset[];
}
/**
 * The owner answers all five questions. "I'm not the owner" sends only who is (if known):
 * nothing is confirmed from it; an admin is asked to resolve it.
 */
export type AttestAnswers =
  | {
      isOwner: true;
      ownerPersonId: null;
      backup: { kind: 'person'; personId: string } | { kind: 'none' };
      criticality: 'critical' | 'high' | 'medium' | 'low';
      criticalityReason: string;
      runbook: { kind: 'url'; url: string } | { kind: 'not_documented' };
      fallback: 'yes' | 'no' | 'unknown';
    }
  | { isOwner: false; ownerPersonId: string | null };

// ── Reviewer app ───────────────────────────────────────────
export interface ReviewerTasks {
  confirmations: Array<{ token: string; campaignName: string; assetCount: number; dueDate: string }>;
  /** One card per departure; accept/decline is per asset row (`handoverId`). */
  handovers: Array<{
    departureId: string; from: EntityRef; leaveDate: string;
    assets: Array<{
      handoverId: string; asset: EntityRef; criticality: CriticalityLevel; criticalityGrade: EvidenceGrade;
      runbookUrl: string | null; credentialNote: string | null;
    }>;
  }>;
}

// ── Settings ───────────────────────────────────────────────
export type ConnectionType = 'n8n' | 'entra' | 'google' | 'ai_admin' | 'openai' | 'anthropic' | 'csv';
/** Types that can be configured and synced from the app (backend CONFIG_SCHEMAS). */
export type SyncableConnectionType = 'n8n' | 'entra' | 'google' | 'ai_admin';
export interface ConnectionTestResult { ok: boolean; error: string | null }
export interface CsvImportResult { syncRunId: string; ok: boolean; error?: string; stats?: Record<string, number | boolean> }
/** First-run setup guide; every step is derived from real state on the backend. */
export interface OnboardingStatus {
  store: 'database' | 'unavailable';
  dismissedAt: string | null;
  completed: boolean;
  steps: { organization: boolean; directory: boolean; automations: boolean; baseline: boolean };
}
/** A configured connector (from the connection store). Secrets never reach the browser. */
export interface ConnectionView {
  id: string; type: ConnectionType; name: string; status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncAt: string | null; lastError: string | null;
  lastRun: { status: 'running' | 'completed' | 'failed'; startedAt: string; completedAt: string | null; stats: Record<string, number>; error: string | null } | null;
}
/** What the graph holds per evidence source (entra, n8n, attestation, manual_assignment …). */
export interface SourceOnRecord { source: string; relationships: number; facts: number; latestAt: string | null }
export interface ConnectionsOverview {
  /** 'unavailable' = the connection store (database) can't be reached, so no connectors are listed. */
  store: 'database' | 'unavailable';
  connections: ConnectionView[];
  sources: SourceOnRecord[];
}
export interface IdentityQueueItemView {
  id: string; source: string; displayName: string | null; emailCandidate: string | null;
  suggestion: { person: EntityRef; reason: string } | null;
}
export type IdentityResolution =
  | { action: 'link'; personId: string } | { action: 'service_account' } | { action: 'departed' } | { action: 'ignore' };
export interface UserView { id: string; name: string; email: string; role: Role; isHrManager: boolean }
export interface OrganizationSettings {
  companyName: string; logoUrl: string | null; minGroupSize: number;
  departmentMappings: Array<{ raw: string; mapped: string }>;
}
export interface AuditEntry { id: string; at: string; actor: string; actorName: string | null; action: string; resource: string; details: string }
export interface AuditLogPage {
  entries: AuditEntry[]; total: number; actions: string[];
  retention: { storage: 'memory'; capacity: number };
}
export interface NamedItem { id: string; name: string; detail: string | null }
export interface N8nCheckReport {
  scannedAt: string;
  summary: { totalWorkflows: number; totalUsers: number; totalCredentials: number; aiIntegrationsCount: number };
  /** each list is null when this backend version does not produce it yet (B-12) */
  singleOwner: NamedItem[] | null;
  personalCredential: NamedItem[] | null;
  failing: NamedItem[] | null;
  abandoned: NamedItem[] | null;
}
