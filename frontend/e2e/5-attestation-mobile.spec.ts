import { devices, type Page } from '@playwright/test';
import { test, expect, signIn, apiGet, apiPost, pickFromCombobox } from './helpers';

interface Asset {
  id: string;
  name: string;
  isCritical: boolean;
  owner: { ref: { id: string; name: string } | null };
}
interface CampaignDetail {
  reviewers: Array<{ person: { id: string }; completed: number; total: number }>;
}

const REVIEWER_PERSON = 'person:chen@acme.com';

// iPhone 12 without its WebKit default: the suite runs on Edge (Chromium) with mobile emulation.
const iphone = devices['iPhone 12'];
const IPHONE_12 = {
  viewport: iphone.viewport,
  userAgent: iphone.userAgent,
  deviceScaleFactor: iphone.deviceScaleFactor,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
};

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
}

// Flow 5: an admin sends a confirmation campaign; the reviewer finds it in their queue on a
// phone, answers every asset through the magic link, and the admin sees it completed.
test('reviewer confirms their assets on a phone through the magic link', async ({ browser, page: adminPage, context: adminContext }) => {
  await signIn(adminContext, 'admin');
  // One asset the reviewer owns (they answer all five questions) and one critical asset someone
  // else owns (they say so and name the owner; the backend refuses an owner's answers from a non-owner).
  const { assets } = await apiGet<{ assets: Asset[] }>(adminPage.request, '/api/assets');
  const mine = assets.find((a) => a.owner.ref?.id === REVIEWER_PERSON);
  const theirs = assets.find((a) => a.isCritical && a.owner.ref && a.owner.ref.id !== REVIEWER_PERSON);
  expect(mine, 'fixture should have an asset the reviewer owns').toBeTruthy();
  expect(theirs, 'fixture should have a critical asset someone else owns').toBeTruthy();
  const campaignAssets = [mine!, theirs!];

  const campaignName = `E2E confirmation ${Date.now()}`;
  const dueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  const { campaignId } = await apiPost<{ campaignId: string }>(adminPage.request, '/api/attestation/campaigns', {
    name: campaignName,
    dueDate,
    tasks: campaignAssets.map((a) => ({ reviewerPersonId: REVIEWER_PERSON, assetEntityId: a.id })),
  });

  const phone = await browser.newContext(IPHONE_12);
  const page = await phone.newPage();
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  try {
    await signIn(phone, 'reviewer');

    // The reviewer's own queue lists the campaign and links to the form.
    await page.goto('/my');
    // The smallest element holding both the campaign title and its link: that campaign's card.
    const card = page
      .locator('div', { has: page.getByRole('heading', { name: campaignName }) })
      .filter({ has: page.getByRole('link', { name: /Start Confirmation/ }) })
      .last();
    await expect(card.getByText('2 automations to certify')).toBeVisible();
    await expectNoSidewaysScroll(page);
    await card.getByRole('link', { name: /Start Confirmation/ }).tap();
    await expect(page).toHaveURL(/\/attest\/[0-9a-f]{64}$/);

    // The form keeps its own order; answer whichever asset it shows.
    for (let i = 0; i < campaignAssets.length; i++) {
      const heading = page.getByRole('heading', { level: 2, name: new RegExp(campaignAssets.map((a) => a.name).join('|')) });
      await expect(heading).toBeVisible();
      const shown = (await heading.textContent())?.trim();
      const asset = campaignAssets.find((a) => a.name === shown)!;
      await expectNoSidewaysScroll(page);

      if (asset === mine) {
        await page.getByRole('button', { name: 'Yes, I own it' }).tap();
        await expect(page.getByRole('button', { name: 'Yes, I own it' })).toHaveAttribute('aria-pressed', 'true');
        await page.getByRole('button', { name: /No Backup/ }).tap();
        await page.getByRole('button', { name: 'Criticality: High' }).tap();
        await page.getByLabel(/justification/i).fill('E2E: stops customer billing if it fails');
        await page.getByRole('button', { name: 'Not Documented' }).tap();
        await page.getByRole('button', { name: /Don.t know/ }).tap();
      } else {
        await page.getByRole('button', { name: 'No, someone else owns it' }).tap();
        const owner = asset.owner.ref!.name;
        await pickFromCombobox(page, page.getByRole('combobox', { name: /Who owns it now/ }), owner.split(' ')[0], owner);
      }

      const last = i === campaignAssets.length - 1;
      await page.getByRole('button', { name: last ? 'Save & Finish Confirmation' : /Save & Next Asset/ }).tap();
      await expect(page.getByRole('alert').filter({ hasText: 'Could not save' })).toHaveCount(0);
    }

    await expect(page.getByRole('heading', { name: 'Thanks — answers saved for 2 of 2.' })).toBeVisible();
    await expectNoSidewaysScroll(page);
    expect(errors, 'uncaught page errors on the phone').toEqual([]);
  } finally {
    await phone.close();
  }

  // The answers reached the backend: the admin's campaign shows the reviewer done.
  const detail = await apiGet<CampaignDetail>(adminPage.request, `/api/attestation/campaigns/${campaignId}`);
  expect(detail.reviewers).toEqual([expect.objectContaining({ person: expect.objectContaining({ id: REVIEWER_PERSON }), completed: 2, total: 2 })]);
});
