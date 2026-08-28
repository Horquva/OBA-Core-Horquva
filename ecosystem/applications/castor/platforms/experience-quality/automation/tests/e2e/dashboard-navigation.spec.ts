import { test, expect } from '@playwright/test';
import { AppShellPage, ROUTES } from '../pages/app-shell.page';

/**
 * Core executive flow: dashboard navigation.
 * Walks every screen in frontend-description.md and asserts it loads without
 * console errors, a broken layout, or a stuck loading state.
 */
const SCREENS: { label: string; route: keyof typeof ROUTES; heading: RegExp }[] = [
  { label: 'Dashboard', route: 'dashboard', heading: /executive command center|executive dashboard|overview/i },
  { label: 'Ownership', route: 'ownership', heading: /ownership/i },
  { label: 'Risk', route: 'risk', heading: /risk/i },
  { label: 'Dependency Map', route: 'dependencyMap', heading: /dependency intelligence|dependenc(y|ies) map/i },
  { label: 'Simulation', route: 'simulation', heading: /continuity intelligence|simulation/i },
  { label: 'Recommendations', route: 'recommendations', heading: /recommendation/i },
  { label: 'AI Tools', route: 'aiTools', heading: /ai tool/i },
  { label: 'Knowledge', route: 'knowledge', heading: /knowledge/i },
  { label: 'Org Memory', route: 'memory', heading: /memory/i },
  { label: 'Decision', route: 'decision', heading: /decision/i },
];

test.describe('Dashboard navigation @smoke', () => {
  for (const screen of SCREENS) {
    test(`loads ${screen.label} via direct navigation`, async ({ page }) => {
      const shell = new AppShellPage(page);
      await shell.expectNoConsoleErrors(async () => {
        await shell.goto(screen.route);
      });
      await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible();
      await expect(page.getByText(/^error|failed to fetch|something went wrong$/i)).toHaveCount(0);
    });
  }

  test('primary nav links traverse every screen in sequence', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto('dashboard');
    for (const screen of SCREENS.slice(1)) {
      await shell.navigateTo(screen.label, ROUTES[screen.route]);
      await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible();
    }
  });

  test('deep link + browser back/forward preserves state', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto('risk');
    await shell.navigateTo('Recommendations', ROUTES.recommendations);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${ROUTES.risk}$`));
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${ROUTES.recommendations}$`));
  });
});
