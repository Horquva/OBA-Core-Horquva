export type ExecutionStatus = 'CREATED' | 'INITIALIZING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | string;

export interface ExperimentRecord {
  id: string;
  name: string;
  seed: number;
  config: Record<string, any>;
  status: ExecutionStatus | string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface SyntheticArtifact {
  artifact_id: string;
  artifact_type: string;
  name?: string;
  description?: string;
  size_bytes?: number;
  created_at?: string;
  lifecycle_state?: string;
  metadata?: Record<string, any>;
}

export interface SyntheticDataCorpusPreview {
  experiment_id: string;
  corpus_id?: string;
  status?: string;
  lineage_available: boolean;
  accepted_artifacts: SyntheticArtifact[];
  total_artifacts?: number;
}

export interface StructuredAssessment {
  assessment_id?: string;
  experiment_id: string;
  context?: string;
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

export interface RuntimeMessage {
  type: string;
  payload: any;
  timestamp?: string;
}