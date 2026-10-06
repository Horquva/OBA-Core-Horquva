import { test, expect } from '@playwright/test';

test.describe('Screen 1: Overview & Briefing E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend responses
    await page.route('**/api/continuity/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalCriticalAssets: 24,
            fullyCoveredCriticalAssets: 18,
            exposedCriticalAssets: 6,
            unknownCriticalAssets: 2,
            definition: 'Counted facts only. An asset is covered if it has a confirmed secondary owner.',
          },
        }),
      });
    });

    await page.route('**/api/changes/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          since: '2026-10-01T00:00:00.000Z',
          peopleLeft: 1,
          backupsLost: 2,
          newlyExposed: 3,
          resolved: 1,
        }),
      });
    });

    await page.route('**/api/continuity/spof-assets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assets: [
            {
              asset: { id: 'asset-billing', name: 'Stripe Billing Webhook', kind: 'automation' },
              reason: 'Single owner with no backup',
              dependsOn: { id: 'p-1', name: 'Elena Rostova', kind: 'person' },
              runsPerWeek: 4500,
            },
          ],
        }),
      });
    });

    await page.route('**/api/departures*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          departures: [
            {
              id: 'dep-1',
              person: { id: 'p-1', name: 'Omar Haddad', kind: 'person' },
              role: 'Lead Architect',
              team: 'Engineering',
              leaveDate: '2026-10-25T00:00:00.000Z',
              stage: 'initiated',
              assetsTotal: 4,
              assetsHandedOver: 1,
              hasAlert: true,
              detectedFrom: 'bamboohr',
              group: 'upcoming',
            },
          ],
        }),
      });
    });

    await page.route('**/api/actions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          actions: [
            {
              id: 'act-1',
              type: 'nominate_backup',
              severity: 'critical',
              problem: 'Critical single point of failure held by single owner.',
              criticalAssetsAffected: 3,
            },
          ],
        }),
      });
    });

    await page.route('**/api/continuity/briefing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          briefing: '# Executive Continuity Briefing\n3 critical workflows gained secondary backups this week.',
        }),
      });
    });

    await page.route('**/api/changes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/nav-counts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          departuresSoon: 1,
          openCriticalActions: 2,
          identityPending: 0,
        }),
      });
    });

    await page.route('**/api/auth/session*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userId: 'usr-dev-admin',
          name: 'Alex Rivera (Dev)',
          email: 'alex.rivera@acme.corp',
          role: 'admin',
          isHrManager: true,
          title: 'Platform Architect & Admin',
        }),
      });
    });
  });

  test('renders headline metrics and coverage strip cleanly', async ({ page }) => {
    page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.text()));
    page.on('pageerror', (err) => console.log('[BROWSER ERROR]', err.message, err.stack));
    page.on('response', (res) => {
      if (res.status() >= 400) console.log('[HTTP ERROR]', res.status(), res.url());
    });

    await page.goto('/');

    // Verify main page title / greeting
    await expect(page.locator('h1')).toBeVisible();

    // Verify coverage strip metrics rendered
    await expect(page.getByText('18 of 24 critical assets fully covered')).toBeVisible();
    await expect(page.getByRole('link', { name: /fully covered/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /exposed/i })).toBeVisible();

    // Verify SPOF asset card displays
    await expect(page.getByText('Stripe Billing Webhook')).toBeVisible();

    // Verify upcoming departures card displays
    await expect(page.getByText('Omar Haddad')).toBeVisible();
  });

  test('navigates to departures handover workbench from overview', async ({ page }) => {
    await page.goto('/');

    // Click on departures card or link
    const departuresLink = page.getByRole('link', { name: /view departures|departures/i }).first();
    await departuresLink.click();

    await expect(page).toHaveURL(/\/departures/);
  });
});
