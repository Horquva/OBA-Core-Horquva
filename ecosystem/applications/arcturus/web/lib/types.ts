export type ExecutionStatus = 'CREATED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface ExperimentRecord {
  id: string;
  name: string;
  status: ExecutionStatus;
  seed: number;
  config: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}