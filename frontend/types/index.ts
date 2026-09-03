export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Agent {
  id: string;
  name: string;
  owner: string | null;
  backup_owner: string | null;
  criticality: RiskLevel;
  department: string;
  documented: boolean;
}

export interface Dependency {
  from: string;
  to: string;
  // company.json labels dependencies by severity rather than by relationship
  // kind (the old sunrise_care.json's 'sequential'/'triggers'/'feeds' vocabulary).
  type: 'critical' | 'high' | 'normal' | 'low';
}

export interface AITool {
  id: string;
  name: string;
  vendor: string;
  category: string;
  users: string[];
  departments: string[];
  workflows: string[];
  agents_using: string[];
  monthly_cost_usd: number;
  criticality: RiskLevel;
  documented: boolean;
  backup_tool: string | null;
  access_owner: string;
}

export interface WorkflowStep {
  step: number;
  actor: 'human' | 'tool' | 'agent';
  name: string;
  action: string;
}

export interface Workflow {
  id: string;
  name: string;
  owner: string;
  backup_owner: string | null;
  department: string;
  criticality: RiskLevel;
  documented: boolean;
  steps: WorkflowStep[];
}

export interface Dataset {
  company: string;
  employees: number;
  agents: Agent[];
  dependencies: Dependency[];
  ai_tools: AITool[];
  workflows: Workflow[];
}
