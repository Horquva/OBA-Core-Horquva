import { test, expect } from '@playwright/test';
import { AppShellPage } from '../pages/app-shell.page';
import { DashboardPage } from '../pages/dashboard.page';
import { SimulationPage } from '../pages/simulation.page';

test.describe('Widget interactions @smoke', () => {
  test('agent table sorts without losing row count', async ({ page }) => {
    const shell = new AppShellPage(page);
    const dashboard = new DashboardPage(page);
    await shell.goto('dashboard');

    const rowsBefore = await (await dashboard.agentRows()).count();
    expect(rowsBefore).toBeGreaterThan(0);

    await dashboard.sortAgentTableBy('Risk');
    const rowsAfter = await (await dashboard.agentRows()).count();
    expect(rowsAfter).toBe(rowsBefore);
  });

  test('heatmap cell click surfaces agent detail', async ({ page }) => {
    const shell = new AppShellPage(page);
    const dashboard = new DashboardPage(page);
    await shell.goto('dashboard');

    await dashboard.clickHeatmapCell(0);
    await expect(page.getByRole('dialog').or(page.getByTestId('agent-detail'))).toBeVisible();
  });

  test('what-if toggle triggers a cascade recalculation', async ({ page }) => {
    const shell = new AppShellPage(page);
    const simulation = new SimulationPage(page);
    await shell.goto('simulation');

    await simulation.runScenario('Lead Scoring Agent');
    await expect(simulation.cascadeResults()).toBeVisible();
  });

  test('KPI strip renders numeric, non-placeholder values', async ({ page }) => {
    const shell = new AppShellPage(page);
    const dashboard = new DashboardPage(page);
    await shell.goto('dashboard');

    const cards = await dashboard.kpiCards();
    await cards.first().waitFor({ state: 'visible', timeout: 15000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = (await cards.nth(i).innerText()).trim();
      expect(text, `KPI card ${i} looked empty/placeholder`).not.toMatch(/^(--|n\/a|undefined|null)?$/i);
    }
  });
});
