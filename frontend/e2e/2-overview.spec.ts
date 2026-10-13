import { test, expect, signIn, apiGet } from './helpers';

interface Overview {
  metrics: { totalCriticalAssets: number; fullyCoveredCriticalAssets: number; exposedCriticalAssets: number };
}
interface SpofAssets {
  assets: Array<{ asset: { name: string } }>;
}

// Flow 2: the Overview shows the backend's own counts and single points of failure,
// not placeholder numbers, and its links lead into the app.
test('Overview shows the real coverage counts and top single points of failure', async ({ page, context }) => {
  await signIn(context, 'admin');
  const { metrics } = await apiGet<Overview>(page.request, '/api/continuity/overview');
  const spof = await apiGet<SpofAssets>(page.request, '/api/continuity/spof-assets?limit=5');
  expect(metrics.totalCriticalAssets, 'fixture should have critical assets').toBeGreaterThan(0);

  await page.goto('/overview');

  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(
    page.getByText(`${metrics.fullyCoveredCriticalAssets} of ${metrics.totalCriticalAssets} critical assets fully covered`),
  ).toBeVisible();
  for (const row of spof.assets.slice(0, 3)) {
    await expect(page.getByText(row.asset.name).first()).toBeVisible();
  }

  // The desktop shell: sidebar navigation into a core screen.
  const sidebar = page.getByRole('complementary', { name: 'Main sidebar' });
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole('link', { name: /Departures/ }).click();
  await expect(page).toHaveURL(/\/departures$/);
  await expect(page.getByRole('heading', { name: 'Departures & Handover' })).toBeVisible();
});
