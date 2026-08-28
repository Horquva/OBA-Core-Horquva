import { Page, Locator } from '@playwright/test';

/** What-If Simulation ("/simulation") — SimulationDashboard toggles + cascade results. */
export class SimulationPage {
  readonly page: Page;
  readonly dashboard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dashboard = page.getByTestId('simulation-dashboard').or(page.locator('main'));
  }

  toggleFor(entityName: string): Locator {
    return this.dashboard
      .locator('[class*=row], li, [role=listitem]')
      .filter({ hasText: entityName })
      .getByRole('switch')
      .or(this.dashboard.getByLabel(entityName));
  }

  async runScenario(entityName: string) {
    await this.toggleFor(entityName).click();
  }

  cascadeResults(): Locator {
    return this.dashboard.getByTestId('cascade-results').or(this.dashboard.locator('[class*=cascade], [class*=Impact]'));
  }
}
