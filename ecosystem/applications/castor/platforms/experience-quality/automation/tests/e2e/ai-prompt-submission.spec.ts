import { test, expect } from '@playwright/test';
import { AppShellPage } from '../pages/app-shell.page';
import { AiPromptPanel } from '../pages/ai-prompt-panel.page';

test.describe('AI prompt submission @smoke', () => {
  test('submits a reasoning question and renders an answer', async ({ page }) => {
    const shell = new AppShellPage(page);
    const prompt = new AiPromptPanel(page);
    await shell.goto('dashboard');

    const response = await prompt.submitPrompt('What are our biggest organizational risks?');
    expect(response.status()).toBe(200);
    await prompt.expectSuccessfulAnswer();
  });

  test('empty prompt is blocked client-side (no request fired)', async ({ page }) => {
    const shell = new AppShellPage(page);
    const prompt = new AiPromptPanel(page);
    await shell.goto('dashboard');

    let requestFired = false;
    page.on('request', (r) => {
      if (r.url().includes('/api/brain/ask')) requestFired = true;
    });
    if (!(await prompt.promptInput.isVisible())) {
      await page.getByRole('button', { name: /avatar profile/i }).click();
    }
    await prompt.promptInput.press('Enter');
    await page.waitForTimeout(500);
    expect(requestFired).toBeFalsy();
  });

  test('backend error on ask surfaces a graceful, user-readable message', async ({ page }) => {
    const shell = new AppShellPage(page);
    const prompt = new AiPromptPanel(page);
    await shell.goto('dashboard');

    await page.route('**/api/brain/ask', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'internal error' }) }),
    );
    if (!(await prompt.promptInput.isVisible())) {
      await page.getByRole('button', { name: /avatar profile/i }).click();
    }
    await prompt.promptInput.fill('Trigger a backend failure');
    await prompt.promptInput.press('Enter');
    await prompt.expectGracefulError();
  });

  test('long-running request shows a loading state, not a frozen UI', async ({ page }) => {
    const shell = new AppShellPage(page);
    const prompt = new AiPromptPanel(page);
    await shell.goto('dashboard');

    await page.route('**/api/brain/ask', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'ok' }) });
    });
    if (!(await prompt.promptInput.isVisible())) {
      await page.getByRole('button', { name: /avatar profile/i }).click();
    }
    await prompt.promptInput.fill('Slow question');
    await prompt.promptInput.press('Enter');
    await expect(prompt.loadingIndicator).toBeVisible();
  });
});
