import { test, expect } from '@playwright/test';

test.describe('Responsive Shell Layout E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock minimal overview and shell API endpoints
    await page.route('**/api/continuity/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: {
            totalCriticalAssets: 10,
            fullyCoveredCriticalAssets: 8,
            exposedCriticalAssets: 2,
            unknownCriticalAssets: 0,
            definition: 'Counted facts only.',
          },
        }),
      });
    });

    await page.route('**/api/changes/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          since: null,
          peopleLeft: 0,
          backupsLost: 0,
          newlyExposed: 0,
          resolved: 0,
        }),
      });
    });

    await page.route('**/api/changes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/nav-counts', async (route) => {
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
  });

  test('displays full sidebar on desktop (1280px)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Desktop sidebar should be visible
    const sidebar = page.locator('aside[aria-label="Main sidebar"]');
    await expect(sidebar).toBeVisible();

    // Mobile bottom tab bar should NOT be visible
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(mobileNav).not.toBeVisible();

    // Nav item text should be visible
    await expect(sidebar.getByText('Departures')).toBeVisible();
    await expect(sidebar.getByText('What-If')).toBeVisible();
  });

  test('collapses to mobile tab bar on mobile viewport (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Desktop sidebar should be hidden
    const sidebar = page.locator('aside[aria-label="Main sidebar"]');
    await expect(sidebar).not.toBeVisible();

    // Mobile navigation tab bar should be visible at bottom
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(mobileNav).toBeVisible();

    // Key mobile navigation items should exist
    await expect(mobileNav.getByText('Overview')).toBeVisible();
    await expect(mobileNav.getByText('Departures')).toBeVisible();
    await expect(mobileNav.getByText('Actions')).toBeVisible();
  });
});
