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
export interface ChangeSummary { since: string | null; peopleLeft: number; backupsLost: number; newlyExposed: number; resolved: number }
export interface SpofAsset { asset: EntityRef; reason: string; dependsOn: EntityRef; runsPerWeek: number | null }
export interface NavCounts { departuresSoon: number; openCriticalActions: number; identityPending: number }

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
  reviewers: Array<{ person: EntityRef; email: string; assetCount: number; viaManager: boolean }>;
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
  email: { subject: string; bodyText: string };
}
export interface CreateCampaignInput {
  name: string; dueDate: string; sendAt: string | null; introLine: string | null;
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
export interface SuccessorSuggestion { person: EntityRef; reason: string }
export interface HandoverAsset {
  asset: EntityRef; criticality: CriticalityLevel; currentBackup: FactView;
  successor: EntityRef | null; suggestion: SuccessorSuggestion | null;
  acceptance: 'none' | 'requested' | 'accepted' | 'declined';
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
  concentration: { sentence: string; holders: Array<{ person: EntityRef; sharePct: number }> } | null;
}
export interface Holding { asset: EntityRef; relation: 'owns' | 'backs_up' | 'credential'; criticality: CriticalityLevel; backup: FactView }
export interface TeamMember { person: EntityRef; title: string | null; holdings: Holding[] }
export interface TeamDetail { team: TeamSummary; members: TeamMember[] }
export interface PersonDetail {
  person: EntityRef; title: string | null; team: EntityRef | null; holdings: Holding[];
  openHandovers: Array<{ departureId: string; from: EntityRef; assetCount: number }>;
  pendingConfirmations: number;
}

// ── Graph ──────────────────────────────────────────────────
export interface GraphNodeView { id: string; kind: EntityKind; name: string; ring: 'fail' | 'unknown' | null }
export interface GraphEdgeView { id: string; from: string; to: string; type: EdgeType; grade: EvidenceGrade }
export interface Neighbourhood { rootId: string; nodes: GraphNodeView[]; edges: GraphEdgeView[] }
export interface BlastRadius { rootId: string; downstream: string[]; upstream: string[] }

// ── What-If ────────────────────────────────────────────────
export interface ScenarioSelection { people: EntityRef[]; unavailable: EntityRef[]; failing: EntityRef[] }
export interface ScenarioResult {
  orphanedCriticalAssets: Array<{ asset: EntityRef; priorOwner: EntityRef | null; criticality: CriticalityLevel }>;
  stoppedAutomations: Array<{ workflow: EntityRef; credentialOwner: EntityRef | null; weeklyRuns: number }>;
  runsPerWeekAffected: number;
  downstream: EntityRef[];
  unknownFactsEncountered: number;
}
export interface SuccessionTestView {
  coveredCount: number; stillExposedCount: number; totalCriticalAssetsOwned: number; sharePct: number; overloadWarning: boolean;
}
export interface WorstLosses {
  vendorsAndModels: Array<{ entity: EntityRef; automationsHalted: number; runsPerWeekAffected: number }>;
  peopleHoldingManyUnbacked: number; threshold: number;
}

// ── Ask OBA ────────────────────────────────────────────────
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  sources: Array<{ label: string; detail: string }>; createdAt: string;
}
export interface Conversation { id: string; title: string; updatedAt: string }

// ── Attestation ────────────────────────────────────────────
export interface AttestAsset { taskId: string; asset: EntityRef; status: 'todo' | 'saved' }
export interface AttestSession {
  token: string; legacy: boolean;
  reviewer: { name: string; email: string };
  requestedBy: string | null;
  company: { name: string; logoUrl: string | null } | null;
  expired: boolean; submitted: boolean;
  assets: AttestAsset[];
}
export interface AttestAnswers {
  isOwner: boolean;
  ownerPersonId: string | null;
  backup: { kind: 'person'; personId: string } | { kind: 'none' };
  criticality: 'high' | 'medium' | 'low';
  criticalityReason: string;
  runbook: { kind: 'url'; url: string } | { kind: 'not_documented' };
  fallback: 'yes' | 'no' | 'unknown';
}

// ── Reviewer app ───────────────────────────────────────────
export interface ReviewerTasks {
  confirmations: Array<{ token: string; campaignName: string; assetCount: number; dueDate: string }>;
  handovers: Array<{
    id: string; from: EntityRef;
    assets: Array<{ asset: EntityRef; criticality: CriticalityLevel; runbookUrl: string | null; credentialNote: string | null }>;
  }>;
}

// ── Settings ───────────────────────────────────────────────
export type ConnectionType = 'n8n' | 'entra' | 'google' | 'openai' | 'anthropic' | 'csv';
export interface ConnectionView {
  id: string; type: ConnectionType; name: string; status: 'healthy' | 'failed' | 'syncing' | 'never';
  lastSyncAt: string | null; itemsSynced: number | null; lastError: string | null; secretHint: string | null;
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
export interface AuditEntry { id: string; at: string; actor: string; action: string; resource: string; details: string }
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
