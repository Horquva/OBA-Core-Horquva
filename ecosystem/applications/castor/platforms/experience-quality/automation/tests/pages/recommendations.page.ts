import { Page, Locator, expect } from '@playwright/test';

/** Recommendations ("/recommendations") — Top5Urgent + RecommendationList approval actions. */
export class RecommendationsPage {
  readonly page: Page;
  readonly top5: Locator;
  readonly fullList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.top5 = page.getByTestId('top5-urgent').or(page.locator('[class*=Top5]'));
    this.fullList = page.getByTestId('recommendation-list').or(page.locator('[class*=RecommendationList]'));
  }

  itemByTitle(title: string): Locator {
    return this.fullList.locator('[class*=item], li, [role=listitem]').filter({ hasText: title });
  }

  async approve(title: string) {
    const item = this.itemByTitle(title);
    if (!(await item.getByRole('button', { name: /approve|accept/i }).isVisible())) {
      await item.click();
    }
    await item.getByRole('button', { name: /approve|accept/i }).click();
  }

  async reject(title: string) {
    const item = this.itemByTitle(title);
    if (!(await item.getByRole('button', { name: /reject|dismiss/i }).isVisible())) {
      await item.click();
    }
    await item.getByRole('button', { name: /reject|dismiss/i }).click();
  }

  async expectStatus(title: string, status: RegExp) {
    await expect(this.itemByTitle(title)).toContainText(status);
  }

  /** Approval writes require auth — 401 on an unauthenticated attempt is the expected/correct behavior. */
  async expectAuthRequiredOnApprove(title: string) {
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/(decisions|recommendations)/.test(r.url())),
      this.approve(title),
    ]);
    expect(response.status()).toBe(401);
  }
}
