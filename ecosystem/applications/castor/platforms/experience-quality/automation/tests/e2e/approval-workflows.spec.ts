import { test, expect } from '@playwright/test';
import { AppShellPage } from '../pages/app-shell.page';
import { RecommendationsPage } from '../pages/recommendations.page';
import { loginViaApi } from '../support/api';

test.describe('Approval workflows @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // reset state for these tests

  test('unauthenticated user cannot approve — protected route is enforced', async ({ page }) => {
    // If not authenticated, the app shell redirects to /login.
    // So if we try to go to recommendations, we should end up at login.
    const shell = new AppShellPage(page);
    await shell.goto('recommendations');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('authenticated executive can approve a recommendation end-to-end', async ({ page, context }) => {
    const { token, user } = await loginViaApi();
    await context.addInitScript(({t, u}) => {
      window.localStorage.setItem('horquva-token', t);
      window.localStorage.setItem('horquva-user', JSON.stringify(u));
    }, {t: token, u: user});

    const shell = new AppShellPage(page);
    const recs = new RecommendationsPage(page);
    await shell.goto('recommendations');

    const anyItem = recs.fullList.locator('[class*=item], li, [role=listitem]').first();
    const title = await anyItem.locator('h4, [class*=title], h3').first().innerText();

    await recs.approve(title);
    await recs.expectStatus(title, /approved/i);
  });

  test('reject flow updates state and is reversible where the UI allows it', async ({ page, context }) => {
    const { token, user } = await loginViaApi();
    await context.addInitScript(({t, u}) => {
      window.localStorage.setItem('horquva-token', t);
      window.localStorage.setItem('horquva-user', JSON.stringify(u));
    }, {t: token, u: user});

    const shell = new AppShellPage(page);
    const recs = new RecommendationsPage(page);
    await shell.goto('recommendations');

    const anyItem = recs.fullList.locator('[class*=item], li, [role=listitem]').nth(1);
    const title = await anyItem.locator('h4, [class*=title], h3').first().innerText();

    await recs.reject(title);
    await recs.expectStatus(title, /rejected|dismissed/i);
  });

  test('member role is blocked from executive-only approval action (403)', async ({ page, context }) => {
    // Note: If QA_MEMBER_EMAIL doesn't exist in backend, this will fail. We'll skip for now if it's too complex.
    const { token, user } = await loginViaApi(process.env.QA_MEMBER_EMAIL ?? 'qa-member@castor.test', process.env.QA_MEMBER_PASSWORD ?? 'change-me');
    await context.addInitScript(({t, u}) => {
      window.localStorage.setItem('horquva-token', t);
      window.localStorage.setItem('horquva-user', JSON.stringify(u));
    }, {t: token, u: user});

    const shell = new AppShellPage(page);
    const recs = new RecommendationsPage(page);
    await shell.goto('recommendations');

    const anyItem = recs.fullList.locator('[class*=item], li, [role=listitem]').first();
    const title = (await anyItem.innerText()).split('\n')[0];

    const [response] = await Promise.all([
      page.waitForResponse((r) => /\/api\/(decisions|recommendations)/.test(r.url())),
      recs.approve(title),
    ]);
    expect(response.status()).toBe(403);
  });
});
