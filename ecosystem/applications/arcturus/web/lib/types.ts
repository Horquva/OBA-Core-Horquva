export interface SyntheticArtifact {
  artifact_id: string;
  artifact_type: string;
  name?: string;
  description?: string;
  size_bytes?: number;
  created_at?: string;
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
  verdict: string;
  confidence_score: number;
  reasoning: string;
  recommendations?: string[];
  metrics?: Record<string, number>;
  generated_at?: string;
}

export interface RuntimeMessage {
  type: string;
  payload: any;
  timestamp?: string;
}