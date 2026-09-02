import type { RiskLevel } from '../types';
import { authHeader } from './authFetch';
import type { EvidenceInfo } from '../components/ui/EvidenceBadge';

// ─── Base ────────────────────────────────────────────────────────────────────

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

/** Minimal wrapper — throws on non-2xx so callers can catch uniformly. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      (body as { error?: string })?.error ?? res.statusText,
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Workflows  (/api/workflows)  — LIVE ─────────────────────────────────────
// Sub-routes: /intelligence, /spof, /failures

export interface WorkflowOwner {
  name: string;
  role: string;
}

export interface WorkflowAgent {
  id: string;
  name: string;
  status: string;
  risk: RiskLevel;
}

export interface WorkflowTool {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface WorkflowFailure {
  failure_type: 'human_spof' | 'tool_failure' | 'process_gap' | 'escalation_failure';
  severity: RiskLevel;
  description: string;
}

export interface WorkflowIntelligenceItem {
  workflow: string;
  status: string;
  owner: WorkflowOwner | null;
  is_documented: boolean;
  lastUpdated: string | null;
  totalAgents: number;
  totalTools: number;
  riskScore: number;
  spofDetected: boolean;
  impactedAgents: WorkflowAgent[];
  impactedTools: WorkflowTool[];
  failures: WorkflowFailure[];
}

export interface WorkflowIntelligenceResponse {
  total: number;
  workflows: WorkflowIntelligenceItem[];
}

export interface SpofWorkflow {
  workflow: string;
  status: string;
  risk: RiskLevel;
  owner: WorkflowOwner | null;
  is_documented: boolean;
  agentCount: number;
  toolCount: number;
  spofReasons: string[];
  spofDetected: true;
}

export interface WorkflowSpofResponse {
  total: number;
  spofWorkflows: SpofWorkflow[];
}

export interface WorkflowFailureSeveritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface WorkflowFailureBreakdownGroup {
  count: number;
  failures: WorkflowFailure[];
}

export interface WorkflowFailureItem {
  workflow: string;
  totalFailures: number;
  severitySummary: WorkflowFailureSeveritySummary;
  breakdown: {
    human_spof: WorkflowFailureBreakdownGroup;
    tool_failure: WorkflowFailureBreakdownGroup;
    process_gap: WorkflowFailureBreakdownGroup;
    escalation_failure: WorkflowFailureBreakdownGroup;
  };
}

export interface WorkflowFailuresResponse {
  totalWorkflows: number;
  totalFailures: number;
  workflows: WorkflowFailureItem[];
}

export const workflows = {
  intelligence: () =>
    request<WorkflowIntelligenceResponse>('/api/workflows/intelligence'),

  spof: () =>
    request<WorkflowSpofResponse>('/api/workflows/spof'),

  failures: () =>
    request<WorkflowFailuresResponse>('/api/workflows/failures'),
};

// ─── Verification  (/api/verification)  — LIVE ───────────────────────────────

export interface VerificationSummary {
  totalActions: number;
  completedActions: number;
  flaggedActions: number;
  failedActions: number;
  pendingActions: number;
  policyViolationsCount: number;
}

export interface VerificationAction {
  actorType: string;
  actorName: string;
  workflow: string | null;
  actionName: string;
  outcome: string;
  verificationStatus: 'COMPLETED' | 'FAILED' | 'PENDING' | 'FLAGGED';
  policyCompliant: boolean;
  createdAt: string;
}

export interface VerificationViolation {
  reason: string;
  severity: string;
  createdAt: string;
}

export interface FlaggedAction extends VerificationAction {
  violations: VerificationViolation[];
}

export interface FlaggedActionsResponse {
  totalFlagged: number;
  flaggedActions: FlaggedAction[];
}

export interface ActorVerificationProfile {
  actorName: string;
  actionsPerformed: number;
  flaggedActionsCount: number;
  violationsCount: number;
  isHighRiskActor: boolean;
  verificationHistory: (VerificationAction & { violations: VerificationViolation[] })[];
}

export const verification = {
  summary: () =>
    request<VerificationSummary>('/api/verification/summary'),

  actions: () =>
    request<VerificationAction[]>('/api/verification/actions'),

  flagged: () =>
    request<FlaggedActionsResponse>('/api/verification/flagged'),

  actor: (name: string) =>
    request<ActorVerificationProfile>(`/api/verification/actor/${encodeURIComponent(name)}`),
};

// ─── Orchestration  (/api/orchestration)  — LIVE ─────────────────────────────

export interface OrchestrationSummary {
  totalWorkflowsOrchestrated: number;
  totalCollisions: number;
  blockedWorkflows: number;
}

export interface OrchestrationNextActor {
  name: string;
  type: string;
  stepName: string;
}

export interface OrchestrationWorkflow {
  workflowName: string;
  department: string;
  currentStep: number;
  totalSteps: number;
  status: string;
  nextActor: OrchestrationNextActor | null;
  updatedAt: string;
}

export interface CollisionConflict {
  workflowId: string;
  workflowName: string;
  currentStep: number;
  totalSteps: number;
}

export interface Collision {
  actorName: string;
  actorType: string;
  conflictingWorkflows: CollisionConflict[];
}

export interface CollisionsResponse {
  totalCollisions: number;
  collisions: Collision[];
}

export interface BlockedWorkflow {
  workflowName: string;
  department: string;
  currentStep: number;
  totalSteps: number;
  blockedActor: string | null;
  reason: string;
}

export interface BlockedResponse {
  totalBlocked: number;
  blockedWorkflows: BlockedWorkflow[];
}

export const orchestration = {
  summary: () =>
    request<OrchestrationSummary>('/api/orchestration/summary'),

  workflows: () =>
    request<OrchestrationWorkflow[]>('/api/orchestration/workflows'),

  collisions: () =>
    request<CollisionsResponse>('/api/orchestration/collisions'),

  blocked: () =>
    request<BlockedResponse>('/api/orchestration/blocked'),

  /** GET /api/orchestration/mode — read-only; there is no endpoint to set it */
  mode: () =>
    request<{ executionMode: string }>('/api/orchestration/mode'),
};

// ─── Forecast  (/api/forecast)  — LIVE ───────────────────────────────────────

export interface ForecastData {
  horizonDays: number;
  healthScore: number;
  healthTrend: string;
  memoryScore: number;
  knowledgeLossRisk: string;
  continuityScore: number;
  resilienceForecast: string;
  outlookScore: number;
  outlookStatus: string;
  computedAt: string;
}

export interface ForecastSummaryResponse {
  forecasts: ForecastData[];
  headlineOutlook: {
    horizonDays: number;
    outlookScore: number;
    outlookStatus: string;
    weakestDimension: string | null;
  };
  provenance: { source: string; table: string };
}

export interface ForecastHealthItem {
  horizonDays: number;
  healthScore: number;
  trend: string;
}

export interface ForecastHealthResponse {
  forecasts: ForecastHealthItem[];
  provenance: { source: string; table: string };
}

export interface ForecastFinding {
  name: string;
  detail: string;
}

export interface ForecastMemoryResponse {
  forecasts: { horizonDays: number; memoryScore: number; knowledgeLossRisk: string }[];
  criticalMemoryCarriers: ForecastFinding[];
  undocumentedAssets: ForecastFinding[];
}

export interface ForecastContinuityResponse {
  forecasts: { horizonDays: number; continuityScore: number; resilienceForecast: string }[];
  fragileWorkflows: ForecastFinding[];
  workflowsWithoutBackup: ForecastFinding[];
}

export interface ForecastOutlookResponse {
  organizationalOutlook: ForecastData[];
  headline: {
    horizonDays: number;
    outlookScore: number;
    outlookStatus: string;
  };
  keyFindings: {
    criticalMemoryCarriers: ForecastFinding[];
    fragileWorkflows: ForecastFinding[];
    workflowsWithoutBackup: ForecastFinding[];
    undocumentedAssets: ForecastFinding[];
  };
  provenance: { source: string; table: string };
}

export const forecast = {
  summary: () =>
    request<ForecastSummaryResponse>('/api/forecast/summary'),

  health: () =>
    request<ForecastHealthResponse>('/api/forecast/health'),

  memory: () =>
    request<ForecastMemoryResponse>('/api/forecast/memory'),

  continuity: () =>
    request<ForecastContinuityResponse>('/api/forecast/continuity'),

  outlook: () =>
    request<ForecastOutlookResponse>('/api/forecast/outlook'),
};

// ─── Learning  (/api/learning)  — LIVE ───────────────────────────────────────

export interface LearningSummary {
  learningMaturityScore: number;
  learningMaturityLevel: string;
  totalKnownRisks: number;
  mitigatedRisks: number;
  unmitigatedRisks: number;
  mitigationPercentage: number;
  repeatOffenderCount: number;
  highestExposureDepartment: {
    department: string;
    exposureScore: number;
  } | null;
}

export interface FailureProneAsset {
  assetName: string;
  assetType: string;
  appearanceCount: number;
  failureSeverity: string;
  isRepeatOffender: boolean;
  reasons: string;
}

export interface LearningFailuresResponse {
  totalFailureProneAssets: number;
  repeatOffenderCount: number;
  failureProneAssets: FailureProneAsset[];
}

export interface LearningDecisionsResponse {
  totalKnownRisks: number;
  mitigatedRisks: number;
  unmitigatedRisks: number;
  mitigationPercentage: number;
  interpretation: string;
}

export interface DepartmentExposure {
  department: string;
  documentationCoverage: number;
  backupCoverage: number;
  incidentExposureScore: number;
  incidentRiskLevel: string;
}

export interface LearningIncidentsResponse {
  totalDepartments: number;
  rankedByExposure: (DepartmentExposure & { rank: number })[];
}

export type LearningDepartmentsResponse = DepartmentExposure[];

export const learning = {
  summary: () =>
    request<LearningSummary>('/api/learning/summary'),

  failures: () =>
    request<LearningFailuresResponse>('/api/learning/failures'),

  decisions: () =>
    request<LearningDecisionsResponse>('/api/learning/decisions'),

  incidents: () =>
    request<LearningIncidentsResponse>('/api/learning/incidents'),

  departments: () =>
    request<DepartmentExposure[]>('/api/learning/departments'),
};

// ─── Collaboration  (/api/collaboration)  — LIVE ─────────────────────────────

export interface CollaborationDepartmentBreakdown {
  department: string;
  avgAdoptionScore?: number;
  avgDependencyScore?: number;
  avgCollaborationScore?: number;
  employeeCount?: number;
  criticalAgentsOwned?: number;
  employeesWithoutBackup?: number;
}

export interface CollaborationAdoptionResponse {
  aiAdoptionScore: number;
  adoptionLevel: string;
  totalEmployees: number;
  employeesUsingAITools: number;
  employeesUsingAIAgents: number;
  departmentBreakdown: { department: string; avgAdoptionScore: number; employeeCount: number }[];
}

export interface CollaborationDependencyPerson {
  name: string;
  department: string;
  dependencyScore: number;
  criticalAgentsOwned: number;
  hasBackup: boolean;
}

export interface CollaborationDependencyResponse {
  humanDependencyScore: number;
  highestDependencyEmployee: string;
  topDependencyIndividuals: CollaborationDependencyPerson[];
  departmentBreakdown: { department: string; avgDependencyScore: number }[];
}

export interface CollaborationScoreResponse {
  collaborationScore: number;
  collaborationLevel: string;
  aiAdoptionScore: number;
  humanDependencyScore: number;
  weakestCollaborationAreas: string[];
  computedAt: string;
}

export interface CollaborationPerson {
  name: string;
  role: string;
  department: string;
  adoptionScore: number;
  dependencyScore: number;
  collaborationScore: number;
  collaborationLevel: string;
  aiToolsUsed: number;
  aiAgentsUsed: number;
  criticalAgentsOwned: number;
  hasBackup: boolean;
}

export interface CollaborationFullDepartment {
  department: string;
  employeeCount: number;
  avgAdoptionScore: number;
  avgDependencyScore: number;
  avgCollaborationScore: number;
  criticalAgentsOwned: number;
  employeesWithoutBackup: number;
}

export interface CollaborationDepartmentsResponse {
  departments: CollaborationFullDepartment[];
  lowestAdoptionDepartment: string | null;
}

export const collaboration = {
  adoption: () =>
    request<CollaborationAdoptionResponse>('/api/collaboration/adoption'),

  dependency: () =>
    request<CollaborationDependencyResponse>('/api/collaboration/dependency'),

  score: () =>
    request<CollaborationScoreResponse>('/api/collaboration/score'),

  people: () =>
    request<CollaborationPerson[]>('/api/collaboration/people'),

  departments: () =>
    request<CollaborationDepartmentsResponse>('/api/collaboration/departments'),
};

// ─── Self-Healing (/api/self-healing) — PENDING BACKEND RE-MOUNT (frontend wiring complete, waiting on backend) ───
export interface SelfHealingIssue {
  id: string;
  type: string;
  severity: RiskLevel;
  description: string;
  detectedAt: string;
}

export interface SelfHealingIntent {
  issueId: string;
  action: string;
  target: string;
  status: string;
}

export const selfHealing = {
  /** GET /api/self-healing/detect — LIVE */
  detect: () =>
    request<{ issues_found: number; issues: SelfHealingIssue[] }>('/api/self-healing/detect'),

  /** POST /api/self-healing/run — LIVE */
  heal: (body: { issueId: string }) =>
    request<SelfHealingIntent>('/api/self-healing/run', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Dataset-derived organizational analyses ─────────────────────────────────
// All seven ARE mounted — index.js mounts routes/intelligence/constitutional.js
// at /api/intelligence. The previous "NOT MOUNTED" comments on signals,
// opportunities, capability, alignment, advisor and simulation-universe were
// stale and wrong.
//
// ⚠ These come from backend/domain/analyses.js (the company dataset), NOT from the
// brain. `capability` and `alignment` here are different analyses from
// orgScience.capabilityByDept and orgScience.strategicAlignment below, which
// compute different things from the Knowledge Graph despite sharing the module
// numbers M39 and M40. See docs/superpowers/specs/2026-08-24-brain-as-library-design.md.
//
// Nothing currently imports this object.

export const intelligence = {
  /** Served by routes/truth/truth.js, not constitutional.js */
  truth: () =>
    request<Record<string, unknown>>('/api/intelligence/truth'),

  brainCore: () =>
    request<Record<string, unknown>>('/api/intelligence/brain-core'),

  orchestrator: () =>
    request<Record<string, unknown>>('/api/intelligence/orchestrator'),

  signals: () =>
    request<Record<string, unknown>>('/api/intelligence/signals'),

  opportunities: () =>
    request<Record<string, unknown>>('/api/intelligence/opportunities'),

  /** Per-department capability scores — not the brain's M39 capability counts */
  capability: () =>
    request<Record<string, unknown>>('/api/intelligence/capability'),

  /**
   * Alignment across three dimensions. `alignment` is null and `state` is
   * 'NO_SIGNAL' when no dimension has data — it is not scored 100.
   */
  alignment: () =>
    request<Record<string, unknown>>('/api/intelligence/alignment'),

  advisor: () =>
    request<Record<string, unknown>>('/api/intelligence/advisor'),

  simulationUniverse: () =>
    request<Record<string, unknown>>('/api/intelligence/simulation-universe'),
};

// ─── Org Science Predictions (M37, M39-M45) ──────────────────────────────────

export interface GraphSource {
  live: boolean;
  stats: Record<string, unknown> | null;
  loadedAt: string | null;
  error: string | null;
}

export interface IntelligenceResponse<T> {
  module: string;
  type: string;
  confidence: number;
  payload: T;
  recommendations: string[];
  generatedAt: string;
  /** Present on the 8 graph-backed cards (domain.graph.run) — absent elsewhere. */
  dataSource?: GraphSource;
}

export interface GraphStatus {
  isReady: boolean;
  source: GraphSource;
}

export interface GraphReloadResult {
  reloaded: boolean;
  stats?: Record<string, unknown>;
  loadedAt?: string;
  error?: string;
  source?: GraphSource;
}

export interface PatternPayload {
  patternDistribution: Record<string, number>;
  dominantPattern: { type: string; count: number };
  anomalyCount: number;
  anomalies: Array<{ type: string; detail: string }>;
}

export interface CapabilityPayload {
  /**
   * Empty because no Supabase table sources the `system` entity type — that is
   * "not modelled", not "this organization has none". See graphLoader's header.
   */
  systemCapabilities: string[];
  workflowCapabilities: string[];
}

export interface StrategicAlignmentPayload {
  ownershipCoverageScore: number;
  covered: boolean;
  gaps: string[];
}

export interface DNAPayload {
  composition: Record<string, number>;
  dnaSignature: string;
  humanShare: number;
  automationShare: number;
  orientation: string;
}

export interface CulturePayload {
  collaborationLinks: number;
  people: number;
  /** Links PER PERSON — unbounded, not a fraction. Never render as a percentage. */
  collaborationDensity: number;
  peopleWithCollaborationRecord: number;
  /**
   * People appearing in no shared-work record at all. This is UNKNOWN, not a
   * finding that they work alone — M42 no longer emits a `siloedPeople` verdict
   * because no available source can distinguish the two.
   */
  peopleWithoutRecord: string[];
  /** Share of people the collaboration sources actually observe (0–1). */
  collaborationCoverage: number;
  cultureSignal: 'no_signal' | 'transitional' | 'collaborative';
}

export interface MaturityPayload {
  maturityScore: number;
  level: string;
  dimensions: Record<string, number>;
  nextLevelGap: number;
}

export interface BehaviorPayload {
  behaviorProfile: Record<string, number>;
  dominantBehavior: string;
  orientation: string;
}

export interface BenchmarkPayload {
  benchmarks: Array<{ metric: string; value: number; target: number; pass: boolean }>;
  passing: number;
  total: number;
  benchmarkScore: number;
}

export const orgScience = {
  pattern: () => request<IntelligenceResponse<PatternPayload>>('/api/intelligence/pattern'),
  capabilityByDept: () => request<IntelligenceResponse<CapabilityPayload>>('/api/intelligence/capability-by-dept'),
  strategicAlignment: () => request<IntelligenceResponse<StrategicAlignmentPayload>>('/api/intelligence/strategic-alignment'),
  dna: () => request<IntelligenceResponse<DNAPayload>>('/api/intelligence/dna'),
  culture: () => request<IntelligenceResponse<CulturePayload>>('/api/intelligence/culture'),
  maturity: () => request<IntelligenceResponse<MaturityPayload>>('/api/intelligence/maturity'),
  behavior: () => request<IntelligenceResponse<BehaviorPayload>>('/api/intelligence/behavior'),
  benchmark: () => request<IntelligenceResponse<BenchmarkPayload>>('/api/intelligence/benchmark'),
  graphStatus: () => request<GraphStatus>('/api/intelligence/graph/status'),
  graphReload: () => request<GraphReloadResult>('/api/intelligence/graph/reload', { method: 'POST' }),
};

// ─── Orchestrator / M55  (/api/intelligence/orchestrator) ───────────────────

export interface OrchestratorSummary {
  organizationalIntelligenceScore: number | null;
  rating: string | null;
  brainPosture: string | null;
  trustScore: number;
  finalVerdict: string;
  topRecommendations: string[];
  generatedAt: string;
  evidence?: EvidenceInfo | null;
}

export interface OrchestratorModule {
  name: string;
  key: string;
  verified: boolean;
  score: number;
  weight: string;
  source: string;
}

export interface OrchestratorModulesResponse {
  totalModules: number;
  verifiedModules: number;
  modules: OrchestratorModule[];
}

export const orchestratorApi = {
  summary: () =>
    request<OrchestratorSummary>('/api/intelligence/orchestrator/summary'),
  modules: () =>
    request<OrchestratorModulesResponse>('/api/intelligence/orchestrator/modules'),
};

// ─── Brain Core / M50  (/api/intelligence/brain-core) ───────────────────────

export interface BrainCoreResponse {
  brainIndex: number;
  posture: string;
  topSignals?: string[];
  computedAt?: string;
}

export const brainCoreApi = {
  latest: () =>
    request<BrainCoreResponse>('/api/intelligence/brain-core'),
};

// ─── Briefing / M23  (/api/briefing) ─────────────────────────────────────────

export interface BriefingLatest {
  briefing_date: string;
  top_spof: string | null;
  most_overloaded_owner: string | null;
  latest_incident: string | null;
  doc_trend_status: string | null;
  summary_points: string[];
}

export const briefingApi = {
  latest: () => request<BriefingLatest>('/api/briefing/today'),
};

// ─── Context Feed / M27  (/api/context) ──────────────────────────────────────

export interface ContextFeedItem {
  rank: number;
  contextType: string;
  title: string;
  description: string;
  entityName: string | null;
  responsiblePerson: string | null;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadius: number;
  sourceModule: string | null;
  status: string;
}

export interface ContextFeedResponse {
  totalItems: number;
  feed: ContextFeedItem[];
}

export interface ContextSummary {
  totalContextItems: number;
  byType: Record<string, number>;
  byUrgency: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  topPriorityItem: ContextFeedItem | null;
}

export const contextApi = {
  feed: () => request<ContextFeedResponse>('/api/context/feed'),
  summary: () => request<ContextSummary>('/api/context/summary'),
  avatar: () => request<Record<string, unknown>>('/api/context/avatar'),
};

// ─── Executive Memory / M26  (/api/executive-memory) ─────────────────────────

export interface ExecMemoryItem {
  memoryType: string;
  title: string;
  description: string;
  entityName: string | null;
  relevanceScore: number;
  severity: string;
  sourceModule: string | null;
  isRecurring: boolean;
}

export interface ExecMemoryItemsResponse {
  totalItems: number;
  items: ExecMemoryItem[];
}

export interface HeroDependency {
  personName: string;
  department: string | null;
  /** Critical assets this person owns with no backup owner named. Replaces the
   *  old `resolutionCount`, which came from a seeded table and claimed a count
   *  of resolved incidents that nothing in the schema actually records. */
  criticalAssetCount: number;
  criticalAssets: string[];
  riskLevel: string;
  description: string;
}

export interface HeroRiskResponse {
  totalHeroDependencies: number;
  criticalHeroes: number;
  heroes: HeroDependency[];
  heroMemoryItems: { title: string; description: string; entityName: string; relevanceScore: number }[];
}

export interface ExecMemorySummary {
  totalMemoryItems: number;
  recurringItems: number;
  byType: Record<string, number>;
  criticalHeroDependencies: number;
  totalIncidentOccurrences: number;
  topMemoryItem: { title: string; type: string; relevanceScore: number; entityName: string } | null;
}

export const execMemoryApi = {
  items: () => request<ExecMemoryItemsResponse>('/api/executive-memory/items'),
  heroRisk: () => request<HeroRiskResponse>('/api/executive-memory/hero-risk'),
  summary: () => request<ExecMemorySummary>('/api/executive-memory/summary'),
  patterns: () => request<Record<string, unknown>>('/api/executive-memory/patterns'),
};

// ─── Org Health  (/api/health, M50) ──────────────────────────────────────────

export interface HealthSummary {
  healthIndex: number;
  healthStatus: string; // STABLE / WARNING / CRITICAL
  trend: string;
  snapshotMonth: string;
  dimensions: {
    documentation:   { score: number; weight: string };
    continuity:      { score: number; weight: string };
    ownershipSpread: { score: number; weight: string };
    criticalSafety:  { score: number; weight: string };
    incidentLoad:    { score: number; weight: string };
  };
}

export interface HealthSignalsResponse {
  liveHealthIndex: number;
  liveHealthStatus: string;
  liveDimensions: {
    documentation:   { score: number; weight: string };
    continuity:      { score: number; weight: string };
    ownershipSpread: { score: number; weight: string };
    criticalSafety:  { score: number; weight: string };
    incidentLoad:    { score: number; weight: string };
  };
  criticalAgents: { name: string; predictedScore: number }[];
  undocumentedWorkflows: { workflowName: string; department: string; owner: string }[];
}

export const healthApi = {
  summary: () => request<HealthSummary>('/api/health/summary'),
  signals: () => request<HealthSignalsResponse>('/api/health/critical'),
  trend: () => request<Record<string, unknown>>('/api/health/trend'),
};

// ─── Accountability (M20) ───────────────────────────────────────────────────

export interface AccountabilityChain {
  entityName: string;
  entityType?: string;
  department?: string;
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
  decisionAuthority?: string[];
}

export interface AccountabilityIssues {
  totalSameResponsibleAccountable: number;
  sameResponsibleAccountableEntities: { entityName: string; entityType?: string }[];
  uniquePeopleCount: number;
  noSeparationOfDutiesCount: number;
}

export const accountabilityApi = {
  chains: () => request<AccountabilityChain[]>('/api/accountability/chains'),
  issues: () => request<AccountabilityIssues>('/api/accountability/issues'),
};

// ─── Predictive Risk (M11) ───────────────────────────────────────────────────

export interface PredictiveSummary {
  totalAgentsAssessed: number;
  breakdown: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
  emergingThreats: number;
  topRiskDrivers: string[];
}

export interface PredictedAgent {
  agentName: string;
  currentRisk: string;
  predictedScore: number;
  threatLevel: string;
  isEmergingThreat: boolean;
  contributingFactors: Record<string, number>;
  reasons: string[];
  computedAt: string;
}

export const predictiveApi = {
  summary: () => request<PredictiveSummary>('/api/predictive-risk/summary'),
  agents: () => request<PredictedAgent[]>('/api/predictive-risk/agents'),
};

// ─── Signal Drilldown (M36) ──────────────────────────────────────────────────

export interface SignalReason {
  id: string;
  factor: string;
  description: string;
  impactWeight: string; // HIGH, MEDIUM, LOW
}

export interface SignalDrilldownResponse {
  entityName: string;
  trendDirection: string;
  reasons: SignalReason[];
}

export const signalApi = {
  drilldown: (entityName: string) => request<SignalDrilldownResponse>(`/api/signals/drilldown/${entityName}`),
};

// ─── Auth  (/api/auth)  — LIVE ───────────────────────────────────────────────
// Login and register stay in AuthContext, because they run before a token
// exists and their whole job is to produce one. Everything here is an
// authenticated call and belongs on the shared client like any other.

export interface ChangePasswordResponse {
  ok: boolean;
  message: string;
}

export const authApi = {
  /**
   * Changes the signed-in user's own password. Takes no email: the account is
   * whichever one the bearer token identifies, so there is no way to aim this
   * at somebody else. The server revokes the current token on success, so the
   * caller must send the user back to /login afterwards.
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<ChangePasswordResponse>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Health Check Utility ────────────────────────────────────────────────────

export const API_BASE = BASE;

export interface PingResult {
  ok: boolean;
  status: number;
  latencyMs: number;
}

/** Ping any endpoint path — never throws, always returns a result object. */
export async function pingEndpoint(path: string): Promise<PingResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { ...authHeader() },
    });
    clearTimeout(timeoutId);
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - start),
    };
  }
}
