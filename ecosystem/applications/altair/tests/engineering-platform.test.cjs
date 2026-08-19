const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  const engineering = await import('../applications/engineering-platform/index.js');

  test('engineering platform exposes dashboard, projects, knowledge, notifications, profile, settings and workflows', () => {
    const ids = engineering.engineeringPlatformCatalog.map((route) => route.id);
    assert.ok(ids.includes('dashboard'));
    assert.ok(ids.includes('projects'));
    assert.ok(ids.includes('knowledge'));
    assert.ok(ids.includes('notifications'));
    assert.ok(ids.includes('profile'));
    assert.ok(ids.includes('settings'));
    assert.ok(ids.includes('workflows'));
  });

  test('dashboard composition includes summary, project status, notifications and activity', () => {
    const dashboard = engineering.renderDashboardExperience({ filter: 'all' });
    assert.equal(dashboard.status, 'success');
    assert.ok(Array.isArray(dashboard.summaryCards));
    assert.ok(Array.isArray(dashboard.projectStatus));
    assert.ok(Array.isArray(dashboard.notifications));
    assert.ok(Array.isArray(dashboard.activity));
  });

  test('projects experience provides listing, detail and empty states', () => {
    const projects = engineering.renderProjectsExperience({ projects: engineering.mockData.projects, unauthorized: false });
    assert.equal(projects.status, 'success');
    assert.ok(Array.isArray(projects.projects));
    assert.ok(projects.projects[0].name);
    assert.equal(engineering.renderProjectsExperience({ projects: [], unauthorized: false }).status, 'empty');
    assert.equal(engineering.renderProjectsExperience({ projects: null, unauthorized: true }).status, 'unauthorized');
  });

  test('knowledge experience supports search, filters and categories', () => {
    const knowledge = engineering.renderKnowledgeExperience({ query: 'ai', category: 'engineering', items: engineering.mockData.knowledge });
    assert.equal(knowledge.status, 'success');
    assert.ok(Array.isArray(knowledge.categories));
    assert.ok(Array.isArray(knowledge.items));
    assert.ok(knowledge.items[0].title.includes('AI') || knowledge.items[0].title.includes('ai'));
    assert.equal(engineering.renderKnowledgeExperience({ query: 'zzz', items: [] }).status, 'empty');
  });

  test('notifications experience supports read/unread and action-required states', () => {
    const notifications = engineering.renderNotificationsExperience({ items: engineering.mockData.notifications });
    assert.equal(notifications.status, 'success');
    assert.ok(Array.isArray(notifications.items));
    assert.ok(notifications.items.some((item) => item.actionRequired === true));
    assert.equal(engineering.renderNotificationsExperience({ items: [] }).status, 'empty');
    assert.equal(engineering.renderNotificationsExperience({ unauthorized: true }).status, 'unauthorized');
  });

  test('profile and settings surfaces render metadata and configuration', () => {
    const profile = engineering.renderProfileExperience();
    const settings = engineering.renderSettingsExperience();
    assert.equal(profile.status, 'success');
    assert.equal(settings.status, 'success');
    assert.ok(profile.user.name);
    assert.ok(Array.isArray(settings.configurations));
  });

  test('request adapter exposes loading, success, empty, error and unauthorized contract-safe states', async () => {
    const adapter = engineering.contractSafeEngineeringService;
    const loading = adapter.createState('loading', { ok: true });
    const success = adapter.createState('success', { ok: true, items: [{ id: 'x' }] });
    const empty = adapter.createState('empty', { ok: true, items: [] });
    const error = adapter.createState('error', { ok: false, error: 'Service failure' });
    const unauthorized = adapter.createState('unauthorized', { ok: false, status: 401, error: 'Unauthorized' });

    assert.equal(loading.status, 'loading');
    assert.equal(success.status, 'success');
    assert.equal(empty.status, 'empty');
    assert.equal(error.status, 'error');
    assert.equal(unauthorized.status, 'unauthorized');
  });

  test('engineer app renders route-specific states and accessible metadata', () => {
    const view = engineering.renderEngineeringApp({ route: 'dashboard' });
    assert.equal(view.route, 'dashboard');
    assert.ok(view.accessibility.label);
    assert.ok(view.sections.length >= 1);

    const fallback = engineering.renderEngineeringApp({ route: 'unknown-route' });
    assert.equal(fallback.route, 'dashboard');
  });
})();
