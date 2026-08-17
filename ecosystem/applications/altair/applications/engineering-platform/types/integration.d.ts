/**
 * Part 4 Integration Types
 *
 * Type definitions for session, authentication, and service integration contracts.
 */

export interface SessionState {
  token: string | null;
  user: User | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  org?: string;
}

export interface AuthResponse {
  ok: boolean;
  status: number;
  error?: string;
  data?: {
    session: SessionState;
    user: User;
  };
}

export interface ServiceResponse<T> {
  ok: boolean;
  status: number;
  error?: string;
  data?: T;
}

export interface DashboardData {
  agents?: number;
  orphanedAgents?: number;
  activeAgents?: number;
  riskScore?: number;
  criticalDependencies?: number;
  totalDependencies?: number;
  openRecommendations?: number;
  latestSnapshot?: {
    date: string;
    memoryHealth: number;
    continuityScore: number;
    governanceScore: number;
    riskIndex: number;
  };
  summaryCards?: Array<{
    id: string;
    title: string;
    value: string | number;
    change?: string;
    context?: string;
    status: string;
  }>;
  projectStatus?: Array<{
    id: string;
    project: string;
    progress: number;
    health: string;
    owner: string;
    risk: string;
  }>;
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    read: boolean;
    actionRequired: boolean;
  }>;
  activity?: Array<{
    id: string;
    title: string;
    detail?: string;
    time?: string;
  }>;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  access: string;
  updated: string;
}

export interface KnowledgeData {
  items: KnowledgeItem[];
  categories?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  actionRequired: boolean;
  category: string;
  timestamp: string;
}

export interface NotificationData {
  items: Notification[];
  unreadCount: number;
}

export interface Workflow {
  id: string;
  name: string;
  state: string;
  owner: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  owner: string;
  phase: string;
  updated: string;
  metadata: {
    capacity?: string;
    budget?: string;
    risk: string;
  };
  description: string;
  approvedResources: string[];
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
}

export interface IntegrationReadinessStatus {
  capability: string;
  upstreamFound: boolean;
  approved: boolean;
  integration: 'real' | 'contract-ready' | 'mocked' | 'blocked';
  fallback: string;
  status: string;
}
