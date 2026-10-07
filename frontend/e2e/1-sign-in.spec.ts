import { test, expect, apiGet } from './helpers';
import { API } from './env';

// Flow 1: a signed-out visitor is sent to sign-in, comes back to the page they asked for,
// and signing out really ends the session.
test('signed-out visit → sign-in → back to the page asked for → sign out', async ({ page }) => {
  await page.goto('/what-if');

  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fwhat-if$/);
  await expect(page.getByRole('heading', { name: 'Sign in to OBA' })).toBeVisible();
  // The E2E backend has no SSO credentials, so no provider button may be offered.
  await expect(page.getByRole('button', { name: /Continue with/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'admin', exact: true }).click();

  await expect(page).toHaveURL(/\/what-if$/);
  await expect(page.getByRole('heading', { name: 'What-If Continuity Simulator' })).toBeVisible();
  const session = await apiGet<{ email: string; role: string }>(page.request, '/api/auth/session');
  expect(session).toMatchObject({ email: 'alex@acme.com', role: 'admin' });

  await page.getByRole('button', { name: /User settings for Alex Rivera/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  const after = await page.request.get(`${API}/api/auth/session`);
  expect(after.status()).toBe(401);

  // Signed out means protected pages send you back to sign-in again.
  await page.goto('/departures');
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fdepartures$/);
});
