import { test, expect, signIn, apiPost, people, pickFromCombobox } from './helpers';

interface ScenarioResult {
  orphanedCriticalAssets: Array<{ asset: { name: string } }>;
  stoppedAutomations: unknown[];
  downstream: unknown[];
}

// Flow 3: pick a person in the sentence builder, simulate, and see exactly what the
// backend computed for that departure.
test('What-If: simulating a leaver shows the backend blast radius', async ({ page, context }) => {
  await signIn(context, 'admin');

  // The person whose departure orphans the most critical assets, so the result is non-trivial.
  let leaver: { name: string; result: ScenarioResult } | null = null;
  for (const p of await people(page.request)) {
    const result = await apiPost<ScenarioResult>(page.request, '/api/continuity/simulations/combined', {
      departingPersonIds: [p.id],
      unavailableIds: [],
      failingAssetIds: [],
    });
    if (!leaver || result.orphanedCriticalAssets.length > leaver.result.orphanedCriticalAssets.length) {
      leaver = { name: p.name, result };
    }
  }
  expect(leaver!.result.orphanedCriticalAssets.length, 'fixture should have someone whose leaving orphans an asset').toBeGreaterThan(0);
  const { name, result } = leaver!;

  await page.goto('/what-if');
  await expect(page.getByRole('heading', { name: 'What-If Continuity Simulator' })).toBeVisible();

  const simulate = page.getByRole('button', { name: /Simulate Impact/ });
  await expect(simulate).toBeDisabled();

  await page.getByRole('button', { name: '+ person' }).click();
  await pickFromCombobox(page, page.getByRole('combobox').first(), name.split(' ')[0], name);
  await expect(page.getByRole('button', { name: `Remove ${name}` })).toBeVisible();

  await simulate.click();

  await expect(page.getByRole('heading', { name: 'Simulated Blast Radius & Impact' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Orphaned Critical Assets (${result.orphanedCriticalAssets.length})` }),
  ).toBeVisible();
  for (const row of result.orphanedCriticalAssets) {
    await expect(page.getByRole('link', { name: row.asset.name }).first()).toBeVisible();
  }
});
