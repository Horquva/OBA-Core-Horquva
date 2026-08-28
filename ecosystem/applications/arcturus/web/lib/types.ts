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

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}