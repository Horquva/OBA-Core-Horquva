import { test, expect } from '@playwright/test';

test.describe('Screen 6: What-If Simulator & Blast Radius E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock worst-losses endpoint (S6 Calculation with aggregate floor)
    await page.route('**/api/continuity/simulations/worst-losses', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          vendorsAndModels: [
            {
              entity: { id: 'v-1', name: 'OpenAI Enterprise API', kind: 'vendor' },
              automationsHalted: 6,
              runsPerWeekAffected: 12500,
            },
          ],
          peopleHoldingManyUnbacked: 4,
          threshold: 3,
        }),
      });
    });

    // Mock scenario results
    const scenarioResult = {
      orphanedCriticalAssets: [
        {
          asset: { id: 'asset-billing-webhook', name: 'Payment Webhook Dispatcher', kind: 'automation' },
          priorOwner: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
          criticality: 'critical',
        },
      ],
      stoppedAutomations: [
        {
          workflow: { id: 'wf-stripe', name: 'Stripe Event Router', kind: 'automation' },
          credentialOwner: { id: 'p-1', name: 'Sarah Connor', kind: 'person' },
          weeklyRuns: 4500,
        },
      ],
      runsPerWeekAffected: 4500,
      downstream: [
        { id: 'down-1', name: 'Monthly Ledger Reconciliation', kind: 'automation' },
      ],
      unknownFactsEncountered: 0,
    };

    await page.route('**/api/continuity/simulations/combined*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(scenarioResult),
      });
    });

    await page.route('**/api/continuity/simulations/leaver*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: scenarioResult }),
      });
    });

    // Mock shell session and navigation
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

    await page.route('**/api/nav-counts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ departuresSoon: 1, openCriticalActions: 2, identityPending: 0 }),
      });
    });

    await page.route('**/api/changes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('renders sentence builder and executes blast radius simulation', async ({ page }) => {
    await page.goto('/what-if');

    // Verify page header
    await expect(page.getByRole('heading', { name: /What-If/i })).toBeVisible();

    // Verify Worst Losses S6 section is visible
    await expect(page.getByText('Worst Single Points of Failure')).toBeVisible();
    await expect(page.getByText('OpenAI Enterprise API')).toBeVisible();
    await expect(page.getByText('4 people')).toBeVisible();

    // Click Run Scenario Simulation
    const runBtn = page.getByRole('button', { name: /Run Scenario Simulation|Simulate/i }).first();
    await runBtn.click();

    // Verify simulation result cards appear
    await expect(page.getByText('Payment Webhook Dispatcher')).toBeVisible();
    await expect(page.getByText('Stripe Event Router')).toBeVisible();
  });
});
