export function createAppState() {
  return {
    sidebarOpen: true,
    themeMode: 'light',
    notifications: 0,
    activeRoute: 'dashboard',
    isHydrated: false
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
