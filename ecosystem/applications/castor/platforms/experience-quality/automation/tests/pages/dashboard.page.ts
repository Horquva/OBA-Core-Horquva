import { Page, Locator } from '@playwright/test';

/** Executive Dashboard ("/") — KpiStrip, Heatmap, RiskSplit, AgentTable. */
export class DashboardPage {
  readonly page: Page;
  readonly kpiStrip: Locator;
  readonly heatmap: Locator;
  readonly riskSplit: Locator;
  readonly agentTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.kpiStrip = page.getByTestId('kpi-strip').or(page.locator('[class*=Kpi]').first());
    this.heatmap = page.getByTestId('heatmap').or(page.locator('[class*=Heatmap]').first());
    this.riskSplit = page.getByTestId('risk-split').or(page.locator('[class*=RiskSplit]').first());
    this.agentTable = page.getByTestId('agent-table').or(page.getByRole('table').first());
  }

  async kpiCards(): Promise<Locator> {
    return this.kpiStrip.locator('.card');
  }

  async clickHeatmapCell(nth = 0) {
    await this.heatmap.locator('rect, path[class*=rectangle], [class*=cell], [class*=Cell]').nth(nth).click();
  }

  async agentRows(): Promise<Locator> {
    return this.agentTable.locator('tbody tr');
  }

  async sortAgentTableBy(columnName: string) {
    await this.agentTable.getByRole('columnheader', { name: columnName }).click();
  }
}
