/**
 * Arcturus Generated TypeScript Contract Types
 * AUTO-GENERATED FILE by scripts/sync_types.py — DO NOT EDIT MANUALLY
 * Source: ecosystem/applications/arcturus/contracts/
 */


export enum ExperimentStatus {
  CREATED = 'CREATED',
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED'
}

/** Master execution context inherited by every Arcturus contract.
Merged to satisfy both Control Plane (Ontology) and Runtime Engine requirements. */
export interface SimulationContext {
  run_id?: string; // Unique identifier for the current simulation run
  trace_id?: string; // Traceability identifier for cross-platform logging and evaluation
  experiment_id: string; // Stable identifier for the overarching scenario experiment
  global_seed: number; // Deterministic seed to ensure reproducible entity resolution and state transitions
  created_at?: string; // Timestamp of context initialization
  config?: Record<string, any>; // Optional run-specific configurations
}

/** Standard data envelope emitted by Maaz's simulation runtime clock loop.
Consumed by Amina's evaluation engine and Ahmed's data pipeline. */
export interface SimulationEventPayload {
  metadata: SimulationContext;
  event_id: string; // Unique event identifier
  event_type: string; // E.g., TASK_COMPLETED, POLICY_BREACH, AGENT_ESCALATION
  affected_entities?: number[]; // List of structural IDs affected
  observed_state_changes: string; // Serialized state transition log payload
}

/** Global standardized error response format across all Arcturus FastAPI endpoints.
Maps to ArcturusValidationError and platform exceptions. */
export interface APIErrorResponse {
  error_code: string; // Unique machine-readable error code
  message: string; // Human-readable error explanation
  platform_source: string; // Platform origin raising the error
  timestamp?: string; // Timestamp when the error occurred
  details?: Record<string, any>; // Additional context or validation metadata
}

/** Configuration parameters defining an overarching simulation experiment. */
export interface ExperimentConfig {
  scenario_id?: string; // Identifier of the scenario template to execute
  global_seed?: number; // Deterministic seed for reproducibility
  duration_ticks?: number; // Total simulation ticks to run
  tick_delay_seconds?: number; // Wall-clock delay between ticks
  parameters?: Record<string, any>; // Arbitrary scenario and workforce overrides
}

/** Persistent record representing an experiment in SQLite and REST responses. */
export interface ExperimentRecord {
  id: string; // Unique experiment identifier
  name: string; // Human-readable experiment name
  seed: number; // Global deterministic seed
  config: ExperimentConfig; // Experiment configuration payload
  status?: ExperimentStatus; // Current experiment status
  created_at?: string; // Experiment creation timestamp
  started_at?: any; // Timestamp when execution began
  completed_at?: any; // Timestamp when execution ended
}

/** Persistent record representing a specific execution run of an experiment. */
export interface SimulationRunRecord {
  run_id?: string; // Unique run identifier
  experiment_id: string; // Parent experiment identifier
  trace_id?: string; // Traceability UUID for logs and telemetry
  status?: ExperimentStatus; // Current run execution status
  started_at?: string; // Run start timestamp
  ended_at?: any; // Run completion timestamp
}

/** Deterministic lineage record ensuring every generated artifact, metric,
and event can be traced back to its root experiment configuration. */
export interface ProvenanceRecord {
  experiment_id: string; // Root experiment identifier
  run_id: string; // Simulation run identifier
  seed: number; // Deterministic seed used
  tick: number; // Simulation tick count when generated
  event_id: string; // Specific simulation event ID that triggered creation
  entity_id?: any; // Optional entity ID primarily involved
  parent_hashes?: string[]; // Direct upstream ancestor lineage hashes
  lineage_hash: string; // SHA-256 deterministic hash of this provenance record
  created_at?: string; // Timestamp of provenance registration
  metadata?: Record<string, any>; // Supplementary lineage tags
}

/** SSE Event Protocol shapes received over GET /api/events/{experiment_id} */
export type SSEEvent =
  | { type: 'STAGE_CHANGE'; experiment_id: string; stage: string }
  | { type: 'TICK'; experiment_id: string; payload: { tick: number; state_snapshot: Record<string, any> } }
  | { type: 'EVENT'; experiment_id: string; payload: SimulationEventPayload }
  | { type: 'STATUS_UPDATE'; experiment_id: string; status: ExecutionStatus }
  | { type: 'ERROR'; experiment_id: string; error_code: string; message: string };
