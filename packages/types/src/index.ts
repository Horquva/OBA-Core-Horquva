// =============================================================================
// Horquva Continuity Platform — Canonical Domain Types (@horquva/types)
// =============================================================================
// Strictly defines all entities, edges, SCD2 facts, checks, simulations,
// attestation campaigns, identity review items, and A/B testing interfaces.
// =============================================================================

export type EntityKind = 
  | 'person'
  | 'automation'
  | 'credential'
  | 'model'
  | 'vendor'
  | 'group'
  | 'app'
  | 'process';

export type EdgeType = 
  | 'owns'
  | 'backs_up'
  | 'depends_on'
  | 'calls_model'
  | 'runs_on_credentials_of'
  | 'member_of';

export type EvidenceGrade = 
  | 'stated'    // Pulled directly from an authoritative API
  | 'inferred'  // Derived from heuristics, version history, or git commits
  | 'confirmed' // Explicitly certified by an asset owner or manager
  | 'unknown';  // Unrecorded / unconfirmed state (never treated as false/no)

export type CriticalityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export type FactAttribute = 
  | 'criticality'
  | 'documented'
  | 'fallback_exists'
  | 'run_volume_weekly'
  | 'status';

export interface CanonicalEntity {
  id: string; // e.g. 'person:omar@acme.com', 'automation:n8n:41'
  kind: EntityKind;
  name: string;
  description?: string;
  externalRefs: Record<string, string>; // e.g. { n8n: '41', entra: 'guid' }
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalEdge {
  id?: string;
  fromId: string;
  toId: string;
  type: EdgeType;
  grade: EvidenceGrade;
  source: string; // e.g. 'n8n', 'entra', 'google', 'attestation'
  sourceRef?: string;
  validFrom: Date;
  validTo?: Date | null;
}

export interface CanonicalFact {
  id?: string;
  entityId: string;
  attribute: FactAttribute;
  value: any; // e.g. 'critical', true, 'https://notion.so/...'
  grade: EvidenceGrade;
  source: string;
  sourceRef?: string;
  attestedBy?: string | null; // personId
  validFrom: Date;
  validTo?: Date | null;
}

export type ChangeEventKind = 
  | 'person_left'
  | 'owner_changed'
  | 'workflow_edited'
  | 'model_swapped'
  | 'credential_risk'
  | 'failures_spiked';

export interface ChangeEvent {
  id: string;
  kind: ChangeEventKind;
  entityId?: string | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  impactSummary: {
    orphanedCriticalAssetsCount?: number;
    affectedRunVolumeWeekly?: number;
    affectedWorkflowIds?: string[];
  };
  detectedAt: Date;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
}

export type CheckStatus = 'PASS' | 'FAIL' | 'UNKNOWN';

export interface CheckResult {
  checkId: string;
  entityId: string;
  status: CheckStatus;
  evidenceFactIds: string[];
  reason: string;
}

export interface CheckDefinition {
  id: string;
  name: string;
  description: string;
  targetKind: EntityKind;
  evaluate(entity: CanonicalEntity, facts: Map<FactAttribute, CanonicalFact>, edges: CanonicalEdge[]): CheckResult;
}

export interface HeadlineMetrics {
  totalCriticalAssets: number;
  fullyCoveredCriticalAssets: number;
  exposedCriticalAssets: number;
  unknownCriticalFacts: number;
  definition: string;
}

export interface WhatIfScenarioInput {
  departingPersonIds?: string[];
  failingAssetIds?: string[];
  unavailableVendorIds?: string[];
}

export interface WhatIfScenarioResult {
  orphanedCriticalAssets: Array<{
    entityId: string;
    name: string;
    priorOwnerId: string;
    criticality: CriticalityLevel;
  }>;
  stoppedPersonalCredentialAutomations: Array<{
    workflowId: string;
    workflowName: string;
    credentialOwnerId: string;
    weeklyRuns: number;
  }>;
  totalRunsPerWeekAffected: number;
  affectedDownstreamAssetIds: string[];
  unknownFactsEncountered: number;
}

export interface SuccessionTestResult {
  departingPersonId: string;
  successorPersonId: string;
  transferredAssetCount: number;
  postHandoverCoverage: {
    coveredCount: number;
    stillExposedCount: number;
  };
  successorNewConcentrationLoad: {
    totalCriticalAssetsOwned: number;
    shareOfCompanyCriticalAutomationsPct: number;
    overloadWarning: boolean;
  };
}

export interface AttestationAnswers {
  isOwner: boolean;
  backupPersonId?: string | null;
  criticality: CriticalityLevel;
  criticalityReason?: string;
  isDocumented: boolean;
  documentationUrl?: string;
  fallbackExists: boolean;
}

export interface AttestationTask {
  id: string;
  campaignId: string;
  reviewerPersonId: string;
  assetEntityId: string;
  status: 'pending' | 'submitted' | 'escalated';
  token: string;
  answers: AttestationAnswers | Record<string, never>;
  escalatedToManagerId?: string | null;
  remindersSent: number;
  submittedAt?: Date | null;
  createdAt: Date;
}

export interface IdentityQueueItem {
  id: string;
  externalAccountId: string;
  source: string;
  displayName?: string | null;
  emailCandidate?: string | null;
  status: 'pending' | 'linked' | 'service_account' | 'departed' | 'ignored';
  linkedPersonId?: string | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
}

export interface PredictionLedgerEntry {
  id: string;
  claimType: string;
  targetEntityId: string;
  predictedRange: {
    min: number;
    max: number;
    expected: number;
  };
  modelVersion: string;
  inputs: Record<string, any>;
  predictedAt: Date;
  evaluationDueAt: Date;
  actualOutcome?: boolean | null;
  brierScore?: number | null;
  evaluatedAt?: Date | null;
}

export interface ABExperiment {
  id: string;
  name: string;
  description: string;
  variants: string[]; // e.g. ['variant_a', 'variant_b']
  weights: number[];  // e.g. [50, 50]
  isActive: boolean;
  createdAt: Date;
}

export interface ABAssignment {
  id?: string;
  experimentId: string;
  subjectKey: string; // e.g. user_id or entity_id
  assignedVariant: string;
  assignedAt: Date;
}
