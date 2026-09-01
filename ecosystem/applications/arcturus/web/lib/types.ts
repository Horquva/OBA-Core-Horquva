export interface SyntheticArtifact {
  artifact_id: string;
  artifact_type: string;
  lifecycle_state?: string;
  name?: string;
  description?: string;
  size_bytes?: number;
  content?: Record<string, unknown>;
  metadata?: Record<string, any>;
  provenance?: Record<string, unknown>;
  created_at?: string;
}

export interface SyntheticDataCorpusPreview {
  run_id: string;
  experiment_id?: string;
  corpus_id?: string;
  status?: string;
  lineage_available: boolean;
  rejected_artifacts_available?: boolean;
  accepted_artifacts: SyntheticArtifact[];
  total_artifacts?: number;
}

export interface StructuredAssessment {
  assessment_id?: string;
  experiment_id?: string;
  context?: {
    experiment_id: string;
    global_seed: number;
    run_id?: string;
    trace_id?: string;
  };
  verdict?: string;
  assessment_summary?: string;
  confidence_score: number;
  reasoning?: string;
  risk_factors?: string[];
  recommendations?: string[];
  evidence_citations?: string[];
  metrics?: Record<string, number>;
  generated_at?: string;
}

export interface ValidationResultContract {
  run_id: string;
  context: {
    experiment_id: string;
    global_seed: number;
    run_id?: string;
    trace_id?: string;
  };
  passed_rules: string[];
  failed_rules: string[];
  flagged_rules: string[];
  final_status: 'validated' | 'rejected' | 'inconclusive';
  reason: string | null;
  evaluated_at: string;
}

export interface RuntimeMessage {
  type: string;
  payload?: any;
  timestamp?: string;
  experiment_id?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type ExecutionStatus =
  | 'CREATED'
  | 'INITIALIZING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export interface ExperimentRecord {
  id: string;
  name: string;
  status: ExecutionStatus;
  seed: number;
  config: {
    scenario_id?: string;
    global_seed?: number;
    duration_ticks?: number;
    tick_delay_seconds?: number;
    parameters?: Record<string, unknown>;
  };
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}