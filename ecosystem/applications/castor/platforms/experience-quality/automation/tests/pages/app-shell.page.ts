import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared shell: primary nav + auth state. Screen routes per frontend-description.md.
 * Selectors prefer role/text queries first, with data-testid fallback so this suite
 * keeps working before the frontend team adds test ids.
 */
export const ROUTES = {
  dashboard: '/',
  ownership: '/ownership',
  risk: '/risk',
  dependencyMap: '/map',
  simulation: '/simulation',
  recommendations: '/recommendations',
  aiTools: '/ai-tools',
  knowledge: '/knowledge',
  memory: '/memory',
  decision: '/decision',
} as const;

export type RouteKey = keyof typeof ROUTES;

export class AppShellPage {
  readonly page: Page;
  readonly nav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.getByRole('navigation');
  }

  async goto(route: RouteKey) {
    await this.page.goto(ROUTES[route]);
    await this.page.waitForLoadState('domcontentloaded');
  }

  navLink(label: string): Locator {
    return this.nav.getByRole('link', { name: label, exact: false });
  }

  async navigateTo(label: string, expectedPath: string) {
    await this.navLink(label).click();
    await this.page.waitForURL(`**${expectedPath}`);
  }

  async expectNoConsoleErrors(run: () => Promise<void>) {
    const errors: string[] = [];
    const handler = (msg: import('@playwright/test').ConsoleMessage) => {
      if (msg.type() === 'error') errors.push(msg.text());
    };
    this.page.on('console', handler);
    await run();
    this.page.off('console', handler);
    expect(errors, `Unexpected console errors: ${errors.join('\n')}`).toEqual([]);
  }
}
