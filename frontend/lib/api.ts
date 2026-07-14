import type { RiskLevel } from '../types';

// ─── Base ────────────────────────────────────────────────────────────────────

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

/** Minimal wrapper — throws on non-2xx so callers can catch uniformly. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
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
  failure_type: 'human_spof' | 'tool_spof' | 'agent_spof';
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
    tool_spof: WorkflowFailureBreakdownGroup;
    agent_spof: WorkflowFailureBreakdownGroup;
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

  /** GET /api/orchestration/mode — may not be implemented yet */
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
}

export interface ForecastHealthItem {
  horizonDays: number;
  healthScore: number;
  trend: string;
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
}

export const forecast = {
  summary: () =>
    request<ForecastSummaryResponse>('/api/forecast/summary'),

  health: () =>
    request<ForecastHealthItem[]>('/api/forecast/health'),

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

export interface LearningDepartmentsResponse extends Array<DepartmentExposure> {}

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

// ─── Self-Healing  (/api/self-healing)  — NOT MOUNTED ────────────────────────
// Documented in API_REFERENCE.md (M51) but not mounted in backend/index.js.
// Functions are typed and ready; wire them once the backend route is live.

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
  /** GET /api/self-healing — not mounted yet */
  detect: () =>
    request<SelfHealingIssue[]>('/api/self-healing'),

  /** POST /api/self-healing — not mounted yet */
  heal: (body: { issueId: string }) =>
    request<SelfHealingIntent>('/api/self-healing', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Constitutional / Intelligence  — NOT ALL MOUNTED ────────────────────────
// Only /api/intelligence/truth, /api/intelligence/brain-core, and
// /api/intelligence/orchestrator are mounted.  The rest (signals, opportunities,
// capability, alignment, advisor, simulation-universe) are in API_REFERENCE.md
// but have no mount in index.js.

export const intelligence = {
  /** MOUNTED — /api/intelligence/truth */
  truth: () =>
    request<Record<string, unknown>>('/api/intelligence/truth'),

  /** MOUNTED — /api/intelligence/brain-core */
  brainCore: () =>
    request<Record<string, unknown>>('/api/intelligence/brain-core'),

  /** MOUNTED — /api/intelligence/orchestrator */
  orchestrator: () =>
    request<Record<string, unknown>>('/api/intelligence/orchestrator'),

  /** NOT MOUNTED — /api/intelligence/signals */
  signals: () =>
    request<Record<string, unknown>>('/api/intelligence/signals'),

  /** NOT MOUNTED — /api/intelligence/opportunities */
  opportunities: () =>
    request<Record<string, unknown>>('/api/intelligence/opportunities'),

  /** NOT MOUNTED — /api/intelligence/capability */
  capability: () =>
    request<Record<string, unknown>>('/api/intelligence/capability'),

  /** NOT MOUNTED — /api/intelligence/alignment */
  alignment: () =>
    request<Record<string, unknown>>('/api/intelligence/alignment'),

  /** NOT MOUNTED — /api/intelligence/advisor */
  advisor: () =>
    request<Record<string, unknown>>('/api/intelligence/advisor'),

  /** NOT MOUNTED — /api/intelligence/simulation-universe */
  simulationUniverse: () =>
    request<Record<string, unknown>>('/api/intelligence/simulation-universe'),
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
