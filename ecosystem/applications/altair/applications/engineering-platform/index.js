export { mockData } from './data/mock-data.js';
export { SummaryCard, StatusBadge, SectionFrame, DetailList, NavigationList } from './components/reusable.js';
export { engineeringPlatformCatalog, engineeringPlatformRouteMap, resolveEngineeringRoute } from './features/navigation.js';
export { contractSafeEngineeringService } from './services/contract-safe-service.js';
export { sessionAdapter } from './services/session-adapter.js';
export {
  dashboardServiceAdapter,
  knowledgeServiceAdapter,
  workflowsServiceAdapter,
  notificationsServiceAdapter,
  activityServiceAdapter,
  projectsServiceAdapter
} from './services/service-adapters.js';
export {
  renderDashboardExperience,
  renderProjectsExperience,
  renderKnowledgeExperience,
  renderNotificationsExperience,
  renderProfileExperience,
  renderSettingsExperience,
  renderWorkflowExperience,
  renderActivityExperience,
  renderEngineeringApp,
  engineeringPlatformState
} from './features/index.js';
