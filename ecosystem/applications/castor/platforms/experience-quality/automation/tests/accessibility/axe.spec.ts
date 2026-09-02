import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('homepage accessibility scan', async ({ page }) => {
    await page.goto('/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Verify the application loaded correctly
    await expect(page.locator('body')).toBeVisible();

    console.log('URL:', page.url());
    console.log('TITLE:', await page.title());
    console.log('H1 COUNT:', await page.locator('h1').count());
    console.log('MAIN COUNT:', await page.locator('main').count());

    // Make sure the expected semantic structure exists
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();

    // Run axe
    const accessibilityScanResults = await new AxeBuilder({
      page,
    })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        JSON.stringify(
          accessibilityScanResults.violations,
          null,
          2
        )
      );
    }

    expect(
      accessibilityScanResults.violations,
      'Accessibility violations found'
    ).toEqual([]);
  });
});