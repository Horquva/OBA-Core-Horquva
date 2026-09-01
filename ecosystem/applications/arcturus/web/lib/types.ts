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

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'neutral';
  sparkline: number[];
  status: 'success' | 'warning' | 'danger' | 'info';
}

export interface Signal {
  id: string;
  source: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  message: string;
  timestamp: string;
}

export interface Insight {
  id: string;
  type: string;
  content: string;
  confidence: number;
  timestamp: string;
}

export interface SystemComponent {
  id: string;
  name: string;
  status: string;
  uptime: string;
  latency_ms: number;
}

export interface SystemHealth {
  overall_status: string;
  components: SystemComponent[];
  last_updated: string;
}

export interface PerformanceDataPoint {
  timestamp: string;
  throughput: number;
  latency: number;
  memory: number;
}

export interface ExperimentPerformance {
  experiment_id: string;
  points: PerformanceDataPoint[];
}