import { createErrorRequestState, createLoadingRequestState, createIdleRequestState } from '../../../platforms/web-foundation/index.js';
import { mockData } from '../data/mock-data.js';
import { DetailList, NavigationList, SectionFrame, StatusBadge, SummaryCard } from '../components/reusable.js';
import { resolveEngineeringRoute } from './navigation.js';

function buildEmptyState(title, description) {
  return {
    status: 'empty',
    title,
    description,
    accessibility: { role: 'status', polite: true }
  };
}

function buildUnauthorizedState(title, description) {
  return {
    status: 'unauthorized',
    title,
    description,
    accessibility: { role: 'alert', polite: false }
  };
}

function buildErrorState(title, message) {
  return {
    status: 'error',
    title,
    message,
    accessibility: { role: 'alert', polite: false }
  };
}

export function renderDashboardExperience({ filter = 'all', summary = mockData.summaryCards, projectStatus = mockData.projectStatus, notifications = mockData.notifications, activity = mockData.activity } = {}) {
  const filteredSummary = Array.isArray(summary) ? summary : [];
  const filteredProjects = Array.isArray(projectStatus) ? projectStatus : [];
  const filteredNotifications = Array.isArray(notifications) ? notifications : [];
  const filteredActivity = Array.isArray(activity) ? activity : [];

  if (!filteredSummary.length && !filteredProjects.length && !filteredNotifications.length && !filteredActivity.length) {
    return { ...buildEmptyState('No operational data', 'No dashboard data is available for this filter right now.'), filter, sections: [] };
  }

  const summaryCards = filteredSummary.map((item) => SummaryCard(item));
  const projectSummary = filteredProjects.map((item) => ({
    ...item,
    badge: StatusBadge({ label: item.health, tone: item.health === 'on-track' ? 'success' : item.health === 'watch' ? 'warning' : 'danger' })
  }));

  return {
    status: 'success',
    filter,
    summaryCards,
    projectStatus: projectSummary,
    notifications: filteredNotifications.map((item) => ({ ...item, badge: StatusBadge({ label: item.actionRequired ? 'Action required' : item.read ? 'Read' : 'Unread', tone: item.actionRequired ? 'warning' : item.read ? 'neutral' : 'info' }) })),
    activity: filteredActivity,
    navigation: NavigationList({ items: ['Overview', 'Ops review', 'Alerts'] }),
    sections: [
      SectionFrame({ heading: 'Engineering summary', description: 'Current delivery and operational health across the portfolio.', items: summaryCards }),
      SectionFrame({ heading: 'Project status', description: 'Portfolio execution and risk health.', items: projectSummary }),
      SectionFrame({ heading: 'Notifications', description: 'Recent operational alerts and required actions.', items: filteredNotifications }),
      SectionFrame({ heading: 'Activity', description: 'Recent system and team activity.', items: filteredActivity })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering dashboard overview'
    }
  };
}

export function renderProjectsExperience({ projects = mockData.projects, unauthorized = false } = {}) {
  if (unauthorized) {
    return { ...buildUnauthorizedState('Projects unavailable', 'You do not have access to the project portfolio right now.'), projects: [] };
  }

  if (!Array.isArray(projects) || !projects.length) {
    return { ...buildEmptyState('No projects available', 'There are no projects in the approved portfolio for this view.'), projects: [] };
  }

  const preparedProjects = projects.map((project) => ({
    ...project,
    statusBadge: StatusBadge({ label: project.status, tone: project.status === 'On track' ? 'success' : project.status === 'Watch' ? 'warning' : 'danger' }),
    details: DetailList({ title: 'Project details', entries: Object.entries(project.metadata || {}).map(([key, value]) => ({ label: key, value })) })
  }));

  return {
    status: 'success',
    projects: preparedProjects,
    summary: `${preparedProjects.length} active projects`,
    sections: [
      SectionFrame({ heading: 'Project listing', description: 'Approved engineering projects and overview metadata.', items: preparedProjects })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering projects overview'
    }
  };
}

export function renderKnowledgeExperience({ query = '', category = 'all', items = mockData.knowledge, unauthorized = false } = {}) {
  if (unauthorized) {
    return { ...buildUnauthorizedState('Knowledge unavailable', 'You do not have access to approved knowledge content.'), items: [] };
  }

  const normalizedQuery = String(query || '').trim().toLowerCase();
  const filteredItems = (Array.isArray(items) ? items : []).filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesQuery = !normalizedQuery || `${item.title} ${item.summary} ${item.tags?.join(' ') ?? ''}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  if (!filteredItems.length) {
    return {
      ...buildEmptyState('No knowledge matches', 'No knowledge content matches your current search and filter criteria.'),
      query,
      category,
      categories: ['all', 'engineering', 'security', 'governance', 'design'],
      items: []
    };
  }

  return {
    status: 'success',
    query,
    category,
    categories: ['all', 'engineering', 'security', 'governance', 'design'],
    items: filteredItems,
    sections: [
      SectionFrame({ heading: 'Knowledge library', description: 'Approved knowledge items and operational guidance.', items: filteredItems })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering knowledge library'
    }
  };
}

export function renderNotificationsExperience({ items = mockData.notifications, unauthorized = false } = {}) {
  if (unauthorized) {
    return { ...buildUnauthorizedState('Notifications unavailable', 'You do not have access to notification details right now.'), items: [] };
  }

  const preparedItems = Array.isArray(items) ? items : [];

  if (!preparedItems.length) {
    return { ...buildEmptyState('No notifications', 'There are no notifications to display for your current context.'), items: [] };
  }

  return {
    status: 'success',
    items: preparedItems.map((item) => ({
      ...item,
      badge: StatusBadge({ label: item.actionRequired ? 'Action required' : item.read ? 'Read' : 'Unread', tone: item.actionRequired ? 'warning' : item.read ? 'neutral' : 'info' })
    })),
    unreadCount: preparedItems.filter((item) => !item.read).length,
    sections: [
      SectionFrame({ heading: 'Notifications', description: 'Team updates, alerts, and required responses.', items: preparedItems })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering notifications'
    }
  };
}

export function renderProfileExperience() {
  const { user, contacts } = mockData.profile;
  return {
    status: 'success',
    user,
    contacts,
    sections: [
      SectionFrame({ heading: 'Profile', description: 'User identity and operational context.', items: [user, ...contacts] }),
      SectionFrame({ heading: 'Contact information', description: 'Current contact channels and ownership information.', items: contacts })
    ],
    accessibility: {
      role: 'main',
      label: 'User profile'
    }
  };
}

export function renderSettingsExperience() {
  const settings = mockData.settings;
  return {
    status: 'success',
    title: settings.title,
    configurations: settings.configurations,
    sections: [
      SectionFrame({ heading: 'Settings', description: 'User-facing configuration and governance preferences.', items: settings.configurations })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering settings'
    }
  };
}

export function renderWorkflowExperience() {
  return {
    status: 'success',
    workflows: mockData.workflows,
    sections: [
      SectionFrame({ heading: 'Workflows', description: 'Workflow states and operational ownership.', items: mockData.workflows })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering workflows'
    }
  };
}

export function renderActivityExperience({ activity = mockData.activity } = {}) {
  return {
    status: Array.isArray(activity) && activity.length ? 'success' : 'empty',
    activity: Array.isArray(activity) ? activity : [],
    sections: [
      SectionFrame({ heading: 'Activity', description: 'Recent operational and project activity.', items: Array.isArray(activity) ? activity : [] })
    ],
    accessibility: {
      role: 'main',
      label: 'Engineering activity stream'
    }
  };
}

export function renderEngineeringApp({ route = 'dashboard', appState = null } = {}) {
  const requestedRouteId = (route || 'dashboard').toLowerCase();
  const currentRoute = resolveEngineeringRoute(requestedRouteId);
  const routeId = currentRoute.id;
  const state = appState ?? {
    status: 'ready',
    activeRoute: routeId
  };

  const routeViews = {
    dashboard: renderDashboardExperience(),
    projects: renderProjectsExperience(),
    knowledge: renderKnowledgeExperience(),
    notifications: renderNotificationsExperience(),
    activity: renderActivityExperience(),
    profile: renderProfileExperience(),
    settings: renderSettingsExperience(),
    workflows: renderWorkflowExperience()
  };

  const payload = routeViews[routeId] ?? renderDashboardExperience();

  return {
    route: routeId,
    currentRoute,
    appState: state,
    ...payload,
    sections: payload.sections || [SectionFrame({ heading: currentRoute.label, description: currentRoute.summary, items: [] })],
    accessibility: {
      ...payload.accessibility,
      label: `${currentRoute.label} experience`,
      nav: 'navigation'
    }
  };
}

export const engineeringPlatformState = {
  idle: createIdleRequestState({ ok: true }),
  loading: createLoadingRequestState({ ok: true }),
  error: createErrorRequestState({ ok: false }, 'Engineering experience failed to load.'),
  unauthorized: { status: 'unauthorized', data: null, error: 'Unauthorized request. Authentication is required.' }
};
