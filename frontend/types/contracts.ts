// =============================================================================
// Horquva Continuity Platform — Frontend Presentation Contracts
// =============================================================================
// Strictly defines the presentation interfaces for the 7 Core Screens.
// Decoupled from CSS/styling so the dedicated Design Document can be applied
// directly without touching business logic or component props.
// =============================================================================

import {
  CanonicalEntity,
  CheckResult,
  HeadlineMetrics,
  WhatIfScenarioResult,
  SuccessionTestResult,
  AttestationTask,
  AttestationAnswers,
  EntityKind,
} from '@horquva/types';

export interface OverviewScreenProps {
  headlineMetrics: HeadlineMetrics;
  activeAlerts: CheckResult[];
  unknownChecks: CheckResult[];
  onTriggerSync?: () => Promise<void>;
  onLaunchCampaign?: () => void;
}

export interface InventoryScreenProps {
  entities: CanonicalEntity[];
  selectedKind?: EntityKind;
  onFilterChange?: (kind: EntityKind | 'all') => void;
  onSelectEntity?: (entityId: string) => void;
}

export interface SimulationScreenProps {
  people: Array<{ id: string; name: string }>;
  models: Array<{ id: string; name: string }>;
  onSimulateLeaver: (personIds: string[]) => Promise<WhatIfScenarioResult>;
  onSimulateOutage: (modelId: string) => Promise<{ affectedAutomations: Array<{ id: string; name: string; runsPerWeek: number }>; totalRunsPerWeekAffected: number }>;
  onTestSuccession: (leaverId: string, successorId: string) => Promise<SuccessionTestResult>;
}

export interface AttestationWebFormProps {
  task: AttestationTask;
  assetName: string;
  reviewerName: string;
  reviewerEmail: string;
  onSubmit: (answers: AttestationAnswers) => Promise<boolean>;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
}

export interface AskHorquvaWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
  onAsk: (query: string) => Promise<string>;
}

export interface CampaignManagementProps {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    dueDate: string;
    totalTasks: number;
    completedTasks: number;
  }>;
  onCreateCampaign: (name: string, dueDate: Date, tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>) => Promise<string>;
}

export interface V0N8nCheckScreenProps {
  onRunCheck: (n8nUrl: string, apiKey: string) => Promise<Record<string, unknown>>;
  isScanning: boolean;
  results?: Record<string, unknown>;
  error?: string | null;
}
