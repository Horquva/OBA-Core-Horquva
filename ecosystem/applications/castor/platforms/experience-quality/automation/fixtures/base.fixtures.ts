import { test as base, expect } from '@playwright/test';

/**
 * Base fixture set for Experience Quality automation.
 *
 * This intentionally does NOT implement application-specific authentication
 * or login flows, because no such flow has been confirmed against the real
 * Castor application yet. Each fixture below is a documented extension
 * point: implement the body once the corresponding application behavior is
 * confirmed, without changing the call sites in tests.
 */

type QualityFixtures = {
  /** Navigates to the application root and waits for it to be interactive. */
  appReady: void;
};

export const test = base.extend<QualityFixtures>({
  appReady: async ({ page }, use) => {
    // Placeholder navigation using BASE_URL from playwright.config.ts.
    // Replace the wait condition below once real load/ready signals
    // (e.g. a specific test-id, network-idle state, or app event) are known.
    await page.goto('/');
    await use(undefined);
  },
});

export { expect };

/**
 * EXTENSION POINTS (documented, not implemented):
 *
 * - authenticatedPage: would log in as a seeded test user and return an
 *   authenticated `page`. Not implemented — no confirmed auth flow exists
 *   yet for the Castor application. When available, add a fixture here
 *   that reads credentials from test-data/ (never hardcoded) and performs
 *   the real login steps.
 *
 * - apiContext: would provide a pre-configured `request` context for
 *   API-level setup/teardown once real API endpoints are confirmed.
 *
 * - testUser: would provide a fixture-scoped, disposable test user record
 *   sourced from test-data/users.json, created and torn down per test.
 */
