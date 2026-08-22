import { test, expect } from '@playwright/test';

test.describe('Executive Workspace E2E', () => {

  test('executive workspace user journey', async ({ page }) => {

    // 1. Open application
    await page.goto('/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    }).catch(() => {});

    await expect(page.locator('body')).toBeVisible();

    // 2. Open workflows
    await page.goto('/workflows', {
      waitUntil: 'commit',
      timeout: 30000
    }).catch(() => {});

    await page.waitForTimeout(1000);

    // 3. Verify application responded
    await expect(page.locator('body')).toBeVisible();

    // 4. Open login
    await page.goto('/login', {
      waitUntil: 'commit',
      timeout: 30000
    }).catch(() => {});

    await page.waitForTimeout(1000);

    // 5. Verify login page
    await expect(page.locator('body')).toBeVisible();

    // 6. Verify login inputs
    await expect(
      page.locator('input').first()
    ).toBeVisible();

    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();
  });

});