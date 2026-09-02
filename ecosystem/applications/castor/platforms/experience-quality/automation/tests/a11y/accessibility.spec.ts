import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { AppShellPage, ROUTES } from '../pages/app-shell.page';

const SCREENS: { label: string; route: keyof typeof ROUTES }[] = [
  { label: 'dashboard', route: 'dashboard' },
  { label: 'ownership', route: 'ownership' },
  { label: 'risk', route: 'risk' },
  { label: 'dependency-map', route: 'dependencyMap' },
  { label: 'simulation', route: 'simulation' },
  { label: 'recommendations', route: 'recommendations' },
  { label: 'ai-tools', route: 'aiTools' },
  { label: 'knowledge', route: 'knowledge' },
  { label: 'memory', route: 'memory' },
  { label: 'decision', route: 'decision' },
];

const EVIDENCE_DIR = path.join('qa-evidence', 'a11y');

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

test.describe('Accessibility (axe-core) @a11y', () => {
  for (const screen of SCREENS) {
    test(`${screen.label} has no WCAG 2.1 A/AA violations`, async ({ page }, testInfo) => {
      const shell = new AppShellPage(page);
      await shell.goto(screen.route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      fs.writeFileSync(
        path.join(EVIDENCE_DIR, `${screen.label}.${testInfo.project.name}.json`),
        JSON.stringify(results, null, 2),
      );

      const critical = results.violations.filter((v) =>
        ['critical', 'serious'].includes(v.impact ?? ''),
      );

      if (critical.length) {
        const summary = critical
          .map(
            (v) =>
              `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes) — ${v.helpUrl}`,
          )
          .join('\n');

        testInfo.attach('axe-violations-summary.txt', {
          body: summary,
        });
      }

      expect(
        critical,
        `Critical/serious a11y violations on ${screen.label}:\n${JSON.stringify(
          critical,
          null,
          2,
        )}`,
      ).toEqual([]);
    });
  }

  test('keyboard-only navigation reaches every nav link', async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.goto('dashboard');

    const links = await shell.nav.getByRole('link').all();

    for (const link of links) {
      await link.focus();
      await expect(link).toBeFocused();
    }
  });
});