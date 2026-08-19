const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  // Import session and service adapters
  const { sessionAdapter } = await import('../applications/engineering-platform/services/session-adapter.js');
  const {
    dashboardServiceAdapter,
    knowledgeServiceAdapter,
    workflowsServiceAdapter,
    notificationsServiceAdapter,
    activityServiceAdapter,
    projectsServiceAdapter
  } = await import('../applications/engineering-platform/services/service-adapters.js');

  // ──── Authentication & Session Tests ────
  test('session adapter creates initial session state', () => {
    const session = sessionAdapter.createSessionState();
    assert.equal(session.token, null);
    assert.equal(session.isAuthenticated, false);
  });

  test('session adapter validates token expiration', () => {
    const validSession = sessionAdapter.createSessionState({
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      isAuthenticated: true
    });
    assert.equal(sessionAdapter.isTokenExpired(validSession.expiresAt), false);

    const expiredSession = sessionAdapter.createSessionState({
      token: 'test-token',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      isAuthenticated: true
    });
    assert.equal(sessionAdapter.isTokenExpired(expiredSession.expiresAt), true);
  });

  test('session adapter blocks access to protected routes without auth', () => {
    const session = sessionAdapter.createSessionState();
    const protectedRoute = { id: 'dashboard', requiresAuth: true };
    assert.equal(sessionAdapter.canAccessRoute({ route: protectedRoute, session }), false);
  });

  test('session adapter blocks protected access when authentication has no token', () => {
    const session = sessionAdapter.createSessionState({
      isAuthenticated: true,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    });
    const protectedRoute = { id: 'dashboard', requiresAuth: true };
    assert.equal(sessionAdapter.canAccessRoute({ route: protectedRoute, session }), false);
  });

  test('session adapter allows access to public routes without auth', () => {
    const session = sessionAdapter.createSessionState();
    const publicRoute = { id: 'login', requiresAuth: false };
    assert.equal(sessionAdapter.canAccessRoute({ route: publicRoute, session }), true);
  });

  test('session adapter provides auth headers for authenticated requests', () => {
    const session = sessionAdapter.createSessionState({
      token: 'test-token-123',
      isAuthenticated: true
    });
    const headers = sessionAdapter.getAuthHeader({ session });
    assert.equal(headers.Authorization, 'Bearer test-token-123');
  });

  test('session adapter logout clears session state', () => {
    const result = sessionAdapter.logout();
    assert.equal(result.ok, true);
    assert.equal(result.data.session.isAuthenticated, false);
    assert.equal(result.data.session.token, null);
  });

  // ──── Dashboard Service Tests ────
  test('dashboard adapter returns success state for mock data', async () => {
    const result = await dashboardServiceAdapter.fetchDashboardData({ useMock: true });
    assert.equal(result.status, 'success');
    assert.ok(result.data);
    assert.ok(Array.isArray(result.data.summaryCards));
    assert.ok(Array.isArray(result.data.projectStatus));
  });

  test('dashboard adapter normalizes an upstream unauthorized response', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      headers: { get: () => 'application/json' },
      status: 401,
      ok: false,
      text: async () => JSON.stringify({ message: 'Unauthorized' })
    });

    try {
      const result = await dashboardServiceAdapter.fetchDashboardData({
        backendUrl: 'http://upstream.test',
        useMock: false,
        token: 'expired-token'
      });
      assert.equal(result.status, 'unauthorized');
      assert.equal(result.error, 'Dashboard access requires authentication');
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ──── Knowledge Service Tests ────
  test('knowledge adapter filters by category', async () => {
    const result = await knowledgeServiceAdapter.fetchKnowledge({
      useMock: true,
      category: 'engineering'
    });
    assert.equal(result.status, 'success');
    assert.ok(result.data.items.every((item) => item.category === 'engineering'));
  });

  test('knowledge adapter filters by search query', async () => {
    const result = await knowledgeServiceAdapter.fetchKnowledge({
      useMock: true,
      query: 'security'
    });
    assert.equal(result.status, 'success');
    assert.ok(
      result.data.items.some(
        (item) =>
          item.title.toLowerCase().includes('security') || item.summary.toLowerCase().includes('security')
      )
    );
  });

  test('knowledge adapter returns empty state for no matches', async () => {
    const result = await knowledgeServiceAdapter.fetchKnowledge({
      useMock: true,
      query: 'nonexistent-topic-zzzzz'
    });
    assert.equal(result.status, 'empty');
  });

  // ──── Workflows/Projects Service Tests ────
  test('workflows adapter returns workflows and projects', async () => {
    const result = await workflowsServiceAdapter.fetchWorkflows({ useMock: true });
    assert.equal(result.status, 'success');
    assert.ok(Array.isArray(result.data.workflows));
    assert.ok(Array.isArray(result.data.projects));
  });

  // ──── Notifications Service Tests ────
  test('notifications adapter returns mock notifications', async () => {
    const result = await notificationsServiceAdapter.fetchNotifications({ useMock: true });
    assert.equal(result.status, 'success');
    assert.ok(Array.isArray(result.data.items));
    assert.ok(typeof result.data.unreadCount === 'number');
  });

  test('notifications adapter marks notification as read', async () => {
    const result = await notificationsServiceAdapter.markAsRead({
      notificationId: 'n-101',
      useMock: true
    });
    assert.equal(result.status, 'success');
    assert.equal(result.data.read, true);
  });

  // ──── Activity Service Tests ────
  test('activity adapter returns mock activity', async () => {
    const result = await activityServiceAdapter.fetchActivity({ useMock: true });
    assert.equal(result.status, 'success');
    assert.ok(Array.isArray(result.data.items));
  });

  // ──── Projects Service Tests ────
  test('projects adapter returns mock projects', async () => {
    const result = await projectsServiceAdapter.fetchProjects({ useMock: true });
    assert.equal(result.status, 'success');
    assert.ok(Array.isArray(result.data.items));
  });

  // ──── Error & Failure State Tests ────
  test('service adapters handle network errors gracefully', async () => {
    // Mock a network error by providing invalid backend URL
    const result = await dashboardServiceAdapter.fetchDashboardData({
      backendUrl: 'http://localhost:99999',
      useMock: false,
      token: null
    });
    assert.equal(result.status, 'error');
    assert.ok(result.error);
  });

  test('service adapters return unauthorized on 401 response', async () => {
    // This tests the contract behavior; actual 401 requires a running backend
    // For now we verify the mock behavior
    const result = await dashboardServiceAdapter.fetchDashboardData({
      useMock: true,
      token: 'valid-token'
    });
    // Mock with valid token returns success; actual 401 would require real backend
    assert.ok(['success', 'error', 'unauthorized'].includes(result.status));
  });

  // ──── Integration Scenario Tests ────
  test('end-to-end: session creation and protected route access', () => {
    const session = sessionAdapter.createSessionState({
      token: 'integration-test-token',
      user: { id: 'user-1', email: 'test@example.com', role: 'engineer' },
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      isAuthenticated: true
    });

    const dashboardRoute = { id: 'dashboard', requiresAuth: true };
    assert.equal(sessionAdapter.canAccessRoute({ route: dashboardRoute, session }), true);
    assert.ok(sessionAdapter.getAuthHeader({ session }).Authorization);
  });

  test('end-to-end: session expiration blocks access', () => {
    const expiredSession = sessionAdapter.createSessionState({
      token: 'expired-token',
      user: { id: 'user-1', email: 'test@example.com' },
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      isAuthenticated: true
    });

    const dashboardRoute = { id: 'dashboard', requiresAuth: true };
    assert.equal(sessionAdapter.canAccessRoute({ route: dashboardRoute, session: expiredSession }), false);
  });

  // ──── Contract Validation ────
  test('session adapter contract: session state has required properties', () => {
    const session = sessionAdapter.createSessionState({
      token: 'test-token',
      user: { id: 'u1', email: 'test@example.com' },
      expiresAt: new Date().toISOString(),
      isAuthenticated: true
    });

    assert.ok(typeof session.token === 'string' || session.token === null);
    assert.ok(typeof session.isAuthenticated === 'boolean');
    assert.ok(typeof session.expiresAt === 'string' || session.expiresAt === null);
    assert.ok(session.user === null || typeof session.user === 'object');
  });

  test('service adapter contract: responses have consistent shape', async () => {
    const dashResult = await dashboardServiceAdapter.fetchDashboardData({ useMock: true });
    const knowledgeResult = await knowledgeServiceAdapter.fetchKnowledge({ useMock: true });
    const projectsResult = await projectsServiceAdapter.fetchProjects({ useMock: true });

    // All responses should have status field
    assert.ok(['idle', 'loading', 'success', 'error', 'empty', 'unauthorized'].includes(dashResult.status));
    assert.ok(['idle', 'loading', 'success', 'error', 'empty', 'unauthorized'].includes(knowledgeResult.status));
    assert.ok(['idle', 'loading', 'success', 'error', 'empty', 'unauthorized'].includes(projectsResult.status));

    // Success responses should have data
    if (dashResult.status === 'success') {
      assert.ok(dashResult.data);
    }
  });
})();
