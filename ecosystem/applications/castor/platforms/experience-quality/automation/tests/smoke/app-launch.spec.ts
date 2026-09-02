import { test, expect } from '../../fixtures';

/**
 * Smoke: Application Launch
 *
 * Verifies the application under test (BASE_URL) is reachable and returns
 * a successful response.
 *
 * This intentionally does NOT assert on a specific page title, heading,
 * or element because the real Castor application page content has not
 * been confirmed for this suite yet.
 *
 * Once the real application is connected, extend this file with additional
 * smoke assertions using known application elements.
 */
test.describe('Smoke: Application Launch', () => {
  test('application root responds successfully', async ({ page }) => {
    const response = await page.goto('/');

    expect(
      response,
      'Expected a response from BASE_URL. Is BASE_URL set and reachable? See .env.example.'
    ).not.toBeNull();

    expect(
      response!.status(),
      'Expected a successful (< 400) response from the application root.'
    ).toBeLessThan(400);
  });
});