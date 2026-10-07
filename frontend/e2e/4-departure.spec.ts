import { test, expect, signIn, apiGet, people, pickFromCombobox } from './helpers';

interface Departures {
  departures: Array<{ id: string; person: { id: string; name: string }; stage: string; group: string; assetsTotal: number }>;
}
interface Assets {
  assets: Array<{ owner: { ref: { id: string } | null } }>;
}
interface DepartureDetail {
  handover: Array<{ asset: { name: string } }>;
}

// Flow 4: an admin records a departure; it appears as upcoming with its handover pack,
// and the workbench lists the assets that need a successor.
test('initiating a departure opens a handover workbench for that person', async ({ page, context }) => {
  await signIn(context, 'admin');

  // The asset owner with the most assets and no open departure, so the pack is non-empty.
  const open = new Set(
    (await apiGet<Departures>(page.request, '/api/departures')).departures.filter((d) => d.stage !== 'verified').map((d) => d.person.id),
  );
  const owned = new Map<string, number>();
  for (const a of (await apiGet<Assets>(page.request, '/api/assets')).assets) {
    if (a.owner.ref) owned.set(a.owner.ref.id, (owned.get(a.owner.ref.id) ?? 0) + 1);
  }
  const candidates = (await people(page.request)).filter((p) => !open.has(p.id) && owned.has(p.id));
  candidates.sort((a, b) => owned.get(b.id)! - owned.get(a.id)!);
  expect(candidates.length, 'fixture should have an asset owner without an open departure').toBeGreaterThan(0);
  const leaver = candidates[0];

  const leaveDate = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);

  await page.goto('/departures');
  await page.getByRole('button', { name: '+ Initiate Departure' }).click();
  const sheet = page.getByRole('dialog', { name: 'Initiate Departure' });
  await expect(sheet).toBeVisible();

  const submit = sheet.getByRole('button', { name: 'Initiate Departure', exact: true });
  await expect(submit).toBeDisabled();
  await pickFromCombobox(page, sheet.getByLabel(/Departing Employee/), leaver.name.split(' ')[0], leaver.name);
  await sheet.getByLabel(/Effective Leave Date/).fill(leaveDate);
  await sheet.getByLabel(/Transition Notes/).fill('E2E: recorded by the smoke suite');
  await submit.click();

  await expect(page.getByText('Departure initiated')).toBeVisible();
  await expect(sheet).toBeHidden();

  // The backend now holds it, as upcoming, with a handover pack.
  const created = (await apiGet<Departures>(page.request, '/api/departures')).departures.find((d) => d.person.id === leaver.id);
  expect(created, 'departure saved by the backend').toBeTruthy();
  expect(created!).toMatchObject({ stage: 'initiated', group: 'upcoming' });
  expect(created!.assetsTotal).toBeGreaterThan(0);

  // And the list shows it under Upcoming with the same counts.
  const upcoming = page.getByRole('tabpanel');
  await expect(upcoming.getByRole('link', { name: leaver.name })).toBeVisible();
  await expect(upcoming.getByText(`0 of ${created!.assetsTotal} assets`)).toBeVisible();

  await upcoming.getByRole('link', { name: leaver.name }).click();
  await expect(page).toHaveURL(new RegExp(`/departures/${encodeURIComponent(created!.id)}$`));
  await expect(page.getByRole('heading', { level: 1, name: leaver.name })).toBeVisible();

  const detail = await apiGet<DepartureDetail>(page.request, `/api/departures/${encodeURIComponent(created!.id)}`);
  expect(detail.handover.length).toBe(created!.assetsTotal);
  for (const item of detail.handover) {
    await expect(page.getByText(item.asset.name).first()).toBeVisible();
  }
});
