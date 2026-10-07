import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { API } from './env';

/** The seeded dev users (frontend lib/session.tsx DEV_USERS). */
export const USERS = {
  admin: 'alex@acme.com',
  reviewer: 'chen@acme.com',
  viewer: 'maya@acme.com',
} as const;

/**
 * Real backend session through the dev sign-in route. The cookie lands in the browser
 * context's jar, so pages opened afterwards are signed in. The sign-in spec covers the
 * UI path; the other specs start signed in.
 */
export async function signIn(context: BrowserContext, who: keyof typeof USERS): Promise<void> {
  const res = await context.request.post(`${API}/api/auth/dev/sign-in`, { data: { email: USERS[who] } });
  expect(res.ok(), `dev sign-in as ${who} failed: ${res.status()}`).toBeTruthy();
}

/** GET against the backend with the context's session; fails the test on a non-2xx. */
export async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`);
  expect(res.ok(), `GET ${path} → ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

export async function apiPost<T>(request: APIRequestContext, path: string, data: unknown): Promise<T> {
  const res = await request.post(`${API}${path}`, { data });
  expect(res.ok(), `POST ${path} → ${res.status()}: ${await res.text()}`).toBeTruthy();
  return (await res.json()) as T;
}

/**
 * `test` for every spec: fails on any uncaught page error, since a screen can render
 * while its script is throwing.
 */
export const test = base.extend<{ noPageErrors: void }>({
  noPageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await use();
      expect(errors, 'uncaught page errors').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Pick from a PersonPicker / EntityPicker combobox by typing part of the name. */
export async function pickFromCombobox(page: Page, combobox: ReturnType<Page['getByRole']>, query: string, optionName: string): Promise<void> {
  await combobox.click();
  await combobox.fill(query);
  await page.getByRole('option', { name: new RegExp(optionName) }).first().click();
}

export interface PersonRow {
  id: string;
  name: string;
}

export async function people(request: APIRequestContext): Promise<PersonRow[]> {
  const r = await apiGet<{ entities: PersonRow[] }>(request, '/api/continuity/inventory?kind=person');
  return r.entities;
}
