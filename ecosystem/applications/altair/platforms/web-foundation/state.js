export function sanitizeText(value) {
  if (value === null || value === undefined) return '';

  const normalized = String(value)
    .replace(/<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

export function createAppState() {
  return {
    sidebarOpen: true,
    themeMode: 'light',
    notifications: 0,
    activeRoute: 'dashboard',
    isHydrated: false
  };
}

export function createObservabilityState() {
  return {
    status: 'ready',
    events: ['request-boundary', 'session', 'ui-primitives', 'route-state'],
    timestamp: new Date().toISOString(),
    metrics: {
      enabled: true,
      samplingRate: '1x',
      traceId: 'altair-local-trace'
    }
  };
}

export function createIdleRequestState(data = null) {
  return {
    status: 'idle',
    data,
    error: null,
    updatedAt: null
  };
}

export function createLoadingRequestState(data = null) {
  return {
    status: 'loading',
    data,
    error: null,
    updatedAt: new Date().toISOString()
  };
}

export function createErrorRequestState(data = null, error = 'Request failed.') {
  return {
    status: 'error',
    data,
    error,
    updatedAt: new Date().toISOString()
  };
}

export function updateAppState(state, update) {
  return {
    ...state,
    ...update
  };
}

export function setActiveRoute(state, routeId) {
  return {
    ...state,
    activeRoute: routeId
  };
}
