// =============================================================================
// Horquva Continuity Platform — Canonical Domain Interfaces & Types
// =============================================================================
// Implements core models from SRS v0-v2 and Architecture Decisions (AD-1 to AD-11)
// =============================================================================

export type EntityKind = 
  | 'person' 
  | 'automation' 
  | 'credential' 
  | 'tool' 
  | 'vendor' 
  | 'model' 
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
  | 'inferred'  // Derived algorithmically by heuristic or contribution recency
  | 'confirmed' // Explicitly certified by an asset owner or line manager
  | 'unknown';  // First-class state: not yet known or recorded (never treated as false)

export type CriticalityLevel = 
  | 'critical' 
  | 'high' 
  | 'medium' 
  | 'low' 
  | 'unknown';

export type ReplaceabilityLevel = 
  | 'hard' 
  | 'moderate' 
  | 'easy' 
  | 'unknown';

export type FactAttribute = 
  | 'criticality' 
  | 'documented' 
  | 'fallback_exists' 
  | 'run_volume_weekly' 
  | 'status'
  | 'failure_rate_weekly';

export interface CanonicalEntity {
  id: string; // e.g. 'person:omar@acme.com', 'automation:n8n:41'
  kind: EntityKind;
  name: string;
  description?: string | null;
  external_refs: Record<string, string>; // e.g. { "n8n": "41", "entra": "uuid-here" }
  created_at: Date;
  updated_at: Date;
}

export interface CanonicalEdge {
  id: string;
  from_id: string;
  to_id: string;
  type: EdgeType;
  grade: EvidenceGrade;
  source: string; // e.g. 'connector:n8n', 'connector:entra', 'attestation'
  source_ref?: string | null;
  valid_from: Date;
  valid_to?: Date | null;
}

export interface CanonicalFact<T = unknown> {
  id: string;
  entity_id: string;
  attribute: FactAttribute;
  value: T;
  grade: EvidenceGrade;
  source: string;
  source_ref?: string | null;
  attested_by?: string | null;
  valid_from: Date;
  valid_to?: Date | null;
}

export interface ChangeEvent {
  id: string;
  kind: 
    | 'person_left' 
    | 'owner_changed' 
    | 'workflow_edited' 
    | 'model_swapped' 
    | 'credential_risk' 
    | 'failures_spiked';
  entity_id?: string | null;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  impact_summary: {
    critical_assets_orphaned?: string[];
    automations_stopped?: string[];
    affected_runs_weekly?: number;
    dependents_count?: number;
  };
  detected_at: Date;
  acknowledged_at?: Date | null;
  acknowledged_by?: string | null;
}

export interface CheckResult {
  checkId: string;
  entityId: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
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

export interface WhatIfScenarioInput {
  departingPersonIds?: string[];
  failingAssetIds?: string[];
  failingVendorIds?: string[];
  failingModelIds?: string[];
  successorAssignments?: Record<string, string>; // assetId -> successorPersonId
}

export interface WhatIfScenarioImpact {
  orphanedCriticalAssets: {
    id: string;
    name: string;
    criticality: CriticalityLevel;
    formerOwnerId: string;
    backupStatus: 'none' | 'unknown';
  }[];
  brokenCredentialAutomations: {
    id: string;
    name: string;
    credentialOwnerId: string;
    runsPerWeek: number;
  }[];
  affectedDownstreamAssets: {
    id: string;
    name: string;
    kind: EntityKind;
  }[];
  runsPerWeekAtRisk: number;
  unresolvedUnknownsCount: number;
  successorLoad?: {
    successorPersonId: string;
    newCriticalAssetCount: number;
    shareOfCompanyCriticalAssets: number;
  };
}

export interface AttestationAnswers {
  is_owner: boolean;
  backup_person_id?: string | null;
  criticality: CriticalityLevel;
  criticality_reason: string;
  is_documented: boolean;
  documentation_url?: string | null;
  fallback_exists: boolean | 'unknown';
}

export interface PredictionLedgerRecord {
  id: string;
  claim_type: 'disruption_probability_range' | 'automation_failure_trend';
  target_entity_id: string;
  predicted_range: {
    min: number;
    max: number;
    expected: number;
  };
  model_version: string;
  inputs: Record<string, unknown>;
  predicted_at: Date;
  evaluation_due_at: Date;
  actual_outcome?: boolean | null;
  brier_score?: number | null;
  evaluated_at?: Date | null;
}
