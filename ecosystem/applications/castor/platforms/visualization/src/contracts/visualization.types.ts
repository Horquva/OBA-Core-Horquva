export type VisualizationState =
  | "idle"
  | "loading"
  | "empty"
  | "partial"
  | "ready"
  | "stale"
  | "invalid"
  | "unavailable"
  | "permission-restricted"
  | "error";

export interface VisualizationMetadata {
  source?: string;
  provenance?: string;
  updatedAt?: string;
  isStale?: boolean;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartSeries {
  id: string;
  label: string;
  data: ChartDataPoint[];
  color?: string;
}

export type MetricStatus = "positive" | "negative" | "neutral" | "warning";

export interface MetricData {
  label: string;
  value: number;
  unit?: string;
  trend?: number;
  status?: MetricStatus;
  comparisonLabel?: string;
  metadata?: VisualizationMetadata;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "person" | "team" | "project" | "knowledge" | "entity";
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  actor?: string;
  category?: string;
  source?: string;
  confidence?: number;
}

export interface VisualizationBaseProps {
  state?: VisualizationState;
  width?: number | string;
  height?: number;
  accessibleLabel: string;
}