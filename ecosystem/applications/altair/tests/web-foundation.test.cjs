const test = require('node:test');
const assert = require('node:assert/strict');

const foundation = require('../platforms/web-foundation');

test('theme exports contain reusable semantic tokens', () => {
  assert.equal(foundation.altairTheme.mode, 'light');
  assert.equal(foundation.altairTheme.colors.primary, '#2457f5');
  assert.equal(foundation.darkAltairTheme.mode, 'dark');
});

test('application state helpers create predictable initial state', () => {
  const state = foundation.createAppState();
  assert.equal(state.activeRoute, 'dashboard');
  assert.equal(state.sidebarOpen, true);

  const loading = foundation.createLoadingRequestState({ ok: true });
  assert.equal(loading.status, 'loading');
  assert.equal(loading.data.ok, true);

  const error = foundation.createErrorRequestState(null, 'Bad request');
  assert.equal(error.status, 'error');
  assert.equal(error.error, 'Bad request');
});

test('route catalog contains approved high-level experiences', () => {
  const ids = foundation.altairRoutes.map((route) => route.id);
  assert.ok(ids.includes('dashboard'));
  assert.ok(ids.includes('knowledge'));
  assert.ok(ids.includes('notifications'));
  assert.ok(ids.includes('workflows'));
  assert.ok(ids.includes('projects'));
});

test('UI primitives expose accessible metadata', () => {
  const button = foundation.Button({ label: 'Save', loading: true });
  const field = foundation.InputField({ label: 'Email', name: 'email', value: '' });
  const empty = foundation.EmptyState({ title: 'No items', description: 'Nothing yet.' });

  assert.equal(button.label, 'Save');
  assert.equal(button.accessibility.role, 'button');
  assert.equal(button.accessibility.ariaLabel, 'Save');
  assert.equal(field.accessibility.role, 'textbox');
  assert.equal(field.accessibility.ariaLabel, 'Email');
  assert.equal(empty.accessibility.role, 'status');
});

test('platform quality helpers sanitize input and expose observability readiness', () => {
  const sanitized = foundation.sanitizeText('<script>alert(1)</script><b>Safe</b>');
  assert.equal(sanitized, 'alert(1)Safe');
  assert.equal(foundation.sanitizeText('&lt;script&gt;safe&lt;/script&gt;'), '&lt;script&gt;safe&lt;/script&gt;');

  const telemetry = foundation.createObservabilityState();
  assert.equal(telemetry.status, 'ready');
  assert.ok(Array.isArray(telemetry.events));
});

test('service boundary treats unauthorized responses as contract-safe errors', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    headers: { get: () => 'application/json' },
    status: 401,
    ok: false,
    json: async () => ({ message: 'Unauthorized' })
  });

  try {
    const result = await foundation.requestService({
      method: 'GET',
      url: '/demo',
      timeoutMs: 200
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.equal(result.error, 'Unauthorized request. Authentication is required.');
  } finally {
    global.fetch = originalFetch;
  }
});

test('service boundary preserves empty successful responses', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    headers: { get: () => 'application/json' },
    status: 204,
    ok: true,
    text: async () => ''
  });

  try {
    const result = await foundation.requestService({ method: 'GET', url: '/empty', timeoutMs: 200 });
    assert.deepEqual(result, { ok: true, status: 204, data: null, error: null });
  } finally {
    global.fetch = originalFetch;
  }
});

test('service boundary reports malformed JSON as a contract error', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    headers: { get: () => 'application/json' },
    status: 200,
    ok: true,
    text: async () => '{invalid'
  });

  try {
    const result = await foundation.requestService({ method: 'GET', url: '/malformed', timeoutMs: 200 });
    assert.equal(result.ok, false);
    assert.equal(result.status, 200);
    assert.equal(result.error, 'Invalid JSON response.');
  } finally {
    global.fetch = originalFetch;
  }
});

test('service boundary distinguishes timeout from caller cancellation', async () => {
  const originalFetch = global.fetch;
  global.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });

  try {
    const timeout = await foundation.requestService({ method: 'GET', url: '/slow', timeoutMs: 5 });
    assert.equal(timeout.status, 408);
    assert.equal(timeout.error, 'Request timed out.');

    const abortController = new AbortController();
    const cancelledRequest = foundation.requestService({
      method: 'GET',
      url: '/cancelled',
      timeoutMs: 200,
      signal: abortController.signal
    });
    abortController.abort();
    const cancelled = await cancelledRequest;
    assert.equal(cancelled.status, 0);
    assert.equal(cancelled.error, 'Request cancelled.');
  } finally {
    global.fetch = originalFetch;
  }
});
