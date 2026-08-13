export const altairRoutes = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    requiresAuth: true,
    summary: 'High-level operational overview and alert summary.',
    status: 'approved'
  },
  {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    requiresAuth: true,
    summary: 'Project portfolio and execution overview.',
    status: 'placeholder'
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    path: '/knowledge',
    requiresAuth: true,
    summary: 'Knowledge, documentation, and intelligence assets.',
    status: 'approved'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    requiresAuth: true,
    summary: 'Alerts, updates, and system notices.',
    status: 'approved'
  },
  {
    id: 'activity',
    label: 'Activity',
    path: '/activity',
    requiresAuth: true,
    summary: 'Operational trail, events, and recent user activity.',
    status: 'placeholder'
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    requiresAuth: true,
    summary: 'User profile and preferences.',
    status: 'deferred'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    requiresAuth: true,
    summary: 'Configuration and governance settings.',
    status: 'placeholder'
  },
  {
    id: 'workflows',
    label: 'Workflows',
    path: '/workflows',
    requiresAuth: true,
    summary: 'Workflow orchestration and execution views.',
    status: 'approved'
  }
];

export const altairRouteMap = Object.fromEntries(
  altairRoutes.map((route) => [route.id, route])
);
