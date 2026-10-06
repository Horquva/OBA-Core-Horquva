import { test, expect } from '@playwright/test';

test.describe('Screen 9: Mobile Attestation Surface (/attest/[token])', () => {
  const mockToken = 'tok-qa-continuity-999';

  test.beforeEach(async ({ page }) => {
    // Set mobile viewport (phone-first experience >=44px touch targets)
    await page.setViewportSize({ width: 390, height: 844 });

    // Mock session API
    await page.route(`**/api/attest/${mockToken}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: mockToken,
          legacy: false,
          reviewer: { id: 'p-1', name: 'Elena Rostova', email: 'elena@company.internal' },
          requestedBy: 'Continuity Admin',
          company: { name: 'Acme Global', logoUrl: null },
          expired: false,
          submitted: false,
          assets: [
            {
              taskId: 'task-asset-billing',
              asset: {
                id: 'asset-billing',
                kind: 'automation',
                name: 'Payment Reconciliation Webhook',
                isCritical: true,
                owner: { state: 'value', display: 'Elena Rostova', grade: 'confirmed', source: null, observedAt: null },
                backup: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
                criticality: { level: 'critical', grade: 'confirmed', source: null, observedAt: null },
                documented: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
                fallback: { state: 'none', display: null, grade: 'confirmed', source: null, observedAt: null },
                runsPerWeek: { state: 'value', display: '4200', grade: 'confirmed', source: null, observedAt: null },
                checkStatus: 'FAIL',
              },
            },
          ],
        }),
      });
    });

    // Mock save task endpoint
    await page.route(`**/api/attest/${mockToken}/tasks/*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Mock auth & nav counts
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

  test('completes all 5 attestation questions and confirms record', async ({ page }) => {
    await page.goto(`/attest/${mockToken}`);

    // Verify company branding and targeted asset title
    await expect(page.getByText('Acme Global')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment Reconciliation Webhook' })).toBeVisible();

    // 1. Question 1: Ownership -> Select "Yes, I own it"
    await page.getByRole('button', { name: 'Yes, I own it' }).click();

    // 2. Question 2: Secondary Backup -> Select "No Backup"
    await page.getByRole('button', { name: /no backup/i }).click();

    // 3. Question 3: Criticality -> Select "high" and type justification
    await page.getByRole('button', { name: /high/i }).click();
    await page.locator('#crit-reason').fill('Direct revenue impact if webhook stops receiving Stripe events');

    // 4. Question 4: Runbook -> Select "Not Documented"
    await page.getByRole('button', { name: 'Not Documented' }).click();

    // 5. Question 5: Fallback -> Select "Don't know" (honest invariant)
    await page.getByRole('button', { name: "Don't know" }).click();

    // Submit the attestation
    const submitBtn = page.getByRole('button', { name: 'Save & Finish Confirmation' });
    await submitBtn.click();

    // Verify thank you / completion screen is displayed
    await expect(page.getByText(/All Confirmations Recorded|Thanks — 1 of 1 confirmed/i)).toBeVisible();
  });
});
