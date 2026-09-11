import { OverviewView } from "../features/overview/OverviewView";
import { CatalogView } from "../features/catalog/CatalogView";
import { WorkflowDetailView } from "../features/workflow-detail/WorkflowDetailView";
import { InitiateView } from "../features/initiate/InitiateView";
import { ApprovalCenterView } from "../features/approvals/ApprovalCenterView";
import { ExecutionDetailView } from "../features/execution/ExecutionDetailView";
import { OperationsCenterView } from "../features/operations/OperationsCenterView";
import { HistoryView } from "../features/history/HistoryView";
import { NotificationCenterView } from "../features/notifications/NotificationCenterView";
import { AuditView } from "../features/audit/AuditView";
import { WorkflowBuilderView } from "../features/workflow-builder/WorkflowBuilderView";
import { IntegrationsView } from "../features/platform/IntegrationsView";
import { SchedulesView } from "../features/platform/SchedulesView";
import { SystemHealthView } from "../features/platform/SystemHealthView";
import { AccessControlView } from "../features/platform/AccessControlView";
import { SettingsView } from "../features/platform/SettingsView";
import { IncidentCenterView } from "../features/platform/IncidentCenterView";
import { ChangeCalendarView } from "../features/platform/ChangeCalendarView";
import { RunbooksView } from "../features/platform/RunbooksView";
import { ServiceMapView } from "../features/platform/ServiceMapView";
import { ReportsView } from "../features/platform/ReportsView";

/**
 * Maps a route's `view` id to the feature component that renders it.
 * This is intentionally a plain object rather than react-router: the app
 * has a flat set of top-level screens and simple id-based navigation
 * (see app/AltairApp.jsx). Swap this for react-router routes later
 * without changing any feature component.
 */
export const VIEWS = {
  overview: OverviewView,
  catalog: CatalogView,
  workflow: WorkflowDetailView,
  initiate: InitiateView,
  approvals: ApprovalCenterView,
  execution: ExecutionDetailView,
  operations: OperationsCenterView,
  history: HistoryView,
  notifications: NotificationCenterView,
  audit: AuditView,
  builder: WorkflowBuilderView,
  integrations: IntegrationsView,
  schedules: SchedulesView,
  health: SystemHealthView,
  access: AccessControlView,
  settings: SettingsView,
  incidents: IncidentCenterView,
  changes: ChangeCalendarView,
  runbooks: RunbooksView,
  services: ServiceMapView,
  reports: ReportsView,
};
