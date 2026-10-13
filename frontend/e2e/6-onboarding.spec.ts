import http from 'node:http';
import { test, expect, signIn, apiGet } from './helpers';
import { API } from './env';

// Flow 6: a new customer sets up through the guide. Organization name, skip the directory,
// connect n8n (a local stand-in for the n8n API), run the first sync, and see the workflows it
// found in the app. Then invite a colleague and confirm only invited people get in.
// Runs last: it renames the org and adds data the other flows don't expect.

const N8N_KEY = 'e2e-n8n-key';
let n8n: http.Server;
let n8nUrl: string;

test.beforeAll(async () => {
  n8n = http.createServer((req, res) => {
    if (req.headers['x-n8n-api-key'] !== N8N_KEY) return void res.writeHead(401).end();
    const send = (body: unknown) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    const path = new URL(req.url!, 'http://x').pathname;
    if (path === '/api/v1/users') return send({ data: [{ id: 'u1', email: 'nadia@northwind.edu', firstName: 'Nadia', lastName: 'Rahman' }] });
    if (path === '/api/v1/credentials') return send({ data: [] });
    if (path === '/api/v1/workflows') return send({ data: [{ id: 'w1', name: 'Grant intake triage', active: true }] });
    if (path === '/api/v1/workflows/w1') return send({ id: 'w1', name: 'Grant intake triage', active: true, ownedBy: { email: 'nadia@northwind.edu' }, nodes: [] });
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => n8n.listen(0, '127.0.0.1', () => r()));
  n8nUrl = `http://localhost:${(n8n.address() as { port: number }).port}`;
});

test.afterAll(() => new Promise<void>((r) => n8n.close(() => r())));

test('a new org sets up through the guide: name, n8n, first sync, invite', async ({ page, context }) => {
  await signIn(context, 'admin');
  await page.goto('/overview');

  // The guide reflects real state: the demo org name is a placeholder, nothing is connected.
  const guide = page.getByRole('region', { name: 'Setup guide' });
  await expect(guide.getByText('Setup guide: 0 of 4 done')).toBeVisible();
  await guide.getByRole('button', { name: 'Start setup' }).click();

  // 1. Organization
  await page.getByLabel('Organization name').fill('Northwind University');
  await page.getByRole('button', { name: /Next Step/ }).click();

  // 2. Directory: skipped
  await expect(page.getByRole('heading', { name: 'Connect your directory', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();

  // 3. Automations: n8n, tested before saving
  await expect(page.getByRole('heading', { name: 'Connect your automations', level: 2 })).toBeVisible();
  await page.getByLabel('n8n URL').fill(n8nUrl);
  await page.getByLabel('API key').fill('wrong-key');
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByText(/Couldn.t connect: .*401/)).toBeVisible();
  await page.getByLabel('API key').fill(N8N_KEY);
  await page.getByRole('button', { name: 'Test connection' }).click();
  await expect(page.getByText('Connected. These credentials work.')).toBeVisible();
  await page.getByRole('button', { name: 'Save & continue' }).click();

  // 4. First sync: real 202 → background sync → polled to completion
  await expect(page.getByRole('heading', { name: 'Run the first sync', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Run first sync' }).click();
  await expect(page.getByText(/^Done\. \d+ relationships on record\.$/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Finish' }).click();

  // The guide now shows three of four steps done (the directory was skipped).
  await expect(guide.getByText('Setup guide: 3 of 4 done')).toBeVisible();

  // What the sync found is in the app, owned by the person n8n says owns it.
  const asset = await apiGet<{ asset?: { name: string }; name?: string; owners?: Array<{ name: string }> }>(page.request, '/api/assets/automation:n8n:w1');
  expect(JSON.stringify(asset)).toContain('Grant intake triage');
  expect(JSON.stringify(asset)).toContain('Nadia Rahman');

  await page.goto('/settings/connections');
  const card = page.getByRole('heading', { name: 'n8n', level: 4 }).locator('xpath=ancestor::div[contains(@class,"shadow-card")][1]');
  await expect(card.getByText('connected', { exact: true })).toBeVisible();
  await expect(card.getByText(/Last run completed · \d+ people & systems/)).toBeVisible();

  // Access is invite-only: an uninvited colleague can't sign in; once invited, they can.
  const before = await context.request.post(`${API}/api/auth/dev/sign-in`, { data: { email: 'lina@northwind.edu' } });
  expect(before.status()).toBe(403);
  await page.goto('/settings/users');
  await page.getByLabel('Work email').fill('lina@northwind.edu');
  await page.getByLabel('Name', { exact: true }).fill('Lina Haddad');
  await page.getByLabel('Role', { exact: true }).selectOption('reviewer');
  await page.getByRole('button', { name: 'Invite' }).click();
  await expect(page.getByText('Lina Haddad can now sign in as reviewer.')).toBeVisible();
  const after = await context.request.post(`${API}/api/auth/dev/sign-in`, { data: { email: 'lina@northwind.edu' } });
  expect(after.ok()).toBeTruthy();
});
