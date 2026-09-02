import { Page, Locator, expect } from '@playwright/test';

/**
 * AI prompt submission surface — wraps whichever screen hosts the Brain "ask" input
 * (Executive Avatar / dashboard assistant). Calls through to POST /api/brain/ask.
 */
export class AiPromptPanel {
  readonly page: Page;
  readonly promptInput: Locator;
  readonly submitButton: Locator;
  readonly responsePanel: Locator;
  readonly loadingIndicator: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.promptInput = page.getByRole('textbox', { name: /ask|prompt|question/i });
    this.submitButton = page.getByRole('button', { name: /ask|submit|send/i });
    this.responsePanel = page.getByTestId('brain-response').or(page.locator('article', { hasText: 'OBA' }));
    this.loadingIndicator = page.getByText(/thinking|loading|analyzing/i).or(page.locator('.animate-bounce')).first();
    this.errorBanner = page.getByRole('alert').or(page.getByText(/Sorry, I couldn't reach|error/i));
  }

  async submitPrompt(text: string) {
    if (!(await this.promptInput.isVisible())) {
      await this.page.getByRole('button', { name: /avatar profile/i }).click();
    }
    await this.promptInput.fill(text);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/brain/ask') && r.request().method() === 'POST'),
      this.promptInput.press('Enter'),
    ]);
    return response;
  }

  async expectSuccessfulAnswer() {
    await expect(this.responsePanel).toBeVisible({ timeout: 15_000 });
    await expect(this.responsePanel).not.toBeEmpty();
  }

  async expectGracefulError() {
    await expect(this.errorBanner).toBeVisible();
    await expect(this.errorBanner).not.toContainText(/stack|traceback|at Object\./i);
  }
}
