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

export interface RuntimeMessage {
  type: 'CONNECTED' | 'STAGE_CHANGE' | 'TICK' | 'STATUS_UPDATE' | 'ERROR' | 'HEARTBEAT';
  experiment_id: string;
  payload?: {
    run_id?: string;
    tick?: number;
    stage?: string;
    status?: string;
    state_summary?: Record<string, unknown>;
    error_code?: string;
    message?: string;
  };
}

export interface SyntheticArtifact {
  artifact_id: string;
  artifact_type: string;
  lifecycle_state: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  provenance: Record<string, unknown>;
  created_at?: string | null;
}

export interface SyntheticDataCorpusPreview {
  run_id: string;
  accepted_artifacts: SyntheticArtifact[];
  lineage_available: boolean;
  rejected_artifacts_available: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}