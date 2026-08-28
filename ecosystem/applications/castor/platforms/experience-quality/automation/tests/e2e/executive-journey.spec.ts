import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('Executive User Journey', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Sign in');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('dashboard page is reachable', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/(login)?$/);
  });

  test('executive dashboard renders correctly', async ({ page }) => {
    test.skip(
      !EMAIL || !PASSWORD,
      'E2E_EMAIL and E2E_PASSWORD must be configured'
    );

    await page.goto('/login');

    await page.getByLabel('Email').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Sign in' }).click();

    const loginResponse = await loginResponsePromise;

    console.log('LOGIN STATUS:', loginResponse.status());

    const responseBody = await loginResponse.text();
    console.log('LOGIN RESPONSE:', responseBody);

    await expect(page).toHaveURL(/\/$/, {
      timeout: 10000,
    });

    await expect(page.locator('main')).toBeVisible();

    const bodyText = await page.locator('body').innerText();

    expect(bodyText.length).toBeGreaterThan(50);
  });
});