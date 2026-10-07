// Live accessibility + responsive audit (Sprint 3 D17).
// Every route, signed in, with real data, at desktop / iPhone 12 / dark: axe (WCAG 2.1 AA),
// horizontal overflow, and small touch targets on phones.
// Needs the dev servers running (frontend :3001, backend :3000 with AUTH_DEV_LOGIN=true).
// Usage (from frontend/): node scripts/a11y-audit.mjs <attestToken> [routeFilter]
//   attestToken: a live magic link token (with no SMTP, the backend logs it on campaign create).
// Writes scripts/a11y-results.json; exits 1 if any violation or overflow is found.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const require = createRequire(path.join(ROOT, 'frontend/package.json'));
const { chromium, devices } = require('@playwright/test');
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');

const FE = 'http://localhost:3001';
const API = 'http://localhost:3000';
const [token, filter] = process.argv.slice(2);

async function ids(request) {
  const j = async (p) => (await request.get(API + p)).json();
  const deps = await j('/api/departures');
  const teams = await j('/api/people/teams');
  const assets = await j('/api/assets');
  return {
    dep: deps.departures[0].id,
    team: teams.teams[0].id,
    person: 'person:omar@acme.com',
    asset: assets.assets[0].id,
  };
}

const VIEWPORTS = [
  { name: 'desktop', opts: { viewport: { width: 1280, height: 900 } } },
  { name: 'iphone12', opts: { ...devices['iPhone 12'] } },
  { name: 'dark', opts: { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' } },
];

const results = [];
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp.opts);
    const signIn = await ctx.request.post(API + '/api/auth/dev/sign-in', { data: { email: 'alex@acme.com' } });
    if (!signIn.ok()) throw new Error('dev sign-in failed ' + signIn.status());
    const id = await ids(ctx.request);
    const routes = [
      '/', '/departures', `/departures/${encodeURIComponent(id.dep)}`, '/people',
      `/people/teams/${encodeURIComponent(id.team)}`, `/people/${encodeURIComponent(id.person)}`,
      '/assets', `/assets/${encodeURIComponent(id.asset)}`, '/map', '/what-if', '/actions',
      '/actions/confirmations/new', '/ask', '/briefing', '/my',
      '/settings/connections', '/settings/connections/n8n-check', '/settings/identity',
      '/settings/users', '/settings/organization', '/settings/audit-log',
      `/attest/${token}`, '/sign-in',
    ].filter((r) => !filter || r.includes(filter));

    const page = await ctx.newPage();
    for (const route of routes) {
      await page.goto(FE + route, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(800);
      await page.addScriptTag({ content: AXE });
      const axe = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        });
        return r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(0, 2).join(' | ') })),
          count: v.nodes.length,
        }));
      });
      const layout = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const over = document.documentElement.scrollWidth - vw;
        const wide = [];
        if (over > 1) {
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') {
              wide.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).split(' ').slice(0, 3).join('.')} right=${Math.round(r.right)}`);
              if (wide.length >= 4) break;
            }
          }
        }
        // WCAG 2.5.5-ish: tap targets smaller than 24px on touch layouts (AA 2.2 minimum)
        const small = [];
        if (vw < 500) {
          for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role=button]')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24)) {
              small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
              if (small.length >= 6) break;
            }
          }
        }
        return { overflowPx: Math.max(0, over), wide, small };
      });
      const status = await page.evaluate(() => document.title);
      results.push({ viewport: vp.name, route, title: status, axe, layout });
      const flag = axe.length || layout.overflowPx > 1 ? '✗' : '✓';
      console.log(`${flag} ${vp.name.padEnd(8)} ${route.padEnd(48)} axe:${axe.length} overflow:${layout.overflowPx}px small:${layout.small.length}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(HERE, 'a11y-results.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.axe.length || r.layout.overflowPx > 1);
console.log(`
${results.length} page checks, ${failed.length} with problems.`);
process.exitCode = failed.length ? 1 : 0;
