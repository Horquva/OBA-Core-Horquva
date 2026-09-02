import { test, expect } from '@playwright/test';

test.describe('Experience Quality Smoke Tests', () => {

  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads successfully', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('body')).toBeVisible();

    await expect(
      page.locator('input').first()
    ).toBeVisible();

    await expect(
      page.locator('input[type="password"]')
    ).toBeVisible();
  });

  test('workflows page loads successfully', async ({ page }) => {
    await page.goto('/workflows');

    await expect(page.locator('body')).toBeVisible();
  });

});