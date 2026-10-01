# OBA Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `frontend/` Next.js app to the approved OBA UI/UX design: tokens, component library, app shell, all 7 screens, reviewer surfaces and Settings. No fabricated data anywhere.

**Architecture:** Feature-sliced Next.js 16 App Router app. `lib/api/*` holds a typed client per domain, covering both endpoints that exist today and the **planned contracts** the backend must implement (Appendix A). `lib/useResource` turns every call into an explicit loading / error / ready state, and an un-built endpoint renders an honest "not available yet" error state. Presentation is in `components/ui` (design system) and `components/shell`. Each screen lives in `features/<screen>/` and is mounted by a thin `app/**/page.tsx`. Styling uses Tailwind v4 utilities generated from CSS custom-property tokens only.

**Tech Stack:** Next.js 16.2 · React 19.2 · TypeScript 5 · Tailwind CSS 4 · lucide-react · @xyflow/react 12 + dagre · react-markdown · Vitest 3 + Testing Library + jsdom + vitest-axe · Playwright (frontend e2e with mocked API).

**Spec:** `docs/superpowers/specs/2026-10-01-oba-ux-design.md`. Read it before starting any task; section references (§) below point into it.

## Global Constraints

Every task's requirements implicitly include all of these (verbatim from the spec):

- **Counted facts only.** No dollar exposure, no probabilities, no "health %", no confidence %. Every number is a count returned by the backend; the browser never computes findings (WBS 10.1.3).
- **Unknown is never "no".** Unrecorded fact → gray "Unknown". Confirmed absence → red "None". Never render unknown as "No", "N/A", "Low" or blank.
- **Never fabricate.** No fallback/demo/sample data in any code path. Loading, error and empty are three distinct states.
- **No individual ranking.** People are never sorted, scored or listed by risk. Ranked lists contain assets, vendors and models only. Team members are listed alphabetically only. (Named share bar on team cards is the approved exception, D-23.)
- **Tokens only.** Components use the token utilities from Task 2 (`bg-surface`, `text-ink-2`, `text-ev-stated`…). No Tailwind palette classes (`slate-*`, `blue-*`, `indigo-*`, `emerald-*`, `rose-*`, `amber-50…950`, `gray-*`) and no hex literals in `components/`, `features/`, `app/` (Task 34 enforces this with a test).
- **Amber text (`text-amber-ink`) only on `bg-surface`.** Never on canvas or sunken. **Bronze is never text.** Primary button = `bg-amber` + `text-on-amber`.
- **Type:** Instrument Serif (400, normal + italic) only for page titles, hero lines, the one headline count per screen, the What-If sentence builder, the sign-in tagline, and the briefing reading body. Everything else Hanken Grotesk 400/500/600 with `tabular-nums` on numbers.
- **Radii:** card 16px (`rounded-card`), input/button 10px (`rounded-control`), action pill full (`rounded-full`), badge 4px (`rounded-badge`).
- **Motion:** 150–250ms fades/slides for drawers, sheets, popovers, tabs. Skeleton shimmer. Blast-radius highlight transition. Nothing else: no hover lift, glow, count-up, pulse or staggered entrances. `prefers-reduced-motion` honoured.
- **Copy:** sentence case; verb-first buttons; system UI says "we"; only the Ask OBA assistant says "I"; US English; dates/times/numbers via `Intl` in the browser's locale and time zone.
- **Tables:** 48px rows (`h-12`), sticky header, hairline dividers, no zebra.
- **Icons:** lucide-react, stroke 1.5 (global CSS rule), 18px nav / 16px inline, never meaning-only.
- **Accessibility:** WCAG 2.1 AA. 2px amber focus ring with offset 2px. Every interactive element is keyboard reachable. Every form field is labelled. Color is never the sole signal.
- **Roles:** Viewer = action controls hidden (not disabled) + "View only" tag. HR/manager permission = Initiate departure + successor pickers. Reviewer = `/my` only. Phones (<768px) are read-only except `/my` and `/attest/*`.

## Defaults this plan sets that the spec does not fix (confirm or change before executing)

| # | Default | Where |
|---|---|---|
| X-1 | Data is "stale" (red) when the newest successful sync is older than **24 hours** | Task 16 `FRESHNESS_STALE_HOURS` |
| X-2 | Default API base for local dev is `http://localhost:4000` (backend `PORT` default) | Task 4 |
| X-3 | Local dev without an auth backend may set `NEXT_PUBLIC_DEV_ROLE=admin\|viewer\|reviewer`; ignored in production builds, shown as a "Dev session" tag | Task 15 |
| X-4 | Confirmation intro line max **280** characters; campaign name defaults to "Ownership confirmation · {date}" | Task 26 |
| X-5 | The departure succession-test panel re-runs **400ms** after the last successor change | Task 28 |
| X-6 | Ask OBA entity links use the markdown convention `[Name](oba://asset/<id>?grade=<grade>)` / `oba://person/<id>` | Task 30 |

## File structure (target state)

```
frontend/
  vitest.config.ts · vitest.setup.ts · playwright.config.ts
  app/
    layout.tsx                      root: fonts, theme init script, ToastProvider
    globals.css                     tokens + Tailwind theme mapping + base styles
    (app)/layout.tsx                SessionProvider + AppShell (authenticated, main nav)
    (app)/page.tsx                  Overview
    (app)/briefing/page.tsx
    (app)/departures/page.tsx · (app)/departures/[id]/page.tsx
    (app)/people/page.tsx · (app)/people/teams/[id]/page.tsx · (app)/people/[id]/page.tsx
    (app)/assets/page.tsx · (app)/assets/[id]/page.tsx
    (app)/map/page.tsx · (app)/what-if/page.tsx
    (app)/actions/page.tsx · (app)/actions/confirmations/new/page.tsx
    (app)/ask/page.tsx
    (app)/settings/layout.tsx · page.tsx · connections/page.tsx · connections/n8n-check/page.tsx
    (app)/settings/identity/page.tsx · users/page.tsx · organization/page.tsx · audit-log/page.tsx
    (reviewer)/layout.tsx · (reviewer)/my/page.tsx
    (bare)/sign-in/page.tsx · (bare)/attest/[token]/page.tsx
  lib/
    cn.ts · format.ts · theme.ts · permissions.ts · session.tsx · useResource.ts
    api/client.ts session.ts overview.ts changes.ts entities.ts assets.ts actions.ts
        confirmations.ts departures.ts people.ts graph.ts simulations.ts assistant.ts
        attest.ts reviewer.ts settings.ts
  types/view.ts                     all view models + planned API contracts
  components/ui/                    Button ActionPill Card PageHeader marks states bars
                                    CoverageStrip StageStepper PriorityCard DataTable Drawer
                                    Toast EntityPicker SentenceBuilder Can LargeScreenNotice
                                    Tabs HeroArt
  components/shell/                 nav Brand Sidebar UserMenu TopBar FreshnessIndicator
                                    AskField BellPopover BottomTabBar AppShell
  features/overview/ departures/ people/ assets/ map/ what-if/ actions/ ask/
           attest/ reviewer/ settings/ sign-in/ briefing/
  tests/                            mirrors the above (unit + component + a11y)
  e2e/                              Playwright specs with mocked API
```

**Deleted by the end:** `app/page.tsx`, `app/campaigns`, `app/connectors`, `app/inventory`, `app/n8n-check`, `app/review`, `app/simulation`, `components/layout/*`, `components/assistant/*`, `components/ui/Badges.tsx`, `lib/ThemeContext.tsx`, `lib/api.ts`, `types/contracts.ts`, `types/index.ts`.

## Phases

| Phase | Tasks | Outcome |
|---|---|---|
| A — Foundation | 1–6 | Test tooling, tokens, fonts, theme, formatting, data layer |
| B — Design system | 7–14 | All `components/ui` with tests |
| C — Shell | 15–18 | Session, sidebar, top bar, responsive shell, route skeleton, old code removed |
| D — Screens | 19–34 | Every screen, reviewer surfaces, Settings |
| E — Hardening | 35–36 | Token/a11y guard tests, Playwright e2e, final build |

All commands run from `frontend/` unless stated otherwise.

---

## Phase A — Foundation

### Task 1: Frontend test tooling

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/tests/mocks/navigation.ts`, `frontend/tests/smoke.test.tsx`

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom). A global `next/navigation` mock driven by `nav` from `tests/mocks/navigation.ts` (`nav.pathname`, `nav.search`, `nav.params`, `nav.push`, `nav.replace`, `nav.back`), reset after every test.

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest@^3 @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vitest-axe
```

- [ ] **Step 2: Add scripts to `frontend/package.json`**

```json
"scripts": {
  "dev": "next dev -p 3001",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
```

- [ ] **Step 4: Create `frontend/tests/mocks/navigation.ts`**

```ts
import { vi } from 'vitest';

export const nav = {
  pathname: '/',
  search: '',
  params: {} as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
};

export function resetNav() {
  nav.pathname = '/';
  nav.search = '';
  nav.params = {};
  nav.push = vi.fn();
  nav.replace = vi.fn();
  nav.back = vi.fn();
}
```

- [ ] **Step 5: Create `frontend/vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';
import { cleanup } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, vi } from 'vitest';
import { nav, resetNav } from './tests/mocks/navigation';

expect.extend(axeMatchers);

vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...rest }: Record<string, unknown>) => createElement('img', rest),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back, prefetch: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  resetNav();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
```

- [ ] **Step 6: Write the smoke test `frontend/tests/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { usePathname } from 'next/navigation';
import { nav } from './mocks/navigation';

function Probe() {
  return <main><h1>Path {usePathname()}</h1></main>;
}

describe('test tooling', () => {
  it('renders with the navigation mock and passes axe', async () => {
    nav.pathname = '/assets';
    const { container } = render(<Probe />);
    expect(screen.getByRole('heading')).toHaveTextContent('Path /assets');
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 7: Run it**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts tests
git commit -m "test(frontend): add Vitest, Testing Library, jsdom and axe tooling"
```

---

### Task 2: Design tokens, Tailwind theme mapping and fonts

**Files:**
- Modify: `frontend/app/globals.css` (full rewrite), `frontend/app/layout.tsx` (fonts only; the theme and shell are swapped in Task 18)
- Test: `frontend/tests/design/tokens.test.ts`

**Interfaces:**
- Produces Tailwind utilities used by every later task: colors `canvas surface sunken ink ink-2 ink-3 rule bronze bronze-deep amber amber-ink on-amber ev-stated ev-inferred ev-confirmed ev-unknown st-pass st-fail st-unknown`; fonts `font-sans` (Hanken) and `font-serif` (Instrument Serif); radii `rounded-card rounded-control rounded-badge`; shadow `shadow-card`; CSS classes `.skeleton`, `.hero-art`.

- [ ] **Step 1: Write the failing contrast test `frontend/tests/design/tokens.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toUpperCase();
  return out;
}

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const light = block(':root');
const dark = block(':root[data-theme="dark"]');
const darkMedia = block(':root:not([data-theme="light"])');

const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'canvas'], ['ink-2', 'canvas'], ['ink-3', 'canvas'], ['ink-3', 'surface'], ['ink-3', 'surface-sunken'],
  ['ink', 'surface'], ['amber-ink', 'surface'], ['on-amber', 'amber'],
  ['ev-stated', 'surface'], ['ev-inferred', 'surface'], ['ev-confirmed', 'surface'], ['ev-unknown', 'surface'],
  ['st-pass', 'surface'], ['st-fail', 'surface'], ['st-unknown', 'surface'], ['st-fail', 'canvas'],
];

describe('design tokens', () => {
  it('matches the spec values for brand tokens', () => {
    expect(light).toMatchObject({
      canvas: '#F3EFE7', surface: '#FFFFFF', 'surface-sunken': '#EBE5DA', ink: '#15120F', 'ink-2': '#4A433C',
      'ink-3': '#6E655C', rule: '#DAD2C4', bronze: '#A9825A', amber: '#E8870F', 'amber-ink': '#A85A00',
      'ev-stated': '#1D5FA8', 'ev-inferred': '#A85A00', 'ev-confirmed': '#2F6B2A', 'ev-unknown': '#6B6560',
      'st-pass': '#2F6B2A', 'st-fail': '#B3261E', 'st-unknown': '#6B6560',
    });
  });

  it.each([['light', light], ['dark', dark]])('%s text pairs pass WCAG AA (4.5:1)', (_n, t) => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('bronze passes 3:1 as a UI color on surface', () => {
    expect(contrast(light.bronze, light.surface)).toBeGreaterThanOrEqual(3);
  });

  it('dark media-query block equals the explicit dark block', () => {
    expect(darkMedia).toEqual(dark);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- tests/design/tokens.test.ts`
Expected: FAIL with `missing block :root[data-theme="dark"]`.

- [ ] **Step 3: Rewrite `frontend/app/globals.css`**

```css
@import "tailwindcss";

/* ── Tokens: light (default) ─────────────────────────────── */
:root {
  --canvas: #F3EFE7;
  --surface: #FFFFFF;
  --surface-sunken: #EBE5DA;
  --ink: #15120F;
  --ink-2: #4A433C;
  --ink-3: #6E655C;
  --rule: #DAD2C4;
  --bronze: #A9825A;
  --bronze-deep: #5E3F2C;
  --amber: #E8870F;
  --amber-ink: #A85A00;
  --on-amber: #15120F;
  --ev-stated: #1D5FA8;
  --ev-inferred: #A85A00;
  --ev-confirmed: #2F6B2A;
  --ev-unknown: #6B6560;
  --st-pass: #2F6B2A;
  --st-fail: #B3261E;
  --st-unknown: #6B6560;
  --card-shadow: 0 1px 2px rgb(21 18 15 / 0.04), 0 4px 16px rgb(21 18 15 / 0.04);
  color-scheme: light;
}

/* ── Tokens: dark (explicit choice) ──────────────────────── */
:root[data-theme="dark"] {
  --canvas: #17140F;
  --surface: #1F1B16;
  --surface-sunken: #2A251E;
  --ink: #F3EFE7;
  --ink-2: #CFC6B8;
  --ink-3: #A39A8F;
  --rule: #3A332D;
  --bronze: #C9A27A;
  --bronze-deep: #E3C8A8;
  --amber: #F2A541;
  --amber-ink: #F2A541;
  --on-amber: #15120F;
  --ev-stated: #7FB0E8;
  --ev-inferred: #F2A541;
  --ev-confirmed: #8CC47E;
  --ev-unknown: #A39A8F;
  --st-pass: #8CC47E;
  --st-fail: #F08A80;
  --st-unknown: #A39A8F;
  --card-shadow: none;
  color-scheme: dark;
}

/* ── Tokens: dark (system preference, unless light chosen) ─ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --canvas: #17140F;
    --surface: #1F1B16;
    --surface-sunken: #2A251E;
    --ink: #F3EFE7;
    --ink-2: #CFC6B8;
    --ink-3: #A39A8F;
    --rule: #3A332D;
    --bronze: #C9A27A;
    --bronze-deep: #E3C8A8;
    --amber: #F2A541;
    --amber-ink: #F2A541;
    --on-amber: #15120F;
    --ev-stated: #7FB0E8;
    --ev-inferred: #F2A541;
    --ev-confirmed: #8CC47E;
    --ev-unknown: #A39A8F;
    --st-pass: #8CC47E;
    --st-fail: #F08A80;
    --st-unknown: #A39A8F;
    --card-shadow: none;
    color-scheme: dark;
  }
}

/* ── Tailwind theme mapping ─────────────────────────────── */
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-sunken: var(--surface-sunken);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-rule: var(--rule);
  --color-bronze: var(--bronze);
  --color-bronze-deep: var(--bronze-deep);
  --color-amber: var(--amber);
  --color-amber-ink: var(--amber-ink);
  --color-on-amber: var(--on-amber);
  --color-ev-stated: var(--ev-stated);
  --color-ev-inferred: var(--ev-inferred);
  --color-ev-confirmed: var(--ev-confirmed);
  --color-ev-unknown: var(--ev-unknown);
  --color-st-pass: var(--st-pass);
  --color-st-fail: var(--st-fail);
  --color-st-unknown: var(--st-unknown);
  --font-sans: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-instrument-serif), Georgia, "Times New Roman", serif;
  --radius-card: 16px;
  --radius-control: 10px;
  --radius-badge: 4px;
  --shadow-card: var(--card-shadow);
}

/* ── Base ───────────────────────────────────────────────── */
html, body { height: 100%; }
body {
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.lucide { stroke-width: 1.5; }
:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
::selection { background: color-mix(in srgb, var(--amber) 30%, transparent); }

/* ── Skeleton shimmer ───────────────────────────────────── */
@keyframes oba-shimmer { 100% { transform: translateX(100%); } }
.skeleton { position: relative; overflow: hidden; background: var(--surface-sunken); border-radius: var(--radius-badge); }
.skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--surface) 60%, transparent), transparent);
  animation: oba-shimmer 1.6s infinite;
}

/* ── Hero artwork (asset pending: /brand/hero-art.webp) ─── */
.hero-art {
  background-color: var(--canvas);
  background-image:
    url("/brand/hero-art.webp"),
    radial-gradient(60% 60% at 50% 45%, color-mix(in srgb, var(--amber) 22%, transparent), transparent 70%);
  background-size: cover, cover;
  background-position: center;
}

/* ── Reduced motion ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Swap fonts in `frontend/app/layout.tsx`** (keep the existing `ThemeProvider`/`AppShell` imports; Task 18 replaces them)

Replace the `DM_Sans` import and constant with:

```tsx
import { Instrument_Serif, Hanken_Grotesk } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken",
});
```

and change the `<html>` element to:

```tsx
<html lang="en" className={`${instrumentSerif.variable} ${hanken.variable} h-full`} suppressHydrationWarning>
```

- [ ] **Step 5: Run the test and the build**

Run: `npm test -- tests/design/tokens.test.ts && npm run build`
Expected: test `4 passed` (the `it.each` counts as 2); build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx tests/design/tokens.test.ts
git commit -m "feat(design): OBA color tokens, dark mode, Tailwind mapping, Instrument Serif + Hanken Grotesk"
```

---

### Task 3: Theme preference (light default, dark, system)

**Files:**
- Create: `frontend/lib/theme-script.ts` (server-safe: no React imports, so the root layout can import it), `frontend/lib/theme.ts` (client hook)
- Test: `frontend/tests/lib/theme.test.ts`

**Interfaces:**
- Produces: `lib/theme-script.ts`: `THEME_STORAGE_KEY = 'oba-theme'`, `themeInitScript: string`. `lib/theme.ts`: `type ThemePreference = 'light' | 'dark' | 'system'`; `readThemePreference(): ThemePreference`; `applyThemePreference(p: ThemePreference): void`; `setThemePreference(p): void` (persists + applies + notifies); `useThemePreference(): [ThemePreference, (p: ThemePreference) => void]`.

- [ ] **Step 1: Write the failing test `frontend/tests/lib/theme.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applyThemePreference, readThemePreference, setThemePreference, useThemePreference } from '@/lib/theme';
import { THEME_STORAGE_KEY, themeInitScript } from '@/lib/theme-script';

describe('theme preference', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readThemePreference()).toBe('system');
  });

  it('applies data-theme for light and dark, and removes it for system', () => {
    applyThemePreference('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyThemePreference('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyThemePreference('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists and notifies subscribers', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('system');
    act(() => setThemePreference('dark'));
    expect(result.current[0]).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('ignores garbage in storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readThemePreference()).toBe('system');
  });

  it('init script applies a stored preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    new Function(themeInitScript)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- tests/lib/theme.test.ts`
Expected: FAIL, cannot resolve `@/lib/theme`.

- [ ] **Step 3: Implement `frontend/lib/theme-script.ts`**

```ts
export const THEME_STORAGE_KEY = 'oba-theme';

export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p);}}catch(e){}})();`;
```

- [ ] **Step 4: Implement `frontend/lib/theme.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from './theme-script';

export type ThemePreference = 'light' | 'dark' | 'system';

const listeners = new Set<() => void>();

function isPreference(v: unknown): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(p: ThemePreference): void {
  const root = document.documentElement;
  if (p === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', p);
}

export function setThemePreference(p: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, p);
  } catch {
    /* storage unavailable: still apply for this page view */
  }
  applyThemePreference(p);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useThemePreference(): [ThemePreference, (p: ThemePreference) => void] {
  const pref = useSyncExternalStore(subscribe, readThemePreference, () => 'system' as ThemePreference);
  return [pref, setThemePreference];
}
```

- [ ] **Step 5: Run it**

Run: `npm test -- tests/lib/theme.test.ts`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts lib/theme-script.ts tests/lib/theme.test.ts
git commit -m "feat(theme): light/dark/system preference store with pre-paint init script"
```

---

### Task 4: Formatting helpers and class merging

**Files:**
- Create: `frontend/lib/format.ts`, `frontend/lib/cn.ts`
- Test: `frontend/tests/lib/format.test.ts`

**Interfaces:**
- Produces: `cn(...classes)`; `formatNumber(n, locale?)`; `formatDate(iso, locale?)` (medium date); `formatTime(iso, locale?)` (short time); `formatDateTime(iso, locale?)`; `formatRelative(iso, now?, locale?)`; `timeZoneLabel(iso, locale?)`; `greeting(now: Date): 'Good morning' | 'Good afternoon' | 'Good evening'`; `firstName(fullName: string): string`; `plural(n, one, many)`.

- [ ] **Step 1: Write the failing test `frontend/tests/lib/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  firstName, formatDate, formatNumber, formatRelative, formatTime, greeting, plural,
} from '@/lib/format';
import { cn } from '@/lib/cn';

describe('format', () => {
  it('formats numbers per locale', () => {
    expect(formatNumber(1200, 'en-US')).toBe('1,200');
    expect(formatNumber(1200, 'de-DE')).toBe('1.200');
  });

  it('formats dates and times per locale', () => {
    expect(formatDate('2026-10-14T09:00:00Z', 'en-US')).toMatch(/Oct 14, 2026/);
    expect(formatTime('2026-10-14T08:42:00Z', 'en-US')).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats relative time', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(formatRelative('2026-10-01T10:00:00Z', now, 'en-US')).toBe('2 hours ago');
    expect(formatRelative('2026-09-30T12:00:00Z', now, 'en-US')).toBe('yesterday');
    expect(formatRelative('2026-10-15T12:00:00Z', now, 'en-US')).toBe('in 2 weeks');
  });

  it('picks the greeting by local hour', () => {
    expect(greeting(new Date(2026, 9, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 1, 21))).toBe('Good evening');
    expect(greeting(new Date(2026, 9, 1, 3))).toBe('Good evening');
  });

  it('extracts first names and pluralises', () => {
    expect(firstName('Guido van Rossum')).toBe('Guido');
    expect(firstName('  ')).toBe('');
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(3, 'person', 'people')).toBe('3 people');
  });

  it('merges classes with tailwind-merge', () => {
    expect(cn('px-2', false, 'px-4')).toBe('px-4');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- tests/lib/format.test.ts`
Expected: FAIL, cannot resolve `@/lib/format`.

- [ ] **Step 3: Implement `frontend/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
```

- [ ] **Step 4: Implement `frontend/lib/format.ts`**

```ts
export function formatNumber(n: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function timeZoneLabel(iso: string, locale?: string): string {
  const part = new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60],
];

export function formatRelative(iso: string, now: Date = new Date(), locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'minute');
}

export function greeting(now: Date): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function plural(n: number, one: string, many: string, locale?: string): string {
  return `${formatNumber(n, locale)} ${n === 1 ? one : many}`;
}
```

- [ ] **Step 5: Run it**

Run: `npm test -- tests/lib/format.test.ts`
Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/format.ts lib/cn.ts tests/lib/format.test.ts
git commit -m "feat(lib): Intl-based locale formatting helpers and cn()"
```

---

### Task 5: API client and `useResource`

**Files:**
- Create: `frontend/lib/api/client.ts`, `frontend/lib/useResource.ts`
- Test: `frontend/tests/lib/client.test.ts`, `frontend/tests/lib/useResource.test.tsx`

**Interfaces:**
- Produces:
  - `API_BASE: string`; `apiUrl(path: string): string`
  - `class ApiError extends Error { status: number; notAvailable: boolean }`: `status 0` = network failure; `notAvailable` = the backend has no such route (404 with a non-JSON body, i.e. Express's default "Cannot GET").
  - `request<T>(path: string, init?: RequestInit): Promise<T>`; `toApiError(e: unknown): ApiError`
  - `type Resource<T> = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'ready'; data: T }`
  - `useResource<T>(key: string | null, fetcher: () => Promise<T>): Resource<T> & { reload: () => void; lastLoadedAt: string | null }`. A `null` key means "don't fetch" and stays loading.

- [ ] **Step 1: Write the failing client test `frontend/tests/lib/client.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/lib/api/client';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(impl as typeof fetch);
}

describe('request', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns parsed JSON and sends credentials', async () => {
    const spy = mockFetch(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    await expect(request<{ ok: number }>('/api/x')).resolves.toEqual({ ok: 1 });
    expect(spy.mock.calls[0][0]).toBe('http://localhost:4000/api/x');
    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('maps JSON errors to ApiError with the server message', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: 'Token expired' }), { status: 404 }));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, message: 'Token expired', notAvailable: false });
  });

  it('flags a missing backend route as notAvailable', async () => {
    mockFetch(async () => new Response('<pre>Cannot GET /api/x</pre>', { status: 404 }));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 404, notAvailable: true });
  });

  it('maps network failure to status 0', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch'); });
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 0, message: "We couldn't reach OBA." });
  });

  it('returns undefined for 204', async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    await expect(request('/api/x', { method: 'POST' })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Write the failing hook test `frontend/tests/lib/useResource.test.tsx`**

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { useResource } from '@/lib/useResource';

describe('useResource', () => {
  it('goes loading -> ready', async () => {
    const { result } = renderHook(() => useResource('a', async () => 42));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', data: 42 }));
    expect(result.current.lastLoadedAt).not.toBeNull();
  });

  it('goes loading -> error with an ApiError', async () => {
    const { result } = renderHook(() => useResource('b', async () => { throw new ApiError(500, 'Boom'); }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') expect(result.current.error.message).toBe('Boom');
  });

  it('reload refetches', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => useResource('c', fetcher));
    await waitFor(() => expect(result.current).toMatchObject({ data: 1 }));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ data: 2 }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when key is null', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useResource(null, fetcher));
    expect(result.current.status).toBe('loading');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run both to see them fail**

Run: `npm test -- tests/lib/client.test.ts tests/lib/useResource.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 4: Implement `frontend/lib/api/client.ts`**

```ts
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public notAvailable = false) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError(0, e instanceof Error ? e.message : 'Something went wrong.');
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "We couldn't reach OBA.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    const message = body && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Request failed (${res.status}).`;
    const notAvailable = (res.status === 404 && body === null) || res.status === 501;
    throw new ApiError(res.status, message, notAvailable);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
```

- [ ] **Step 5: Implement `frontend/lib/useResource.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, toApiError } from './api/client';

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; data: T };

type Settled<T> = { id: string; ok: true; data: T } | { id: string; ok: false; error: ApiError };

export function useResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): Resource<T> & { reload: () => void; lastLoadedAt: string | null } {
  const fetcherRef = useRef(fetcher);
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const id = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (id === null) return;
    let live = true;
    fetcherRef.current().then(
      (data) => {
        if (!live) return;
        setSettled({ id, ok: true, data });
        setLastLoadedAt(new Date().toISOString());
      },
      (e) => {
        if (live) setSettled({ id, ok: false, error: toApiError(e) });
      },
    );
    return () => { live = false; };
  }, [id]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (id === null || !settled || settled.id !== id) return { status: 'loading', reload, lastLoadedAt };
  if (settled.ok) return { status: 'ready', data: settled.data, reload, lastLoadedAt };
  return { status: 'error', error: settled.error, reload, lastLoadedAt };
}
```

- [ ] **Step 6: Run both**

Run: `npm test -- tests/lib/client.test.ts tests/lib/useResource.test.tsx`
Expected: `9 passed`.

- [ ] **Step 7: Commit**

```bash
git add lib/api/client.ts lib/useResource.ts tests/lib/client.test.ts tests/lib/useResource.test.tsx
git commit -m "feat(api): typed request client with ApiError and useResource state hook"
```

---

### Task 6: View models and domain API modules

**Files:**
- Create: `frontend/types/view.ts`
- Create: `frontend/lib/api/{session,overview,changes,entities,assets,actions,confirmations,departures,people,graph,simulations,assistant,attest,reviewer,settings}.ts`
- Test: `frontend/tests/lib/api-contracts.test.ts`

**Interfaces:**
- Consumes: `request`, `ApiError`, `apiUrl` (Task 5).
- Produces: every type and function named below; later tasks import them exactly as written. Endpoints marked **(planned)** do not exist yet: they're specified in Appendix A, and until then they surface as `ApiError.notAvailable`.

- [ ] **Step 1: Create `frontend/types/view.ts`**

```ts
import type {
  CheckResult, CheckStatus, ChangeEventKind, CriticalityLevel, EdgeType, EntityKind, EvidenceGrade,
} from '@horquva/types';

export type { CheckResult, CheckStatus, ChangeEventKind, CriticalityLevel, EdgeType, EntityKind, EvidenceGrade };

// ── Identity & session ─────────────────────────────────────
export type Role = 'admin' | 'viewer' | 'reviewer';
export interface Session {
  userId: string; name: string; email: string; role: Role; isHrManager: boolean; title: string | null;
}
export type AuthProvider = 'microsoft' | 'google';

export interface EntityRef { id: string; kind: EntityKind; name: string }

// ── Facts ──────────────────────────────────────────────────
export type FactState = 'value' | 'unknown' | 'none';
export interface FactView {
  state: FactState;
  display: string | null;
  grade: EvidenceGrade;
  source: string | null;
  observedAt: string | null;
  ref?: EntityRef | null;
}
export interface CriticalityView { level: CriticalityLevel; grade: EvidenceGrade; source: string | null; observedAt: string | null }

// ── Coverage & overview ────────────────────────────────────
export interface CoverageMetrics {
  total: number; covered: number; exposed: number;
  /** null until backend B-01 partitions unknown out of exposed */
  unknown: number | null;
  definition: string;
}
export interface ChangeSummary { since: string | null; peopleLeft: number; backupsLost: number; newlyExposed: number; resolved: number }
export interface SpofAsset { asset: EntityRef; reason: string; dependsOn: EntityRef; runsPerWeek: number | null }
export interface NavCounts { departuresSoon: number; openCriticalActions: number; identityPending: number }

// ── Changes (bell) ─────────────────────────────────────────
export interface ChangeEventView {
  id: string; kind: ChangeEventKind | 'post_departure_alert'; title: string; impact: string;
  href: string | null; detectedAt: string;
}

// ── Assets ─────────────────────────────────────────────────
export interface AssetRow {
  id: string; kind: EntityKind; name: string; isCritical: boolean;
  owner: FactView; backup: FactView; criticality: CriticalityView;
  documented: FactView; fallback: FactView; runsPerWeek: FactView;
  checkStatus: CheckStatus;
}
export interface FactHistoryEntry {
  attribute: string; display: string | null; state: FactState; grade: EvidenceGrade;
  source: string | null; changedBy: string | null; validFrom: string; validTo: string | null;
}
export interface AssetDetail {
  asset: AssetRow; checks: CheckResult[]; upstream: EntityRef[]; downstream: EntityRef[]; history: FactHistoryEntry[];
}

// ── Actions ────────────────────────────────────────────────
export type ActionType = 'assign_backup' | 'confirm_facts' | 'name_successor' | 'move_credential' | 'document' | 'add_fallback';
export type ActionStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
export type ActionPrimary = { kind: 'assign_backup' } | { kind: 'link'; label: string; href: string };
export interface ActionView {
  id: string; rank: number; type: ActionType; status: ActionStatus; problem: string;
  asset: EntityRef; failingFact: string; criticalAssetsAffected: number; checkId: string;
  primary: ActionPrimary;
  acceptedRisk: { reason: string; expiresAt: string; acceptedBy: string } | null;
  resolvedAt: string | null;
}

// ── Confirmations ──────────────────────────────────────────
export interface CampaignSummary { id: string; name: string; status: string; dueDate: string; createdAt: string; totalTasks: number; completedTasks: number }
export interface CampaignDetail {
  id: string;
  reviewers: Array<{ person: EntityRef; completed: number; total: number }>;
  reminderAt: string | null; escalationAt: string | null;
}
export type CampaignScope =
  | { kind: 'all_unknown_critical' }
  | { kind: 'department'; department: string }
  | { kind: 'leaver'; personId: string }
  | { kind: 'selected'; assetIds: string[] };
export interface CampaignPreview {
  emailCount: number; questionCount: number;
  reviewers: Array<{ person: EntityRef; email: string; assetCount: number; viaManager: boolean }>;
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
  email: { subject: string; bodyText: string };
}
export interface CreateCampaignInput {
  name: string; dueDate: string; sendAt: string | null; introLine: string | null;
  tasks: Array<{ reviewerPersonId: string; assetEntityId: string }>;
}

// ── Departures ─────────────────────────────────────────────
export type DepartureStage = 'initiated' | 'successor_named' | 'accepted' | 'account_disabled' | 'verified';
export const DEPARTURE_STAGES: DepartureStage[] = ['initiated', 'successor_named', 'accepted', 'account_disabled', 'verified'];
export const STAGE_LABEL: Record<DepartureStage, string> = {
  initiated: 'Initiated', successor_named: 'Successor named', accepted: 'Accepted',
  account_disabled: 'Account disabled', verified: 'Post-departure verified',
};
export interface DepartureSummary {
  id: string; person: EntityRef; role: string | null; team: string | null; leaveDate: string;
  stage: DepartureStage; assetsTotal: number; assetsHandedOver: number; hasAlert: boolean;
  detectedFrom: 'manual' | 'entra' | 'google'; group: 'upcoming' | 'in_handover' | 'departed';
}
export interface SuccessorSuggestion { person: EntityRef; reason: string }
export interface HandoverAsset {
  asset: EntityRef; criticality: CriticalityLevel; currentBackup: FactView;
  successor: EntityRef | null; suggestion: SuccessorSuggestion | null;
  acceptance: 'none' | 'requested' | 'accepted' | 'declined';
}
export interface WatchLogEntry { at: string; workflow: EntityRef; message: string; severity: 'info' | 'alert' }
export interface DepartureDetail extends DepartureSummary {
  stageTimestamps: Partial<Record<DepartureStage, string>>;
  handover: HandoverAsset[];
  personalCredentialAutomations: Array<{ workflow: EntityRef; weeklyRuns: number | null }>;
  undocumented: EntityRef[];
  watchLog: WatchLogEntry[];
}
export interface SuccessorAssignment { assetId: string; successorId: string }
export interface SuccessionLoad {
  successor: EntityRef; totalCriticalAssetsOwned: number; shareOfCompanyCriticalAutomationsPct: number; overloadWarning: boolean;
}
export interface SuccessionPlanResult { coveredCount: number; stillExposedCount: number; loads: SuccessionLoad[] }

// ── People & teams ─────────────────────────────────────────
export interface TeamSummary {
  id: string; name: string; memberCount: number; rolledUp: boolean; coverage: CoverageMetrics;
  concentration: { sentence: string; holders: Array<{ person: EntityRef; sharePct: number }> } | null;
}
export interface Holding { asset: EntityRef; relation: 'owns' | 'backs_up' | 'credential'; criticality: CriticalityLevel; backup: FactView }
export interface TeamMember { person: EntityRef; title: string | null; holdings: Holding[] }
export interface TeamDetail { team: TeamSummary; members: TeamMember[] }
export interface PersonDetail {
  person: EntityRef; title: string | null; team: EntityRef | null; holdings: Holding[];
  openHandovers: Array<{ departureId: string; from: EntityRef; assetCount: number }>;
  pendingConfirmations: number;
}

// ── Graph ──────────────────────────────────────────────────
export interface GraphNodeView { id: string; kind: EntityKind; name: string; ring: 'fail' | 'unknown' | null }
export interface GraphEdgeView { id: string; from: string; to: string; type: EdgeType; grade: EvidenceGrade }
export interface Neighbourhood { rootId: string; nodes: GraphNodeView[]; edges: GraphEdgeView[] }
export interface BlastRadius { rootId: string; downstream: string[]; upstream: string[] }

// ── What-If ────────────────────────────────────────────────
export interface ScenarioSelection { people: EntityRef[]; unavailable: EntityRef[]; failing: EntityRef[] }
export interface ScenarioResult {
  orphanedCriticalAssets: Array<{ asset: EntityRef; priorOwner: EntityRef | null; criticality: CriticalityLevel }>;
  stoppedAutomations: Array<{ workflow: EntityRef; credentialOwner: EntityRef | null; weeklyRuns: number }>;
  runsPerWeekAffected: number;
  downstream: EntityRef[];
  unknownFactsEncountered: number;
}
export interface SuccessionTestView {
  coveredCount: number; stillExposedCount: number; totalCriticalAssetsOwned: number; sharePct: number; overloadWarning: boolean;
}
export interface WorstLosses {
  vendorsAndModels: Array<{ entity: EntityRef; automationsHalted: number; runsPerWeekAffected: number }>;
  peopleHoldingManyUnbacked: number; threshold: number;
}

// ── Ask OBA ────────────────────────────────────────────────
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  sources: Array<{ label: string; detail: string }>; createdAt: string;
}
export interface Conversation { id: string; title: string; updatedAt: string }

// ── Attestation ────────────────────────────────────────────
export interface AttestAsset { taskId: string; asset: EntityRef; status: 'todo' | 'saved' }
export interface AttestSession {
  token: string; legacy: boolean;
  reviewer: { name: string; email: string };
  requestedBy: string | null;
  company: { name: string; logoUrl: string | null } | null;
  expired: boolean; submitted: boolean;
  assets: AttestAsset[];
}
export interface AttestAnswers {
  isOwner: boolean;
  ownerPersonId: string | null;
  backup: { kind: 'person'; personId: string } | { kind: 'none' };
  criticality: 'high' | 'medium' | 'low';
  criticalityReason: string;
  runbook: { kind: 'url'; url: string } | { kind: 'not_documented' };
  fallback: 'yes' | 'no' | 'unknown';
}

// ── Reviewer app ───────────────────────────────────────────
export interface ReviewerTasks {
  confirmations: Array<{ token: string; campaignName: string; assetCount: number; dueDate: string }>;
  handovers: Array<{
    id: string; from: EntityRef;
    assets: Array<{ asset: EntityRef; criticality: CriticalityLevel; runbookUrl: string | null; credentialNote: string | null }>;
  }>;
}

// ── Settings ───────────────────────────────────────────────
export type ConnectionType = 'n8n' | 'entra' | 'google' | 'openai' | 'anthropic' | 'csv';
export interface ConnectionView {
  id: string; type: ConnectionType; name: string; status: 'healthy' | 'failed' | 'syncing' | 'never';
  lastSyncAt: string | null; itemsSynced: number | null; lastError: string | null; secretHint: string | null;
}
export interface IdentityQueueItemView {
  id: string; source: string; displayName: string | null; emailCandidate: string | null;
  suggestion: { person: EntityRef; reason: string } | null;
}
export type IdentityResolution =
  | { action: 'link'; personId: string } | { action: 'service_account' } | { action: 'departed' } | { action: 'ignore' };
export interface UserView { id: string; name: string; email: string; role: Role; isHrManager: boolean }
export interface OrganizationSettings {
  companyName: string; logoUrl: string | null; minGroupSize: number;
  departmentMappings: Array<{ raw: string; mapped: string }>;
}
export interface AuditEntry { id: string; at: string; actor: string; action: string; resource: string; details: string }
export interface NamedItem { id: string; name: string; detail: string | null }
export interface N8nCheckReport {
  scannedAt: string;
  summary: { totalWorkflows: number; totalUsers: number; totalCredentials: number; aiIntegrationsCount: number };
  /** each list is null when this backend version does not produce it yet (B-12) */
  singleOwner: NamedItem[] | null;
  personalCredential: NamedItem[] | null;
  failing: NamedItem[] | null;
  abandoned: NamedItem[] | null;
}
```

- [ ] **Step 2: Create `frontend/lib/api/session.ts`**

```ts
import type { AuthProvider, Session } from '@/types/view';
import { apiUrl, request } from './client';

export function fetchSession(): Promise<Session> {
  return request<Session>('/api/auth/session'); // (planned) B-02
}

export async function fetchAuthProviders(): Promise<AuthProvider[]> {
  const r = await request<{ providers: AuthProvider[] }>('/api/auth/providers'); // (planned) B-02
  return r.providers;
}

export function authStartUrl(provider: AuthProvider): string {
  return apiUrl(`/api/auth/${provider}/start`); // (planned) B-02
}

export function signOut(): Promise<void> {
  return request<void>('/api/auth/sign-out', { method: 'POST' }); // (planned) B-02
}
```

- [ ] **Step 3: Create `frontend/lib/api/overview.ts`**

```ts
import type { HeadlineMetrics } from '@horquva/types';
import type { ChangeSummary, CoverageMetrics, NavCounts, SpofAsset } from '@/types/view';
import { request } from './client';

type OverviewResponse = { metrics: HeadlineMetrics & { unknownCriticalAssets?: number } };

/** Existing: GET /api/continuity/overview. `unknown` stays null until B-01. */
export async function fetchCoverage(): Promise<CoverageMetrics> {
  const { metrics: m } = await request<OverviewResponse>('/api/continuity/overview');
  return {
    total: m.totalCriticalAssets,
    covered: m.fullyCoveredCriticalAssets,
    exposed: m.exposedCriticalAssets,
    unknown: typeof m.unknownCriticalAssets === 'number' ? m.unknownCriticalAssets : null,
    definition: m.definition,
  };
}

export function fetchChangeSummary(): Promise<ChangeSummary> {
  return request<ChangeSummary>('/api/changes/summary'); // (planned) B-03 — backend computes "since last visit"
}

export async function fetchSpofAssets(limit = 5): Promise<SpofAsset[]> {
  const r = await request<{ assets: SpofAsset[] }>(`/api/continuity/spof-assets?limit=${limit}`); // (planned) B-04
  return r.assets;
}

/** Existing: GET /api/continuity/briefing */
export async function fetchBriefing(): Promise<string> {
  const r = await request<{ briefing: string }>('/api/continuity/briefing');
  return r.briefing;
}

export function fetchNavCounts(): Promise<NavCounts> {
  return request<NavCounts>('/api/nav-counts'); // (planned) B-05
}
```

- [ ] **Step 4: Create `frontend/lib/api/changes.ts`**

```ts
import type { ChangeEventView } from '@/types/view';
import { request } from './client';

export async function fetchChanges(): Promise<ChangeEventView[]> {
  const r = await request<{ events: ChangeEventView[] }>('/api/changes?acknowledged=false'); // (planned) B-03
  return r.events;
}

export function acknowledgeChange(id: string): Promise<void> {
  return request<void>(`/api/changes/${encodeURIComponent(id)}/ack`, { method: 'POST' }); // (planned) B-03
}

export function acknowledgeAllChanges(): Promise<void> {
  return request<void>('/api/changes/ack-all', { method: 'POST' }); // (planned) B-03
}
```

- [ ] **Step 5: Create `frontend/lib/api/entities.ts`**

```ts
import type { EntityKind, EntityRef } from '@/types/view';
import { request } from './client';

const nameCache = new Map<string, string>();

/** Existing: GET /api/continuity/inventory?kind= (returns raw entity rows). */
export async function fetchEntities(kind: EntityKind): Promise<EntityRef[]> {
  const r = await request<{ entities: Array<{ id: string; kind: EntityKind; name: string }> }>(
    `/api/continuity/inventory?kind=${encodeURIComponent(kind)}`,
  );
  const refs = r.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name }));
  refs.forEach((e) => nameCache.set(e.id, e.name));
  return refs;
}

/** Name for an id seen by fetchEntities; falls back to the id itself. */
export function lookupEntityName(id: string): string {
  return nameCache.get(id) ?? id;
}
```

- [ ] **Step 6: Create `frontend/lib/api/assets.ts`**

```ts
import type { AssetDetail, AssetRow } from '@/types/view';
import { request } from './client';

export async function fetchAssets(): Promise<AssetRow[]> {
  const r = await request<{ assets: AssetRow[] }>('/api/assets'); // (planned) B-06
  return r.assets;
}

export function fetchAssetDetail(id: string): Promise<AssetDetail> {
  return request<AssetDetail>(`/api/assets/${encodeURIComponent(id)}`); // (planned) B-06
}
```

- [ ] **Step 7: Create `frontend/lib/api/actions.ts`**

```ts
import type { ActionStatus, ActionView } from '@/types/view';
import { request } from './client';

export async function fetchActions(params: { status?: ActionStatus; limit?: number } = {}): Promise<ActionView[]> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  const r = await request<{ actions: ActionView[] }>(`/api/actions${qs ? `?${qs}` : ''}`); // (planned) B-07
  return r.actions;
}

export function assignBackup(actionId: string, personId: string): Promise<void> {
  return request<void>(`/api/actions/${encodeURIComponent(actionId)}/assign-backup`, {
    method: 'POST', body: JSON.stringify({ personId }),
  }); // (planned) B-07
}

export function acceptRisk(actionId: string, input: { reason: string; expiresAt: string }): Promise<void> {
  return request<void>(`/api/actions/${encodeURIComponent(actionId)}/accept-risk`, {
    method: 'POST', body: JSON.stringify(input),
  }); // (planned) B-07
}
```

- [ ] **Step 8: Create `frontend/lib/api/confirmations.ts`**

```ts
import type { CampaignDetail, CampaignPreview, CampaignScope, CampaignSummary, CreateCampaignInput } from '@/types/view';
import { request } from './client';

type CampaignRow = {
  id: string; name: string; status: string; due_date: string; created_at: string;
  total_tasks: number | string; completed_tasks: number | string;
};

/** Existing: GET /api/attestation/campaigns (snake_case rows; counts may arrive as strings). */
export async function fetchCampaigns(): Promise<CampaignSummary[]> {
  const r = await request<{ campaigns: CampaignRow[] }>('/api/attestation/campaigns');
  return r.campaigns.map((c) => ({
    id: c.id, name: c.name, status: c.status, dueDate: c.due_date, createdAt: c.created_at,
    totalTasks: Number(c.total_tasks), completedTasks: Number(c.completed_tasks),
  }));
}

export function fetchCampaignDetail(id: string): Promise<CampaignDetail> {
  return request<CampaignDetail>(`/api/attestation/campaigns/${encodeURIComponent(id)}`); // (planned) B-08
}

export function previewCampaign(scope: CampaignScope): Promise<CampaignPreview> {
  return request<CampaignPreview>('/api/attestation/campaigns/preview', {
    method: 'POST', body: JSON.stringify({ scope }),
  }); // (planned) B-08
}

/** Existing: POST /api/attestation/campaigns. `introLine` and `sendAt` need B-08 to be honoured. */
export async function createCampaign(input: CreateCampaignInput): Promise<string> {
  const r = await request<{ campaignId: string }>('/api/attestation/campaigns', {
    method: 'POST', body: JSON.stringify(input),
  });
  return r.campaignId;
}
```

- [ ] **Step 9: Create `frontend/lib/api/departures.ts`**

```ts
import type { DepartureDetail, DepartureSummary, SuccessionPlanResult, SuccessorAssignment } from '@/types/view';
import { request } from './client';

export async function fetchDepartures(): Promise<DepartureSummary[]> {
  const r = await request<{ departures: DepartureSummary[] }>('/api/departures'); // (planned) B-09
  return r.departures;
}

export function fetchDeparture(id: string): Promise<DepartureDetail> {
  return request<DepartureDetail>(`/api/departures/${encodeURIComponent(id)}`); // (planned) B-09
}

export async function initiateDeparture(input: { personId: string; leaveDate: string; note: string | null }): Promise<string> {
  const r = await request<{ id: string }>('/api/departures', { method: 'POST', body: JSON.stringify(input) }); // (planned) B-09
  return r.id;
}

export function simulateSuccessionPlan(departureId: string, assignments: SuccessorAssignment[]): Promise<SuccessionPlanResult> {
  return request<SuccessionPlanResult>(`/api/departures/${encodeURIComponent(departureId)}/succession-test`, {
    method: 'POST', body: JSON.stringify({ assignments }),
  }); // (planned) B-09
}

export function saveSuccessors(departureId: string, assignments: SuccessorAssignment[]): Promise<void> {
  return request<void>(`/api/departures/${encodeURIComponent(departureId)}/successors`, {
    method: 'PUT', body: JSON.stringify({ assignments }),
  }); // (planned) B-09
}

export function sendAcceptanceRequests(departureId: string): Promise<void> {
  return request<void>(`/api/departures/${encodeURIComponent(departureId)}/acceptance-requests`, { method: 'POST' }); // (planned) B-09
}
```

- [ ] **Step 10: Create `frontend/lib/api/people.ts`**

```ts
import type { PersonDetail, TeamDetail, TeamSummary } from '@/types/view';
import { request } from './client';

export function fetchTeams(): Promise<{ teams: TeamSummary[]; minGroupSize: number }> {
  return request('/api/people/teams'); // (planned) B-10
}

export function fetchTeam(id: string): Promise<TeamDetail> {
  return request<TeamDetail>(`/api/people/teams/${encodeURIComponent(id)}`); // (planned) B-10
}

export function fetchPerson(id: string): Promise<PersonDetail> {
  return request<PersonDetail>(`/api/people/${encodeURIComponent(id)}`); // (planned) B-10
}
```

- [ ] **Step 11: Create `frontend/lib/api/graph.ts`**

```ts
import type { BlastRadius, Neighbourhood } from '@/types/view';
import { request } from './client';

export function fetchNeighbourhood(rootId: string, hops: 1 | 2 = 2): Promise<Neighbourhood> {
  return request<Neighbourhood>(`/api/graph/neighbourhood?root=${encodeURIComponent(rootId)}&hops=${hops}`); // (planned) B-11
}

export function fetchBlastRadius(rootId: string): Promise<BlastRadius> {
  return request<BlastRadius>(`/api/graph/blast-radius?root=${encodeURIComponent(rootId)}`); // (planned) B-11
}
```

- [ ] **Step 12: Create `frontend/lib/api/simulations.ts`**

```ts
import type { SuccessionTestResult, WhatIfScenarioResult } from '@horquva/types';
import type { EntityRef, ScenarioResult, ScenarioSelection, SuccessionTestView, WorstLosses } from '@/types/view';
import { request } from './client';
import { lookupEntityName } from './entities';

function ref(id: string, kind: EntityRef['kind']): EntityRef {
  return { id, kind, name: lookupEntityName(id) };
}

function fromLeaver(r: WhatIfScenarioResult): ScenarioResult {
  return {
    orphanedCriticalAssets: r.orphanedCriticalAssets.map((a) => ({
      asset: { id: a.entityId, kind: 'automation', name: a.name },
      priorOwner: a.priorOwnerId ? ref(a.priorOwnerId, 'person') : null,
      criticality: a.criticality,
    })),
    stoppedAutomations: r.stoppedPersonalCredentialAutomations.map((s) => ({
      workflow: { id: s.workflowId, kind: 'automation', name: s.workflowName },
      credentialOwner: s.credentialOwnerId ? ref(s.credentialOwnerId, 'person') : null,
      weeklyRuns: s.weeklyRuns,
    })),
    runsPerWeekAffected: r.totalRunsPerWeekAffected,
    downstream: r.affectedDownstreamAssetIds.map((id) => ref(id, 'automation')),
    unknownFactsEncountered: r.unknownFactsEncountered,
  };
}

type OutageResult = { affectedAutomations: Array<{ id: string; name: string; weeklyRuns: number }>; totalRunsPerWeekAffected: number };

function fromOutage(r: OutageResult): ScenarioResult {
  return {
    orphanedCriticalAssets: [],
    stoppedAutomations: r.affectedAutomations.map((a) => ({
      workflow: { id: a.id, kind: 'automation', name: a.name }, credentialOwner: null, weeklyRuns: a.weeklyRuns,
    })),
    runsPerWeekAffected: r.totalRunsPerWeekAffected,
    downstream: [],
    unknownFactsEncountered: 0,
  };
}

/** Routes to the existing S1/S2 endpoints when possible, otherwise the planned combined endpoint (B-13). */
export async function runScenario(sel: ScenarioSelection): Promise<ScenarioResult> {
  const onlyPeople = sel.people.length > 0 && sel.unavailable.length === 0 && sel.failing.length === 0;
  const onlyOneModel = sel.people.length === 0 && sel.failing.length === 0 && sel.unavailable.length === 1;

  if (onlyPeople) {
    const r = await request<{ result: WhatIfScenarioResult }>('/api/continuity/simulations/leaver', {
      method: 'POST', body: JSON.stringify({ departingPersonIds: sel.people.map((p) => p.id) }),
    });
    return fromLeaver(r.result);
  }
  if (onlyOneModel) {
    const r = await request<{ result: OutageResult }>('/api/continuity/simulations/outage', {
      method: 'POST', body: JSON.stringify({ modelEntityId: sel.unavailable[0].id }),
    });
    return fromOutage(r.result);
  }
  return request<ScenarioResult>('/api/continuity/simulations/combined', {
    method: 'POST',
    body: JSON.stringify({
      departingPersonIds: sel.people.map((p) => p.id),
      unavailableIds: sel.unavailable.map((u) => u.id),
      failingAssetIds: sel.failing.map((f) => f.id),
    }),
  }); // (planned) B-13
}

/** Existing: POST /api/continuity/simulations/succession */
export async function testSuccession(departingPersonId: string, successorPersonId: string): Promise<SuccessionTestView> {
  const { result } = await request<{ result: SuccessionTestResult }>('/api/continuity/simulations/succession', {
    method: 'POST', body: JSON.stringify({ departingPersonId, successorPersonId }),
  });
  return {
    coveredCount: result.postHandoverCoverage.coveredCount,
    stillExposedCount: result.postHandoverCoverage.stillExposedCount,
    totalCriticalAssetsOwned: result.successorNewConcentrationLoad.totalCriticalAssetsOwned,
    sharePct: result.successorNewConcentrationLoad.shareOfCompanyCriticalAutomationsPct,
    overloadWarning: result.successorNewConcentrationLoad.overloadWarning,
  };
}

export function fetchWorstLosses(): Promise<WorstLosses> {
  return request<WorstLosses>('/api/continuity/simulations/worst-losses'); // (planned) B-13
}
```

- [ ] **Step 13: Create `frontend/lib/api/assistant.ts`**

```ts
import type { ChatMessage, Conversation } from '@/types/view';
import { request } from './client';

export async function fetchConversations(): Promise<Conversation[]> {
  const r = await request<{ conversations: Conversation[] }>('/api/assistant/conversations'); // (planned) B-14
  return r.conversations;
}

export function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
  return request(`/api/assistant/conversations/${encodeURIComponent(id)}`); // (planned) B-14
}

export function sendMessage(conversationId: string | null, query: string): Promise<{ conversationId: string; message: ChatMessage }> {
  return request('/api/assistant/messages', {
    method: 'POST', body: JSON.stringify({ conversationId, query }),
  }); // (planned) B-14
}

/** Existing: POST /api/continuity/assistant/ask. No history, no structured sources. */
export async function askOnce(query: string): Promise<ChatMessage> {
  const r = await request<{ answer: string }>('/api/continuity/assistant/ask', {
    method: 'POST', body: JSON.stringify({ query }),
  });
  return { id: `local-${Date.now()}`, role: 'assistant', content: r.answer, sources: [], createdAt: new Date().toISOString() };
}
```

- [ ] **Step 14: Create `frontend/lib/api/attest.ts`**

```ts
import type { AttestationAnswers, AttestationTask } from '@horquva/types';
import type { AttestAnswers, AttestSession, EntityRef } from '@/types/view';
import { ApiError, request } from './client';
import { fetchEntities } from './entities';

type LegacyTask = { task: AttestationTask; assetName: string; reviewerName: string; reviewerEmail: string };

/** Planned multi-asset endpoint (B-15); falls back to the existing single-task endpoint. */
export async function fetchAttestSession(token: string): Promise<AttestSession> {
  const t = encodeURIComponent(token);
  try {
    const s = await request<Omit<AttestSession, 'token' | 'legacy'>>(`/api/attest/${t}`);
    return { ...s, token, legacy: false };
  } catch (e) {
    if (!(e instanceof ApiError) || !e.notAvailable) throw e;
  }
  const l = await request<LegacyTask>(`/api/attestation/review/${t}`);
  return {
    token, legacy: true,
    reviewer: { name: l.reviewerName, email: l.reviewerEmail },
    requestedBy: null, company: null, expired: false,
    submitted: l.task.status === 'submitted',
    assets: [{
      taskId: l.task.id,
      asset: { id: l.task.assetEntityId, kind: 'automation', name: l.assetName },
      status: l.task.status === 'submitted' ? 'saved' : 'todo',
    }],
  };
}

export class UnsupportedAnswerError extends Error {}

function toLegacy(a: AttestAnswers): AttestationAnswers {
  if (a.fallback === 'unknown') {
    throw new UnsupportedAnswerError('This deployment can’t record “Don’t know” yet. Choose Yes or No, or ask your admin.');
  }
  return {
    isOwner: a.isOwner,
    backupPersonId: a.backup.kind === 'person' ? a.backup.personId : null,
    criticality: a.criticality,
    criticalityReason: a.criticalityReason,
    isDocumented: a.runbook.kind === 'url',
    documentationUrl: a.runbook.kind === 'url' ? a.runbook.url : undefined,
    fallbackExists: a.fallback === 'yes',
  };
}

export function saveAttestAnswers(session: AttestSession, taskId: string, answers: AttestAnswers): Promise<void> {
  const t = encodeURIComponent(session.token);
  if (session.legacy) {
    return request<void>(`/api/attestation/review/${t}`, { method: 'POST', body: JSON.stringify(toLegacy(answers)) });
  }
  return request<void>(`/api/attest/${t}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT', body: JSON.stringify(answers),
  }); // (planned) B-15
}

/** People the reviewer can pick as backup/owner. */
export async function loadAttestPeople(session: AttestSession): Promise<EntityRef[]> {
  if (session.legacy) return fetchEntities('person');
  const r = await request<{ people: EntityRef[] }>(`/api/attest/${encodeURIComponent(session.token)}/people`); // (planned) B-15
  return r.people;
}
```

- [ ] **Step 15: Create `frontend/lib/api/reviewer.ts`**

```ts
import type { ReviewerTasks } from '@/types/view';
import { request } from './client';

export function fetchReviewerTasks(): Promise<ReviewerTasks> {
  return request<ReviewerTasks>('/api/me/tasks'); // (planned) B-16
}

export function acceptHandover(id: string): Promise<void> {
  return request<void>(`/api/handovers/${encodeURIComponent(id)}/accept`, { method: 'POST' }); // (planned) B-16
}

export function declineHandover(id: string, reason: string): Promise<void> {
  return request<void>(`/api/handovers/${encodeURIComponent(id)}/decline`, {
    method: 'POST', body: JSON.stringify({ reason }),
  }); // (planned) B-16
}
```

- [ ] **Step 16: Create `frontend/lib/api/settings.ts`**

```ts
import type {
  AuditEntry, ConnectionView, IdentityQueueItemView, IdentityResolution, N8nCheckReport, OrganizationSettings, UserView,
} from '@/types/view';
import { request } from './client';

export async function fetchConnections(): Promise<ConnectionView[]> {
  const r = await request<{ connections: ConnectionView[] }>('/api/connections'); // (planned) B-17
  return r.connections;
}

export function syncConnection(id: string): Promise<void> {
  return request<void>(`/api/connections/${encodeURIComponent(id)}/sync`, { method: 'POST' }); // (planned) B-17
}

type V0Response = {
  scannedAt: string;
  summary: N8nCheckReport['summary'];
  singleOwner?: N8nCheckReport['singleOwner'];
  personalCredential?: N8nCheckReport['personalCredential'];
  failing?: N8nCheckReport['failing'];
  abandoned?: N8nCheckReport['abandoned'];
};

/** Existing: POST /api/v0/n8n-check. The four named lists need B-12; absent lists stay null. */
export async function runN8nCheck(n8nUrl: string, n8nApiKey: string): Promise<N8nCheckReport> {
  const r = await request<V0Response>('/api/v0/n8n-check', { method: 'POST', body: JSON.stringify({ n8nUrl, n8nApiKey }) });
  return {
    scannedAt: r.scannedAt, summary: r.summary,
    singleOwner: r.singleOwner ?? null, personalCredential: r.personalCredential ?? null,
    failing: r.failing ?? null, abandoned: r.abandoned ?? null,
  };
}

export async function fetchIdentityQueue(): Promise<IdentityQueueItemView[]> {
  const r = await request<{ items: IdentityQueueItemView[] }>('/api/identity-queue'); // (planned) B-18
  return r.items;
}

export function resolveIdentity(id: string, resolution: IdentityResolution): Promise<void> {
  return request<void>(`/api/identity-queue/${encodeURIComponent(id)}/resolve`, {
    method: 'POST', body: JSON.stringify(resolution),
  }); // (planned) B-18
}

export async function fetchUsers(): Promise<UserView[]> {
  const r = await request<{ users: UserView[] }>('/api/users'); // (planned) B-02
  return r.users;
}

export function updateUser(id: string, patch: Partial<Pick<UserView, 'role' | 'isHrManager'>>): Promise<void> {
  return request<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }); // (planned) B-02
}

export function fetchOrganization(): Promise<OrganizationSettings> {
  return request<OrganizationSettings>('/api/settings/organization'); // (planned) B-19
}

export function saveOrganization(s: OrganizationSettings): Promise<void> {
  return request<void>('/api/settings/organization', { method: 'PUT', body: JSON.stringify(s) }); // (planned) B-19
}

export async function fetchAuditLog(filters: { action?: string; from?: string; to?: string } = {}): Promise<AuditEntry[]> {
  const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => !!v) as Array<[string, string]>).toString();
  const r = await request<{ entries: AuditEntry[] }>(`/api/audit-log${q ? `?${q}` : ''}`); // (planned) B-20
  return r.entries;
}
```

- [ ] **Step 17: Write the contract test `frontend/tests/lib/api-contracts.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as overview from '@/lib/api/overview';
import * as changes from '@/lib/api/changes';
import * as assets from '@/lib/api/assets';
import * as actions from '@/lib/api/actions';
import * as confirmations from '@/lib/api/confirmations';
import * as departures from '@/lib/api/departures';
import * as people from '@/lib/api/people';
import * as graph from '@/lib/api/graph';
import * as sims from '@/lib/api/simulations';
import * as assistant from '@/lib/api/assistant';
import * as reviewer from '@/lib/api/reviewer';
import * as settings from '@/lib/api/settings';
import * as attest from '@/lib/api/attest';

function respond(body: unknown, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
const call = (spy: ReturnType<typeof respond>, i = 0) => ({
  url: String(spy.mock.calls[i][0]).replace('http://localhost:4000', ''),
  method: (spy.mock.calls[i][1] as RequestInit | undefined)?.method ?? 'GET',
  body: (spy.mock.calls[i][1] as RequestInit | undefined)?.body,
});

describe('API contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('adapts existing overview metrics; unknown stays null until B-01', async () => {
    respond({ metrics: { totalCriticalAssets: 52, fullyCoveredCriticalAssets: 38, exposedCriticalAssets: 14, unknownCriticalFacts: 5, definition: 'd' } });
    await expect(overview.fetchCoverage()).resolves.toEqual({ total: 52, covered: 38, exposed: 14, unknown: null, definition: 'd' });
  });

  it('uses unknownCriticalAssets once the backend sends it', async () => {
    respond({ metrics: { totalCriticalAssets: 52, fullyCoveredCriticalAssets: 38, exposedCriticalAssets: 9, unknownCriticalFacts: 5, unknownCriticalAssets: 5, definition: 'd' } });
    await expect(overview.fetchCoverage()).resolves.toMatchObject({ exposed: 9, unknown: 5 });
  });

  it('maps snake_case campaigns', async () => {
    respond({ campaigns: [{ id: 'c1', name: 'Q4', status: 'active', due_date: '2026-10-08', created_at: '2026-10-01', total_tasks: '4', completed_tasks: '1' }] });
    await expect(confirmations.fetchCampaigns()).resolves.toEqual([
      { id: 'c1', name: 'Q4', status: 'active', dueDate: '2026-10-08', createdAt: '2026-10-01', totalTasks: 4, completedTasks: 1 },
    ]);
  });

  it.each([
    ['changes', () => changes.fetchChanges(), { events: [] }, '/api/changes?acknowledged=false', 'GET'],
    ['ack', () => changes.acknowledgeChange('e/1'), {}, '/api/changes/e%2F1/ack', 'POST'],
    ['assets', () => assets.fetchAssets(), { assets: [] }, '/api/assets', 'GET'],
    ['actions', () => actions.fetchActions({ status: 'open', limit: 3 }), { actions: [] }, '/api/actions?status=open&limit=3', 'GET'],
    ['departures', () => departures.fetchDepartures(), { departures: [] }, '/api/departures', 'GET'],
    ['teams', () => people.fetchTeams(), { teams: [], minGroupSize: 5 }, '/api/people/teams', 'GET'],
    ['neighbourhood', () => graph.fetchNeighbourhood('a:1'), { rootId: 'a:1', nodes: [], edges: [] }, '/api/graph/neighbourhood?root=a%3A1&hops=2', 'GET'],
    ['worst', () => sims.fetchWorstLosses(), { vendorsAndModels: [], peopleHoldingManyUnbacked: 0, threshold: 3 }, '/api/continuity/simulations/worst-losses', 'GET'],
    ['convos', () => assistant.fetchConversations(), { conversations: [] }, '/api/assistant/conversations', 'GET'],
    ['tasks', () => reviewer.fetchReviewerTasks(), { confirmations: [], handovers: [] }, '/api/me/tasks', 'GET'],
    ['connections', () => settings.fetchConnections(), { connections: [] }, '/api/connections', 'GET'],
    ['identity', () => settings.fetchIdentityQueue(), { items: [] }, '/api/identity-queue', 'GET'],
  ])('%s hits the contract path', async (_n, fn, body, url, method) => {
    const spy = respond(body);
    await fn();
    expect(call(spy)).toMatchObject({ url, method });
  });

  it('routes a people-only scenario to the existing leaver endpoint', async () => {
    const spy = respond({ result: { orphanedCriticalAssets: [], stoppedPersonalCredentialAutomations: [], totalRunsPerWeekAffected: 0, affectedDownstreamAssetIds: [], unknownFactsEncountered: 0 } });
    await sims.runScenario({ people: [{ id: 'person:a', kind: 'person', name: 'A' }], unavailable: [], failing: [] });
    expect(call(spy)).toMatchObject({ url: '/api/continuity/simulations/leaver', method: 'POST' });
  });

  it('routes a combined scenario to the planned combined endpoint', async () => {
    const spy = respond({ orphanedCriticalAssets: [], stoppedAutomations: [], runsPerWeekAffected: 0, downstream: [], unknownFactsEncountered: 0 });
    await sims.runScenario({
      people: [{ id: 'person:a', kind: 'person', name: 'A' }],
      unavailable: [{ id: 'vendor:openai', kind: 'vendor', name: 'OpenAI' }], failing: [],
    });
    expect(call(spy).url).toBe('/api/continuity/simulations/combined');
  });

  it('falls back to the legacy attestation endpoint and refuses to write "Don’t know" there', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('<pre>Cannot GET</pre>', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        task: { id: 't1', assetEntityId: 'automation:1', status: 'pending' }, assetName: 'Invoice sync',
        reviewerName: 'Sara', reviewerEmail: 's@acme.com',
      }), { status: 200 }));
    const s = await attest.fetchAttestSession('tok');
    expect(s.legacy).toBe(true);
    expect(s.assets[0].asset.name).toBe('Invoice sync');
    expect(call(spy, 1).url).toBe('/api/attestation/review/tok');
    expect(() => attest.saveAttestAnswers(s, 't1', {
      isOwner: true, ownerPersonId: null, backup: { kind: 'none' }, criticality: 'high', criticalityReason: 'r',
      runbook: { kind: 'not_documented' }, fallback: 'unknown',
    })).toThrow(attest.UnsupportedAnswerError);
  });
});
```

- [ ] **Step 18: Run it**

Run: `npm test -- tests/lib/api-contracts.test.ts`
Expected: all pass (`18 passed`).

- [ ] **Step 19: Commit**

```bash
git add types/view.ts lib/api tests/lib/api-contracts.test.ts
git commit -m "feat(api): view models and typed domain API modules (existing + planned contracts)"
```

---
## Phase B — Design system (`components/ui`)

### Task 7: Buttons, action pill, card, page header, tabs, large-screen notice

**Files:**
- Create: `frontend/components/ui/Button.tsx`, `ActionPill.tsx`, `Card.tsx`, `PageHeader.tsx`, `Tabs.tsx`, `LargeScreenNotice.tsx`
- Test: `frontend/tests/ui/basics.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 4).
- Produces:
  - `Button` (forwardRef, `variant?: 'primary'|'secondary'|'ghost'|'danger'`, `size?: 'md'|'sm'`, default `type="button"`)
  - `ButtonLink({ href, variant?, size?, ...anchorProps })`; `buttonClass(variant?, size?, className?)`
  - `ActionPill({ href?, children, ...buttonProps })`
  - `Card({ as?: 'section'|'div'|'article'|'li', ...htmlProps })`
  - `PageHeader({ title, description?, actions? })`
  - `LinkTabs({ label, tabs: {id,label,href,count?}[], active })`
  - `LargeScreenNotice({ listHref, listLabel })`

- [ ] **Step 1: Write the failing test `frontend/tests/ui/basics.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ActionPill } from '@/components/ui/ActionPill';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { LinkTabs } from '@/components/ui/Tabs';
import { LargeScreenNotice } from '@/components/ui/LargeScreenNotice';

describe('basic UI', () => {
  it('primary button uses amber fill with ink text and defaults to type=button', () => {
    render(<Button variant="primary">Send</Button>);
    const b = screen.getByRole('button', { name: 'Send' });
    expect(b).toHaveAttribute('type', 'button');
    expect(b.className).toContain('bg-amber');
    expect(b.className).toContain('text-on-amber');
  });

  it('ButtonLink renders a link', () => {
    render(<ButtonLink href="/settings/connections">Connect n8n</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Connect n8n' })).toHaveAttribute('href', '/settings/connections');
  });

  it('ActionPill is a rounded link when given href, else a button', () => {
    const { rerender } = render(<ActionPill href="/actions?focus=a1">Review</ActionPill>);
    expect(screen.getByRole('link', { name: 'Review' }).className).toContain('rounded-full');
    rerender(<ActionPill>Review</ActionPill>);
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
  });

  it('PageHeader renders one serif h1', () => {
    render(<PageHeader title="Assets" description="Everything we know about." />);
    const h = screen.getByRole('heading', { level: 1, name: 'Assets' });
    expect(h.className).toContain('font-serif');
  });

  it('LinkTabs marks the active tab', () => {
    render(<LinkTabs label="Actions views" active="confirmations" tabs={[
      { id: 'actions', label: 'Actions', href: '/actions' },
      { id: 'confirmations', label: 'Confirmations', href: '/actions?tab=confirmations', count: 2 },
    ]} />);
    expect(screen.getByRole('link', { name: /Confirmations/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Actions' })).not.toHaveAttribute('aria-current');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <main>
        <PageHeader title="Overview" actions={<Button>Refresh</Button>} />
        <Card><p>Body</p><ActionPill href="/x">Review</ActionPill></Card>
        <LargeScreenNotice listHref="/assets" listLabel="View as a list" />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/basics.test.tsx`
Expected: FAIL, cannot resolve `@/components/ui/Button`.

- [ ] **Step 3: Implement `frontend/components/ui/Button.tsx`**

```tsx
import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-amber text-on-amber hover:brightness-95',
  secondary: 'border border-rule bg-surface text-ink hover:bg-sunken',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink',
  danger: 'border border-rule bg-surface text-st-fail hover:bg-sunken',
};

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-[13px]',
    VARIANT[variant],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = 'button', ...rest }, ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
});

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ href, variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...rest} />;
}
```

- [ ] **Step 4: Implement `frontend/components/ui/ActionPill.tsx`**

```tsx
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Amber text: only ever place pills on bg-surface (cards), never on canvas.
const PILL =
  'inline-flex h-8 items-center gap-1.5 rounded-full border border-amber px-3.5 text-[13px] font-medium text-amber-ink transition-colors duration-150 hover:bg-amber/10';

type Props = { href?: string; children: ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>;

export function ActionPill({ href, children, className, ...rest }: Props) {
  if (href) return <Link href={href} className={cn(PILL, className)}>{children}</Link>;
  return <button type="button" className={cn(PILL, className)} {...rest}>{children}</button>;
}
```

- [ ] **Step 5: Implement `frontend/components/ui/Card.tsx`**

```tsx
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' | 'li' };

export function Card({ as: Tag = 'section', className, ...rest }: Props) {
  return <Tag className={cn('rounded-card border border-rule bg-surface p-6 shadow-card', className)} {...rest} />;
}
```

- [ ] **Step 6: Implement `frontend/components/ui/PageHeader.tsx`**

```tsx
import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-serif text-[40px] leading-[1.1] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 7: Implement `frontend/components/ui/Tabs.tsx`**

```tsx
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export interface LinkTab { id: string; label: string; href: string; count?: number }

export function LinkTabs({ label, tabs, active }: { label: string; tabs: LinkTab[]; active: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex gap-1 border-b border-rule">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.id === active ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors duration-150',
            t.id === active ? 'border-amber text-ink' : 'border-transparent text-ink-2 hover:text-ink',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && <span className="ml-2 tabular-nums text-ink-3">{formatNumber(t.count)}</span>}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 8: Implement `frontend/components/ui/LargeScreenNotice.tsx`**

```tsx
import { ButtonLink } from './Button';

/** Shown below 768px in place of Map and What-If. */
export function LargeScreenNotice({ listHref, listLabel }: { listHref: string; listLabel: string }) {
  return (
    <div className="rounded-card border border-rule bg-surface p-6 md:hidden">
      <p className="font-medium text-ink">Best on a larger screen</p>
      <p className="mt-1 text-sm text-ink-2">This view needs more room. You can see the same data as a list.</p>
      <ButtonLink href={listHref} className="mt-4">{listLabel}</ButtonLink>
    </div>
  );
}
```

- [ ] **Step 9: Run the test**

Run: `npm test -- tests/ui/basics.test.tsx`
Expected: `6 passed`.

- [ ] **Step 10: Commit**

```bash
git add components/ui/Button.tsx components/ui/ActionPill.tsx components/ui/Card.tsx components/ui/PageHeader.tsx components/ui/Tabs.tsx components/ui/LargeScreenNotice.tsx tests/ui/basics.test.tsx
git commit -m "feat(ui): buttons, action pill, card, page header, link tabs, large-screen notice"
```

---

### Task 8: Data marks (evidence, status, criticality, unknown, none, fact cell)

**Files:**
- Create: `frontend/components/ui/marks.tsx`
- Test: `frontend/tests/ui/marks.test.tsx`

**Interfaces:**
- Consumes: `cn`, `formatTime`, `FactView`, `EvidenceGrade`, `CheckStatus`, `CriticalityLevel` (Tasks 4, 6).
- Produces:
  - `GRADE_LABEL: Record<EvidenceGrade, string>`; `evidenceDescription(grade, source, observedAt, locale?) => string`
  - `EvidenceDot({ grade, source?, observedAt? })`; `EvidenceBadge({ grade })`; `EvidenceLegend()`
  - `CheckStatusBadge({ status })`; `CriticalityDots({ level })`
  - `UnknownValue({ askHref? })`; `NoneValue()`; `FactCell({ fact, askHref? })`

- [ ] **Step 1: Write the failing test `frontend/tests/ui/marks.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import {
  CheckStatusBadge, CriticalityDots, EvidenceBadge, EvidenceDot, EvidenceLegend, FactCell, evidenceDescription,
} from '@/components/ui/marks';
import type { FactView } from '@/types/view';

const fact = (over: Partial<FactView>): FactView => ({
  state: 'value', display: 'Sara Ali', grade: 'stated', source: 'n8n', observedAt: '2026-10-01T08:42:00Z', ...over,
});

describe('data marks', () => {
  it('describes evidence as grade · source · synced time', () => {
    expect(evidenceDescription('stated', 'n8n', '2026-10-01T08:42:00Z', 'en-US')).toMatch(/^Stated · n8n · synced \d{1,2}:42/);
    expect(evidenceDescription('unknown', null, null)).toBe('Unknown');
  });

  it('dot is focusable and exposes its description as a tooltip', () => {
    render(<EvidenceDot grade="inferred" source="n8n history" observedAt={null} />);
    const dot = screen.getByRole('img', { name: 'Inferred' });
    expect(dot).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Inferred · n8n history');
  });

  it('renders unknown as "Unknown" with an ask link, never as "No"', () => {
    render(<FactCell fact={fact({ state: 'unknown', display: null, grade: 'unknown', source: null, observedAt: null })} askHref="/actions/confirmations/new?assets=a1" />);
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    expect(screen.queryByText(/^No$/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Ask owner' })).toHaveAttribute('href', '/actions/confirmations/new?assets=a1');
  });

  it('renders a confirmed absence as red "None"', () => {
    render(<FactCell fact={fact({ state: 'none', display: null, grade: 'confirmed' })} />);
    expect(screen.getByText('None').className).toContain('text-st-fail');
  });

  it('renders the value for known facts', () => {
    render(<FactCell fact={fact({})} />);
    expect(screen.getByText('Sara Ali')).toBeInTheDocument();
  });

  it('labels check status and criticality in text', () => {
    render(<><CheckStatusBadge status="UNKNOWN" /><CriticalityDots level="high" /><EvidenceBadge grade="confirmed" /></>);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Criticality: High' })).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <main>
        <EvidenceLegend />
        <FactCell fact={fact({})} />
        <FactCell fact={fact({ state: 'unknown', display: null, grade: 'unknown' })} askHref="/x" />
        <CriticalityDots level="unknown" />
        <CheckStatusBadge status="FAIL" />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/marks.test.tsx`
Expected: FAIL, cannot resolve `@/components/ui/marks`.

- [ ] **Step 3: Implement `frontend/components/ui/marks.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import type { CheckStatus, CriticalityLevel, EvidenceGrade, FactView } from '@/types/view';

export const GRADE_LABEL: Record<EvidenceGrade, string> = {
  stated: 'Stated', inferred: 'Inferred', confirmed: 'Confirmed', unknown: 'Unknown',
};

const DOT: Record<EvidenceGrade, string> = {
  stated: 'bg-ev-stated', inferred: 'bg-ev-inferred', confirmed: 'bg-ev-confirmed', unknown: 'bg-ev-unknown',
};

const BADGE: Record<EvidenceGrade, string> = {
  stated: 'bg-ev-stated/10 text-ev-stated',
  inferred: 'bg-ev-inferred/10 text-ev-inferred',
  confirmed: 'bg-ev-confirmed/10 text-ev-confirmed',
  unknown: 'border border-dashed border-ev-unknown text-ev-unknown',
};

export function evidenceDescription(grade: EvidenceGrade, source: string | null, observedAt: string | null, locale?: string): string {
  const parts = [GRADE_LABEL[grade]];
  if (source) parts.push(source);
  if (observedAt) parts.push(`synced ${formatTime(observedAt, locale)}`);
  return parts.join(' · ');
}

export function EvidenceDot({ grade, source = null, observedAt = null }: { grade: EvidenceGrade; source?: string | null; observedAt?: string | null }) {
  const tipId = useId();
  return (
    <span className="group/dot relative inline-flex shrink-0">
      <span
        tabIndex={0}
        role="img"
        aria-label={GRADE_LABEL[grade]}
        aria-describedby={tipId}
        className={cn('inline-block size-2 rounded-full', DOT[grade])}
      />
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-badge bg-ink px-2 py-1 text-xs text-canvas opacity-0 transition-opacity duration-150 group-hover/dot:opacity-100 group-focus-within/dot:opacity-100"
      >
        {evidenceDescription(grade, source, observedAt)}
      </span>
    </span>
  );
}

export function EvidenceBadge({ grade }: { grade: EvidenceGrade }) {
  return (
    <span className={cn('inline-flex items-center rounded-badge px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', BADGE[grade])}>
      {GRADE_LABEL[grade]}
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <ul aria-label="Evidence legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
      {(Object.keys(GRADE_LABEL) as EvidenceGrade[]).map((g) => (
        <li key={g} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('size-2 rounded-full', DOT[g])} />
          {GRADE_LABEL[g]}
        </li>
      ))}
    </ul>
  );
}

const STATUS: Record<CheckStatus, { label: string; cls: string }> = {
  PASS: { label: 'Pass', cls: 'bg-st-pass/10 text-st-pass' },
  FAIL: { label: 'Fail', cls: 'bg-st-fail/10 text-st-fail' },
  UNKNOWN: { label: 'Unknown', cls: 'border border-dashed border-st-unknown text-st-unknown' },
};

export function CheckStatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-badge px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', STATUS[status].cls)}>
      {STATUS[status].label}
    </span>
  );
}

const CRIT_FILLED: Record<CriticalityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };
const CRIT_LABEL: Record<CriticalityLevel, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', unknown: 'Unknown' };

export function CriticalityDots({ level }: { level: CriticalityLevel }) {
  return (
    <span
      role="img"
      aria-label={`Criticality: ${CRIT_LABEL[level]}`}
      className={cn('inline-flex items-center gap-2 text-sm', level === 'unknown' ? 'text-ev-unknown' : 'text-ink-2')}
    >
      <span aria-hidden className="flex gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('size-1.5 rounded-full', i < CRIT_FILLED[level] ? 'bg-current' : 'border border-current')} />
        ))}
      </span>
      <span aria-hidden>{CRIT_LABEL[level]}</span>
    </span>
  );
}

export function UnknownValue({ askHref }: { askHref?: string }) {
  return (
    <span className="group/unknown inline-flex items-center gap-2">
      <span className="rounded-badge border border-dashed border-ev-unknown px-1.5 py-0.5 text-xs text-ev-unknown">Unknown</span>
      {askHref && (
        <Link
          href={askHref}
          className="text-xs font-medium text-amber-ink underline-offset-2 opacity-0 transition-opacity duration-150 hover:underline focus:opacity-100 group-hover/unknown:opacity-100"
        >
          Ask owner
        </Link>
      )}
    </span>
  );
}

export function NoneValue() {
  return <span className="text-sm font-medium text-st-fail">None</span>;
}

export function FactCell({ fact, askHref }: { fact: FactView; askHref?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <EvidenceDot grade={fact.grade} source={fact.source} observedAt={fact.observedAt} />
      {fact.state === 'unknown' ? <UnknownValue askHref={askHref} />
        : fact.state === 'none' ? <NoneValue />
        : <span className="text-sm text-ink">{fact.display}</span>}
    </span>
  );
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- tests/ui/marks.test.tsx`
Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add components/ui/marks.tsx tests/ui/marks.test.tsx
git commit -m "feat(ui): evidence dot/badge/legend, check status, criticality dots, unknown/none fact cells"
```

---

### Task 9: States (skeleton, empty, error, resource view), toast, hero art

**Files:**
- Create: `frontend/components/ui/states.tsx`, `frontend/components/ui/Toast.tsx`, `frontend/components/ui/HeroArt.tsx`
- Test: `frontend/tests/ui/states.test.tsx`

**Interfaces:**
- Consumes: `Resource`, `ApiError` (Task 5), `Button` (Task 7), `formatTime` (Task 4).
- Produces:
  - `Skeleton({ className? })`; `LoadingBlock({ label? })`
  - `EmptyState({ title, body, action?, art? })`
  - `ErrorState({ error: ApiError, onRetry?, lastLoadedAt? })`
  - `ResourceView<T>({ resource, loading?, isEmpty?, empty?, children: (data: T) => ReactNode })`
  - `ToastProvider`, `useToast(): { show(message: string): void }`
  - `HeroArt({ className? })`

- [ ] **Step 1: Write the failing test `frontend/tests/ui/states.test.tsx`**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { EmptyState, ErrorState, ResourceView } from '@/components/ui/states';
import { ToastProvider, useToast } from '@/components/ui/Toast';

const reload = vi.fn();

describe('states', () => {
  it('ResourceView shows loading, then error with retry, then data', async () => {
    const { rerender } = render(
      <ResourceView resource={{ status: 'loading', reload, lastLoadedAt: null }}>{(d: string) => <p>{d}</p>}</ResourceView>,
    );
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();

    rerender(
      <ResourceView resource={{ status: 'error', error: new ApiError(0, "We couldn't reach OBA."), reload, lastLoadedAt: null }}>
        {(d: string) => <p>{d}</p>}
      </ResourceView>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't reach OBA");
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalled();

    rerender(<ResourceView resource={{ status: 'ready', data: 'hello', reload, lastLoadedAt: null }}>{(d: string) => <p>{d}</p>}</ResourceView>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('ResourceView renders the empty state when isEmpty', () => {
    render(
      <ResourceView
        resource={{ status: 'ready', data: [] as string[], reload, lastLoadedAt: null }}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState title="No departures" body="Nobody is leaving in the next 30 days." />}
      >
        {() => <p>list</p>}
      </ResourceView>,
    );
    expect(screen.getByRole('heading', { name: 'No departures' })).toBeInTheDocument();
  });

  it('ErrorState explains a missing backend route without offering retry', () => {
    render(<ErrorState error={new ApiError(404, 'x', true)} onRetry={reload} />);
    expect(screen.getByRole('alert')).toHaveTextContent("isn't available on this deployment yet");
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('ErrorState shows the last successful load time', () => {
    render(<ErrorState error={new ApiError(500, 'Boom')} lastLoadedAt="2026-10-01T08:42:00Z" />);
    expect(screen.getByText(/Last successful load/)).toBeInTheDocument();
  });

  it('toast announces politely and disappears', () => {
    vi.useFakeTimers();
    function Fire() { const t = useToast(); return <button onClick={() => t.show('Confirmation sent')}>go</button>; }
    render(<ToastProvider><Fire /></ToastProvider>);
    act(() => screen.getByRole('button', { name: 'go' }).click());
    expect(screen.getByText('Confirmation sent')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4100));
    expect(screen.queryByText('Confirmation sent')).toBeNull();
    vi.useRealTimers();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <main>
        <EmptyState title="Connect n8n" body="See your n8n exposure in a few minutes." art />
        <ErrorState error={new ApiError(500, 'Boom')} onRetry={reload} />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/states.test.tsx`
Expected: FAIL, cannot resolve `@/components/ui/states`.

- [ ] **Step 3: Implement `frontend/components/ui/HeroArt.tsx`**

```tsx
import { cn } from '@/lib/cn';

/** Decorative only. Image asset is pending (spec §13); the CSS falls back to a warm glow. */
export function HeroArt({ className }: { className?: string }) {
  return <div aria-hidden className={cn('hero-art', className)} />;
}
```

- [ ] **Step 4: Implement `frontend/components/ui/states.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api/client';
import type { Resource } from '@/lib/useResource';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { Button } from './Button';
import { HeroArt } from './HeroArt';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />;
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 rounded-card border border-rule bg-surface p-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton />
      <Skeleton className="w-2/3" />
    </div>
  );
}

export function EmptyState({ title, body, action, art = false }: { title: string; body: string; action?: ReactNode; art?: boolean }) {
  return (
    <div className="overflow-hidden rounded-card border border-rule bg-surface">
      {art && <HeroArt className="h-40 w-full" />}
      <div className="flex flex-col items-start gap-2 p-8">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="max-w-prose text-ink-2">{body}</p>
        {action && <div className="mt-3 flex flex-wrap gap-3">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry, lastLoadedAt }: { error: ApiError; onRetry?: () => void; lastLoadedAt?: string | null }) {
  const title = error.notAvailable ? 'Not available yet' : error.status === 0 ? "We couldn't reach OBA" : 'Something went wrong';
  const body = error.notAvailable
    ? "This part of OBA isn't available on this deployment yet."
    : error.status === 0 ? 'Check your connection and try again.' : error.message;
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-card border border-rule bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-2">{body}</p>
      {lastLoadedAt && <p className="text-sm text-ink-3">Last successful load {formatTime(lastLoadedAt)}</p>}
      {onRetry && !error.notAvailable && <Button size="sm" onClick={onRetry} className="mt-2">Retry</Button>}
    </div>
  );
}

type ResourceProp<T> = Resource<T> & { reload: () => void; lastLoadedAt: string | null };

export function ResourceView<T>({ resource, loading, isEmpty, empty, children }: {
  resource: ResourceProp<T>;
  loading?: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (resource.status === 'loading') return <>{loading ?? <LoadingBlock />}</>;
  if (resource.status === 'error') {
    return <ErrorState error={resource.error} onRetry={resource.reload} lastLoadedAt={resource.lastLoadedAt} />;
  }
  if (empty && isEmpty?.(resource.data)) return <>{empty}</>;
  return <>{children(resource.data)}</>;
}
```

- [ ] **Step 5: Implement `frontend/components/ui/Toast.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const ToastContext = createContext<{ show: (message: string) => void }>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Array<{ id: number; message: string }>>([]);

  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 max-md:bottom-20">
        {items.map((t) => (
          <div key={t.id} className="rounded-control bg-ink px-4 py-2.5 text-sm text-canvas shadow-card">{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -- tests/ui/states.test.tsx`
Expected: `6 passed`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/states.tsx components/ui/Toast.tsx components/ui/HeroArt.tsx tests/ui/states.test.tsx
git commit -m "feat(ui): loading/empty/error states, ResourceView, toast, hero art"
```

---

### Task 10: Segmented bar, named share bar, coverage strip

**Files:**
- Create: `frontend/components/ui/bars.tsx`, `frontend/components/ui/CoverageStrip.tsx`
- Test: `frontend/tests/ui/bars.test.tsx`

**Interfaces:**
- Consumes: `Card` (Task 7), `formatNumber` (Task 4), `CoverageMetrics`, `EntityRef` (Task 6).
- Produces:
  - `type Tone = 'pass' | 'fail' | 'unknown' | 'neutral'`
  - `interface Segment { key: string; label: string; value: number; tone: Tone; href?: string }`
  - `SegmentedBar({ segments, label })`
  - `NamedShareBar({ holders: Array<{ person: EntityRef; sharePct: number }> })`
  - `coverageSegments(c: CoverageMetrics): Segment[]`; `CoverageStrip({ coverage })`

- [ ] **Step 1: Write the failing test `frontend/tests/ui/bars.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { NamedShareBar, SegmentedBar } from '@/components/ui/bars';
import { CoverageStrip, coverageSegments } from '@/components/ui/CoverageStrip';

describe('bars', () => {
  it('coverage has three segments once unknown is partitioned', () => {
    const s = coverageSegments({ total: 52, covered: 38, exposed: 9, unknown: 5, definition: 'd' });
    expect(s.map((x) => [x.key, x.value, x.tone])).toEqual([['covered', 38, 'pass'], ['exposed', 9, 'fail'], ['unknown', 5, 'unknown']]);
  });

  it('coverage falls back to two honest segments while unknown is null (B-01)', () => {
    const s = coverageSegments({ total: 52, covered: 38, exposed: 14, unknown: null, definition: 'd' });
    expect(s).toHaveLength(2);
    expect(s[1].label).toBe('not fully covered (includes unknown)');
  });

  it('CoverageStrip shows the serif headline count and toggles the definition', async () => {
    render(<CoverageStrip coverage={{ total: 52, covered: 38, exposed: 9, unknown: 5, definition: 'Backup, docs and fallback confirmed.' }} />);
    const h = screen.getByRole('heading', { level: 2 });
    expect(h).toHaveTextContent('38 of 52 critical assets fully covered');
    expect(h.className).toContain('font-serif');
    const toggle = screen.getByRole('button', { name: 'What counts as covered?' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(screen.getByText('Backup, docs and fallback confirmed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /5 unknown/ })).toHaveAttribute('href', '/assets?coverage=unknown');
  });

  it('CoverageStrip says so when there are no critical assets yet', () => {
    render(<CoverageStrip coverage={{ total: 0, covered: 0, exposed: 0, unknown: 0, definition: 'd' }} />);
    expect(screen.getByText(/haven't found any critical assets yet/)).toBeInTheDocument();
  });

  it('SegmentedBar summarises itself for screen readers', () => {
    render(<SegmentedBar label="Coverage" segments={[{ key: 'a', label: 'covered', value: 3, tone: 'pass' }, { key: 'b', label: 'exposed', value: 1, tone: 'fail' }]} />);
    expect(screen.getByRole('img', { name: 'Coverage: 3 covered, 1 exposed' })).toBeInTheDocument();
  });

  it('NamedShareBar names holders in descending share', () => {
    render(<NamedShareBar holders={[
      { person: { id: 'p2', kind: 'person', name: 'Ben' }, sharePct: 30 },
      { person: { id: 'p1', kind: 'person', name: 'Ana' }, sharePct: 40 },
    ]} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Ana');
    expect(items[0]).toContain('40%');
    expect(items[1]).toContain('Ben');
  });

  it('has no axe violations', async () => {
    const { container } = render(<main><CoverageStrip coverage={{ total: 52, covered: 38, exposed: 9, unknown: 5, definition: 'd' }} /></main>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/bars.test.tsx`
Expected: FAIL, cannot resolve `@/components/ui/bars`.

- [ ] **Step 3: Implement `frontend/components/ui/bars.tsx`**

```tsx
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { EntityRef } from '@/types/view';

export type Tone = 'pass' | 'fail' | 'unknown' | 'neutral';
export interface Segment { key: string; label: string; value: number; tone: Tone; href?: string }

const TONE_BG: Record<Tone, string> = { pass: 'bg-st-pass', fail: 'bg-st-fail', unknown: 'bg-st-unknown', neutral: 'bg-ink-3' };

export function SegmentedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const summary = `${label}: ${segments.map((s) => `${formatNumber(s.value)} ${s.label}`).join(', ')}`;
  return (
    <div>
      <div role="img" aria-label={summary} className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
        {total > 0 && segments.filter((s) => s.value > 0).map((s) => (
          <span key={s.key} className={TONE_BG[s.tone]} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {segments.map((s) => {
          const text = <><span className="font-semibold tabular-nums">{formatNumber(s.value)}</span> {s.label}</>;
          return (
            <li key={s.key} className="flex items-center gap-2 text-ink">
              <span aria-hidden className={cn('size-2 rounded-full', TONE_BG[s.tone])} />
              {s.href ? <Link href={s.href} className="hover:underline">{text}</Link> : <span>{text}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SHARE_OPACITY = [1, 0.75, 0.55, 0.4, 0.3];

/** D-23: holders are named and ordered by share — the one approved exception to "no individual ordering". */
export function NamedShareBar({ holders }: { holders: Array<{ person: EntityRef; sharePct: number }> }) {
  const sorted = [...holders].sort((a, b) => b.sharePct - a.sharePct);
  return (
    <div>
      <div aria-hidden className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
        {sorted.map((h, i) => (
          <span key={h.person.id} className="bg-bronze" style={{ width: `${h.sharePct}%`, opacity: SHARE_OPACITY[Math.min(i, SHARE_OPACITY.length - 1)] }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        {sorted.map((h) => (
          <li key={h.person.id}>
            {h.person.name} <span className="tabular-nums text-ink">{formatNumber(h.sharePct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Implement `frontend/components/ui/CoverageStrip.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { formatNumber } from '@/lib/format';
import type { CoverageMetrics } from '@/types/view';
import { SegmentedBar, type Segment } from './bars';
import { Card } from './Card';

export function coverageSegments(c: CoverageMetrics): Segment[] {
  if (c.unknown === null) {
    return [
      { key: 'covered', label: 'covered', value: c.covered, tone: 'pass', href: '/assets?coverage=covered' },
      { key: 'exposed', label: 'not fully covered (includes unknown)', value: c.exposed, tone: 'fail', href: '/assets?coverage=exposed' },
    ];
  }
  return [
    { key: 'covered', label: 'covered', value: c.covered, tone: 'pass', href: '/assets?coverage=covered' },
    { key: 'exposed', label: 'exposed', value: c.exposed, tone: 'fail', href: '/assets?coverage=exposed' },
    { key: 'unknown', label: 'unknown', value: c.unknown, tone: 'unknown', href: '/assets?coverage=unknown' },
  ];
}

export function CoverageStrip({ coverage }: { coverage: CoverageMetrics }) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const defId = useId();
  return (
    <Card aria-labelledby={headingId}>
      <h2 id={headingId} className="font-serif text-[32px] leading-[1.15] text-ink">
        <span className="tabular-nums">{formatNumber(coverage.covered)}</span> of{' '}
        <span className="tabular-nums">{formatNumber(coverage.total)}</span> critical assets fully covered
      </h2>
      {coverage.total === 0 ? (
        <p className="mt-3 text-ink-2">We haven&apos;t found any critical assets yet. Criticality comes from owners&apos; confirmations.</p>
      ) : (
        <div className="mt-5"><SegmentedBar label="Critical asset coverage" segments={coverageSegments(coverage)} /></div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={defId}
        onClick={() => setOpen((o) => !o)}
        className="mt-4 text-sm font-medium text-amber-ink hover:underline"
      >
        What counts as covered?
      </button>
      {open && <p id={defId} className="mt-2 max-w-prose text-sm text-ink-2">{coverage.definition}</p>}
    </Card>
  );
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/ui/bars.test.tsx`
Expected: `7 passed`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/bars.tsx components/ui/CoverageStrip.tsx tests/ui/bars.test.tsx
git commit -m "feat(ui): segmented bar, named share bar, coverage strip with honest two-segment fallback"
```

---

### Task 11: Stage stepper and priority card

**Files:**
- Create: `frontend/components/ui/StageStepper.tsx`, `frontend/components/ui/PriorityCard.tsx`
- Test: `frontend/tests/ui/stepper-priority.test.tsx`

**Interfaces:**
- Consumes: `DEPARTURE_STAGES`, `STAGE_LABEL`, `DepartureStage`, `ActionView`, `ActionType` (Task 6); `Card`, `ActionPill` (Task 7); `formatDateTime`, `formatNumber` (Task 4).
- Produces: `StageStepper({ stage, timestamps?, variant: 'compact' | 'full' })`; `ACTION_TYPE_META: Record<ActionType, { label: string; icon: LucideIcon }>`; `PriorityCard({ action })`.

- [ ] **Step 1: Write the failing test `frontend/tests/ui/stepper-priority.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { StageStepper } from '@/components/ui/StageStepper';
import { PriorityCard } from '@/components/ui/PriorityCard';
import type { ActionView } from '@/types/view';

const action: ActionView = {
  id: 'act-1', rank: 1, type: 'assign_backup', status: 'open',
  problem: 'Invoice sync has one owner and no confirmed backup.',
  asset: { id: 'automation:n8n:41', kind: 'automation', name: 'Invoice sync' },
  failingFact: 'No confirmed backup', criticalAssetsAffected: 4, checkId: 'C1_UNBACKED_CRITICAL',
  primary: { kind: 'assign_backup' }, acceptedRisk: null, resolvedAt: null,
};

describe('StageStepper', () => {
  it('compact variant announces the stage', () => {
    render(<StageStepper variant="compact" stage="accepted" />);
    expect(screen.getByRole('img', { name: 'Stage 3 of 5: Accepted' })).toBeInTheDocument();
  });

  it('full variant lists all five stages and marks the current one', () => {
    render(<StageStepper variant="full" stage="successor_named" timestamps={{ initiated: '2026-09-30T10:00:00Z' }} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[4]).toHaveTextContent('Post-departure verified');
  });
});

describe('PriorityCard', () => {
  it('shows rank, problem, counted metric and a Review pill to the action', () => {
    render(<PriorityCard action={action} />);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('Missing backup')).toBeInTheDocument();
    expect(screen.getByText('Critical assets affected')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/actions?focus=act-1');
  });

  it('has no axe violations', async () => {
    const { container } = render(<main><PriorityCard action={action} /><StageStepper variant="full" stage="initiated" /></main>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/stepper-priority.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement `frontend/components/ui/StageStepper.tsx`**

```tsx
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { DEPARTURE_STAGES, STAGE_LABEL, type DepartureStage } from '@/types/view';

function dotClass(i: number, idx: number) {
  if (i < idx) return 'bg-ink';
  if (i === idx) return 'bg-amber';
  return 'border border-ink-3';
}

export function StageStepper({ stage, timestamps = {}, variant }: {
  stage: DepartureStage;
  timestamps?: Partial<Record<DepartureStage, string>>;
  variant: 'compact' | 'full';
}) {
  const idx = DEPARTURE_STAGES.indexOf(stage);

  if (variant === 'compact') {
    return (
      <span role="img" aria-label={`Stage ${idx + 1} of 5: ${STAGE_LABEL[stage]}`} className="inline-flex items-center gap-1">
        {DEPARTURE_STAGES.map((s, i) => <span key={s} className={cn('size-2 rounded-full', dotClass(i, idx))} />)}
      </span>
    );
  }

  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5">
      {DEPARTURE_STAGES.map((s, i) => (
        <li key={s} aria-current={i === idx ? 'step' : undefined} className="flex items-start gap-3 sm:flex-col sm:gap-2">
          <span aria-hidden className={cn('mt-1.5 size-2.5 shrink-0 rounded-full sm:mt-0', dotClass(i, idx))} />
          <span>
            <span className={cn('block text-sm', i <= idx ? 'font-medium text-ink' : 'text-ink-3')}>{STAGE_LABEL[s]}</span>
            {timestamps[s] && <span className="block text-xs text-ink-3">{formatDateTime(timestamps[s]!)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Implement `frontend/components/ui/PriorityCard.tsx`**

```tsx
import { CircleHelp, DoorOpen, FileText, KeyRound, LifeBuoy, UserRoundPlus, type LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { ActionType, ActionView } from '@/types/view';
import { ActionPill } from './ActionPill';
import { Card } from './Card';

export const ACTION_TYPE_META: Record<ActionType, { label: string; icon: LucideIcon }> = {
  assign_backup: { label: 'Missing backup', icon: UserRoundPlus },
  confirm_facts: { label: 'Unconfirmed facts', icon: CircleHelp },
  name_successor: { label: 'Departure handover', icon: DoorOpen },
  move_credential: { label: 'Personal credential', icon: KeyRound },
  document: { label: 'Undocumented', icon: FileText },
  add_fallback: { label: 'No fallback', icon: LifeBuoy },
};

export function PriorityCard({ action }: { action: ActionView }) {
  const meta = ACTION_TYPE_META[action.type];
  const Icon = meta.icon;
  return (
    <Card as="article" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Icon aria-hidden className="size-[18px] text-bronze" />
        <span className="text-sm tabular-nums text-ink-3">{String(action.rank).padStart(2, '0')}</span>
        <span className="text-sm font-medium text-ink-2">{meta.label}</span>
      </div>
      <p className="text-ink">{action.problem}</p>
      <div>
        <p className="text-sm text-ink-3">Critical assets affected</p>
        <p className="text-[32px] font-semibold leading-none tabular-nums text-ink">{formatNumber(action.criticalAssetsAffected)}</p>
      </div>
      <div className="mt-auto flex justify-end">
        <ActionPill href={`/actions?focus=${encodeURIComponent(action.id)}`}>Review</ActionPill>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/ui/stepper-priority.test.tsx`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/StageStepper.tsx components/ui/PriorityCard.tsx tests/ui/stepper-priority.test.tsx
git commit -m "feat(ui): departure stage stepper and Overview priority card"
```

---
### Task 12: Data table and drawer / side sheet

**Files:**
- Create: `frontend/components/ui/DataTable.tsx`, `frontend/components/ui/Drawer.tsx`
- Modify: `frontend/app/globals.css` (append drawer keyframes)
- Test: `frontend/tests/ui/table-drawer.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Button` (Task 7).
- Produces:
  - `interface Column<T> { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string }`
  - `DataTable<T>({ caption, columns, rows, rowKey, onRowClick?, toolbar?, rowClassName? })`. Row click ignores clicks and Enter presses that start on an inner link/button/input. Every `<tr>` carries `data-row-key`.
  - `Drawer({ open, onClose, title, children, footer?, headerActions?, size?: 'lg' | 'md' })`. `lg` = 560px (asset drawer), `md` = 480px (side sheets). It's a `role="dialog"` that closes on Escape, traps Tab focus and restores focus on close. CSS classes `.oba-fade`, `.oba-slide`.

- [ ] **Step 1: Write the failing test `frontend/tests/ui/table-drawer.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';

type Row = { id: string; name: string };
const rows: Row[] = [{ id: 'a', name: 'Invoice sync' }, { id: 'b', name: 'Slack alert bot' }];

describe('DataTable', () => {
  it('renders 48px rows and calls onRowClick via mouse and Enter', async () => {
    const onRowClick = vi.fn();
    render(<DataTable caption="Assets" rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick}
      columns={[{ key: 'name', header: 'Name', cell: (r) => r.name }]} />);
    const row = screen.getByText('Invoice sync').closest('tr')!;
    expect(row.className).toContain('h-12');
    await userEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it('ignores clicks on inner links', async () => {
    const onRowClick = vi.fn();
    render(<DataTable caption="Assets" rows={rows} rowKey={(r) => r.id} onRowClick={onRowClick}
      columns={[{ key: 'link', header: 'Open', cell: (r) => <a href={`#${r.id}`}>open {r.id}</a> }]} />);
    await userEvent.click(screen.getByRole('link', { name: 'open a' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe('Drawer', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open drawer</button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Invoice sync" footer={<button>Save</button>}>
          <input aria-label="Note" />
        </Drawer>
      </>
    );
  }

  it('opens as a labelled dialog, closes on Escape and restores focus', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open drawer' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Invoice sync' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('keeps typing focus inside while re-rendering', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open drawer' }));
    const input = screen.getByRole('textbox', { name: 'Note' });
    await userEvent.type(input, 'abc');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('abc');
  });

  it('has no axe violations when open', async () => {
    const { container } = render(<Drawer open onClose={() => {}} title="Details"><p>Body</p></Drawer>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/table-drawer.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement `frontend/components/ui/DataTable.tsx`**

```tsx
'use client';

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> { key: string; header: ReactNode; cell: (row: T) => ReactNode; className?: string }

const INTERACTIVE = 'a,button,input,select,textarea,[role="button"],[role="combobox"]';

function fromInner(e: MouseEvent | KeyboardEvent) {
  const target = e.target as HTMLElement;
  return target !== e.currentTarget && !!target.closest(INTERACTIVE);
}

export function DataTable<T>({ caption, columns, rows, rowKey, onRowClick, toolbar, rowClassName }: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-rule bg-surface">
      {toolbar && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3">{toolbar}</div>}
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-sunken">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('h-10 px-4 text-xs font-semibold uppercase tracking-wider text-ink-3', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = rowKey(r);
            return (
              <tr
                key={key}
                data-row-key={key}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? (e) => { if (!fromInner(e)) onRowClick(r); } : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' && !fromInner(e)) { e.preventDefault(); onRowClick(r); }
                } : undefined}
                className={cn(
                  'h-12 border-t border-rule',
                  onRowClick && 'cursor-pointer hover:bg-sunken focus-visible:bg-sunken',
                  rowClassName?.(r),
                )}
              >
                {columns.map((c) => <td key={c.key} className={cn('px-4 align-middle', c.className)}>{c.cell(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Append keyframes to `frontend/app/globals.css`**

```css
/* ── Drawer / popover motion ────────────────────────────── */
@keyframes oba-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes oba-slide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.oba-fade { animation: oba-fade 200ms ease-out both; }
.oba-slide { animation: oba-slide 200ms ease-out both; }
```

- [ ] **Step 5: Implement `frontend/components/ui/Drawer.tsx`**

```tsx
'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Drawer({ open, onClose, title, children, footer, headerActions, size = 'lg' }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
  size?: 'lg' | 'md';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div aria-hidden className="oba-fade absolute inset-0 bg-ink/30" onClick={() => closeRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn('oba-slide absolute inset-y-0 right-0 flex w-full flex-col bg-surface shadow-card outline-none', size === 'lg' ? 'sm:w-[560px]' : 'sm:w-[480px]')}
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
          <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <Button variant="ghost" size="sm" onClick={() => closeRef.current()} aria-label="Close">
              <X aria-hidden className="size-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-3 border-t border-rule px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -- tests/ui/table-drawer.test.tsx`
Expected: `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/DataTable.tsx components/ui/Drawer.tsx app/globals.css tests/ui/table-drawer.test.tsx
git commit -m "feat(ui): accessible data table (48px rows) and focus-trapping drawer"
```

---

### Task 13: Entity picker and What-If sentence builder

**Files:**
- Create: `frontend/components/ui/EntityPicker.tsx`, `frontend/components/ui/SentenceBuilder.tsx`
- Test: `frontend/tests/ui/pickers.test.tsx`

**Interfaces:**
- Consumes: `useResource` (Task 5), `fetchEntities` (Task 6), `EntityRef`, `EntityKind` (Task 6).
- Produces:
  - `EntityPicker({ label, kinds, value, onChange, placeholder?, load?, exclude?, hideLabel? })`. A combobox with an alphabetical, name-filtered listbox, showing at most 50 options. `load` overrides the inventory source (used by the attestation form).
  - `interface SentenceValue { people: EntityRef[]; unavailable: EntityRef[]; failing: EntityRef[] }`; `EMPTY_SENTENCE: SentenceValue`
  - `SentenceBuilder({ value, onChange })`

- [ ] **Step 1: Write the failing test `frontend/tests/ui/pickers.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { EMPTY_SENTENCE, SentenceBuilder, type SentenceValue } from '@/components/ui/SentenceBuilder';
import type { EntityRef } from '@/types/view';

const people: EntityRef[] = [
  { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' },
  { id: 'person:omar', kind: 'person', name: 'Omar Haddad' },
  { id: 'person:sara', kind: 'person', name: 'Sara Ali' },
];

describe('EntityPicker', () => {
  it('loads on focus, filters by name, lists alphabetically and selects with the keyboard', async () => {
    const onChange = vi.fn();
    render(<EntityPicker label="Successor" kinds={['person']} value={null} onChange={onChange} load={async () => people} />);
    const box = screen.getByRole('combobox', { name: 'Successor' });
    await userEvent.click(box);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Omar Haddad', 'Sara Ali', 'Yuki Tanaka']);
    await userEvent.type(box, 'sa');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith(people[2]);
  });

  it('excludes ids and shows "No matches"', async () => {
    render(<EntityPicker label="Backup" kinds={['person']} value={null} onChange={() => {}} load={async () => people} exclude={['person:omar']} />);
    const box = screen.getByRole('combobox', { name: 'Backup' });
    await userEvent.click(box);
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    await userEvent.type(box, 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('shows the selected value and can clear it', async () => {
    const onChange = vi.fn();
    render(<EntityPicker label="Owner" kinds={['person']} value={people[1]} onChange={onChange} load={async () => people} />);
    expect(screen.getByRole('combobox', { name: 'Owner' })).toHaveValue('Omar Haddad');
    await userEvent.click(screen.getByRole('button', { name: 'Clear Owner' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('SentenceBuilder', () => {
  function Harness() {
    const [v, setV] = useState<SentenceValue>({ ...EMPTY_SENTENCE, people: [people[1]] });
    return <SentenceBuilder value={v} onChange={setV} />;
  }

  it('renders the serif sentence with removable chips', async () => {
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'Scenario' });
    expect(group.className).toContain('font-serif');
    expect(group).toHaveTextContent(/What if\s*Omar Haddad/);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Omar Haddad' }));
    expect(screen.queryByText('Omar Haddad')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(<main><Harness /></main>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/ui/pickers.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement `frontend/components/ui/EntityPicker.tsx`**

```tsx
'use client';

import { X } from 'lucide-react';
import { useId, useState } from 'react';
import { fetchEntities } from '@/lib/api/entities';
import { cn } from '@/lib/cn';
import { useResource } from '@/lib/useResource';
import type { EntityKind, EntityRef } from '@/types/view';

export interface EntityPickerProps {
  label: string;
  kinds: EntityKind[];
  value: EntityRef | null;
  onChange: (value: EntityRef | null) => void;
  placeholder?: string;
  load?: () => Promise<EntityRef[]>;
  exclude?: string[];
  hideLabel?: boolean;
}

export function EntityPicker({ label, kinds, value, onChange, placeholder, load, exclude = [], hideLabel }: EntityPickerProps) {
  const inputId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const resource = useResource<EntityRef[]>(
    open ? `picker:${kinds.join(',')}:${load ? 'custom' : 'inventory'}` : null,
    () => (load ? load() : Promise.all(kinds.map(fetchEntities)).then((r) => r.flat())),
  );

  const q = query.trim().toLowerCase();
  const options = resource.status === 'ready'
    ? resource.data
        .filter((e) => !exclude.includes(e.id) && e.name.toLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 50)
    : [];

  function select(e: EntityRef) {
    onChange(e);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative inline-block w-full">
      <label htmlFor={inputId} className={cn('mb-1 block font-sans text-sm font-medium text-ink', hideLabel && 'sr-only')}>{label}</label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder ?? 'Search by name'}
          value={open ? query : value?.name ?? ''}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, Math.max(options.length - 1, 0))); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && open && options[active]) { e.preventDefault(); select(options[active]); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          className="h-10 w-full rounded-control border border-rule bg-surface px-3 pr-9 font-sans text-sm text-ink placeholder:text-ink-3"
        />
        {value && !open && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange(null)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-3 hover:text-ink"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-rule bg-surface py-1 font-sans shadow-card">
          {resource.status === 'loading' && <p role="status" className="px-3 py-2 text-sm text-ink-3">Loading…</p>}
          {resource.status === 'error' && <p role="alert" className="px-3 py-2 text-sm text-ink-2">We couldn&apos;t load the list.</p>}
          {resource.status === 'ready' && options.length === 0 && <p className="px-3 py-2 text-sm text-ink-3">No matches</p>}
          <ul role="listbox" id={listId} aria-label={label}>
            {options.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); select(o); }}
                onMouseEnter={() => setActive(i)}
                className={cn('cursor-pointer px-3 py-2 text-sm text-ink', i === active && 'bg-sunken')}
              >
                {o.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement `frontend/components/ui/SentenceBuilder.tsx`**

```tsx
'use client';

import { X } from 'lucide-react';
import type { EntityKind, EntityRef } from '@/types/view';
import { EntityPicker } from './EntityPicker';

export interface SentenceValue { people: EntityRef[]; unavailable: EntityRef[]; failing: EntityRef[] }
export const EMPTY_SENTENCE: SentenceValue = { people: [], unavailable: [], failing: [] };

type Slot = keyof SentenceValue;

export function SentenceBuilder({ value, onChange }: { value: SentenceValue; onChange: (v: SentenceValue) => void }) {
  const chips = (slot: Slot) => value[slot].map((e) => (
    <span key={e.id} className="mx-1 inline-flex items-center gap-1 rounded-full border border-rule bg-surface px-3 py-1 align-middle font-sans text-base text-ink">
      {e.name}
      <button
        type="button"
        aria-label={`Remove ${e.name}`}
        onClick={() => onChange({ ...value, [slot]: value[slot].filter((x) => x.id !== e.id) })}
        className="rounded-full p-0.5 text-ink-3 hover:text-ink"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  ));

  const adder = (slot: Slot, kinds: EntityKind[], label: string) => (
    <span className="mx-1 inline-block w-60 align-middle">
      <EntityPicker
        hideLabel
        label={label}
        placeholder={label}
        kinds={kinds}
        value={null}
        exclude={value[slot].map((e) => e.id)}
        onChange={(e) => e && onChange({ ...value, [slot]: [...value[slot], e] })}
      />
    </span>
  );

  return (
    <div role="group" aria-label="Scenario" className="font-serif text-[32px] leading-[1.7] text-ink">
      What if {chips('people')}{adder('people', ['person'], 'Add a person')}
      {value.people.length > 1 ? ' leave, ' : ' leaves, '}
      {chips('unavailable')}{adder('unavailable', ['vendor', 'model'], 'Add a vendor or model')}
      {value.unavailable.length > 1 ? ' go down, ' : ' goes down, '}
      and {chips('failing')}{adder('failing', ['automation'], 'Add an automation')}
      {value.failing.length > 1 ? ' fail?' : ' fails?'}
    </div>
  );
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/ui/pickers.test.tsx`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add components/ui/EntityPicker.tsx components/ui/SentenceBuilder.tsx tests/ui/pickers.test.tsx
git commit -m "feat(ui): accessible entity combobox and What-If sentence builder"
```

---

### Task 14: Permissions, session context, `<Can>` and the test session helper

**Files:**
- Create: `frontend/lib/permissions.ts`, `frontend/lib/session.tsx`, `frontend/components/ui/Can.tsx`, `frontend/tests/helpers.tsx`
- Test: `frontend/tests/lib/session.test.tsx`

**Interfaces:**
- Consumes: `fetchSession` (Task 6), `useResource`, `ApiError` (Task 5), `ToastProvider` (Task 9).
- Produces:
  - `type Capability = 'act' | 'initiateDeparture' | 'nameSuccessors' | 'admin'`; `can(session: Session | null, cap: Capability): boolean`
  - `interface SessionState { status: 'loading' | 'signed_out' | 'error' | 'ready'; session: Session | null; isDev: boolean; error: ApiError | null }`
  - `SessionContext`; `SessionProvider`; `useSession(): SessionState`
  - `resolveSession(resource, devRole?, nodeEnv?): SessionState`: dev fallback only when the session route is not available, `NEXT_PUBLIC_DEV_ROLE` is set, and the build isn't production (X-3).
  - `Can({ do: Capability, children, allowOnPhone? })`: renders nothing without the capability, and hides children below 768px unless `allowOnPhone`.
  - `tests/helpers.tsx`: `ADMIN`, `VIEWER`, `HR_MANAGER` fixtures; `renderWithSession(ui, session?)` (wraps in `ToastProvider` + `SessionContext`). **Every later screen test uses this helper.**

- [ ] **Step 1: Create `frontend/tests/helpers.tsx`**

```tsx
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionContext } from '@/lib/session';
import type { Session } from '@/types/view';

export const ADMIN: Session = {
  userId: 'u-admin', name: 'Guido Rossi', email: 'guido@acme.com', role: 'admin', isHrManager: false, title: 'Chief Executive Officer',
};
export const VIEWER: Session = { ...ADMIN, userId: 'u-viewer', name: 'Vera Lind', role: 'viewer', title: null };
export const HR_MANAGER: Session = { ...ADMIN, userId: 'u-hr', name: 'Hana Okafor', role: 'viewer', isHrManager: true, title: 'HR lead' };

export function renderWithSession(ui: ReactElement, session: Session | null = ADMIN): RenderResult {
  return render(
    <ToastProvider>
      <SessionContext.Provider value={{ status: session ? 'ready' : 'signed_out', session, isDev: false, error: null }}>
        {ui}
      </SessionContext.Provider>
    </ToastProvider>,
  );
}
```

- [ ] **Step 2: Write the failing test `frontend/tests/lib/session.test.tsx`**

```tsx
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { can } from '@/lib/permissions';
import { resolveSession } from '@/lib/session';
import { Can } from '@/components/ui/Can';
import { ADMIN, HR_MANAGER, VIEWER, renderWithSession } from '../helpers';

const reload = () => {};

describe('permissions', () => {
  it('admin can do everything; viewer nothing; HR manager departures only', () => {
    expect(can(ADMIN, 'act')).toBe(true);
    expect(can(VIEWER, 'act')).toBe(false);
    expect(can(HR_MANAGER, 'initiateDeparture')).toBe(true);
    expect(can(HR_MANAGER, 'nameSuccessors')).toBe(true);
    expect(can(HR_MANAGER, 'admin')).toBe(false);
    expect(can(null, 'act')).toBe(false);
  });
});

describe('resolveSession', () => {
  it('ready when the backend returns a session', () => {
    expect(resolveSession({ status: 'ready', data: ADMIN, reload, lastLoadedAt: null })).toMatchObject({ status: 'ready', session: ADMIN, isDev: false });
  });

  it('signed out on 401', () => {
    expect(resolveSession({ status: 'error', error: new ApiError(401, 'no'), reload, lastLoadedAt: null }).status).toBe('signed_out');
  });

  it('dev session only when route missing, role valid and not production', () => {
    const missing = { status: 'error' as const, error: new ApiError(404, 'x', true), reload, lastLoadedAt: null };
    expect(resolveSession(missing, 'viewer', 'development')).toMatchObject({ status: 'ready', isDev: true, session: { role: 'viewer' } });
    expect(resolveSession(missing, 'viewer', 'production').status).toBe('error');
    expect(resolveSession(missing, undefined, 'development').status).toBe('error');
    expect(resolveSession(missing, 'superuser', 'development').status).toBe('error');
  });
});

describe('<Can>', () => {
  it('hides actions for viewers (absent, not disabled)', () => {
    renderWithSession(<Can do="act"><button>Assign backup</button></Can>, VIEWER);
    expect(screen.queryByRole('button', { name: 'Assign backup' })).toBeNull();
  });

  it('shows actions for admins, wrapped to hide below md', () => {
    renderWithSession(<Can do="act"><button>Assign backup</button></Can>, ADMIN);
    expect(screen.getByRole('button', { name: 'Assign backup' }).parentElement?.className).toContain('max-md:hidden');
  });
});
```

- [ ] **Step 3: Run to see it fail**

Run: `npm test -- tests/lib/session.test.tsx`
Expected: FAIL, cannot resolve `@/lib/session`.

- [ ] **Step 4: Implement `frontend/lib/permissions.ts`**

```ts
import type { Session } from '@/types/view';

export type Capability = 'act' | 'initiateDeparture' | 'nameSuccessors' | 'admin';

/** UI mirror of server-side RBAC. The backend remains the authority. */
export function can(session: Session | null, cap: Capability): boolean {
  if (!session) return false;
  if (session.role === 'admin') return true;
  if (cap === 'initiateDeparture' || cap === 'nameSuccessors') return session.isHrManager;
  return false;
}
```

- [ ] **Step 5: Implement `frontend/lib/session.tsx`**

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ApiError } from './api/client';
import { fetchSession } from './api/session';
import { useResource, type Resource } from './useResource';
import type { Role, Session } from '@/types/view';

export interface SessionState {
  status: 'loading' | 'signed_out' | 'error' | 'ready';
  session: Session | null;
  isDev: boolean;
  error: ApiError | null;
}

export const SessionContext = createContext<SessionState>({ status: 'loading', session: null, isDev: false, error: null });

const ROLES: Role[] = ['admin', 'viewer', 'reviewer'];

export function resolveSession(
  res: Resource<Session> & { reload: () => void; lastLoadedAt: string | null },
  devRole: string | undefined = process.env.NEXT_PUBLIC_DEV_ROLE,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): SessionState {
  if (res.status === 'loading') return { status: 'loading', session: null, isDev: false, error: null };
  if (res.status === 'ready') return { status: 'ready', session: res.data, isDev: false, error: null };
  if (res.error.status === 401) return { status: 'signed_out', session: null, isDev: false, error: null };
  if (res.error.notAvailable && nodeEnv !== 'production' && devRole && (ROLES as string[]).includes(devRole)) {
    return {
      status: 'ready', isDev: true, error: null,
      session: { userId: 'dev', name: 'Local developer', email: 'dev@localhost', role: devRole as Role, isHrManager: true, title: null },
    };
  }
  return { status: 'error', session: null, isDev: false, error: res.error };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const res = useResource('session', fetchSession);
  return <SessionContext.Provider value={resolveSession(res)}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
```

- [ ] **Step 6: Implement `frontend/components/ui/Can.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import { can, type Capability } from '@/lib/permissions';
import { useSession } from '@/lib/session';

/** Hides (never disables) controls the user may not use. Phones are read-only unless allowOnPhone. */
export function Can({ do: cap, children, allowOnPhone = false }: { do: Capability; children: ReactNode; allowOnPhone?: boolean }) {
  const { session } = useSession();
  if (!can(session, cap)) return null;
  if (allowOnPhone) return <>{children}</>;
  return <span className="contents max-md:hidden">{children}</span>;
}
```

- [ ] **Step 7: Run the test**

Run: `npm test -- tests/lib/session.test.tsx`
Expected: `6 passed`.

- [ ] **Step 8: Commit**

```bash
git add lib/permissions.ts lib/session.tsx components/ui/Can.tsx tests/helpers.tsx tests/lib/session.test.tsx
git commit -m "feat(auth-ui): capability checks, session context with guarded dev fallback, <Can>"
```

---

## Phase C — Shell

### Task 15: Navigation config, brand, sidebar and user menu

**Files:**
- Create: `frontend/public/brand/logo-mark.png` (copied), `frontend/lib/useDismiss.ts`, `frontend/components/shell/nav.ts`, `Brand.tsx`, `Sidebar.tsx`, `UserMenu.tsx`
- Test: `frontend/tests/shell/sidebar.test.tsx`

**Interfaces:**
- Consumes: `useSession` (Task 14), `useThemePreference` (Task 3), `fetchNavCounts`, `signOut` (Task 6), `useResource` (Task 5), `Button` (Task 7).
- Produces:
  - `nav.ts`: `type NavBadge = 'departures' | 'actions' | 'identity'`; `interface NavItem { name; href; icon: LucideIcon; badge?: NavBadge; badgeLabel?: string }`; `PRIMARY_NAV: NavItem[]` (7 items in spec order); `SETTINGS_NAV: NavItem`; `isActive(pathname, href): boolean`; `badgeCount(counts: NavCounts, badge: NavBadge): number`
  - `useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void)`: closes on outside mousedown and on Escape
  - `Brand({ compact? })`; `Sidebar()`; `initials(name): string`; `UserMenu({ variant: 'full' | 'compact' })`

- [ ] **Step 1: Copy the logo mark**

```bash
mkdir -p public/brand
cp ../../horquva-services-website/public/logo-mark.png public/brand/logo-mark.png
```

Expected: `public/brand/logo-mark.png` exists (bronze ribbon mark, spec §1).

- [ ] **Step 2: Write the failing test `frontend/tests/shell/sidebar.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { renderWithSession } from '../helpers';

vi.mock('@/lib/api/overview', () => ({ fetchNavCounts: vi.fn() }));
vi.mock('@/lib/api/session', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
import * as overviewApi from '@/lib/api/overview';
import * as sessionApi from '@/lib/api/session';
import { Sidebar } from '@/components/shell/Sidebar';
import { UserMenu } from '@/components/shell/UserMenu';
import { isActive } from '@/components/shell/nav';

describe('Sidebar', () => {
  it('lists the 7 screens in order plus Settings, marking the active one', async () => {
    vi.mocked(overviewApi.fetchNavCounts).mockResolvedValue({ departuresSoon: 2, openCriticalActions: 0, identityPending: 4 });
    nav.pathname = '/assets/automation:n8n:41';
    renderWithSession(<Sidebar />);
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(primary).getAllByRole('link').map((l) => l.textContent?.replace(/\d+.*/, '').trim()))
      .toEqual(['Overview', 'Departures', 'People & Teams', 'Assets', 'Map', 'What-If', 'Actions']);
    expect(screen.getByRole('link', { name: /^Assets/ })).toHaveAttribute('aria-current', 'page');
    await waitFor(() => expect(screen.getByRole('link', { name: /Departures/ })).toHaveTextContent('2'));
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveTextContent('4');
    expect(screen.getByRole('link', { name: /^Actions/ })).not.toHaveTextContent(/\d/);
  });

  it('hides badges when counts are unavailable', async () => {
    vi.mocked(overviewApi.fetchNavCounts).mockRejectedValue(new Error('x'));
    renderWithSession(<Sidebar />);
    await waitFor(() => expect(overviewApi.fetchNavCounts).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Departures/ })).not.toHaveTextContent(/\d/);
  });

  it('isActive treats / as exact and others as prefixes', () => {
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/assets', '/')).toBe(false);
    expect(isActive('/settings/users', '/settings')).toBe(true);
    expect(isActive('/settingsx', '/settings')).toBe(false);
  });

  it('has no axe violations', async () => {
    vi.mocked(overviewApi.fetchNavCounts).mockResolvedValue({ departuresSoon: 0, openCriticalActions: 0, identityPending: 0 });
    const { container } = renderWithSession(<Sidebar />);
    await waitFor(() => expect(overviewApi.fetchNavCounts).toHaveBeenCalled());
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('UserMenu', () => {
  it('shows name and role, switches theme and signs out', async () => {
    renderWithSession(<UserMenu variant="full" />);
    const trigger = screen.getByRole('button', { name: /Guido Rossi/ });
    expect(trigger).toHaveTextContent('Chief Executive Officer');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(sessionApi.signOut).toHaveBeenCalled();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/sign-in'));
  });

  it('closes on Escape', async () => {
    renderWithSession(<UserMenu variant="compact" />);
    await userEvent.click(screen.getByRole('button', { name: 'Account and theme' }));
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('radio', { name: 'System' })).toBeNull();
  });
});
```

- [ ] **Step 3: Run to see it fail**

Run: `npm test -- tests/shell/sidebar.test.tsx`
Expected: FAIL, cannot resolve `@/components/shell/Sidebar`.

- [ ] **Step 4: Implement `frontend/lib/useDismiss.ts`**

```ts
'use client';

import { useEffect, useRef, type RefObject } from 'react';

export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref]);
}
```

- [ ] **Step 5: Implement `frontend/components/shell/nav.ts`**

```ts
import { Boxes, DoorOpen, FlaskConical, House, ListChecks, Network, Settings, Users, type LucideIcon } from 'lucide-react';
import type { NavCounts } from '@/types/view';

export type NavBadge = 'departures' | 'actions' | 'identity';

export interface NavItem { name: string; href: string; icon: LucideIcon; badge?: NavBadge; badgeLabel?: string }

export const PRIMARY_NAV: NavItem[] = [
  { name: 'Overview', href: '/', icon: House },
  { name: 'Departures', href: '/departures', icon: DoorOpen, badge: 'departures', badgeLabel: 'leaving within 14 days' },
  { name: 'People & Teams', href: '/people', icon: Users },
  { name: 'Assets', href: '/assets', icon: Boxes },
  { name: 'Map', href: '/map', icon: Network },
  { name: 'What-If', href: '/what-if', icon: FlaskConical },
  { name: 'Actions', href: '/actions', icon: ListChecks, badge: 'actions', badgeLabel: 'open critical actions' },
];

export const SETTINGS_NAV: NavItem = {
  name: 'Settings', href: '/settings', icon: Settings, badge: 'identity', badgeLabel: 'identities to review',
};

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function badgeCount(counts: NavCounts, badge: NavBadge): number {
  if (badge === 'departures') return counts.departuresSoon;
  if (badge === 'actions') return counts.openCriticalActions;
  return counts.identityPending;
}
```

- [ ] **Step 6: Implement `frontend/components/shell/Brand.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="OBA by Horquva, home">
      <Image src="/brand/logo-mark.png" alt="" width={32} height={32} priority className="size-8 shrink-0 object-contain" />
      <span className={cn('min-w-0', compact && 'max-lg:sr-only')} aria-hidden>
        <span className="block text-[15px] font-medium uppercase tracking-[0.18em] text-ink">Horquva</span>
        <span className="block truncate text-xs text-ink-3">
          <span className="font-semibold text-ink-2">OBA</span> · Organizational Brain Analysis
        </span>
      </span>
    </Link>
  );
}
```

- [ ] **Step 7: Implement `frontend/components/shell/UserMenu.tsx`**

```tsx
'use client';

import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/lib/api/session';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { useThemePreference, type ThemePreference } from '@/lib/theme';
import { useDismiss } from '@/lib/useDismiss';
import type { Role } from '@/types/view';

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', viewer: 'Viewer', reviewer: 'Reviewer' };
const THEMES: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0] ?? '').slice(0, 2).join('').toUpperCase();
}

export function UserMenu({ variant }: { variant: 'full' | 'compact' }) {
  const { session } = useSession();
  const [pref, setPref] = useThemePreference();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, open, () => setOpen(false));

  if (!session) return null;

  async function onSignOut() {
    try { await signOut(); } catch { /* leave anyway; the server session may already be gone */ }
    router.replace('/sign-in');
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={variant === 'compact' ? 'Account and theme' : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-3 rounded-control text-left',
          variant === 'full' ? 'w-full border border-rule bg-surface p-2.5 hover:bg-sunken' : 'p-0.5',
        )}
      >
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold text-ink">
          {initials(session.name)}
        </span>
        {variant === 'full' && (
          <>
            <span className="min-w-0 flex-1 max-lg:sr-only">
              <span className="block truncate text-sm font-medium text-ink">{session.name}</span>
              <span className="block truncate text-xs text-ink-3">{session.title ?? ROLE_LABEL[session.role]}</span>
            </span>
            <ChevronDown aria-hidden className="size-4 text-ink-3 max-lg:hidden" />
          </>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          className={cn(
            'oba-fade absolute z-40 w-64 rounded-card border border-rule bg-surface p-4 shadow-card',
            variant === 'full' ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2',
          )}
        >
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">Theme</legend>
            <div className="grid grid-cols-3 gap-1">
              {THEMES.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1 rounded-control border px-2 py-2 text-xs has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-amber',
                    pref === t.value ? 'border-amber text-ink' : 'border-rule text-ink-2 hover:bg-sunken',
                  )}
                >
                  <input type="radio" name={`${panelId}-theme`} value={t.value} checked={pref === t.value} onChange={() => setPref(t.value)} className="sr-only" />
                  <t.icon aria-hidden className="size-4" />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Button variant="ghost" className="mt-3 w-full justify-start" onClick={onSignOut}>
            <LogOut aria-hidden className="size-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Implement `frontend/components/shell/Sidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchNavCounts } from '@/lib/api/overview';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { Brand } from './Brand';
import { PRIMARY_NAV, SETTINGS_NAV, badgeCount, isActive, type NavItem } from './nav';
import { UserMenu } from './UserMenu';

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count: number | null }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={item.name}
      className={cn(
        'flex h-11 items-center gap-3 rounded-control px-3 text-[15px] transition-colors duration-150',
        active ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-2 hover:bg-sunken hover:text-ink',
      )}
    >
      <Icon aria-hidden className="size-[18px] shrink-0" />
      <span className="flex-1 truncate max-lg:sr-only">{item.name}</span>
      {count !== null && (
        <span className="rounded-full bg-sunken px-2 text-xs font-semibold tabular-nums text-ink-2 max-lg:sr-only">
          {formatNumber(count)}<span className="sr-only"> {item.badgeLabel}</span>
        </span>
      )}
      {active && <span aria-hidden className="size-1.5 rounded-full bg-amber max-lg:hidden" />}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const counts = useResource('nav-counts', fetchNavCounts);
  const countFor = (item: NavItem) => {
    if (!item.badge || counts.status !== 'ready') return null;
    const n = badgeCount(counts.data, item.badge);
    return n > 0 ? n : null;
  };

  return (
    <aside aria-label="Sidebar" className="hidden h-screen shrink-0 flex-col border-r border-rule bg-canvas md:flex md:w-[72px] lg:w-[248px]">
      <div className="px-4 py-6 lg:px-6"><Brand compact /></div>
      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
        {PRIMARY_NAV.map((item) => <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} count={countFor(item)} />)}
      </nav>
      <div className="space-y-2 px-3 pb-4">
        <NavLink item={SETTINGS_NAV} active={isActive(pathname, SETTINGS_NAV.href)} count={countFor(SETTINGS_NAV)} />
        <UserMenu variant="full" />
      </div>
    </aside>
  );
}
```

- [ ] **Step 9: Run the test**

Run: `npm test -- tests/shell/sidebar.test.tsx`
Expected: `6 passed`.

- [ ] **Step 10: Commit**

```bash
git add public/brand/logo-mark.png lib/useDismiss.ts components/shell tests/shell/sidebar.test.tsx
git commit -m "feat(shell): nav config, brand, sidebar with badges, user menu with theme + sign out"
```

---

### Task 16: Top bar: data freshness, Ask OBA field, change-feed bell

**Files:**
- Create: `frontend/components/shell/FreshnessIndicator.tsx`, `AskField.tsx`, `BellPopover.tsx`, `TopBar.tsx`
- Test: `frontend/tests/shell/topbar.test.tsx`

**Interfaces:**
- Consumes: `fetchConnections` (Task 6 settings), `fetchChanges`, `acknowledgeChange`, `acknowledgeAllChanges` (Task 6), `useSession`, `can` (Task 14), `useDismiss`, `UserMenu` (Task 15), `Button`, `ButtonLink` (Task 7), `ErrorState`, `Skeleton` (Task 9), `useToast` (Task 9), `formatRelative`, `formatTime`, `plural` (Task 4).
- Produces:
  - `FRESHNESS_STALE_HOURS = 24` (X-1); `freshnessStatus(connections, now?, locale?): { tone: 'ok' | 'warn' | 'stale' | 'none'; text: string }`; `FreshnessIndicator()`
  - `PENDING_QUESTION_KEY = 'oba-pending-question'`; `AskField()` (stores the question in sessionStorage, then `router.push('/ask')`)
  - `BellPopover()`; `TopBar()`

- [ ] **Step 1: Write the failing test `frontend/tests/shell/topbar.test.tsx`**

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';
import type { ConnectionView } from '@/types/view';

vi.mock('@/lib/api/settings', () => ({ fetchConnections: vi.fn() }));
vi.mock('@/lib/api/changes', () => ({ fetchChanges: vi.fn(), acknowledgeChange: vi.fn(), acknowledgeAllChanges: vi.fn() }));
vi.mock('@/lib/api/session', () => ({ signOut: vi.fn() }));
import * as settingsApi from '@/lib/api/settings';
import * as changesApi from '@/lib/api/changes';
import { freshnessStatus } from '@/components/shell/FreshnessIndicator';
import { AskField, PENDING_QUESTION_KEY } from '@/components/shell/AskField';
import { BellPopover } from '@/components/shell/BellPopover';
import { TopBar } from '@/components/shell/TopBar';

const conn = (over: Partial<ConnectionView>): ConnectionView => ({
  id: 'c', type: 'n8n', name: 'n8n', status: 'healthy', lastSyncAt: '2026-10-01T08:42:00Z',
  itemsSynced: 10, lastError: null, secretHint: null, ...over,
});
const NOW = new Date('2026-10-01T10:00:00Z');

describe('freshnessStatus', () => {
  it('ok: oldest sync time and synced count', () => {
    const f = freshnessStatus([conn({}), conn({ id: 'd', lastSyncAt: '2026-10-01T09:30:00Z' })], NOW, 'en-US');
    expect(f.tone).toBe('ok');
    expect(f.text).toMatch(/^Data as of .* · 2 of 2 sources synced$/);
  });
  it('warn when any source failed', () => {
    expect(freshnessStatus([conn({}), conn({ id: 'd', status: 'failed' })], NOW, 'en-US')).toEqual({ tone: 'warn', text: '1 source failed' });
  });
  it('stale after 24 hours', () => {
    expect(freshnessStatus([conn({ lastSyncAt: '2026-09-29T08:00:00Z' })], NOW, 'en-US')).toEqual({ tone: 'stale', text: 'Data is 2 days old' });
  });
  it('none when nothing is connected', () => {
    expect(freshnessStatus([], NOW).tone).toBe('none');
  });
});

describe('AskField', () => {
  it('hands the question to /ask via sessionStorage, not the URL', async () => {
    renderWithSession(<AskField />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Ask OBA' }), 'What breaks if Omar leaves?{Enter}');
    expect(window.sessionStorage.getItem(PENDING_QUESTION_KEY)).toBe('What breaks if Omar leaves?');
    expect(nav.push).toHaveBeenCalledWith('/ask');
  });
});

describe('BellPopover', () => {
  it('shows unacknowledged count, lists events and acknowledges', async () => {
    vi.mocked(changesApi.fetchChanges).mockResolvedValue([
      { id: 'e1', kind: 'person_left', title: 'Omar Haddad left', impact: '4 critical assets orphaned · 1,200 runs/week', href: '/departures/d1', detectedAt: '2026-10-01T09:00:00Z' },
    ]);
    vi.mocked(changesApi.acknowledgeChange).mockResolvedValue(undefined);
    renderWithSession(<BellPopover />, ADMIN);
    const bell = await screen.findByRole('button', { name: 'Changes, 1 unacknowledged' });
    await userEvent.click(bell);
    expect(screen.getByText('4 critical assets orphaned · 1,200 runs/week')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/departures/d1');
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(changesApi.acknowledgeChange).toHaveBeenCalledWith('e1');
  });

  it('viewers can read but not acknowledge', async () => {
    vi.mocked(changesApi.fetchChanges).mockResolvedValue([
      { id: 'e1', kind: 'person_left', title: 'Omar Haddad left', impact: 'x', href: null, detectedAt: '2026-10-01T09:00:00Z' },
    ]);
    renderWithSession(<BellPopover />, VIEWER);
    await userEvent.click(await screen.findByRole('button', { name: /Changes, 1/ }));
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Acknowledge all' })).toBeNull();
  });
});

describe('TopBar', () => {
  it('shows "View only" for viewers and passes axe', async () => {
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue([conn({})]);
    vi.mocked(changesApi.fetchChanges).mockResolvedValue([]);
    const { container } = renderWithSession(<TopBar />, VIEWER);
    expect(screen.getByText('View only')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: /sources synced/ })).toHaveAttribute('href', '/settings/connections'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/shell/topbar.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement `frontend/components/shell/FreshnessIndicator.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/ui/states';
import { fetchConnections } from '@/lib/api/settings';
import { cn } from '@/lib/cn';
import { formatNumber, formatTime, plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { ConnectionView } from '@/types/view';

export const FRESHNESS_STALE_HOURS = 24;

type Tone = 'ok' | 'warn' | 'stale' | 'none';

/** "As of" uses the OLDEST successful sync: data is only as fresh as its stalest source. */
export function freshnessStatus(connections: ConnectionView[], now: Date = new Date(), locale?: string): { tone: Tone; text: string } {
  if (connections.length === 0) return { tone: 'none', text: 'No sources connected' };
  const failed = connections.filter((c) => c.status === 'failed').length;
  if (failed > 0) return { tone: 'warn', text: `${plural(failed, 'source', 'sources', locale)} failed` };
  const synced = connections.filter((c) => c.lastSyncAt);
  if (synced.length === 0) return { tone: 'none', text: 'Not synced yet' };
  const oldest = synced.map((c) => c.lastSyncAt!).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const ageHours = (now.getTime() - new Date(oldest).getTime()) / 3_600_000;
  if (ageHours > FRESHNESS_STALE_HOURS) {
    const days = Math.floor(ageHours / 24);
    return { tone: 'stale', text: `Data is ${plural(days, 'day', 'days', locale)} old` };
  }
  return {
    tone: 'ok',
    text: `Data as of ${formatTime(oldest, locale)} · ${formatNumber(synced.length, locale)} of ${formatNumber(connections.length, locale)} sources synced`,
  };
}

const DOT: Record<Tone, string> = { ok: 'bg-st-pass', warn: 'bg-amber', stale: 'bg-st-fail', none: 'bg-ink-3' };
const TEXT: Record<Tone, string> = { ok: 'text-ink-2', warn: 'text-ink', stale: 'text-st-fail', none: 'text-ink-3' };

export function FreshnessIndicator() {
  const res = useResource('connections', fetchConnections);
  if (res.status === 'loading') return <Skeleton className="h-4 w-56" />;
  const f = res.status === 'ready' ? freshnessStatus(res.data) : { tone: 'none' as Tone, text: 'Data freshness unavailable' };
  return (
    <Link href="/settings/connections" className="inline-flex max-w-full items-center gap-2 text-sm hover:underline">
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[f.tone])} />
      <span className={cn('truncate', TEXT[f.tone])}>{f.text}{f.tone === 'warn' ? ' · View' : ''}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Implement `frontend/components/shell/AskField.tsx`**

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

export const PENDING_QUESTION_KEY = 'oba-pending-question';

export function AskField() {
  const [value, setValue] = useState('');
  const router = useRouter();
  const id = useId();
  return (
    <form
      role="search"
      aria-label="Ask OBA"
      className="hidden w-full max-w-sm md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        try { window.sessionStorage.setItem(PENDING_QUESTION_KEY, q); } catch { /* the Ask page will start empty */ }
        setValue('');
        router.push('/ask');
      }}
    >
      <label htmlFor={id} className="sr-only">Ask OBA</label>
      <div className="relative">
        <Sparkles aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-bronze" />
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask OBA about a person, team or automation"
          className="h-10 w-full rounded-control border border-rule bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-3"
        />
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Implement `frontend/components/shell/BellPopover.tsx`**

```tsx
'use client';

import { Bell } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { acknowledgeAllChanges, acknowledgeChange, fetchChanges } from '@/lib/api/changes';
import { formatRelative } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useDismiss } from '@/lib/useDismiss';
import { useResource } from '@/lib/useResource';

export function BellPopover() {
  const { session } = useSession();
  const changes = useResource('changes', fetchChanges);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, open, () => setOpen(false));

  const events = changes.status === 'ready' ? changes.data : [];
  const canAct = can(session, 'act');
  const label = events.length > 0 ? `Changes, ${events.length} unacknowledged` : 'Changes';

  async function ack(id: string) {
    await acknowledgeChange(id);
    toast.show('Acknowledged');
    changes.reload();
  }
  async function ackAll() {
    await acknowledgeAllChanges();
    toast.show('All changes acknowledged');
    changes.reload();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-10 items-center justify-center rounded-control text-ink-2 hover:bg-sunken hover:text-ink"
      >
        <Bell aria-hidden className="size-[18px]" />
        {events.length > 0 && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-amber" />}
      </button>
      {open && (
        <div id={panelId} role="region" aria-label="Changes" className="oba-fade absolute right-0 top-full z-40 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-card border border-rule bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Changes</h2>
            {events.length > 0 && canAct && (
              <button type="button" onClick={ackAll} className="text-xs font-medium text-amber-ink hover:underline">Acknowledge all</button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {changes.status === 'loading' && <div className="space-y-2 p-4"><Skeleton /><Skeleton className="w-2/3" /></div>}
            {changes.status === 'error' && <div className="p-3"><ErrorState error={changes.error} onRetry={changes.reload} /></div>}
            {changes.status === 'ready' && events.length === 0 && <p className="p-6 text-center text-sm text-ink-2">You&apos;re all caught up.</p>}
            <ul>
              {events.map((e) => (
                <li key={e.id} className="border-b border-rule px-4 py-3 last:border-0">
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-sm text-ink-2">{e.impact}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-ink-3">{formatRelative(e.detectedAt)}</span>
                    <span className="flex gap-2">
                      {e.href && <ButtonLink href={e.href} size="sm" variant="ghost" onClick={() => setOpen(false)}>Open</ButtonLink>}
                      {canAct && <Button size="sm" onClick={() => ack(e.id)}>Acknowledge</Button>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement `frontend/components/shell/TopBar.tsx`**

```tsx
'use client';

import { useSession } from '@/lib/session';
import { AskField } from './AskField';
import { BellPopover } from './BellPopover';
import { FreshnessIndicator } from './FreshnessIndicator';
import { UserMenu } from './UserMenu';

export function TopBar() {
  const { session, isDev } = useSession();
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-rule px-4 md:px-8">
      <div className="min-w-0 flex-1"><FreshnessIndicator /></div>
      {session?.role === 'viewer' && (
        <span className="rounded-badge border border-rule px-2 py-0.5 text-xs font-medium text-ink-2">View only</span>
      )}
      {isDev && <span className="rounded-badge border border-dashed border-rule px-2 py-0.5 text-xs text-ink-3">Dev session</span>}
      <AskField />
      <BellPopover />
      <UserMenu variant="compact" />
    </header>
  );
}
```

- [ ] **Step 7: Run the test**

Run: `npm test -- tests/shell/topbar.test.tsx`
Expected: `8 passed`.

- [ ] **Step 8: Commit**

```bash
git add components/shell/FreshnessIndicator.tsx components/shell/AskField.tsx components/shell/BellPopover.tsx components/shell/TopBar.tsx tests/shell/topbar.test.tsx
git commit -m "feat(shell): top bar with data freshness, Ask OBA field and change-feed bell"
```

---

### Task 17: Bottom tab bar and app shell

**Files:**
- Create: `frontend/components/shell/BottomTabBar.tsx`, `frontend/components/shell/AppShell.tsx`
- Test: `frontend/tests/shell/appshell.test.tsx`

**Interfaces:**
- Consumes: `PRIMARY_NAV`, `SETTINGS_NAV`, `isActive` (Task 15), `Sidebar` (Task 15), `TopBar` (Task 16), `Drawer` (Task 12), `ErrorState`, `Skeleton` (Task 9), `useSession` (Task 14).
- Produces:
  - `BottomTabBar()`: below 768px: Overview · Departures · Actions · More (a sheet with the rest plus Ask OBA)
  - `WIDE_ROUTES = ['/map', '/what-if']`
  - `AppShell({ children })`: gates on session. Loading shows a skeleton, 401 does `replace('/sign-in')`, a reviewer gets `replace('/my')`, and an error shows ErrorState. Includes a "Skip to content" link.

- [ ] **Step 1: Write the failing test `frontend/tests/shell/appshell.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN } from '../helpers';
import { SessionContext, type SessionState } from '@/lib/session';
import { ApiError } from '@/lib/api/client';

vi.mock('@/components/shell/Sidebar', () => ({ Sidebar: () => <aside>sidebar</aside> }));
vi.mock('@/components/shell/TopBar', () => ({ TopBar: () => <header>topbar</header> }));
import { AppShell } from '@/components/shell/AppShell';

function renderShell(state: SessionState) {
  return render(<SessionContext.Provider value={state}><AppShell><p>page body</p></AppShell></SessionContext.Provider>);
}

describe('AppShell', () => {
  it('renders the page inside the shell for an admin, with a skip link', () => {
    renderShell({ status: 'ready', session: ADMIN, isDev: false, error: null });
    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('navigation', { name: 'Primary (mobile)' })).toBeInTheDocument();
  });

  it('redirects signed-out users to sign-in', async () => {
    renderShell({ status: 'signed_out', session: null, isDev: false, error: null });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByText('page body')).toBeNull();
  });

  it('sends reviewers to their slim app', async () => {
    renderShell({ status: 'ready', session: { ...ADMIN, role: 'reviewer' }, isDev: false, error: null });
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/my'));
  });

  it('shows an error state when the session cannot load', () => {
    renderShell({ status: 'error', session: null, isDev: false, error: new ApiError(0, "We couldn't reach OBA.") });
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't reach OBA");
  });

  it('removes the content width cap on wide routes', () => {
    nav.pathname = '/map';
    renderShell({ status: 'ready', session: ADMIN, isDev: false, error: null });
    expect(screen.getByText('page body').parentElement?.className).toContain('max-w-none');
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/shell/appshell.test.tsx`
Expected: FAIL, cannot resolve `@/components/shell/AppShell`.

- [ ] **Step 3: Implement `frontend/components/shell/BottomTabBar.tsx`**

```tsx
'use client';

import { Menu, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { cn } from '@/lib/cn';
import { PRIMARY_NAV, SETTINGS_NAV, isActive, type NavItem } from './nav';

const TAB_HREFS = ['/', '/departures', '/actions'];

export function BottomTabBar() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const tabs = PRIMARY_NAV.filter((i) => TAB_HREFS.includes(i.href));
  const rest: NavItem[] = [
    ...PRIMARY_NAV.filter((i) => !TAB_HREFS.includes(i.href)),
    SETTINGS_NAV,
    { name: 'Ask OBA', href: '/ask', icon: Sparkles },
  ];

  return (
    <>
      <nav aria-label="Primary (mobile)" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-rule bg-surface md:hidden">
        {tabs.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}
              className={cn('flex flex-col items-center gap-1 py-2.5 text-xs', active ? 'font-medium text-ink' : 'text-ink-2')}>
              <t.icon aria-hidden className="size-5" />
              {t.name}
            </Link>
          );
        })}
        <button type="button" aria-haspopup="dialog" onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-xs text-ink-2">
          <Menu aria-hidden className="size-5" />
          More
        </button>
      </nav>
      <Drawer open={more} onClose={() => setMore(false)} title="More" size="md">
        <ul className="space-y-1">
          {rest.map((i) => (
            <li key={i.href}>
              <Link href={i.href} onClick={() => setMore(false)} className="flex h-11 items-center gap-3 rounded-control px-3 text-ink hover:bg-sunken">
                <i.icon aria-hidden className="size-[18px]" />
                {i.name}
              </Link>
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}
```

- [ ] **Step 4: Implement `frontend/components/shell/AppShell.tsx`**

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const WIDE_ROUTES = ['/map', '/what-if'];

export function AppShell({ children }: { children: ReactNode }) {
  const state = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const role = state.session?.role;

  useEffect(() => {
    if (state.status === 'signed_out') router.replace('/sign-in');
    else if (state.status === 'ready' && role === 'reviewer') router.replace('/my');
  }, [state.status, role, router]);

  if (state.status === 'error' && state.error) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <ErrorState error={state.error} onRetry={() => window.location.reload()} />
      </main>
    );
  }

  if (state.status !== 'ready' || role === 'reviewer') {
    return (
      <div role="status" aria-label="Loading OBA" className="flex h-screen items-center justify-center">
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  const wide = WIDE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-4 pb-24 pt-8 outline-none md:px-8 md:pb-12">
          <div className={cn('mx-auto w-full', wide ? 'max-w-none' : 'max-w-[1280px]')}>{children}</div>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/shell/appshell.test.tsx`
Expected: `5 passed`.

- [ ] **Step 6: Commit**

```bash
git add components/shell/BottomTabBar.tsx components/shell/AppShell.tsx tests/shell/appshell.test.tsx
git commit -m "feat(shell): session-gated app shell, skip link, mobile bottom tab bar"
```

---

### Task 18: Route restructure: route groups, root layout, redirects, remove legacy UI

**Files:**
- Delete: `frontend/app/page.tsx`, `frontend/app/campaigns/`, `frontend/app/connectors/`, `frontend/app/inventory/`, `frontend/app/n8n-check/`, `frontend/app/review/`, `frontend/app/simulation/`, `frontend/components/layout/`, `frontend/components/assistant/`, `frontend/components/ui/Badges.tsx`, `frontend/lib/ThemeContext.tsx`, `frontend/lib/api.ts`, `frontend/types/contracts.ts`, `frontend/types/index.ts`
- Modify: `frontend/app/layout.tsx` (final), `frontend/next.config.ts` (add redirects)
- Create: `frontend/app/(app)/layout.tsx`, `frontend/features/_pending/PendingScreen.tsx`, stub `page.tsx` files listed in Step 6
- Test: `frontend/tests/app/routes.test.ts`

**Interfaces:**
- Consumes: `themeInitScript` (Task 3), `ToastProvider` (Task 9), `SessionProvider` (Task 14), `AppShell` (Task 17), `PageHeader` (Task 7), `EmptyState` (Task 9).
- Produces: the final route map. Every screen task in Phase D **replaces** one stub page and must not leave `PendingScreen` imports behind. Task 35 deletes `features/_pending/`.

- [ ] **Step 1: Write the failing test `frontend/tests/app/routes.test.ts`**

```ts
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

const root = fileURLToPath(new URL('../..', import.meta.url));
const appDir = join(root, 'app');

function pageRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...pageRoutes(full));
    else if (name === 'page.tsx') {
      const segs = relative(appDir, dir).split(sep).filter((s) => s && !/^\(.*\)$/.test(s));
      out.push('/' + segs.join('/'));
    }
  }
  return out;
}

const REQUIRED = [
  '/', '/briefing', '/departures', '/departures/[id]', '/people', '/people/teams/[id]', '/people/[id]',
  '/assets', '/assets/[id]', '/map', '/what-if', '/actions', '/actions/confirmations/new', '/ask',
  '/settings', '/settings/connections', '/settings/connections/n8n-check', '/settings/identity',
  '/settings/users', '/settings/organization', '/settings/audit-log', '/my', '/sign-in', '/attest/[token]',
];

describe('route map', () => {
  it('has a page for every spec route', () => {
    const routes = pageRoutes(appDir);
    for (const r of REQUIRED) expect(routes, r).toContain(r);
  });

  it('removed the legacy UI', () => {
    for (const p of ['app/page.tsx', 'app/inventory', 'app/simulation', 'app/campaigns', 'app/connectors', 'app/n8n-check',
      'app/review', 'components/layout', 'components/assistant', 'components/ui/Badges.tsx', 'lib/ThemeContext.tsx',
      'lib/api.ts', 'types/contracts.ts', 'types/index.ts']) {
      expect(existsSync(join(root, p)), p).toBe(false);
    }
  });

  it('redirects old routes', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/inventory', destination: '/assets' }),
      expect.objectContaining({ source: '/simulation', destination: '/what-if' }),
      expect.objectContaining({ source: '/campaigns', destination: '/actions?tab=confirmations' }),
      expect.objectContaining({ source: '/connectors', destination: '/settings/connections' }),
      expect.objectContaining({ source: '/n8n-check', destination: '/settings/connections/n8n-check' }),
      expect.objectContaining({ source: '/review/:token', destination: '/attest/:token' }),
    ]));
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/app/routes.test.ts`
Expected: FAIL, missing routes and legacy files present.

- [ ] **Step 3: Delete the legacy UI**

```bash
git rm -r app/page.tsx app/campaigns app/connectors app/inventory app/n8n-check app/review app/simulation components/layout components/assistant components/ui/Badges.tsx lib/ThemeContext.tsx lib/api.ts types/contracts.ts types/index.ts
```

- [ ] **Step 4: Replace `frontend/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { Hanken_Grotesk, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { themeInitScript } from '@/lib/theme-script';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-instrument-serif',
});
const hanken = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-hanken' });

export const metadata: Metadata = {
  title: { default: 'OBA · Horquva', template: '%s · OBA' },
  description: 'When someone leaves, nothing breaks.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${hanken.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-canvas text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Create `frontend/app/(app)/layout.tsx`**

```tsx
import { AppShell } from '@/components/shell/AppShell';
import { SessionProvider } from '@/lib/session';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
```

- [ ] **Step 6: Create the temporary stub `frontend/features/_pending/PendingScreen.tsx` and stub pages**

```tsx
import { EmptyState } from '@/components/ui/states';
import { PageHeader } from '@/components/ui/PageHeader';

/** Temporary. Each Phase D task replaces one usage; Task 35 deletes this file. */
export function PendingScreen({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="Not built yet" body="This screen is part of the OBA rebuild and lands in a later task." />
    </>
  );
}
```

Create each file below with exactly this body, substituting the title:

```tsx
import { PendingScreen } from '@/features/_pending/PendingScreen';

export default function Page() {
  return <PendingScreen title="TITLE" />;
}
```

| File | TITLE |
|---|---|
| `app/(app)/page.tsx` | Overview |
| `app/(app)/briefing/page.tsx` | This week's briefing |
| `app/(app)/departures/page.tsx` | Departures |
| `app/(app)/departures/[id]/page.tsx` | Departure |
| `app/(app)/people/page.tsx` | People & Teams |
| `app/(app)/people/teams/[id]/page.tsx` | Team |
| `app/(app)/people/[id]/page.tsx` | Person |
| `app/(app)/assets/page.tsx` | Assets |
| `app/(app)/assets/[id]/page.tsx` | Asset |
| `app/(app)/map/page.tsx` | Map |
| `app/(app)/what-if/page.tsx` | What-If |
| `app/(app)/actions/page.tsx` | Actions |
| `app/(app)/actions/confirmations/new/page.tsx` | New confirmation |
| `app/(app)/ask/page.tsx` | Ask OBA |
| `app/(app)/settings/connections/page.tsx` | Connections |
| `app/(app)/settings/connections/n8n-check/page.tsx` | n8n Ownership Check |
| `app/(app)/settings/identity/page.tsx` | Identity queue |
| `app/(app)/settings/users/page.tsx` | Users & roles |
| `app/(app)/settings/organization/page.tsx` | Organization |
| `app/(app)/settings/audit-log/page.tsx` | Audit log |
| `app/(reviewer)/my/page.tsx` | Your confirmations and handovers |
| `app/(bare)/sign-in/page.tsx` | Sign in to OBA |
| `app/(bare)/attest/[token]/page.tsx` | Ownership check |

And `frontend/app/(app)/settings/page.tsx` (final, not a stub):

```tsx
import { redirect } from 'next/navigation';

export default function SettingsIndex() {
  redirect('/settings/connections');
}
```

- [ ] **Step 7: Add redirects to `frontend/next.config.ts`** (keep the existing `rewrites` and comment block)

```ts
const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendOrigin) return [];
    return [{ source: "/api/:path*", destination: `${backendOrigin}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: "/inventory", destination: "/assets", permanent: false },
      { source: "/simulation", destination: "/what-if", permanent: false },
      { source: "/campaigns", destination: "/actions?tab=confirmations", permanent: false },
      { source: "/connectors", destination: "/settings/connections", permanent: false },
      { source: "/n8n-check", destination: "/settings/connections/n8n-check", permanent: false },
      { source: "/review/:token", destination: "/attest/:token", permanent: false },
    ];
  },
};
```

- [ ] **Step 8: Run tests, lint and build**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass; lint 0 errors; build lists the new routes.

- [ ] **Step 9: Commit**

```bash
git add -A app components features lib types next.config.ts tests/app/routes.test.ts
git commit -m "refactor(frontend): route groups for the OBA IA, legacy UI removed, old routes redirected"
```

---
## Phase D — Screens

Every task in this phase follows the same pattern: a testable screen component in `features/<screen>/`, a thin `page.tsx` that replaces the Task 18 stub, tests that mock the `lib/api/*` module, and an axe check.

### Task 19: Sign-in

**Files:**
- Create: `frontend/features/sign-in/SignInScreen.tsx`
- Modify: `frontend/app/(bare)/sign-in/page.tsx` (replace stub)
- Test: `frontend/tests/features/sign-in.test.tsx`

**Interfaces:**
- Consumes: `fetchAuthProviders`, `authStartUrl` (Task 6), `useResource` (Task 5), `ResourceView`, `Skeleton` (Task 9), `HeroArt` (Task 9), `buttonClass` (Task 7), `Brand` (Task 15).
- Produces: `SignInScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/sign-in.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/session', () => ({
  fetchAuthProviders: vi.fn(),
  authStartUrl: (p: string) => `http://localhost:4000/api/auth/${p}/start`,
}));
import * as sessionApi from '@/lib/api/session';
import { SignInScreen } from '@/features/sign-in/SignInScreen';

describe('SignInScreen', () => {
  it('offers only the providers this deployment uses, SSO only', async () => {
    vi.mocked(sessionApi.fetchAuthProviders).mockResolvedValue(['microsoft']);
    render(<SignInScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to OBA' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Continue with Microsoft' })).toHaveAttribute('href', 'http://localhost:4000/api/auth/microsoft/start');
    expect(screen.queryByRole('link', { name: 'Continue with Google' })).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(screen.getByText('When someone leaves, nothing breaks.')).toBeInTheDocument();
  });

  it('says so when no provider is configured', async () => {
    vi.mocked(sessionApi.fetchAuthProviders).mockResolvedValue([]);
    render(<SignInScreen />);
    expect(await screen.findByText(/No sign-in method is configured/)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    vi.mocked(sessionApi.fetchAuthProviders).mockResolvedValue(['microsoft', 'google']);
    const { container } = render(<SignInScreen />);
    await screen.findByRole('link', { name: 'Continue with Google' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/sign-in.test.tsx`
Expected: FAIL, cannot resolve `@/features/sign-in/SignInScreen`.

- [ ] **Step 3: Implement `frontend/features/sign-in/SignInScreen.tsx`**

```tsx
'use client';

import { Brand } from '@/components/shell/Brand';
import { buttonClass } from '@/components/ui/Button';
import { HeroArt } from '@/components/ui/HeroArt';
import { ResourceView, Skeleton } from '@/components/ui/states';
import { authStartUrl, fetchAuthProviders } from '@/lib/api/session';
import { useResource } from '@/lib/useResource';
import type { AuthProvider } from '@/types/view';

const PROVIDER_LABEL: Record<AuthProvider, string> = {
  microsoft: 'Continue with Microsoft',
  google: 'Continue with Google',
};

export function SignInScreen() {
  const providers = useResource('auth-providers', fetchAuthProviders);
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <HeroArt className="absolute inset-0" />
        <p className="absolute inset-x-16 bottom-16 font-serif text-[56px] leading-[1.05] text-ink">When someone leaves, nothing breaks.</p>
      </div>
      <main className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Brand />
          <h1 className="mt-10 font-serif text-[40px] leading-[1.1] text-ink">Sign in to OBA</h1>
          <p className="mt-2 text-ink-2">Use your work account.</p>
          <p className="mt-1 font-serif text-xl italic text-ink-2 lg:hidden">When someone leaves, nothing breaks.</p>
          <div className="mt-8 space-y-3">
            <ResourceView
              resource={providers}
              loading={<Skeleton className="h-10" />}
              isEmpty={(list) => list.length === 0}
              empty={<p className="text-sm text-ink-2">No sign-in method is configured for this deployment. Ask your administrator.</p>}
            >
              {(list) => list.map((p) => (
                <a key={p} href={authStartUrl(p)} className={buttonClass('secondary', 'md', 'w-full')}>{PROVIDER_LABEL[p]}</a>
              ))}
            </ResourceView>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Replace `frontend/app/(bare)/sign-in/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { SignInScreen } from '@/features/sign-in/SignInScreen';

export const metadata: Metadata = { title: 'Sign in' };

export default function Page() {
  return <SignInScreen />;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/features/sign-in.test.tsx`
Expected: `3 passed`.

- [ ] **Step 6: Commit**

```bash
git add features/sign-in "app/(bare)/sign-in/page.tsx" tests/features/sign-in.test.tsx
git commit -m "feat(sign-in): SSO-only sign-in with hero art and tagline"
```

---

### Task 20: Overview

**Files:**
- Create: `frontend/features/overview/summarySentence.ts`, `frontend/features/overview/OverviewScreen.tsx`
- Modify: `frontend/app/(app)/page.tsx` (replace stub)
- Test: `frontend/tests/features/overview.test.tsx`

**Interfaces:**
- Consumes: `fetchCoverage`, `fetchChangeSummary`, `fetchSpofAssets` (Task 6 overview), `fetchActions` (actions), `fetchDepartures` (departures), `fetchConnections` (settings); `CoverageStrip` (Task 10), `PriorityCard` (Task 11), `StageStepper` (Task 11), `EmptyState`, `ResourceView`, `Skeleton` (Task 9), `ButtonLink` (Task 7), `Card` (Task 7), `Can` (Task 14), `useSession` (Task 14), `greeting`, `firstName`, `formatDate`, `formatRelative`, `formatNumber`, `plural` (Task 4).
- Produces: `summarySentence(s: ChangeSummary, now?: Date, locale?: string): string`; `OverviewScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/overview.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';
import type { ActionView } from '@/types/view';

vi.mock('@/lib/api/overview', () => ({ fetchCoverage: vi.fn(), fetchChangeSummary: vi.fn(), fetchSpofAssets: vi.fn() }));
vi.mock('@/lib/api/actions', () => ({ fetchActions: vi.fn() }));
vi.mock('@/lib/api/departures', () => ({ fetchDepartures: vi.fn() }));
vi.mock('@/lib/api/settings', () => ({ fetchConnections: vi.fn() }));
import * as overviewApi from '@/lib/api/overview';
import * as actionsApi from '@/lib/api/actions';
import * as departuresApi from '@/lib/api/departures';
import * as settingsApi from '@/lib/api/settings';
import { summarySentence } from '@/features/overview/summarySentence';
import { OverviewScreen } from '@/features/overview/OverviewScreen';

const action = (i: number): ActionView => ({
  id: `a${i}`, rank: i, type: 'assign_backup', status: 'open', problem: `Problem ${i}`,
  asset: { id: `automation:${i}`, kind: 'automation', name: `Workflow ${i}` }, failingFact: 'No confirmed backup',
  criticalAssetsAffected: i, checkId: 'C1', primary: { kind: 'assign_backup' }, acceptedRisk: null, resolvedAt: null,
});

describe('summarySentence', () => {
  const now = new Date('2026-10-01T12:00:00Z');
  it('builds the template sentence from counted changes', () => {
    expect(summarySentence({ since: '2026-09-28T12:00:00Z', peopleLeft: 2, backupsLost: 3, newlyExposed: 0, resolved: 0 }, now, 'en-US'))
      .toBe('Since Monday, 2 people left and 3 critical assets lost their backup.');
  });
  it('uses a date for older windows and singular forms', () => {
    expect(summarySentence({ since: '2026-09-14T12:00:00Z', peopleLeft: 1, backupsLost: 1, newlyExposed: 1, resolved: 1 }, now, 'en-US'))
      .toBe('Since Sep 14, 2026, 1 person left, 1 critical asset lost its backup, 1 critical asset became exposed and 1 action was resolved.');
  });
  it('says nothing changed when all counts are zero', () => {
    expect(summarySentence({ since: null, peopleLeft: 0, backupsLost: 0, newlyExposed: 0, resolved: 0 }, now)).toBe('No changes since your last visit.');
  });
});

describe('OverviewScreen', () => {
  beforeEach(() => {
    vi.mocked(overviewApi.fetchCoverage).mockResolvedValue({ total: 52, covered: 38, exposed: 9, unknown: 5, definition: 'd' });
    vi.mocked(overviewApi.fetchChangeSummary).mockResolvedValue({ since: null, peopleLeft: 0, backupsLost: 0, newlyExposed: 0, resolved: 0 });
    vi.mocked(overviewApi.fetchSpofAssets).mockResolvedValue([
      { asset: { id: 'automation:41', kind: 'automation', name: 'Invoice Workflow' }, reason: 'one owner, no backup',
        dependsOn: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, runsPerWeek: 1200 },
    ]);
    vi.mocked(actionsApi.fetchActions).mockResolvedValue([action(1), action(2), action(3)]);
    vi.mocked(departuresApi.fetchDepartures).mockResolvedValue([{
      id: 'd1', person: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, role: 'DevOps lead', team: 'Platform',
      leaveDate: new Date(Date.now() + 5 * 86_400_000).toISOString(), stage: 'successor_named', assetsTotal: 5, assetsHandedOver: 3,
      hasAlert: false, detectedFrom: 'entra', group: 'upcoming',
    }]);
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue([
      { id: 'c1', type: 'n8n', name: 'n8n', status: 'healthy', lastSyncAt: new Date().toISOString(), itemsSynced: 3, lastError: null, secretHint: null },
    ]);
  });

  it('greets by first name and shows coverage, 3 priorities, departures and SPOF assets', async () => {
    renderWithSession(<OverviewScreen />, ADMIN);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening), Guido\./);
    expect(await screen.findByText('No changes since your last visit.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /38 of 52 critical assets fully covered/ })).toBeInTheDocument();
    expect(await screen.findAllByRole('link', { name: 'Review' })).toHaveLength(3);
    const departures = screen.getByRole('region', { name: 'Upcoming departures' });
    expect(await within(departures).findByText('Omar Haddad')).toBeInTheDocument();
    expect(within(departures).getByText('3 of 5 handed over')).toBeInTheDocument();
    const spof = screen.getByRole('region', { name: 'Top single points of failure' });
    expect(await within(spof).findByRole('link', { name: 'Invoice Workflow' })).toBeInTheDocument();
    expect(within(spof).getByText(/1,200 runs\/wk/)).toBeInTheDocument();
  });

  it('offers the n8n check when no n8n source is connected; viewers cannot connect', async () => {
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue([]);
    renderWithSession(<OverviewScreen />, VIEWER);
    expect(await screen.findByRole('link', { name: 'Run n8n check' })).toHaveAttribute('href', '/settings/connections/n8n-check');
    expect(screen.queryByRole('link', { name: 'Connect n8n' })).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<OverviewScreen />, ADMIN);
    await screen.findAllByRole('link', { name: 'Review' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/overview.test.tsx`
Expected: FAIL, cannot resolve `@/features/overview/summarySentence`.

- [ ] **Step 3: Implement `frontend/features/overview/summarySentence.ts`**

```ts
import { formatDate, plural } from '@/lib/format';
import type { ChangeSummary } from '@/types/view';

function sinceLabel(since: string | null, now: Date, locale?: string): string {
  if (!since) return 'Since your last visit';
  const d = new Date(since);
  const days = (now.getTime() - d.getTime()) / 86_400_000;
  if (days < 6) return `Since ${new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d)}`;
  return `Since ${formatDate(since, locale)}`;
}

/** Deterministic template (D-26). No AI. Counts come from the backend. */
export function summarySentence(s: ChangeSummary, now: Date = new Date(), locale?: string): string {
  const parts: string[] = [];
  if (s.peopleLeft) parts.push(`${plural(s.peopleLeft, 'person', 'people', locale)} left`);
  if (s.backupsLost) parts.push(`${plural(s.backupsLost, 'critical asset', 'critical assets', locale)} lost ${s.backupsLost === 1 ? 'its' : 'their'} backup`);
  if (s.newlyExposed) parts.push(`${plural(s.newlyExposed, 'critical asset', 'critical assets', locale)} became exposed`);
  if (s.resolved) parts.push(`${plural(s.resolved, 'action', 'actions', locale)} ${s.resolved === 1 ? 'was' : 'were'} resolved`);
  if (parts.length === 0) return 'No changes since your last visit.';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${sinceLabel(s.since, now, locale)}, ${list}.`;
}
```

- [ ] **Step 4: Implement `frontend/features/overview/OverviewScreen.tsx`**

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { Card } from '@/components/ui/Card';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { PriorityCard } from '@/components/ui/PriorityCard';
import { StageStepper } from '@/components/ui/StageStepper';
import { EmptyState, ResourceView, Skeleton } from '@/components/ui/states';
import { fetchActions } from '@/lib/api/actions';
import { fetchDepartures } from '@/lib/api/departures';
import { fetchChangeSummary, fetchCoverage, fetchSpofAssets } from '@/lib/api/overview';
import { fetchConnections } from '@/lib/api/settings';
import { firstName, formatDate, formatNumber, formatRelative, greeting } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useResource } from '@/lib/useResource';
import { summarySentence } from './summarySentence';

const DAY = 86_400_000;

export function OverviewScreen() {
  const { session } = useSession();
  const [now] = useState(() => new Date());
  const coverage = useResource('coverage', fetchCoverage);
  const summary = useResource('change-summary', fetchChangeSummary);
  const actions = useResource('actions:open:3', () => fetchActions({ status: 'open', limit: 3 }));
  const departures = useResource('departures', fetchDepartures);
  const spof = useResource('spof:5', () => fetchSpofAssets(5));
  const connections = useResource('connections', fetchConnections);
  const noN8n = connections.status === 'ready' && !connections.data.some((c) => c.type === 'n8n');

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-[56px] leading-[1.05] text-ink">
          {greeting(now)}, {firstName(session?.name ?? '')}.
        </h1>
        <div className="mt-3 max-w-2xl text-lg text-ink-2">
          {summary.status === 'loading' && <Skeleton className="h-5 w-96 max-w-full" />}
          {summary.status === 'ready' && <p>{summarySentence(summary.data, now)}</p>}
          {summary.status === 'error' && <p className="text-base text-ink-3">We couldn&apos;t load what changed since your last visit.</p>}
        </div>
      </header>

      {noN8n && (
        <EmptyState
          art
          title="See your n8n exposure in a few minutes"
          body="Run a one-off ownership check, or connect n8n so OBA keeps it current."
          action={
            <>
              <ButtonLink href="/settings/connections/n8n-check" variant="primary">Run n8n check</ButtonLink>
              <Can do="admin"><ButtonLink href="/settings/connections?add=n8n">Connect n8n</ButtonLink></Can>
            </>
          }
        />
      )}

      <ResourceView resource={coverage}>{(c) => <CoverageStrip coverage={c} />}</ResourceView>

      <section aria-labelledby="ov-priorities">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="ov-priorities" className="text-lg font-semibold text-ink">Top priorities</h2>
          <Link href="/actions" className="text-sm font-medium text-ink-2 hover:text-ink hover:underline">See all actions</Link>
        </div>
        <ResourceView
          resource={actions}
          isEmpty={(list) => list.length === 0}
          empty={<EmptyState title="No open actions" body="There are no open actions right now." />}
        >
          {(list) => <div className="grid gap-4 lg:grid-cols-3">{list.slice(0, 3).map((a) => <PriorityCard key={a.id} action={a} />)}</div>}
        </ResourceView>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card role="region" aria-label="Upcoming departures">
          <h2 className="mb-4 text-lg font-semibold text-ink">Upcoming departures</h2>
          <ResourceView resource={departures}>
            {(list) => {
              const upcoming = list
                .filter((d) => d.group !== 'departed' && new Date(d.leaveDate).getTime() - now.getTime() <= 30 * DAY)
                .sort((a, b) => a.leaveDate.localeCompare(b.leaveDate));
              if (upcoming.length === 0) return <p className="text-ink-2">Nobody is due to leave in the next 30 days.</p>;
              return (
                <ul className="divide-y divide-rule">
                  {upcoming.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <Link href={`/departures/${encodeURIComponent(d.id)}`} className="font-medium text-ink hover:underline">{d.person.name}</Link>
                        <p className="text-sm text-ink-3">{formatDate(d.leaveDate)} · {formatRelative(d.leaveDate, now)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StageStepper variant="compact" stage={d.stage} />
                        <span className="text-xs text-ink-2">{formatNumber(d.assetsHandedOver)} of {formatNumber(d.assetsTotal)} handed over</span>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            }}
          </ResourceView>
        </Card>

        <Card role="region" aria-label="Top single points of failure">
          <h2 className="mb-4 text-lg font-semibold text-ink">Top single points of failure</h2>
          <ResourceView resource={spof}>
            {(list) => list.length === 0 ? (
              <p className="text-ink-2">No critical asset depends on a single person or credential.</p>
            ) : (
              <ol className="divide-y divide-rule">
                {list.map((s) => (
                  <li key={s.asset.id} className="py-3">
                    <Link href={`/assets?asset=${encodeURIComponent(s.asset.id)}`} className="font-medium text-ink hover:underline">{s.asset.name}</Link>
                    <p className="text-sm text-ink-2">
                      {s.reason} · depends on {s.dependsOn.name} ·{' '}
                      {s.runsPerWeek === null ? 'runs/wk unknown' : `${formatNumber(s.runsPerWeek)} runs/wk`}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </ResourceView>
        </Card>
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-3">This week&apos;s briefing</p>
          <p className="mt-1 flex items-center gap-2 text-ink-2"><Sparkles aria-hidden className="size-4 text-bronze" />Written by AI from counted data.</p>
        </div>
        <ButtonLink href="/briefing">Read briefing</ButtonLink>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Replace `frontend/app/(app)/page.tsx`**

```tsx
import { OverviewScreen } from '@/features/overview/OverviewScreen';

export default function Page() {
  return <OverviewScreen />;
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -- tests/features/overview.test.tsx`
Expected: `6 passed`.

- [ ] **Step 7: Commit**

```bash
git add features/overview "app/(app)/page.tsx" tests/features/overview.test.tsx
git commit -m "feat(overview): greeting + template summary, coverage strip, priorities, departures, SPOF assets, briefing card"
```

---

### Task 21: Weekly briefing reading view

**Files:**
- Create: `frontend/features/briefing/BriefingScreen.tsx`
- Modify: `frontend/app/(app)/briefing/page.tsx` (replace stub)
- Test: `frontend/tests/features/briefing.test.tsx`

**Interfaces:**
- Consumes: `fetchBriefing` (Task 6), `PageHeader`, `Card` (Task 7), `ResourceView`, `EmptyState` (Task 9), `react-markdown`.
- Produces: `BriefingScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/briefing.test.tsx`**

```tsx
import { screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { renderWithSession } from '../helpers';

vi.mock('@/lib/api/overview', () => ({ fetchBriefing: vi.fn() }));
import * as overviewApi from '@/lib/api/overview';
import { BriefingScreen } from '@/features/briefing/BriefingScreen';

describe('BriefingScreen', () => {
  it('renders the AI-written briefing in serif with an AI marker', async () => {
    vi.mocked(overviewApi.fetchBriefing).mockResolvedValue('**2 people** left this week. See [Departures](/departures).');
    const { container } = renderWithSession(<BriefingScreen />);
    expect(screen.getByText(/Written by AI from counted data/)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Departures' });
    expect(link).toHaveAttribute('href', '/departures');
    expect(link.closest('.font-serif')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows an empty state for a blank briefing', async () => {
    vi.mocked(overviewApi.fetchBriefing).mockResolvedValue('  ');
    renderWithSession(<BriefingScreen />);
    expect(await screen.findByRole('heading', { name: 'No briefing yet' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/briefing.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/briefing/BriefingScreen.tsx`**

```tsx
'use client';

import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchBriefing } from '@/lib/api/overview';
import { useResource } from '@/lib/useResource';

export function BriefingScreen() {
  const briefing = useResource('briefing', fetchBriefing);
  return (
    <article className="mx-auto max-w-2xl">
      <PageHeader
        title="This week's briefing"
        description={
          <span className="inline-flex items-center gap-2">
            <Sparkles aria-hidden className="size-4 text-bronze" />
            Written by AI from counted data. Check the numbers against the screens they link to.
          </span>
        }
      />
      <ResourceView
        resource={briefing}
        isEmpty={(t) => t.trim().length === 0}
        empty={<EmptyState title="No briefing yet" body="We don't have a briefing to show yet." />}
      >
        {(text) => (
          <Card className="font-serif text-[20px] leading-[1.6] text-ink [&_a]:text-amber-ink [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-4 [&_strong]:font-normal [&_strong]:italic">
            <ReactMarkdown>{text}</ReactMarkdown>
          </Card>
        )}
      </ResourceView>
    </article>
  );
}
```

- [ ] **Step 4: Replace `frontend/app/(app)/briefing/page.tsx`**

```tsx
import { BriefingScreen } from '@/features/briefing/BriefingScreen';

export default function Page() {
  return <BriefingScreen />;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/features/briefing.test.tsx`
Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add features/briefing "app/(app)/briefing/page.tsx" tests/features/briefing.test.tsx
git commit -m "feat(briefing): serif reading view for the AI-written weekly briefing"
```

---

### Task 22: Assets: inventory table, filters, drawer, full page

**Files:**
- Create: `frontend/features/assets/filters.ts`, `frontend/features/assets/AssetDetailView.tsx`, `frontend/features/assets/AssetsScreen.tsx`
- Modify: `frontend/app/(app)/assets/page.tsx`, `frontend/app/(app)/assets/[id]/page.tsx` (replace stubs)
- Test: `frontend/tests/features/assets-filters.test.ts`, `frontend/tests/features/assets.test.tsx`

**Interfaces:**
- Consumes: `fetchAssets`, `fetchAssetDetail` (Task 6); `DataTable`, `Drawer` (Task 12); `FactCell`, `CriticalityDots`, `CheckStatusBadge`, `EvidenceBadge`, `EvidenceLegend`, `evidenceDescription` (Task 8); `PageHeader`, `ButtonLink`, `Button`, `Card` (Task 7); `ResourceView`, `EmptyState` (Task 9); `useSession` (Task 14), `can` (Task 14); `formatDateTime` (Task 4).
- Produces:
  - `filters.ts`: `type AssetTab = 'all' | 'automation' | 'model' | 'credential' | 'app' | 'vendor' | 'group' | 'csv'`; `ASSET_TABS`; `interface AssetFilters { tab; criticality: CriticalityLevel | 'all'; status: CheckStatus | 'all'; coverage: 'covered' | 'exposed' | 'unknown' | 'all'; unknownOnly: boolean; owner: string; source: string; q: string }`; `parseFilters(sp: URLSearchParams): AssetFilters`; `filtersToQuery(f: AssetFilters, assetId?: string | null): string`; `hasUnknown(r)`; `factSources(r): string[]`; `matchesFilters(r, f)`; `sortAssets(rows)`; `askOwnerHref(assetId)`
  - `AssetDetailView({ id, variant: 'drawer' | 'page' })`
  - `AssetsScreen()`

- [ ] **Step 1: Write the failing pure test `frontend/tests/features/assets-filters.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { filtersToQuery, matchesFilters, parseFilters, sortAssets } from '@/features/assets/filters';
import type { AssetRow, FactView } from '@/types/view';

const f = (over: Partial<FactView> = {}): FactView => ({ state: 'value', display: 'Sara', grade: 'stated', source: 'n8n', observedAt: null, ...over });
const row = (id: string, over: Partial<AssetRow> = {}): AssetRow => ({
  id, kind: 'automation', name: id, isCritical: true,
  owner: f(), backup: f(), criticality: { level: 'high', grade: 'confirmed', source: 'attestation', observedAt: null },
  documented: f(), fallback: f(), runsPerWeek: f({ display: '10' }), checkStatus: 'PASS', ...over,
});

describe('asset filters', () => {
  it('parses and serialises URL state, omitting defaults', () => {
    const p = parseFilters(new URLSearchParams('tab=model&coverage=exposed&q=inv'));
    expect(p).toMatchObject({ tab: 'model', coverage: 'exposed', q: 'inv', status: 'all', unknownOnly: false });
    expect(filtersToQuery(p, 'automation:41')).toBe('tab=model&coverage=exposed&q=inv&asset=automation%3A41');
  });

  it('coverage filters are restricted to critical assets', () => {
    const base = parseFilters(new URLSearchParams('coverage=exposed'));
    expect(matchesFilters(row('a', { checkStatus: 'FAIL' }), base)).toBe(true);
    expect(matchesFilters(row('b', { checkStatus: 'FAIL', isCritical: false }), base)).toBe(false);
  });

  it('the CSV tab matches rows with any CSV-sourced fact', () => {
    const csv = parseFilters(new URLSearchParams('tab=csv'));
    expect(matchesFilters(row('a', { owner: f({ source: 'csv' }) }), csv)).toBe(true);
    expect(matchesFilters(row('b'), csv)).toBe(false);
  });

  it('unknownOnly matches any unknown fact, including criticality', () => {
    const u = parseFilters(new URLSearchParams('unknown=1'));
    expect(matchesFilters(row('a', { backup: f({ state: 'unknown', grade: 'unknown' }) }), u)).toBe(true);
    expect(matchesFilters(row('b', { criticality: { level: 'unknown', grade: 'unknown', source: null, observedAt: null } }), u)).toBe(true);
    expect(matchesFilters(row('c'), u)).toBe(false);
  });

  it('sorts failing critical, unknown critical, covered critical, then non-critical, then by name', () => {
    const sorted = sortAssets([
      row('z-noncrit', { isCritical: false, checkStatus: 'FAIL' }),
      row('b-pass'), row('a-unknown', { checkStatus: 'UNKNOWN' }), row('c-fail', { checkStatus: 'FAIL' }), row('a-pass'),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(['c-fail', 'a-unknown', 'a-pass', 'b-pass', 'z-noncrit']);
  });
});
```

- [ ] **Step 2: Write the failing screen test `frontend/tests/features/assets.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';
import type { AssetRow, FactView } from '@/types/view';

vi.mock('@/lib/api/assets', () => ({ fetchAssets: vi.fn(), fetchAssetDetail: vi.fn() }));
import * as assetsApi from '@/lib/api/assets';
import { AssetsScreen } from '@/features/assets/AssetsScreen';

const f = (over: Partial<FactView> = {}): FactView => ({ state: 'value', display: 'Sara Ali', grade: 'stated', source: 'n8n', observedAt: null, ...over });
const rows: AssetRow[] = [
  { id: 'automation:41', kind: 'automation', name: 'Invoice sync', isCritical: true, owner: f({ display: 'Omar Haddad' }),
    backup: f({ state: 'unknown', display: null, grade: 'unknown', source: null }),
    criticality: { level: 'critical', grade: 'confirmed', source: 'attestation', observedAt: null },
    documented: f({ state: 'none', display: null, grade: 'confirmed' }), fallback: f({ display: 'Yes' }), runsPerWeek: f({ display: '1,200' }), checkStatus: 'FAIL' },
  { id: 'model:gpt', kind: 'model', name: 'gpt-4o', isCritical: false, owner: f(), backup: f(),
    criticality: { level: 'low', grade: 'inferred', source: 'n8n', observedAt: null },
    documented: f({ display: 'Yes' }), fallback: f({ display: 'No' }), runsPerWeek: f({ display: '40' }), checkStatus: 'PASS' },
];

describe('AssetsScreen', () => {
  beforeEach(() => {
    nav.pathname = '/assets';
    vi.mocked(assetsApi.fetchAssets).mockResolvedValue(rows);
    vi.mocked(assetsApi.fetchAssetDetail).mockResolvedValue({
      asset: rows[0],
      checks: [{ checkId: 'C1_UNBACKED_CRITICAL', entityId: 'automation:41', status: 'FAIL', evidenceFactIds: [], reason: 'No confirmed backup.' }],
      upstream: [{ id: 'model:gpt', kind: 'model', name: 'gpt-4o' }], downstream: [],
      history: [{ attribute: 'owner', display: 'Omar Haddad', state: 'value', grade: 'stated', source: 'n8n', changedBy: 'n8n sync', validFrom: '2026-09-01T00:00:00Z', validTo: null }],
    });
  });

  it('lists failing critical first, shows Unknown vs None honestly, and links Ask owner for admins', async () => {
    renderWithSession(<AssetsScreen />, ADMIN);
    const table = await screen.findByRole('table', { name: 'Assets' });
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows[0]).toHaveTextContent('Invoice sync');
    expect(within(bodyRows[0]).getByText('None')).toBeInTheDocument();
    expect(within(bodyRows[0]).getByRole('link', { name: 'Ask owner' })).toHaveAttribute('href', '/actions/confirmations/new?assets=automation%3A41');
  });

  it('viewers get no Ask owner links', async () => {
    renderWithSession(<AssetsScreen />, VIEWER);
    await screen.findByRole('table', { name: 'Assets' });
    expect(screen.queryByRole('link', { name: 'Ask owner' })).toBeNull();
  });

  it('type tab filters and writes the URL', async () => {
    renderWithSession(<AssetsScreen />, ADMIN);
    await screen.findByRole('table', { name: 'Assets' });
    await userEvent.click(screen.getByRole('button', { name: 'AI models' }));
    expect(nav.replace).toHaveBeenCalledWith('/assets?tab=model', { scroll: false });
  });

  it('opens the drawer from ?asset= with checks, dependencies and history', async () => {
    nav.search = 'asset=automation%3A41';
    renderWithSession(<AssetsScreen />, ADMIN);
    const dialog = await screen.findByRole('dialog', { name: 'Invoice sync' });
    expect(await within(dialog).findByText('No confirmed backup.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'gpt-4o' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/assets/automation%3A41');
    expect(within(dialog).getByRole('link', { name: 'Show on map' })).toHaveAttribute('href', '/map?root=automation%3A41');
  });

  it('distinguishes "no assets yet" from "no matches"', async () => {
    nav.search = 'q=zzz';
    renderWithSession(<AssetsScreen />, ADMIN);
    expect(await screen.findByRole('heading', { name: 'No assets match these filters' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<AssetsScreen />, ADMIN);
    await screen.findByRole('table', { name: 'Assets' });
    await waitFor(async () => expect(await axe(container)).toHaveNoViolations());
  });
});
```

- [ ] **Step 3: Run both to see them fail**

Run: `npm test -- tests/features/assets-filters.test.ts tests/features/assets.test.tsx`
Expected: FAIL, cannot resolve `@/features/assets/filters`.

- [ ] **Step 4: Implement `frontend/features/assets/filters.ts`**

```ts
import type { AssetRow, CheckStatus, CriticalityLevel } from '@/types/view';

export type AssetTab = 'all' | 'automation' | 'model' | 'credential' | 'app' | 'vendor' | 'group' | 'csv';

export const ASSET_TABS: Array<{ id: AssetTab; label: string }> = [
  { id: 'all', label: 'All' }, { id: 'automation', label: 'Automations' }, { id: 'model', label: 'AI models' },
  { id: 'credential', label: 'Credentials' }, { id: 'app', label: 'Apps' }, { id: 'vendor', label: 'Vendors' },
  { id: 'group', label: 'Groups' }, { id: 'csv', label: 'CSV assets' },
];

export interface AssetFilters {
  tab: AssetTab;
  criticality: CriticalityLevel | 'all';
  status: CheckStatus | 'all';
  coverage: 'covered' | 'exposed' | 'unknown' | 'all';
  unknownOnly: boolean;
  owner: string;
  source: string;
  q: string;
}

const DEFAULTS: AssetFilters = { tab: 'all', criticality: 'all', status: 'all', coverage: 'all', unknownOnly: false, owner: '', source: '', q: '' };

function pick<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function parseFilters(sp: URLSearchParams): AssetFilters {
  return {
    tab: pick(sp.get('tab'), ASSET_TABS.map((t) => t.id), 'all'),
    criticality: pick(sp.get('criticality'), ['critical', 'high', 'medium', 'low', 'unknown', 'all'] as const, 'all'),
    status: pick(sp.get('status'), ['PASS', 'FAIL', 'UNKNOWN', 'all'] as const, 'all'),
    coverage: pick(sp.get('coverage'), ['covered', 'exposed', 'unknown', 'all'] as const, 'all'),
    unknownOnly: sp.get('unknown') === '1',
    owner: sp.get('owner') ?? '',
    source: sp.get('source') ?? '',
    q: sp.get('q') ?? '',
  };
}

export function filtersToQuery(f: AssetFilters, assetId?: string | null): string {
  const q = new URLSearchParams();
  if (f.tab !== DEFAULTS.tab) q.set('tab', f.tab);
  if (f.criticality !== 'all') q.set('criticality', f.criticality);
  if (f.status !== 'all') q.set('status', f.status);
  if (f.coverage !== 'all') q.set('coverage', f.coverage);
  if (f.unknownOnly) q.set('unknown', '1');
  if (f.owner) q.set('owner', f.owner);
  if (f.source) q.set('source', f.source);
  if (f.q) q.set('q', f.q);
  if (assetId) q.set('asset', assetId);
  return q.toString();
}

const facts = (r: AssetRow) => [r.owner, r.backup, r.documented, r.fallback, r.runsPerWeek];

export function hasUnknown(r: AssetRow): boolean {
  return r.criticality.level === 'unknown' || facts(r).some((x) => x.state === 'unknown');
}

export function factSources(r: AssetRow): string[] {
  const s = new Set<string>();
  for (const x of facts(r)) if (x.source) s.add(x.source);
  if (r.criticality.source) s.add(r.criticality.source);
  return [...s];
}

export function matchesFilters(r: AssetRow, f: AssetFilters): boolean {
  if (f.tab === 'csv' ? !factSources(r).includes('csv') : f.tab !== 'all' && r.kind !== f.tab) return false;
  if (f.criticality !== 'all' && r.criticality.level !== f.criticality) return false;
  if (f.status !== 'all' && r.checkStatus !== f.status) return false;
  if (f.coverage !== 'all') {
    const want: CheckStatus = f.coverage === 'covered' ? 'PASS' : f.coverage === 'exposed' ? 'FAIL' : 'UNKNOWN';
    if (!r.isCritical || r.checkStatus !== want) return false;
  }
  if (f.unknownOnly && !hasUnknown(r)) return false;
  if (f.owner && r.owner.display !== f.owner) return false;
  if (f.source && !factSources(r).includes(f.source)) return false;
  if (f.q && !r.name.toLowerCase().includes(f.q.trim().toLowerCase())) return false;
  return true;
}

function rank(r: AssetRow): number {
  if (!r.isCritical) return 3;
  return r.checkStatus === 'FAIL' ? 0 : r.checkStatus === 'UNKNOWN' ? 1 : 2;
}

export function sortAssets(rows: AssetRow[]): AssetRow[] {
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function askOwnerHref(assetId: string): string {
  return `/actions/confirmations/new?assets=${encodeURIComponent(assetId)}`;
}
```

- [ ] **Step 5: Implement `frontend/features/assets/AssetDetailView.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckStatusBadge, CriticalityDots, EvidenceBadge, FactCell, evidenceDescription } from '@/components/ui/marks';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourceView } from '@/components/ui/states';
import { fetchAssetDetail } from '@/lib/api/assets';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { AssetDetail, EntityRef, FactView } from '@/types/view';

function entityHref(e: EntityRef): string {
  return e.kind === 'person' ? `/people/${encodeURIComponent(e.id)}` : `/assets/${encodeURIComponent(e.id)}`;
}

function FactRow({ label, fact }: { label: string; fact: FactView }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-2.5">
      <dt className="text-sm text-ink-3">{label}</dt>
      <dd>
        <FactCell fact={fact} />
        <p className="mt-0.5 text-xs text-ink-3">{evidenceDescription(fact.grade, fact.source, fact.observedAt)}</p>
      </dd>
    </div>
  );
}

function RefList({ title, items, empty }: { title: string; items: EntityRef[]; empty: string }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? <p className="text-sm text-ink-3">{empty}</p> : (
        <ul className="space-y-1">
          {items.map((e) => <li key={e.id}><Link href={entityHref(e)} className="text-sm text-ink hover:underline">{e.name}</Link></li>)}
        </ul>
      )}
    </section>
  );
}

function Body({ d }: { d: AssetDetail }) {
  const a = d.asset;
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-1 text-sm font-semibold text-ink">Facts</h3>
        <dl className="divide-y divide-rule">
          <FactRow label="Owner" fact={a.owner} />
          <FactRow label="Backup" fact={a.backup} />
          <div className="grid grid-cols-[140px_1fr] items-start gap-3 py-2.5">
            <dt className="text-sm text-ink-3">Criticality</dt>
            <dd>
              <CriticalityDots level={a.criticality.level} />
              <p className="mt-0.5 text-xs text-ink-3">{evidenceDescription(a.criticality.grade, a.criticality.source, a.criticality.observedAt)}</p>
            </dd>
          </div>
          <FactRow label="Documented" fact={a.documented} />
          <FactRow label="Fallback" fact={a.fallback} />
          <FactRow label="Runs per week" fact={a.runsPerWeek} />
        </dl>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">Checks</h3>
        <ul className="space-y-2">
          {d.checks.map((c) => (
            <li key={c.checkId} className="flex items-start gap-3">
              <CheckStatusBadge status={c.status} />
              <span className="text-sm text-ink">{c.reason}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <RefList title="Depends on" items={d.upstream} empty="Nothing upstream on record." />
        <RefList title="Used by" items={d.downstream} empty="Nothing downstream on record." />
      </div>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-ink">History</h3>
        <ol className="space-y-3 border-l border-rule pl-4">
          {d.history.map((h, i) => (
            <li key={`${h.attribute}-${h.validFrom}-${i}`}>
              <p className="text-sm text-ink">
                <span className="text-ink-3">{h.attribute}:</span>{' '}
                {h.state === 'unknown' ? 'Unknown' : h.state === 'none' ? 'None' : h.display}{' '}
                <EvidenceBadge grade={h.grade} />
              </p>
              <p className="text-xs text-ink-3">{formatDateTime(h.validFrom)}{h.source ? ` · ${h.source}` : ''}{h.changedBy ? ` · ${h.changedBy}` : ''}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function AssetDetailView({ id, variant }: { id: string; variant: 'drawer' | 'page' }) {
  const detail = useResource(`asset:${id}`, () => fetchAssetDetail(id));
  return (
    <ResourceView resource={detail}>
      {(d) => variant === 'drawer' ? <Body d={d} /> : (
        <>
          <PageHeader
            title={d.asset.name}
            actions={<ButtonLink href={`/map?root=${encodeURIComponent(d.asset.id)}`}>Show on map</ButtonLink>}
          />
          <Card><Body d={d} /></Card>
        </>
      )}
    </ResourceView>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/assets/AssetsScreen.tsx`**

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { CheckStatusBadge, CriticalityDots, EvidenceLegend, FactCell } from '@/components/ui/marks';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchAssets } from '@/lib/api/assets';
import { cn } from '@/lib/cn';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useResource } from '@/lib/useResource';
import type { AssetRow } from '@/types/view';
import { AssetDetailView } from './AssetDetailView';
import { ASSET_TABS, askOwnerHref, factSources, filtersToQuery, matchesFilters, parseFilters, sortAssets, type AssetFilters } from './filters';

const SELECT = 'h-9 rounded-control border border-rule bg-surface px-2 text-sm text-ink';

export function AssetsScreen() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const filters = parseFilters(new URLSearchParams(sp.toString()));
  const openId = sp.get('asset');
  const assets = useResource('assets', fetchAssets);
  const canAct = can(session, 'act');

  const setUrl = (f: AssetFilters, assetId: string | null = openId) => {
    const qs = filtersToQuery(f, assetId);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const set = <K extends keyof AssetFilters>(k: K, v: AssetFilters[K]) => setUrl({ ...filters, [k]: v });

  const all = assets.status === 'ready' ? assets.data : [];
  const owners = useMemo(() => [...new Set(all.map((r) => r.owner.display).filter((x): x is string => !!x))].sort(), [all]);
  const sources = useMemo(() => [...new Set(all.flatMap(factSources))].sort(), [all]);
  const openRow = all.find((r) => r.id === openId) ?? null;

  const ask = (r: AssetRow) => (canAct ? askOwnerHref(r.id) : undefined);
  const columns: Column<AssetRow>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'owner', header: 'Owner', cell: (r) => <FactCell fact={r.owner} askHref={ask(r)} /> },
    { key: 'backup', header: 'Backup', cell: (r) => <FactCell fact={r.backup} askHref={ask(r)} /> },
    { key: 'crit', header: 'Criticality', cell: (r) => <CriticalityDots level={r.criticality.level} /> },
    { key: 'doc', header: 'Documented', cell: (r) => <FactCell fact={r.documented} askHref={ask(r)} /> },
    { key: 'fallback', header: 'Fallback', cell: (r) => <FactCell fact={r.fallback} askHref={ask(r)} /> },
    { key: 'runs', header: 'Runs/week', cell: (r) => <FactCell fact={r.runsPerWeek} />, className: 'tabular-nums' },
    { key: 'status', header: 'Check', cell: (r) => <CheckStatusBadge status={r.checkStatus} /> },
  ];

  return (
    <>
      <PageHeader title="Assets" description="Every automation, model, credential, app, vendor and group we know about, with the evidence behind each fact." />

      <div role="group" aria-label="Asset type" className="mb-4 flex flex-wrap gap-1">
        {ASSET_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={filters.tab === t.id}
            onClick={() => set('tab', t.id)}
            className={cn('h-9 rounded-full px-3.5 text-sm transition-colors duration-150',
              filters.tab === t.id ? 'bg-ink font-medium text-canvas' : 'text-ink-2 hover:bg-sunken hover:text-ink')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ResourceView
        resource={assets}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="No assets yet" body="Connect a source and we'll list what it runs." action={<ButtonLink href="/settings/connections">Go to connections</ButtonLink>} />}
      >
        {(list) => {
          const rows = sortAssets(list.filter((r) => matchesFilters(r, filters)));
          const toolbar = (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="asset-search">Search assets</label>
                <input id="asset-search" type="search" defaultValue={filters.q} placeholder="Search by name"
                  onChange={(e) => set('q', e.target.value)} className={cn(SELECT, 'w-56 px-3')} />
                <label className="sr-only" htmlFor="f-crit">Criticality</label>
                <select id="f-crit" className={SELECT} value={filters.criticality} onChange={(e) => set('criticality', e.target.value as AssetFilters['criticality'])}>
                  <option value="all">All criticality</option><option value="critical">Critical</option><option value="high">High</option>
                  <option value="medium">Medium</option><option value="low">Low</option><option value="unknown">Unknown</option>
                </select>
                <label className="sr-only" htmlFor="f-status">Check status</label>
                <select id="f-status" className={SELECT} value={filters.status} onChange={(e) => set('status', e.target.value as AssetFilters['status'])}>
                  <option value="all">All checks</option><option value="FAIL">Fail</option><option value="UNKNOWN">Unknown</option><option value="PASS">Pass</option>
                </select>
                <label className="sr-only" htmlFor="f-owner">Owner</label>
                <select id="f-owner" className={SELECT} value={filters.owner} onChange={(e) => set('owner', e.target.value)}>
                  <option value="">All owners</option>{owners.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <label className="sr-only" htmlFor="f-source">Source</label>
                <select id="f-source" className={SELECT} value={filters.source} onChange={(e) => set('source', e.target.value)}>
                  <option value="">All sources</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 text-sm text-ink-2">
                  <input type="checkbox" checked={filters.unknownOnly} onChange={(e) => set('unknownOnly', e.target.checked)} />
                  Has unknown facts
                </label>
              </div>
              <EvidenceLegend />
            </>
          );
          return rows.length === 0 ? (
            <EmptyState title="No assets match these filters" body="Try fewer filters." action={<Button onClick={() => router.replace(pathname)}>Clear filters</Button>} />
          ) : (
            <DataTable caption="Assets" columns={columns} rows={rows} rowKey={(r) => r.id} toolbar={toolbar}
              onRowClick={(r) => setUrl(filters, r.id)} />
          );
        }}
      </ResourceView>

      <Drawer
        open={!!openId}
        onClose={() => setUrl(filters, null)}
        title={openRow?.name ?? 'Asset'}
        headerActions={openId ? (
          <>
            <ButtonLink size="sm" variant="ghost" href={`/assets/${encodeURIComponent(openId)}`}>Open full page</ButtonLink>
            <ButtonLink size="sm" variant="ghost" href={`/map?root=${encodeURIComponent(openId)}`}>Show on map</ButtonLink>
          </>
        ) : null}
      >
        {openId && <AssetDetailView id={openId} variant="drawer" />}
      </Drawer>
    </>
  );
}
```

- [ ] **Step 7: Replace the two pages**

`frontend/app/(app)/assets/page.tsx`:

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { AssetsScreen } from '@/features/assets/AssetsScreen';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><AssetsScreen /></Suspense>;
}
```

`frontend/app/(app)/assets/[id]/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { AssetDetailView } from '@/features/assets/AssetDetailView';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <AssetDetailView id={decodeURIComponent(id)} variant="page" />;
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test -- tests/features/assets-filters.test.ts tests/features/assets.test.tsx`
Expected: `11 passed`.

- [ ] **Step 9: Commit**

```bash
git add features/assets "app/(app)/assets" tests/features/assets-filters.test.ts tests/features/assets.test.tsx
git commit -m "feat(assets): inventory with URL filters, honest fact cells, provenance drawer and full page"
```

---

### Task 23: Map

**Files:**
- Create: `frontend/features/map/graph.ts`, `frontend/features/map/EntityNode.tsx`, `frontend/features/map/MapView.tsx`, `frontend/features/map/MapScreen.tsx`
- Modify: `frontend/app/(app)/map/page.tsx` (replace stub)
- Test: `frontend/tests/features/map-graph.test.ts`, `frontend/tests/features/map.test.tsx`

**Interfaces:**
- Consumes: `fetchNeighbourhood`, `fetchBlastRadius`, `fetchSpofAssets` (Task 6); `EntityPicker` (Task 13); `Drawer` (Task 12); `DataTable` (Task 12); `Button`, `ButtonLink`, `PageHeader` (Task 7); `LargeScreenNotice` (Task 7); `ResourceView`, `ErrorState` (Task 9); `AssetDetailView` (Task 22); `EvidenceLegend`, `GRADE_LABEL` (Task 8); `@xyflow/react`, `dagre`.
- Produces:
  - `graph.ts`: `KIND_SHAPE: Record<EntityKind, 'circle' | 'hexagon' | 'rect' | 'rounded'>`; `edgeStyle(grade): { stroke: string; strokeDasharray?: string }`; `EDGE_TYPE_LABEL: Record<EdgeType, string>`; `mergeGraph(a: Neighbourhood, b: Neighbourhood): Neighbourhood`; `layoutGraph(n: Neighbourhood): Record<string, { x: number; y: number }>`; `dimmed(id: string, br: BlastRadius | null): boolean`
  - `MapView({ rootId, onSelect? })`: React Flow canvas (also used by What-If)
  - `MapScreen()`

- [ ] **Step 1: Write the failing pure test `frontend/tests/features/map-graph.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { KIND_SHAPE, dimmed, edgeStyle, layoutGraph, mergeGraph } from '@/features/map/graph';
import type { Neighbourhood } from '@/types/view';

const nb: Neighbourhood = {
  rootId: 'person:omar',
  nodes: [
    { id: 'person:omar', kind: 'person', name: 'Omar', ring: null },
    { id: 'automation:41', kind: 'automation', name: 'Invoice sync', ring: 'fail' },
    { id: 'model:gpt', kind: 'model', name: 'gpt-4o', ring: null },
  ],
  edges: [
    { id: 'e1', from: 'person:omar', to: 'automation:41', type: 'owns', grade: 'stated' },
    { id: 'e2', from: 'automation:41', to: 'model:gpt', type: 'calls_model', grade: 'inferred' },
  ],
};

describe('map graph helpers', () => {
  it('maps kinds to the WBS shapes', () => {
    expect(KIND_SHAPE.person).toBe('circle');
    expect(KIND_SHAPE.automation).toBe('hexagon');
    expect(KIND_SHAPE.vendor).toBe('rect');
    expect(KIND_SHAPE.credential).toBe('rounded');
  });

  it('styles edges by evidence grade', () => {
    expect(edgeStyle('stated')).toEqual({ stroke: 'var(--ev-stated)' });
    expect(edgeStyle('inferred')).toEqual({ stroke: 'var(--ev-inferred)', strokeDasharray: '6 4' });
    expect(edgeStyle('unknown')).toEqual({ stroke: 'var(--ev-unknown)', strokeDasharray: '2 4' });
  });

  it('merges neighbourhoods without duplicates', () => {
    const more: Neighbourhood = { rootId: 'model:gpt', nodes: [nb.nodes[2], { id: 'vendor:openai', kind: 'vendor', name: 'OpenAI', ring: null }],
      edges: [nb.edges[1], { id: 'e3', from: 'model:gpt', to: 'vendor:openai', type: 'depends_on', grade: 'stated' }] };
    const m = mergeGraph(nb, more);
    expect(m.rootId).toBe('person:omar');
    expect(m.nodes).toHaveLength(4);
    expect(m.edges).toHaveLength(3);
  });

  it('lays out left to right', () => {
    const pos = layoutGraph(nb);
    expect(pos['person:omar'].x).toBeLessThan(pos['automation:41'].x);
    expect(pos['automation:41'].x).toBeLessThan(pos['model:gpt'].x);
  });

  it('dims everything outside the blast radius', () => {
    const br = { rootId: 'automation:41', downstream: ['model:gpt'], upstream: ['person:omar'] };
    expect(dimmed('automation:41', br)).toBe(false);
    expect(dimmed('model:gpt', br)).toBe(false);
    expect(dimmed('vendor:x', br)).toBe(true);
    expect(dimmed('vendor:x', null)).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing screen test `frontend/tests/features/map.test.tsx`** (React Flow is stubbed; canvas rendering is covered by Playwright in Task 36)

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { renderWithSession } from '../helpers';

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ nodes }: { nodes: Array<{ id: string; data: { name: string } }> }) => (
    <div data-testid="flow">{nodes.map((n) => <span key={n.id}>{n.data.name}</span>)}</div>
  ),
  Background: () => null, Controls: () => null, Handle: () => null,
  Position: { Left: 'left', Right: 'right' },
}));
vi.mock('@/lib/api/graph', () => ({ fetchNeighbourhood: vi.fn(), fetchBlastRadius: vi.fn() }));
vi.mock('@/lib/api/overview', () => ({ fetchSpofAssets: vi.fn() }));
import * as graphApi from '@/lib/api/graph';
import * as overviewApi from '@/lib/api/overview';
import { MapScreen } from '@/features/map/MapScreen';

describe('MapScreen', () => {
  beforeEach(() => {
    nav.pathname = '/map';
    vi.mocked(overviewApi.fetchSpofAssets).mockResolvedValue([
      { asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, reason: 'one owner, no backup', dependsOn: { id: 'person:omar', kind: 'person', name: 'Omar' }, runsPerWeek: 10 },
    ]);
    vi.mocked(graphApi.fetchNeighbourhood).mockResolvedValue({
      rootId: 'automation:41',
      nodes: [{ id: 'automation:41', kind: 'automation', name: 'Invoice sync', ring: 'fail' }, { id: 'person:omar', kind: 'person', name: 'Omar', ring: null }],
      edges: [{ id: 'e1', from: 'person:omar', to: 'automation:41', type: 'owns', grade: 'stated' }],
    });
  });

  it('starts with a picker and suggests the top SPOF asset', async () => {
    renderWithSession(<MapScreen />);
    expect(screen.getByRole('combobox', { name: 'Start from a person, asset, or vendor' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Start from Invoice sync/ }));
    expect(nav.replace).toHaveBeenCalledWith('/map?root=automation%3A41');
  });

  it('renders the neighbourhood and an accessible list view', async () => {
    nav.search = 'root=automation%3A41';
    renderWithSession(<MapScreen />);
    expect(await screen.findByTestId('flow')).toHaveTextContent('Omar');
    await userEvent.click(screen.getByRole('button', { name: 'Show as list' }));
    const table = screen.getByRole('table', { name: 'Map relationships' });
    expect(within(table).getByText('Owns')).toBeInTheDocument();
    expect(within(table).getByText('Stated')).toBeInTheDocument();
  });

  it('has no axe violations in list view', async () => {
    nav.search = 'root=automation%3A41&view=list';
    const { container } = renderWithSession(<MapScreen />);
    await screen.findByRole('table', { name: 'Map relationships' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 3: Run both to see them fail**

Run: `npm test -- tests/features/map-graph.test.ts tests/features/map.test.tsx`
Expected: FAIL, cannot resolve `@/features/map/graph`.

- [ ] **Step 4: Implement `frontend/features/map/graph.ts`**

```ts
import dagre from 'dagre';
import type { BlastRadius, EdgeType, EntityKind, EvidenceGrade, Neighbourhood } from '@/types/view';

export const KIND_SHAPE: Record<EntityKind, 'circle' | 'hexagon' | 'rect' | 'rounded'> = {
  person: 'circle', group: 'circle', automation: 'hexagon', process: 'hexagon',
  model: 'rect', vendor: 'rect', app: 'rect', credential: 'rounded',
};

export const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  owns: 'Owns', backs_up: 'Backs up', depends_on: 'Depends on', calls_model: 'Calls model',
  runs_on_credentials_of: 'Runs on credentials of', member_of: 'Member of',
};

export function edgeStyle(grade: EvidenceGrade): { stroke: string; strokeDasharray?: string } {
  if (grade === 'inferred') return { stroke: 'var(--ev-inferred)', strokeDasharray: '6 4' };
  if (grade === 'unknown') return { stroke: 'var(--ev-unknown)', strokeDasharray: '2 4' };
  return { stroke: grade === 'confirmed' ? 'var(--ev-confirmed)' : 'var(--ev-stated)' };
}

export function mergeGraph(a: Neighbourhood, b: Neighbourhood): Neighbourhood {
  const nodes = new Map(a.nodes.map((n) => [n.id, n]));
  b.nodes.forEach((n) => nodes.set(n.id, n));
  const edges = new Map(a.edges.map((e) => [e.id, e]));
  b.edges.forEach((e) => edges.set(e.id, e));
  return { rootId: a.rootId, nodes: [...nodes.values()], edges: [...edges.values()] };
}

export const NODE_W = 180;
export const NODE_H = 56;

export function layoutGraph(n: Neighbourhood): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 96 });
  g.setDefaultEdgeLabel(() => ({}));
  n.nodes.forEach((node) => g.setNode(node.id, { width: NODE_W, height: NODE_H }));
  n.edges.forEach((e) => g.setEdge(e.from, e.to));
  dagre.layout(g);
  const out: Record<string, { x: number; y: number }> = {};
  n.nodes.forEach((node) => {
    const p = g.node(node.id);
    out[node.id] = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  });
  return out;
}

export function dimmed(id: string, br: BlastRadius | null): boolean {
  if (!br) return false;
  return id !== br.rootId && !br.downstream.includes(id) && !br.upstream.includes(id);
}
```

- [ ] **Step 5: Implement `frontend/features/map/EntityNode.tsx`**

```tsx
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/cn';
import type { GraphNodeView } from '@/types/view';
import { KIND_SHAPE, NODE_H, NODE_W } from './graph';

export type EntityNodeData = GraphNodeView & { dim: boolean };

const SHAPE_CLASS: Record<'circle' | 'hexagon' | 'rect' | 'rounded', string> = {
  circle: 'rounded-full',
  hexagon: '[clip-path:polygon(10%_0,90%_0,100%_50%,90%_100%,10%_100%,0_50%)]',
  rect: 'rounded-badge',
  rounded: 'rounded-control',
};

export function EntityNode({ data }: { data: EntityNodeData }) {
  const shape = KIND_SHAPE[data.kind];
  return (
    <div
      style={{ width: NODE_W, height: NODE_H, opacity: data.dim ? 0.15 : 1 }}
      className={cn(
        'flex items-center justify-center border bg-surface px-4 text-center text-sm text-ink transition-opacity duration-200',
        SHAPE_CLASS[shape],
        data.ring === 'fail' ? 'border-2 border-st-fail' : data.ring === 'unknown' ? 'border-2 border-dashed border-st-unknown' : 'border-rule',
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <span className="truncate">{data.name}</span>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/map/MapView.tsx`**

```tsx
'use client';

import '@xyflow/react/dist/style.css';
import { Background, Controls, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { fetchBlastRadius, fetchNeighbourhood } from '@/lib/api/graph';
import { toApiError, type ApiError } from '@/lib/api/client';
import { useResource } from '@/lib/useResource';
import type { BlastRadius, GraphNodeView, Neighbourhood } from '@/types/view';
import { EntityNode, type EntityNodeData } from './EntityNode';
import { EDGE_TYPE_LABEL, dimmed, edgeStyle, layoutGraph, mergeGraph } from './graph';

const nodeTypes = { entity: EntityNode };

export function MapView({ rootId, onSelect, extra, blast }: {
  rootId: string;
  onSelect?: (node: GraphNodeView | null) => void;
  extra?: Neighbourhood | null;
  blast?: BlastRadius | null;
}) {
  const base = useResource(`nb:${rootId}`, () => fetchNeighbourhood(rootId, 2));
  const [selectedBlast, setSelectedBlast] = useState<BlastRadius | null>(null);
  const [blastError, setBlastError] = useState<ApiError | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const activeBlast = blast ?? selectedBlast;

  const graph = useMemo(() => {
    if (base.status !== 'ready') return null;
    return extra ? mergeGraph(base.data, extra) : base.data;
  }, [base, extra]);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [] as Node<EntityNodeData>[], edges: [] as Edge[] };
    const pos = layoutGraph(graph);
    return {
      nodes: graph.nodes.map((n) => ({
        id: n.id, type: 'entity', position: pos[n.id], data: { ...n, dim: dimmed(n.id, activeBlast) },
        ariaLabel: `${n.name}, ${n.kind}`,
      })),
      edges: graph.edges.map((e) => ({
        id: e.id, source: e.from, target: e.to,
        style: { ...edgeStyle(e.grade), strokeWidth: 1.5, opacity: dimmed(e.from, activeBlast) || dimmed(e.to, activeBlast) ? 0.15 : 1 },
        label: hoverEdge === e.id ? EDGE_TYPE_LABEL[e.type] : undefined,
      })),
    };
  }, [graph, activeBlast, hoverEdge]);

  if (base.status === 'loading') return <LoadingBlock label="Loading map" />;
  if (base.status === 'error') return <ErrorState error={base.error} onRetry={base.reload} />;

  return (
    <div className="h-[640px] overflow-hidden rounded-card border border-rule bg-surface">
      {blastError && <div className="p-3"><ErrorState error={blastError} /></div>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        onEdgeMouseEnter={(_, e) => setHoverEdge(e.id)}
        onEdgeMouseLeave={() => setHoverEdge(null)}
        onPaneClick={() => { setSelectedBlast(null); onSelect?.(null); }}
        onNodeClick={async (_, n) => {
          onSelect?.(graph!.nodes.find((x) => x.id === n.id) ?? null);
          try { setSelectedBlast(await fetchBlastRadius(n.id)); setBlastError(null); }
          catch (e) { setBlastError(toApiError(e)); }
        }}
      >
        <Background gap={24} color="var(--rule)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 7: Implement `frontend/features/map/MapScreen.tsx`**

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { LargeScreenNotice } from '@/components/ui/LargeScreenNotice';
import { EvidenceLegend, GRADE_LABEL } from '@/components/ui/marks';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, ResourceView } from '@/components/ui/states';
import { AssetDetailView } from '@/features/assets/AssetDetailView';
import { fetchNeighbourhood } from '@/lib/api/graph';
import { fetchSpofAssets } from '@/lib/api/overview';
import { toApiError, type ApiError } from '@/lib/api/client';
import { useResource } from '@/lib/useResource';
import type { EntityKind, GraphEdgeView, GraphNodeView, Neighbourhood } from '@/types/view';
import { EDGE_TYPE_LABEL } from './graph';
import { MapView } from './MapView';

const ROOT_KINDS: EntityKind[] = ['person', 'automation', 'credential', 'model', 'vendor', 'app'];

export function MapScreen() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rootId = sp.get('root');
  const listView = sp.get('view') === 'list';
  const [selected, setSelected] = useState<GraphNodeView | null>(null);
  const [extra, setExtra] = useState<Neighbourhood | null>(null);
  const [expandError, setExpandError] = useState<ApiError | null>(null);
  const spof = useResource(rootId ? null : 'spof:1', () => fetchSpofAssets(1));

  const go = (root: string, view?: 'list') => {
    const q = new URLSearchParams({ root });
    if (view) q.set('view', view);
    setExtra(null);
    router.replace(`${pathname}?${q.toString()}`);
  };

  if (!rootId) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-serif text-[40px] leading-[1.1] text-ink">Map</h1>
        <p className="mt-2 text-ink-2">Pick where to start. We&apos;ll show it and everything within two steps.</p>
        <div className="mt-8 text-left">
          <EntityPicker label="Start from a person, asset, or vendor" kinds={ROOT_KINDS} value={null} onChange={(e) => e && go(e.id)} />
        </div>
        <div className="mt-6">
          <ResourceView resource={spof} loading={null}>
            {(list) => list[0] ? (
              <Button variant="ghost" onClick={() => go(list[0].asset.id)}>Start from {list[0].asset.name} · {list[0].reason}</Button>
            ) : null}
          </ResourceView>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Map"
        actions={
          <>
            <div className="w-72"><EntityPicker hideLabel label="Change starting point" kinds={ROOT_KINDS} value={null} onChange={(e) => e && go(e.id)} placeholder="Change starting point" /></div>
            <Button onClick={() => go(rootId, listView ? undefined : 'list')}>{listView ? 'Show as map' : 'Show as list'}</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <EvidenceLegend />
        <p className="text-xs text-ink-3">Circle = person · hexagon = automation · rectangle = model, vendor or app · rounded square = credential. Red ring = failing check, dashed ring = unknown.</p>
      </div>
      {expandError && <div className="mb-4"><ErrorState error={expandError} /></div>}

      {listView ? (
        <MapList rootId={rootId} extra={extra} />
      ) : (
        <>
          <div className="max-md:hidden"><MapView rootId={rootId} extra={extra} onSelect={setSelected} /></div>
          <LargeScreenNotice listHref={`/map?root=${encodeURIComponent(rootId)}&view=list`} listLabel="View as a list" />
        </>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        footer={selected ? (
          <>
            <Button onClick={async () => {
              try {
                const more = await fetchNeighbourhood(selected.id, 1);
                setExtra((prev) => (prev ? { ...prev, nodes: [...prev.nodes, ...more.nodes], edges: [...prev.edges, ...more.edges] } : more));
              } catch (e) { setExpandError(toApiError(e)); }
            }}>Expand</Button>
            <ButtonLink variant="primary" href={`/what-if?add=${encodeURIComponent(selected.id)}&kind=${selected.kind}`}>Run What-If from here</ButtonLink>
          </>
        ) : null}
      >
        {selected && (selected.kind === 'person'
          ? <ButtonLink href={`/people/${encodeURIComponent(selected.id)}`}>Open person</ButtonLink>
          : <AssetDetailView id={selected.id} variant="drawer" />)}
      </Drawer>
    </>
  );
}

function MapList({ rootId, extra }: { rootId: string; extra: Neighbourhood | null }) {
  const nb = useResource(`nb:${rootId}`, () => fetchNeighbourhood(rootId, 2));
  return (
    <ResourceView resource={nb}>
      {(data) => {
        const all = extra ? { ...data, nodes: [...data.nodes, ...extra.nodes], edges: [...data.edges, ...extra.edges] } : data;
        const name = (id: string) => all.nodes.find((n) => n.id === id)?.name ?? id;
        return (
          <DataTable<GraphEdgeView>
            caption="Map relationships"
            rows={all.edges}
            rowKey={(e) => e.id}
            columns={[
              { key: 'from', header: 'From', cell: (e) => name(e.from) },
              { key: 'type', header: 'Relationship', cell: (e) => EDGE_TYPE_LABEL[e.type] },
              { key: 'to', header: 'To', cell: (e) => name(e.to) },
              { key: 'grade', header: 'Evidence', cell: (e) => GRADE_LABEL[e.grade] },
            ]}
          />
        );
      }}
    </ResourceView>
  );
}
```

- [ ] **Step 8: Replace `frontend/app/(app)/map/page.tsx`**

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { MapScreen } from '@/features/map/MapScreen';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><MapScreen /></Suspense>;
}
```

- [ ] **Step 9: Run the tests**

Run: `npm test -- tests/features/map-graph.test.ts tests/features/map.test.tsx`
Expected: `8 passed`.

- [ ] **Step 10: Commit**

```bash
git add features/map "app/(app)/map/page.tsx" tests/features/map-graph.test.ts tests/features/map.test.tsx
git commit -m "feat(map): focused 2-hop neighbourhood, WBS node shapes, grade-styled edges, blast radius, list view"
```

---

### Task 24: What-If

**Files:**
- Create: `frontend/features/what-if/WhatIfScreen.tsx`
- Modify: `frontend/app/(app)/what-if/page.tsx` (replace stub)
- Test: `frontend/tests/features/what-if.test.tsx`

**Interfaces:**
- Consumes: `runScenario`, `testSuccession`, `fetchWorstLosses` (Task 6); `fetchEntities` (Task 6); `SentenceBuilder`, `EMPTY_SENTENCE`, `EntityPicker` (Task 13); `MapView` (Task 23); `Card`, `Button`, `PageHeader`, `LargeScreenNotice` (Task 7); `CriticalityDots` (Task 8); `ResourceView`, `ErrorState` (Task 9); `toApiError` (Task 5); `formatNumber`, `plural` (Task 4).
- Produces: `WhatIfScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/what-if.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { renderWithSession } from '../helpers';

vi.mock('@/lib/api/simulations', () => ({ runScenario: vi.fn(), testSuccession: vi.fn(), fetchWorstLosses: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({ fetchEntities: vi.fn(), lookupEntityName: (id: string) => id }));
vi.mock('@/features/map/MapView', () => ({ MapView: ({ rootId }: { rootId: string }) => <div>map of {rootId}</div> }));
import * as simApi from '@/lib/api/simulations';
import * as entitiesApi from '@/lib/api/entities';
import { WhatIfScreen } from '@/features/what-if/WhatIfScreen';

describe('WhatIfScreen', () => {
  beforeEach(() => {
    vi.mocked(entitiesApi.fetchEntities).mockImplementation(async (kind) => kind === 'person'
      ? [{ id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }]
      : []);
    vi.mocked(simApi.fetchWorstLosses).mockResolvedValue({
      vendorsAndModels: [{ entity: { id: 'vendor:openai', kind: 'vendor', name: 'OpenAI' }, automationsHalted: 6, runsPerWeekAffected: 2400 }],
      peopleHoldingManyUnbacked: 7, threshold: 3,
    });
    vi.mocked(simApi.runScenario).mockResolvedValue({
      orphanedCriticalAssets: [{ asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, priorOwner: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, criticality: 'critical' }],
      stoppedAutomations: [{ workflow: { id: 'automation:7', kind: 'automation', name: 'Slack alerts' }, credentialOwner: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, weeklyRuns: 1200 }],
      runsPerWeekAffected: 1200, downstream: [], unknownFactsEncountered: 2,
    });
    vi.mocked(simApi.testSuccession).mockResolvedValue({ coveredCount: 3, stillExposedCount: 1, totalCriticalAssetsOwned: 6, sharePct: 34, overloadWarning: true });
  });

  it('asks for a selection before running', async () => {
    renderWithSession(<WhatIfScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Run scenario' }));
    expect(screen.getByText('Add at least one person, vendor, model or automation.')).toBeInTheDocument();
    expect(simApi.runScenario).not.toHaveBeenCalled();
  });

  it('prefills from ?add=, runs, shows counted results and a successor test with overload warning', async () => {
    nav.search = 'add=person%3Aomar&kind=person';
    renderWithSession(<WhatIfScreen />);
    expect(await screen.findByRole('button', { name: 'Remove Omar Haddad' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Run scenario' }));
    const summary = await screen.findByRole('region', { name: 'Scenario results' });
    expect(within(summary).getByText('Orphaned critical assets').nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText('Runs per week affected').nextSibling).toHaveTextContent('1,200');
    expect(screen.getByRole('link', { name: 'Invoice sync' })).toBeInTheDocument();
    const box = screen.getByRole('combobox', { name: 'Test a successor' });
    await userEvent.click(box);
    await userEvent.click(await screen.findByRole('option', { name: 'Yuki Tanaka' }));
    expect(await screen.findByText(/34% of the company's critical automations/)).toBeInTheDocument();
    expect(simApi.testSuccession).toHaveBeenCalledWith('person:omar', 'person:yuki');
  });

  it('ranks vendors and models only; people are a count', async () => {
    renderWithSession(<WhatIfScreen />);
    const worst = await screen.findByRole('region', { name: 'Worst single losses' });
    expect(within(worst).getByText('OpenAI')).toBeInTheDocument();
    expect(within(worst).getByText(/7 people each hold 3\+ unbacked critical assets/)).toBeInTheDocument();
    expect(within(worst).getByRole('link', { name: 'People & Teams' })).toHaveAttribute('href', '/people');
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<WhatIfScreen />);
    await screen.findByRole('region', { name: 'Worst single losses' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/what-if.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/what-if/WhatIfScreen.tsx`**

```tsx
'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { LargeScreenNotice } from '@/components/ui/LargeScreenNotice';
import { CriticalityDots } from '@/components/ui/marks';
import { PageHeader } from '@/components/ui/PageHeader';
import { EMPTY_SENTENCE, SentenceBuilder, type SentenceValue } from '@/components/ui/SentenceBuilder';
import { ErrorState, LoadingBlock, ResourceView } from '@/components/ui/states';
import { MapView } from '@/features/map/MapView';
import { toApiError, type ApiError } from '@/lib/api/client';
import { fetchEntities } from '@/lib/api/entities';
import { fetchWorstLosses, runScenario, testSuccession } from '@/lib/api/simulations';
import { formatNumber, plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { EntityKind, EntityRef, ScenarioResult, SuccessionTestView } from '@/types/view';

const SLOT_FOR: Partial<Record<EntityKind, keyof SentenceValue>> = {
  person: 'people', vendor: 'unavailable', model: 'unavailable', automation: 'failing',
};

type Run = { status: 'idle' } | { status: 'running' } | { status: 'error'; error: ApiError } | { status: 'ready'; data: ScenarioResult };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-rule bg-surface p-4">
      <p className="text-sm text-ink-3">{label}</p>
      <p className="text-[28px] font-semibold leading-tight tabular-nums text-ink">{value}</p>
    </div>
  );
}

function assetHref(e: EntityRef) {
  return `/assets/${encodeURIComponent(e.id)}`;
}

export function WhatIfScreen() {
  const sp = useSearchParams();
  const [value, setValue] = useState<SentenceValue>(EMPTY_SENTENCE);
  const [run, setRun] = useState<Run>({ status: 'idle' });
  const [needsInput, setNeedsInput] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [successor, setSuccessor] = useState<EntityRef | null>(null);
  const [succession, setSuccession] = useState<SuccessionTestView | ApiError | null>(null);
  const worst = useResource('worst-losses', fetchWorstLosses);

  const addId = sp.get('add');
  const addKind = sp.get('kind') as EntityKind | null;
  useEffect(() => {
    if (!addId || !addKind || !SLOT_FOR[addKind]) return;
    let live = true;
    fetchEntities(addKind).then((list) => {
      const e = list.find((x) => x.id === addId);
      const slot = SLOT_FOR[addKind]!;
      if (live && e) setValue((v) => (v[slot].some((x) => x.id === e.id) ? v : { ...v, [slot]: [...v[slot], e] }));
    }, () => {});
    return () => { live = false; };
  }, [addId, addKind]);

  const total = value.people.length + value.unavailable.length + value.failing.length;
  const firstSelected = value.people[0] ?? value.unavailable[0] ?? value.failing[0] ?? null;
  const singleLeaver = value.people.length === 1 && value.unavailable.length === 0 && value.failing.length === 0 ? value.people[0] : null;

  async function onRun() {
    if (total === 0) { setNeedsInput(true); return; }
    setNeedsInput(false);
    setSuccessor(null);
    setSuccession(null);
    setRun({ status: 'running' });
    try { setRun({ status: 'ready', data: await runScenario(value) }); }
    catch (e) { setRun({ status: 'error', error: toApiError(e) }); }
  }

  async function onSuccessor(p: EntityRef | null) {
    setSuccessor(p);
    setSuccession(null);
    if (!p || !singleLeaver) return;
    try { setSuccession(await testSuccession(singleLeaver.id, p.id)); }
    catch (e) { setSuccession(toApiError(e)); }
  }

  return (
    <>
      <PageHeader title="What-If" description="Test what breaks before it happens. Every number is counted from the dependency graph." />
      <LargeScreenNotice listHref="/assets" listLabel="View assets as a list" />

      <div className="max-md:hidden space-y-8">
        <Card>
          <SentenceBuilder value={value} onChange={(v) => { setValue(v); setRun({ status: 'idle' }); }} />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button variant="primary" onClick={onRun}>Run scenario</Button>
            {needsInput && <p role="alert" className="text-sm text-st-fail">Add at least one person, vendor, model or automation.</p>}
          </div>
        </Card>

        {run.status === 'running' && <LoadingBlock label="Running scenario" />}
        {run.status === 'error' && <ErrorState error={run.error} onRetry={onRun} />}
        {run.status === 'ready' && (
          <section aria-label="Scenario results" role="region" className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Orphaned critical assets" value={formatNumber(run.data.orphanedCriticalAssets.length)} />
              <Stat label="Automations stopped" value={formatNumber(run.data.stoppedAutomations.length)} />
              <Stat label="Runs per week affected" value={formatNumber(run.data.runsPerWeekAffected)} />
              <Stat label="Downstream assets hit" value={formatNumber(run.data.downstream.length)} />
              <Stat label="Unknown facts encountered" value={formatNumber(run.data.unknownFactsEncountered)} />
            </div>
            {run.data.unknownFactsEncountered > 0 && (
              <p className="text-sm text-ink-2">
                Unknown facts mean these counts may be incomplete.{' '}
                <Link href="/actions/confirmations/new" className="font-medium text-ink underline">Ask owners to confirm</Link>
              </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="mb-3 text-lg font-semibold text-ink">Assets left without an owner</h2>
                {run.data.orphanedCriticalAssets.length === 0 ? <p className="text-ink-2">None.</p> : (
                  <ul className="divide-y divide-rule">
                    {run.data.orphanedCriticalAssets.map((o) => (
                      <li key={o.asset.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span>
                          <Link href={assetHref(o.asset)} className="font-medium text-ink hover:underline">{o.asset.name}</Link>
                          {o.priorOwner && <span className="block text-sm text-ink-3">Owned by {o.priorOwner.name}</span>}
                        </span>
                        <CriticalityDots level={o.criticality} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h2 className="mb-3 text-lg font-semibold text-ink">Automations that stop</h2>
                {run.data.stoppedAutomations.length === 0 ? <p className="text-ink-2">None.</p> : (
                  <ul className="divide-y divide-rule">
                    {run.data.stoppedAutomations.map((s) => (
                      <li key={s.workflow.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span>
                          <Link href={assetHref(s.workflow)} className="font-medium text-ink hover:underline">{s.workflow.name}</Link>
                          {s.credentialOwner && <span className="block text-sm text-ink-3">Runs on {s.credentialOwner.name}&apos;s credentials</span>}
                        </span>
                        <span className="text-sm tabular-nums text-ink-2">{formatNumber(s.weeklyRuns)} runs/wk</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {run.data.downstream.length > 0 && (
              <Card>
                <h2 className="mb-3 text-lg font-semibold text-ink">Downstream assets</h2>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {run.data.downstream.map((d) => <li key={d.id}><Link href={assetHref(d)} className="text-ink hover:underline">{d.name}</Link></li>)}
                </ul>
              </Card>
            )}

            {singleLeaver && (
              <Card>
                <h2 className="mb-1 text-lg font-semibold text-ink">Test a successor</h2>
                <p className="mb-4 text-sm text-ink-2">See coverage after handing {singleLeaver.name}&apos;s assets to one person.</p>
                <div className="max-w-sm">
                  <EntityPicker label="Test a successor" hideLabel kinds={['person']} value={successor} exclude={[singleLeaver.id]} onChange={onSuccessor} placeholder="Pick a successor" />
                </div>
                {succession && 'coveredCount' in succession && (
                  <div className="mt-4 space-y-2 text-ink">
                    <p>{formatNumber(succession.coveredCount)} covered · {formatNumber(succession.stillExposedCount)} still exposed</p>
                    <p className="text-ink-2">{successor?.name} would own {plural(succession.totalCriticalAssetsOwned, 'critical asset', 'critical assets')}.</p>
                    {succession.overloadWarning && (
                      <p className="flex items-center gap-2 font-medium text-amber-ink">
                        <TriangleAlert aria-hidden className="size-4" />
                        {successor?.name} would hold {formatNumber(succession.sharePct)}% of the company&apos;s critical automations (over 30%).
                      </p>
                    )}
                  </div>
                )}
                {succession && !('coveredCount' in succession) && <div className="mt-4"><ErrorState error={succession} /></div>}
              </Card>
            )}

            {firstSelected && (
              <div>
                <Button onClick={() => setShowMap((s) => !s)} aria-expanded={showMap}>{showMap ? 'Hide map' : 'Show on map'}</Button>
                {showMap && <div className="mt-4"><MapView rootId={firstSelected.id} /></div>}
              </div>
            )}
          </section>
        )}

        <section aria-label="Worst single losses" role="region">
          <Card>
            <h2 className="mb-1 text-lg font-semibold text-ink">Worst single losses</h2>
            <p className="mb-4 text-sm text-ink-2">Vendors and models ranked by what halts if they go down today.</p>
            <ResourceView resource={worst}>
              {(w) => (
                <>
                  {w.vendorsAndModels.length === 0 ? <p className="text-ink-2">No vendor or model dependencies on record.</p> : (
                    <ol className="divide-y divide-rule">
                      {w.vendorsAndModels.map((v, i) => (
                        <li key={v.entity.id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="flex items-center gap-3">
                            <span className="text-sm tabular-nums text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-medium text-ink">{v.entity.name}</span>
                          </span>
                          <span className="text-sm tabular-nums text-ink-2">
                            {plural(v.automationsHalted, 'automation', 'automations')} halt · {formatNumber(v.runsPerWeekAffected)} runs/wk
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className="mt-4 border-t border-rule pt-4 text-sm text-ink-2">
                    {plural(w.peopleHoldingManyUnbacked, 'person', 'people')} each hold {formatNumber(w.threshold)}+ unbacked critical assets. We don&apos;t rank people; see them by team in{' '}
                    <Link href="/people" className="font-medium text-ink underline">People &amp; Teams</Link>.
                  </p>
                </>
              )}
            </ResourceView>
          </Card>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Replace `frontend/app/(app)/what-if/page.tsx`**

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { WhatIfScreen } from '@/features/what-if/WhatIfScreen';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><WhatIfScreen /></Suspense>;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/features/what-if.test.tsx`
Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add features/what-if "app/(app)/what-if/page.tsx" tests/features/what-if.test.tsx
git commit -m "feat(what-if): sentence builder scenarios, counted results, successor test, vendor-only ranking"
```

---
### Task 25: Actions page: ranked actions tab and confirmations tab

**Files:**
- Create: `frontend/features/actions/ActionsList.tsx`, `frontend/features/actions/ActionSheets.tsx`, `frontend/features/actions/ConfirmationsList.tsx`, `frontend/features/actions/ActionsScreen.tsx`
- Modify: `frontend/app/(app)/actions/page.tsx` (replace stub)
- Test: `frontend/tests/features/actions.test.tsx`

**Interfaces:**
- Consumes: `fetchActions`, `assignBackup`, `acceptRisk` (Task 6 actions); `fetchCampaigns`, `fetchCampaignDetail` (Task 6 confirmations); `DataTable` (Task 12), `Drawer` (Task 12), `EntityPicker` (Task 13), `LinkTabs`, `PageHeader`, `Button`, `ButtonLink`, `Card` (Task 7), `ResourceView`, `EmptyState` (Task 9), `useToast` (Task 9), `Can` (Task 14), `formatDate`, `formatNumber`, `plural` (Task 4).
- Produces: `ACTION_STATUS_META: Record<ActionStatus, { label: string; cls: string }>`; `ActionsList()`; `AssignBackupSheet({ action, onClose, onDone })`; `AcceptRiskSheet({ action, onClose, onDone })`; `ConfirmationsList()`; `ActionsScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/actions.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';
import type { ActionView } from '@/types/view';

vi.mock('@/lib/api/actions', () => ({ fetchActions: vi.fn(), assignBackup: vi.fn(), acceptRisk: vi.fn() }));
vi.mock('@/lib/api/confirmations', () => ({ fetchCampaigns: vi.fn(), fetchCampaignDetail: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({
  fetchEntities: vi.fn().mockResolvedValue([{ id: 'person:sara', kind: 'person', name: 'Sara Ali' }]),
  lookupEntityName: (id: string) => id,
}));
import * as actionsApi from '@/lib/api/actions';
import * as confApi from '@/lib/api/confirmations';
import { ActionsScreen } from '@/features/actions/ActionsScreen';

const a1: ActionView = {
  id: 'act-1', rank: 1, type: 'assign_backup', status: 'open', problem: 'Invoice sync has no confirmed backup.',
  asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, failingFact: 'No confirmed backup',
  criticalAssetsAffected: 4, checkId: 'C1', primary: { kind: 'assign_backup' }, acceptedRisk: null, resolvedAt: null,
};
const a2: ActionView = {
  ...a1, id: 'act-2', rank: 2, type: 'name_successor', problem: 'Omar leaves Oct 14 with 5 assets unassigned.',
  primary: { kind: 'link', label: 'Name successor', href: '/departures/d1' },
};

describe('ActionsScreen', () => {
  beforeEach(() => {
    nav.pathname = '/actions';
    vi.mocked(actionsApi.fetchActions).mockResolvedValue([a1, a2]);
    vi.mocked(actionsApi.assignBackup).mockResolvedValue(undefined);
    vi.mocked(actionsApi.acceptRisk).mockResolvedValue(undefined);
  });

  it('shows open actions ranked, each naming its failing fact, with one primary action per type', async () => {
    renderWithSession(<ActionsScreen />, ADMIN);
    const table = await screen.findByRole('table', { name: 'Actions' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('01');
    expect(rows[0]).toHaveTextContent('Fails: No confirmed backup');
    expect(within(rows[0]).getByRole('button', { name: 'Assign backup' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('link', { name: 'Name successor' })).toHaveAttribute('href', '/departures/d1');
    expect(actionsApi.fetchActions).toHaveBeenCalledWith({ status: 'open' });
  });

  it('highlights ?focus= row', async () => {
    nav.search = 'focus=act-2';
    renderWithSession(<ActionsScreen />, ADMIN);
    await screen.findByRole('table', { name: 'Actions' });
    expect(document.querySelector('[data-row-key="act-2"]')?.className).toContain('bg-amber/10');
  });

  it('viewers see the list without action controls', async () => {
    renderWithSession(<ActionsScreen />, VIEWER);
    await screen.findByRole('table', { name: 'Actions' });
    expect(screen.queryByRole('button', { name: 'Assign backup' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept risk' })).toBeNull();
  });

  it('assigns a backup through the side sheet', async () => {
    renderWithSession(<ActionsScreen />, ADMIN);
    await userEvent.click(await screen.findByRole('button', { name: 'Assign backup' }));
    const sheet = screen.getByRole('dialog', { name: 'Assign backup · Invoice sync' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(within(sheet).getByText('Pick a person.')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('combobox', { name: 'Backup' }));
    await userEvent.click(await within(sheet).findByRole('option', { name: 'Sara Ali' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(actionsApi.assignBackup).toHaveBeenCalledWith('act-1', 'person:sara'));
  });

  it('accepting a risk needs a reason and a future expiry', async () => {
    renderWithSession(<ActionsScreen />, ADMIN);
    await userEvent.click((await screen.findAllByRole('button', { name: 'Accept risk' }))[0]);
    const sheet = screen.getByRole('dialog', { name: 'Accept risk · Invoice sync' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Accept risk' }));
    expect(within(sheet).getByText('Give a reason.')).toBeInTheDocument();
    expect(within(sheet).getByText('Pick a date after today.')).toBeInTheDocument();
    expect(actionsApi.acceptRisk).not.toHaveBeenCalled();
    expect(within(sheet).getByText(/still count as exposed/)).toBeInTheDocument();
  });

  it('confirmations tab lists campaigns with progress and reviewer breakdown', async () => {
    nav.search = 'tab=confirmations';
    vi.mocked(confApi.fetchCampaigns).mockResolvedValue([
      { id: 'c1', name: 'Q4 ownership', status: 'active', dueDate: '2026-10-08', createdAt: '2026-10-01', totalTasks: 52, completedTasks: 41 },
    ]);
    vi.mocked(confApi.fetchCampaignDetail).mockResolvedValue({
      id: 'c1', reviewers: [{ person: { id: 'person:sara', kind: 'person', name: 'Sara Ali' }, completed: 3, total: 4 }],
      reminderAt: '2026-10-04T09:00:00Z', escalationAt: '2026-10-08T09:00:00Z',
    });
    const { container } = renderWithSession(<ActionsScreen />, ADMIN);
    expect(await screen.findByText('41 of 52 answered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New confirmation' })).toHaveAttribute('href', '/actions/confirmations/new');
    await userEvent.click(screen.getByRole('button', { name: 'Show reviewers' }));
    expect(await screen.findByText('3 of 4')).toBeInTheDocument();
    expect(screen.getByText(/Reminder/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/actions.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/actions/ActionSheets.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { useToast } from '@/components/ui/Toast';
import { acceptRisk, assignBackup } from '@/lib/api/actions';
import { toApiError } from '@/lib/api/client';
import { formatDate } from '@/lib/format';
import type { ActionView, EntityRef } from '@/types/view';

export function toDateInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function AssignBackupSheet({ action, onClose, onDone }: { action: ActionView; onClose: () => void; onDone: () => void }) {
  const [person, setPerson] = useState<EntityRef | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save() {
    if (!person) { setError('Pick a person.'); return; }
    setSaving(true);
    try {
      await assignBackup(action.id, person.id);
      toast.show('Backup assigned. The action resolves once the check passes.');
      onDone();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open onClose={onClose} size="md" title={`Assign backup · ${action.asset.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={saving}>Save</Button></>}>
      <EntityPicker label="Backup" kinds={['person']} value={person} onChange={(p) => { setPerson(p); setError(null); }} />
      {error && <p role="alert" className="mt-2 text-sm text-st-fail">{error}</p>}
    </Drawer>
  );
}

export function AcceptRiskSheet({ action, onClose, onDone }: { action: ActionView; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; date?: string; submit?: string }>({});
  const toast = useToast();
  const reasonId = useId();
  const dateId = useId();

  async function save() {
    const next: typeof errors = {};
    if (!reason.trim()) next.reason = 'Give a reason.';
    if (!date || date <= toDateInput(new Date())) next.date = 'Pick a date after today.';
    setErrors(next);
    if (next.reason || next.date) return;
    try {
      const expiresAt = new Date(`${date}T23:59:59`).toISOString();
      await acceptRisk(action.id, { reason: reason.trim(), expiresAt });
      toast.show(`Risk accepted until ${formatDate(expiresAt)}`);
      onDone();
    } catch (e) {
      setErrors({ submit: toApiError(e).message });
    }
  }

  return (
    <Drawer open onClose={onClose} size="md" title={`Accept risk · ${action.asset.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Accept risk</Button></>}>
      <p className="mb-5 text-sm text-ink-2">Accepted risks stay visible under Accepted and still count as exposed in the headline. The decision is recorded in the audit log.</p>
      <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-ink">Reason</label>
      <textarea id={reasonId} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
        aria-invalid={!!errors.reason} className="w-full rounded-control border border-rule bg-surface p-3 text-sm text-ink" />
      {errors.reason && <p className="mt-1 text-sm text-st-fail">{errors.reason}</p>}
      <label htmlFor={dateId} className="mb-1 mt-4 block text-sm font-medium text-ink">Accept until</label>
      <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)}
        aria-invalid={!!errors.date} className="h-10 rounded-control border border-rule bg-surface px-3 text-sm text-ink" />
      {errors.date && <p className="mt-1 text-sm text-st-fail">{errors.date}</p>}
      {errors.submit && <p role="alert" className="mt-3 text-sm text-st-fail">{errors.submit}</p>}
    </Drawer>
  );
}
```

- [ ] **Step 4: Implement `frontend/features/actions/ActionsList.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchActions } from '@/lib/api/actions';
import { cn } from '@/lib/cn';
import { formatDate, plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { ActionStatus, ActionView } from '@/types/view';
import { AcceptRiskSheet, AssignBackupSheet } from './ActionSheets';

export const ACTION_STATUS_META: Record<ActionStatus, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-st-fail/10 text-st-fail' },
  in_progress: { label: 'In progress', cls: 'bg-ev-stated/10 text-ev-stated' },
  accepted_risk: { label: 'Accepted risk', cls: 'border border-rule text-ink-2' },
  resolved: { label: 'Resolved', cls: 'bg-st-pass/10 text-st-pass' },
};

const FILTERS: Array<{ id: ActionStatus; label: string }> = [
  { id: 'open', label: 'Open' }, { id: 'in_progress', label: 'In progress' },
  { id: 'accepted_risk', label: 'Accepted' }, { id: 'resolved', label: 'Resolved (last 30 days)' },
];

export function ActionsList() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get('status');
  const status: ActionStatus = FILTERS.some((f) => f.id === raw) ? (raw as ActionStatus) : 'open';
  const focus = sp.get('focus');
  const actions = useResource(`actions:${status}`, () => fetchActions({ status }));
  const [assignFor, setAssignFor] = useState<ActionView | null>(null);
  const [riskFor, setRiskFor] = useState<ActionView | null>(null);

  useEffect(() => {
    if (!focus || actions.status !== 'ready') return;
    const el = Array.from(document.querySelectorAll<HTMLElement>('[data-row-key]')).find((n) => n.dataset.rowKey === focus);
    el?.scrollIntoView?.({ block: 'center' });
  }, [focus, actions.status]);

  const columns: Column<ActionView>[] = [
    { key: 'rank', header: '#', cell: (a) => <span className="tabular-nums text-ink-3">{String(a.rank).padStart(2, '0')}</span>, className: 'w-12' },
    {
      key: 'problem', header: 'Problem', cell: (a) => (
        <div className="py-2">
          <p className="text-ink">{a.problem}</p>
          <p className="text-xs text-ink-3">
            <Link href={`/assets?asset=${encodeURIComponent(a.asset.id)}`} className="text-ink-2 hover:underline">{a.asset.name}</Link> · Fails: {a.failingFact}
          </p>
          {a.acceptedRisk && <p className="text-xs text-ink-3">Accepted until {formatDate(a.acceptedRisk.expiresAt)} by {a.acceptedRisk.acceptedBy}: {a.acceptedRisk.reason}</p>}
        </div>
      ),
    },
    { key: 'affected', header: 'Affected', cell: (a) => <span className="tabular-nums text-ink">{plural(a.criticalAssetsAffected, 'critical asset', 'critical assets')}</span> },
    {
      key: 'status', header: 'Status', cell: (a) => (
        <span className={cn('inline-flex rounded-badge px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', ACTION_STATUS_META[a.status].cls)}>
          {ACTION_STATUS_META[a.status].label}
        </span>
      ),
    },
    {
      key: 'do', header: <span className="sr-only">Actions</span>, cell: (a) => (
        <Can do="act">
          <span className="flex justify-end gap-2">
            {a.status !== 'resolved' && (a.primary.kind === 'assign_backup'
              ? <Button size="sm" onClick={() => setAssignFor(a)}>Assign backup</Button>
              : <ButtonLink size="sm" href={a.primary.href}>{a.primary.label}</ButtonLink>)}
            {(a.status === 'open' || a.status === 'in_progress') && <Button size="sm" variant="ghost" onClick={() => setRiskFor(a)}>Accept risk</Button>}
          </span>
        </Can>
      ),
    },
  ];

  return (
    <>
      <div role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={status === f.id}
            onClick={() => router.replace(`${pathname}?status=${f.id}`, { scroll: false })}
            className={cn('h-9 rounded-full px-3.5 text-sm transition-colors duration-150',
              status === f.id ? 'bg-ink font-medium text-canvas' : 'text-ink-2 hover:bg-sunken hover:text-ink')}>
            {f.label}
          </button>
        ))}
      </div>
      <ResourceView
        resource={actions}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title={status === 'open' ? 'No open actions' : 'Nothing here'} body={status === 'open' ? 'There are no open actions right now.' : 'No actions have this status.'} />}
      >
        {(list) => (
          <DataTable caption="Actions" columns={columns} rows={list} rowKey={(a) => a.id}
            rowClassName={(a) => (a.id === focus ? 'bg-amber/10' : undefined)} />
        )}
      </ResourceView>
      {assignFor && <AssignBackupSheet action={assignFor} onClose={() => setAssignFor(null)} onDone={() => { setAssignFor(null); actions.reload(); }} />}
      {riskFor && <AcceptRiskSheet action={riskFor} onClose={() => setRiskFor(null)} onDone={() => { setRiskFor(null); actions.reload(); }} />}
    </>
  );
}
```

- [ ] **Step 5: Implement `frontend/features/actions/ConfirmationsList.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchCampaignDetail, fetchCampaigns } from '@/lib/api/confirmations';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { CampaignSummary } from '@/types/view';

function Reviewers({ id }: { id: string }) {
  const detail = useResource(`campaign:${id}`, () => fetchCampaignDetail(id));
  return (
    <ResourceView resource={detail}>
      {(d) => (
        <div className="mt-4 border-t border-rule pt-4">
          <ul className="divide-y divide-rule">
            {[...d.reviewers].sort((a, b) => a.person.name.localeCompare(b.person.name)).map((r) => (
              <li key={r.person.id} className="flex justify-between py-2 text-sm">
                <span className="text-ink">{r.person.name}</span>
                <span className="tabular-nums text-ink-2">{formatNumber(r.completed)} of {formatNumber(r.total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">
            {d.reminderAt ? `Reminder ${formatDateTime(d.reminderAt)}` : 'No reminder scheduled'} ·{' '}
            {d.escalationAt ? `Escalation to managers ${formatDateTime(d.escalationAt)}` : 'No escalation scheduled'}
          </p>
        </div>
      )}
    </ResourceView>
  );
}

function CampaignCard({ c }: { c: CampaignSummary }) {
  const [open, setOpen] = useState(false);
  const pct = c.totalTasks > 0 ? (c.completedTasks / c.totalTasks) * 100 : 0;
  return (
    <Card as="li">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">{c.name}</h3>
          <p className="text-sm text-ink-3">Due {formatDate(c.dueDate)} · {c.status}</p>
        </div>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Hide reviewers' : 'Show reviewers'}</Button>
      </div>
      <div className="mt-4">
        <div role="progressbar" aria-label={`${c.name} progress`} aria-valuemin={0} aria-valuemax={c.totalTasks} aria-valuenow={c.completedTasks}
          className="h-2 overflow-hidden rounded-full bg-sunken">
          <div className="h-full bg-st-pass" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm tabular-nums text-ink-2">{formatNumber(c.completedTasks)} of {formatNumber(c.totalTasks)} answered</p>
      </div>
      {open && <Reviewers id={c.id} />}
    </Card>
  );
}

export function ConfirmationsList() {
  const campaigns = useResource('campaigns', fetchCampaigns);
  return (
    <ResourceView
      resource={campaigns}
      isEmpty={(list) => list.length === 0}
      empty={<EmptyState title="No confirmations yet" body="Ask owners to confirm what no system records: backups, criticality, runbooks and fallbacks." />}
    >
      {(list) => <ul className="space-y-4">{list.map((c) => <CampaignCard key={c.id} c={c} />)}</ul>}
    </ResourceView>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/actions/ActionsScreen.tsx`**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { PageHeader } from '@/components/ui/PageHeader';
import { LinkTabs } from '@/components/ui/Tabs';
import { ActionsList } from './ActionsList';
import { ConfirmationsList } from './ConfirmationsList';

export function ActionsScreen() {
  const sp = useSearchParams();
  const tab = sp.get('tab') === 'confirmations' ? 'confirmations' : 'actions';
  return (
    <>
      <PageHeader
        title="Actions"
        description="One action per failing check, most critical first. An action resolves only when its check passes."
        actions={tab === 'confirmations' ? <Can do="admin"><ButtonLink variant="primary" href="/actions/confirmations/new">New confirmation</ButtonLink></Can> : null}
      />
      <LinkTabs label="Actions views" active={tab} tabs={[
        { id: 'actions', label: 'Actions', href: '/actions' },
        { id: 'confirmations', label: 'Confirmations', href: '/actions?tab=confirmations' },
      ]} />
      {tab === 'actions' ? <ActionsList /> : <ConfirmationsList />}
    </>
  );
}
```

- [ ] **Step 7: Replace `frontend/app/(app)/actions/page.tsx`**

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { ActionsScreen } from '@/features/actions/ActionsScreen';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><ActionsScreen /></Suspense>;
}
```

- [ ] **Step 8: Run the test**

Run: `npm test -- tests/features/actions.test.tsx`
Expected: `6 passed`.

- [ ] **Step 9: Commit**

```bash
git add features/actions "app/(app)/actions/page.tsx" tests/features/actions.test.tsx
git commit -m "feat(actions): ranked actions with status filters, assign-backup and accept-risk sheets, confirmations tab"
```

---

### Task 26: New confirmation wizard

**Files:**
- Create: `frontend/features/actions/ConfirmationWizard.tsx`
- Modify: `frontend/app/(app)/actions/confirmations/new/page.tsx` (replace stub)
- Test: `frontend/tests/features/confirmation-wizard.test.tsx`

**Interfaces:**
- Consumes: `previewCampaign`, `createCampaign` (Task 6), `fetchTeams` (Task 6 people), `EntityPicker` (Task 13), `toDateInput` (Task 25), `Card`, `Button`, `ButtonLink`, `PageHeader` (Task 7), `EmptyState`, `ErrorState`, `LoadingBlock` (Task 9), `useToast` (Task 9), `useSession`, `can` (Task 14), `formatDate`, `formatNumber`, `plural` (Task 4).
- Produces: `INTRO_MAX = 280` (X-4); `ConfirmationWizard()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/confirmation-wizard.test.tsx`**

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';

vi.mock('@/lib/api/confirmations', () => ({ previewCampaign: vi.fn(), createCampaign: vi.fn() }));
vi.mock('@/lib/api/people', () => ({ fetchTeams: vi.fn() }));
import * as confApi from '@/lib/api/confirmations';
import * as peopleApi from '@/lib/api/people';
import { ConfirmationWizard } from '@/features/actions/ConfirmationWizard';

describe('ConfirmationWizard', () => {
  beforeEach(() => {
    vi.mocked(peopleApi.fetchTeams).mockResolvedValue({ teams: [], minGroupSize: 5 });
    vi.mocked(confApi.previewCampaign).mockResolvedValue({
      emailCount: 14, questionCount: 52,
      reviewers: [{ person: { id: 'person:sara', kind: 'person', name: 'Sara Ali' }, email: 'sara@acme.com', assetCount: 4, viaManager: true }],
      tasks: [{ reviewerPersonId: 'person:sara', assetEntityId: 'automation:41' }],
      email: { subject: 'Confirm ownership of your automations', bodyText: 'Hi Sara…' },
    });
    vi.mocked(confApi.createCampaign).mockResolvedValue('c9');
  });

  it('walks scope → review → message → schedule and sends the previewed tasks', async () => {
    nav.search = 'assets=automation%3A41';
    renderWithSession(<ConfirmationWizard />, ADMIN);
    expect(screen.getByRole('radio', { name: /Selected items \(1\)/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(confApi.previewCampaign).toHaveBeenCalledWith({ kind: 'selected', assetIds: ['automation:41'] });
    expect(await screen.findByText('Sends 14 emails covering 52 questions')).toBeInTheDocument();
    expect(screen.getByText('via manager')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Confirm ownership of your automations')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: /Personal intro line/ }), 'Quick check before Q4.');
    expect(screen.getByText('22 / 280')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(confApi.createCampaign).toHaveBeenCalledWith(expect.objectContaining({
      introLine: 'Quick check before Q4.', sendAt: null,
      tasks: [{ reviewerPersonId: 'person:sara', assetEntityId: 'automation:41' }],
    })));
    expect(nav.push).toHaveBeenCalledWith('/actions?tab=confirmations');
  });

  it('defaults to all unknown critical facts without a selection', () => {
    renderWithSession(<ConfirmationWizard />, ADMIN);
    expect(screen.getByRole('radio', { name: 'All unknown critical facts' })).toBeChecked();
  });

  it('is admin-only', () => {
    renderWithSession(<ConfirmationWizard />, VIEWER);
    expect(screen.getByRole('heading', { name: 'Only admins can start confirmations' })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<ConfirmationWizard />, ADMIN);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/confirmation-wizard.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/actions/ConfirmationWizard.tsx`**

```tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError, type ApiError } from '@/lib/api/client';
import { createCampaign, previewCampaign } from '@/lib/api/confirmations';
import { fetchTeams } from '@/lib/api/people';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber, plural } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useResource } from '@/lib/useResource';
import type { CampaignPreview, CampaignScope, EntityRef } from '@/types/view';
import { toDateInput } from './ActionSheets';

export const INTRO_MAX = 280;
const STEPS = ['Scope', 'Review', 'Message', 'Schedule'] as const;

const INPUT = 'h-10 rounded-control border border-rule bg-surface px-3 text-sm text-ink';

export function ConfirmationWizard() {
  const { session } = useSession();
  const sp = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const selected = (sp.get('assets') ?? '').split(',').filter(Boolean);

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<CampaignScope['kind']>(selected.length ? 'selected' : 'all_unknown_critical');
  const [department, setDepartment] = useState('');
  const [leaver, setLeaver] = useState<EntityRef | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [intro, setIntro] = useState('');
  const [today] = useState(() => new Date());
  const [name, setName] = useState(`Ownership confirmation · ${formatDate(today.toISOString())}`);
  const [due, setDue] = useState(toDateInput(new Date(today.getTime() + 7 * 86_400_000)));
  const [sendMode, setSendMode] = useState<'now' | 'later'>('now');
  const [sendAt, setSendAt] = useState('');
  const teams = useResource(kind === 'department' ? 'teams' : null, fetchTeams);
  const ids = { intro: useId(), name: useId(), due: useId(), sendAt: useId(), dept: useId() };

  if (!can(session, 'admin')) {
    return <EmptyState title="Only admins can start confirmations" body="Ask an admin to send a confirmation for these assets." />;
  }

  function scope(): CampaignScope | null {
    if (kind === 'all_unknown_critical') return { kind };
    if (kind === 'department') return department ? { kind, department } : null;
    if (kind === 'leaver') return leaver ? { kind, personId: leaver.id } : null;
    return selected.length ? { kind: 'selected', assetIds: selected } : null;
  }

  async function next() {
    if (step === 0) {
      const s = scope();
      if (!s) { setScopeError('Finish choosing the scope.'); return; }
      setScopeError(null);
      setLoading(true);
      setApiError(null);
      try { setPreview(await previewCampaign(s)); setStep(1); }
      catch (e) { setApiError(toApiError(e)); }
      finally { setLoading(false); }
      return;
    }
    setStep((n) => Math.min(n + 1, STEPS.length - 1));
  }

  async function send() {
    if (!preview) return;
    try {
      await createCampaign({
        name: name.trim() || `Ownership confirmation · ${formatDate(today.toISOString())}`,
        dueDate: new Date(`${due}T23:59:59`).toISOString(),
        sendAt: sendMode === 'later' && sendAt ? new Date(sendAt).toISOString() : null,
        introLine: intro.trim() || null,
        tasks: preview.tasks,
      });
      toast.show(sendMode === 'later' ? 'Confirmation scheduled' : `Confirmation sent to ${plural(preview.emailCount, 'reviewer', 'reviewers')}`);
      router.push('/actions?tab=confirmations');
    } catch (e) {
      setApiError(toApiError(e));
    }
  }

  const radio = (value: CampaignScope['kind'], label: string) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-rule px-4 has-[:checked]:border-amber">
      <input type="radio" name="scope" checked={kind === value} onChange={() => setKind(value)} />
      <span className="text-ink">{label}</span>
    </label>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New confirmation" description="Ask owners to confirm backups, criticality, runbooks and fallbacks." />
      <ol className="mb-6 flex gap-6 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={cn(i === step ? 'font-medium text-ink' : 'text-ink-3')}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <Card>
        {step === 0 && (
          <fieldset className="space-y-3">
            <legend className="mb-3 text-lg font-semibold text-ink">Who should we ask, about what?</legend>
            {radio('all_unknown_critical', 'All unknown critical facts')}
            {radio('department', 'A department')}
            {kind === 'department' && (
              <div className="pl-4">
                <label htmlFor={ids.dept} className="mb-1 block text-sm font-medium text-ink">Department</label>
                <select id={ids.dept} className={INPUT} value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Choose a department</option>
                  {teams.status === 'ready' && [...teams.data.teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            )}
            {radio('leaver', 'Assets of someone who is leaving')}
            {kind === 'leaver' && <div className="pl-4"><EntityPicker label="Leaver" kinds={['person']} value={leaver} onChange={setLeaver} /></div>}
            {selected.length > 0 && radio('selected', `Selected items (${selected.length})`)}
            {scopeError && <p role="alert" className="text-sm text-st-fail">{scopeError}</p>}
          </fieldset>
        )}

        {step === 1 && preview && (
          <div>
            <h2 className="text-lg font-semibold text-ink">Sends {formatNumber(preview.emailCount)} emails covering {formatNumber(preview.questionCount)} questions</h2>
            <ul className="mt-4 divide-y divide-rule">
              {[...preview.reviewers].sort((a, b) => a.person.name.localeCompare(b.person.name)).map((r) => (
                <li key={r.person.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span><span className="text-ink">{r.person.name}</span> <span className="text-ink-3">{r.email}</span></span>
                  <span className="flex items-center gap-2 text-ink-2">
                    {plural(r.assetCount, 'asset', 'assets')}
                    {r.viaManager && <span className="rounded-badge border border-rule px-1.5 py-0.5 text-xs text-ink-2">via manager</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-4">
            <div className="rounded-control border border-rule bg-sunken p-4">
              <p className="text-sm font-semibold text-ink">{preview.email.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{preview.email.bodyText}</p>
            </div>
            <div>
              <label htmlFor={ids.intro} className="mb-1 block text-sm font-medium text-ink">Personal intro line (optional)</label>
              <textarea id={ids.intro} rows={2} maxLength={INTRO_MAX} value={intro} onChange={(e) => setIntro(e.target.value)}
                className="w-full rounded-control border border-rule bg-surface p-3 text-sm text-ink" />
              <p className="mt-1 text-right text-xs tabular-nums text-ink-3">{intro.length} / {INTRO_MAX}</p>
              <p className="text-xs text-ink-3">The subject and body are fixed so every reviewer gets the same, tested wording.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label htmlFor={ids.name} className="mb-1 block text-sm font-medium text-ink">Name</label>
              <input id={ids.name} className={cn(INPUT, 'w-full')} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor={ids.due} className="mb-1 block text-sm font-medium text-ink">Due date</label>
              <input id={ids.due} type="date" className={INPUT} value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">When to send</legend>
              <label className="mr-6 inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="when" checked={sendMode === 'now'} onChange={() => setSendMode('now')} />Now</label>
              <label className="inline-flex items-center gap-2 text-sm text-ink"><input type="radio" name="when" checked={sendMode === 'later'} onChange={() => setSendMode('later')} />At a set time</label>
              {sendMode === 'later' && (
                <div className="mt-2">
                  <label htmlFor={ids.sendAt} className="sr-only">Send at</label>
                  <input id={ids.sendAt} type="datetime-local" className={INPUT} value={sendAt} onChange={(e) => setSendAt(e.target.value)} />
                </div>
              )}
            </fieldset>
          </div>
        )}

        {loading && <div className="mt-4"><LoadingBlock label="Preparing preview" /></div>}
        {apiError && <div className="mt-4"><ErrorState error={apiError} /></div>}

        <div className="mt-8 flex justify-between gap-3">
          {step === 0 ? <ButtonLink variant="ghost" href="/actions?tab=confirmations">Cancel</ButtonLink> : <Button variant="ghost" onClick={() => setStep((n) => n - 1)}>Back</Button>}
          {step < 3 ? <Button variant="primary" onClick={next} disabled={loading}>Next</Button> : <Button variant="primary" onClick={send}>Send</Button>}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Replace `frontend/app/(app)/actions/confirmations/new/page.tsx`**

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { ConfirmationWizard } from '@/features/actions/ConfirmationWizard';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><ConfirmationWizard /></Suspense>;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/features/confirmation-wizard.test.tsx`
Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add features/actions/ConfirmationWizard.tsx "app/(app)/actions/confirmations/new/page.tsx" tests/features/confirmation-wizard.test.tsx
git commit -m "feat(confirmations): four-step campaign wizard with preview and fixed email copy"
```

---

### Task 27: Departures list and initiate departure

**Files:**
- Create: `frontend/features/departures/DeparturesScreen.tsx`, `frontend/features/departures/InitiateDepartureSheet.tsx`
- Modify: `frontend/app/(app)/departures/page.tsx` (replace stub)
- Test: `frontend/tests/features/departures.test.tsx`

**Interfaces:**
- Consumes: `fetchDepartures`, `initiateDeparture` (Task 6), `StageStepper` (Task 11), `DataTable`, `Drawer` (Task 12), `EntityPicker` (Task 13), `Button`, `PageHeader` (Task 7), `ResourceView`, `EmptyState` (Task 9), `useToast` (Task 9), `Can` (Task 14), `toDateInput` (Task 25), `formatDate`, `formatRelative`, `formatNumber` (Task 4).
- Produces: `DETECTED_LABEL: Record<DepartureSummary['detectedFrom'], string | null>`; `DeparturesScreen()`; `InitiateDepartureSheet({ onClose })`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/departures.test.tsx`**

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, HR_MANAGER, VIEWER, renderWithSession } from '../helpers';
import type { DepartureSummary } from '@/types/view';

vi.mock('@/lib/api/departures', () => ({ fetchDepartures: vi.fn(), initiateDeparture: vi.fn() }));
vi.mock('@/lib/api/entities', () => ({
  fetchEntities: vi.fn().mockResolvedValue([{ id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }]),
  lookupEntityName: (id: string) => id,
}));
import * as depApi from '@/lib/api/departures';
import { DeparturesScreen } from '@/features/departures/DeparturesScreen';

const d = (over: Partial<DepartureSummary>): DepartureSummary => ({
  id: 'd1', person: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, role: 'DevOps lead', team: 'Platform',
  leaveDate: '2026-10-14T00:00:00Z', stage: 'successor_named', assetsTotal: 5, assetsHandedOver: 3, hasAlert: false,
  detectedFrom: 'entra', group: 'upcoming', ...over,
});

describe('DeparturesScreen', () => {
  beforeEach(() => {
    vi.mocked(depApi.fetchDepartures).mockResolvedValue([
      d({ id: 'd3', person: { id: 'person:lee', kind: 'person', name: 'Lee Park' }, group: 'departed', stage: 'account_disabled', leaveDate: '2026-09-20T00:00:00Z', hasAlert: true, detectedFrom: 'manual' }),
      d({}),
      d({ id: 'd2', person: { id: 'person:ana', kind: 'person', name: 'Ana Ruiz' }, group: 'in_handover', stage: 'accepted' }),
    ]);
    vi.mocked(depApi.initiateDeparture).mockResolvedValue('d9');
  });

  it('groups as Upcoming, In handover, Recently departed with stage and handover counts', async () => {
    renderWithSession(<DeparturesScreen />, ADMIN);
    const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    expect(headings).toEqual(['Upcoming (1)', 'In handover (1)', 'Recently departed (1)']);
    expect(screen.getByRole('img', { name: 'Stage 2 of 5: Successor named' })).toBeInTheDocument();
    expect(screen.getAllByText('3 of 5 assets handed over').length).toBeGreaterThan(0);
    expect(screen.getByText('Detected from Entra')).toBeInTheDocument();
    const departed = screen.getByRole('table', { name: 'Recently departed' });
    expect(within(departed).getByText('Post-departure alert')).toBeInTheDocument();
  });

  it('HR managers can initiate a departure; viewers cannot', async () => {
    const { unmount } = renderWithSession(<DeparturesScreen />, VIEWER);
    await screen.findAllByRole('heading', { level: 2 });
    expect(screen.queryByRole('button', { name: 'Initiate departure' })).toBeNull();
    unmount();

    renderWithSession(<DeparturesScreen />, HR_MANAGER);
    await userEvent.click(await screen.findByRole('button', { name: 'Initiate departure' }));
    const sheet = screen.getByRole('dialog', { name: 'Initiate departure' });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Start departure' }));
    expect(within(sheet).getByText('Pick the person who is leaving.')).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('combobox', { name: 'Person leaving' }));
    await userEvent.click(await within(sheet).findByRole('option', { name: 'Yuki Tanaka' }));
    fireEvent.change(within(sheet).getByLabelText('Leave date'), { target: { value: '2026-11-30' } });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Start departure' }));
    await waitFor(() => expect(depApi.initiateDeparture).toHaveBeenCalledWith({ personId: 'person:yuki', leaveDate: '2026-11-30', note: null }));
    expect(nav.push).toHaveBeenCalledWith('/departures/d9');
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<DeparturesScreen />, ADMIN);
    await screen.findAllByRole('heading', { level: 2 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/departures.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/departures/InitiateDepartureSheet.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { initiateDeparture } from '@/lib/api/departures';
import type { EntityRef } from '@/types/view';

export function InitiateDepartureSheet({ onClose }: { onClose: () => void }) {
  const [person, setPerson] = useState<EntityRef | null>(null);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ person?: string; date?: string; submit?: string }>({});
  const router = useRouter();
  const toast = useToast();
  const dateId = useId();
  const noteId = useId();

  async function submit() {
    const next: typeof errors = {};
    if (!person) next.person = 'Pick the person who is leaving.';
    if (!date) next.date = 'Pick the leave date.';
    setErrors(next);
    if (next.person || next.date) return;
    try {
      const id = await initiateDeparture({ personId: person!.id, leaveDate: date, note: note.trim() || null });
      toast.show('Departure started');
      router.push(`/departures/${encodeURIComponent(id)}`);
    } catch (e) {
      setErrors({ submit: toApiError(e).message });
    }
  }

  return (
    <Drawer open onClose={onClose} size="md" title="Initiate departure"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Start departure</Button></>}>
      <div className="space-y-5">
        <div>
          <EntityPicker label="Person leaving" kinds={['person']} value={person} onChange={setPerson} />
          {errors.person && <p className="mt-1 text-sm text-st-fail">{errors.person}</p>}
        </div>
        <div>
          <label htmlFor={dateId} className="mb-1 block text-sm font-medium text-ink">Leave date</label>
          <input id={dateId} type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-control border border-rule bg-surface px-3 text-sm text-ink" />
          {errors.date && <p className="mt-1 text-sm text-st-fail">{errors.date}</p>}
        </div>
        <div>
          <label htmlFor={noteId} className="mb-1 block text-sm font-medium text-ink">Note (optional)</label>
          <textarea id={noteId} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-control border border-rule bg-surface p-3 text-sm text-ink" />
        </div>
        {errors.submit && <p role="alert" className="text-sm text-st-fail">{errors.submit}</p>}
      </div>
    </Drawer>
  );
}
```

- [ ] **Step 4: Implement `frontend/features/departures/DeparturesScreen.tsx`**

```tsx
'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { StageStepper } from '@/components/ui/StageStepper';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchDepartures } from '@/lib/api/departures';
import { formatDate, formatNumber, formatRelative } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { DepartureSummary } from '@/types/view';
import { InitiateDepartureSheet } from './InitiateDepartureSheet';

export const DETECTED_LABEL: Record<DepartureSummary['detectedFrom'], string | null> = {
  manual: null, entra: 'Detected from Entra', google: 'Detected from Google',
};

const GROUPS: Array<{ id: DepartureSummary['group']; title: string; asc: boolean }> = [
  { id: 'upcoming', title: 'Upcoming', asc: true },
  { id: 'in_handover', title: 'In handover', asc: true },
  { id: 'departed', title: 'Recently departed', asc: false },
];

export function DeparturesScreen() {
  const departures = useResource('departures', fetchDepartures);
  const [initiating, setInitiating] = useState(false);
  const router = useRouter();

  const columns: Column<DepartureSummary>[] = [
    {
      key: 'person', header: 'Person', cell: (d) => (
        <div className="py-2">
          <Link href={`/departures/${encodeURIComponent(d.id)}`} className="font-medium text-ink hover:underline">{d.person.name}</Link>
          <p className="text-xs text-ink-3">{[d.role, d.team].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Leave date', cell: (d) => <span className="text-ink">{formatDate(d.leaveDate)} <span className="text-ink-3">· {formatRelative(d.leaveDate)}</span></span> },
    { key: 'stage', header: 'Stage', cell: (d) => <StageStepper variant="compact" stage={d.stage} /> },
    { key: 'handover', header: 'Handover', cell: (d) => <span className="tabular-nums text-ink-2">{formatNumber(d.assetsHandedOver)} of {formatNumber(d.assetsTotal)} assets handed over</span> },
    {
      key: 'flags', header: <span className="sr-only">Notes</span>, cell: (d) => (
        <span className="flex flex-wrap items-center justify-end gap-2">
          {d.hasAlert && <span className="inline-flex items-center gap-1 text-sm font-medium text-st-fail"><TriangleAlert aria-hidden className="size-4" />Post-departure alert</span>}
          {DETECTED_LABEL[d.detectedFrom] && <span className="rounded-badge border border-rule px-1.5 py-0.5 text-xs text-ink-2">{DETECTED_LABEL[d.detectedFrom]}</span>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Departures"
        description="Who is leaving, how far their handover has got, and what broke after they left."
        actions={<Can do="initiateDeparture"><Button variant="primary" onClick={() => setInitiating(true)}>Initiate departure</Button></Can>}
      />
      <ResourceView
        resource={departures}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState title="No departures on record" body="Departures appear here when your directory reports a leave date or someone starts one." />}
      >
        {(list) => (
          <div className="space-y-10">
            {GROUPS.map((g) => {
              const rows = list.filter((d) => d.group === g.id)
                .sort((a, b) => (g.asc ? 1 : -1) * a.leaveDate.localeCompare(b.leaveDate));
              return (
                <section key={g.id}>
                  <h2 className="mb-3 text-lg font-semibold text-ink">{g.title} ({formatNumber(rows.length)})</h2>
                  {rows.length === 0
                    ? <p className="text-ink-3">None.</p>
                    : <DataTable caption={g.title} columns={columns} rows={rows} rowKey={(d) => d.id}
                        onRowClick={(d) => router.push(`/departures/${encodeURIComponent(d.id)}`)} />}
                </section>
              );
            })}
          </div>
        )}
      </ResourceView>
      {initiating && <InitiateDepartureSheet onClose={() => setInitiating(false)} />}
    </>
  );
}
```

- [ ] **Step 5: Replace `frontend/app/(app)/departures/page.tsx`**

```tsx
import { DeparturesScreen } from '@/features/departures/DeparturesScreen';

export default function Page() {
  return <DeparturesScreen />;
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -- tests/features/departures.test.tsx`
Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add features/departures "app/(app)/departures/page.tsx" tests/features/departures.test.tsx
git commit -m "feat(departures): grouped departure list with stage stepper and initiate-departure sheet"
```

---

### Task 28: Departure detail: handover, live succession test, watch log

**Files:**
- Create: `frontend/features/departures/DepartureDetailScreen.tsx`
- Modify: `frontend/app/(app)/departures/[id]/page.tsx` (replace stub)
- Test: `frontend/tests/features/departure-detail.test.tsx`

**Interfaces:**
- Consumes: `fetchDeparture`, `simulateSuccessionPlan`, `saveSuccessors`, `sendAcceptanceRequests` (Task 6); `StageStepper` (Task 11); `EntityPicker` (Task 13); `CriticalityDots`, `FactCell` (Task 8); `DataTable` (Task 12); `Card`, `Button`, `PageHeader` (Task 7); `ResourceView`, `ErrorState` (Task 9); `useToast` (Task 9); `useSession`, `can` (Task 14); `DETECTED_LABEL` (Task 27); `formatDate`, `formatDateTime`, `formatRelative`, `formatNumber`, `plural`, `firstName` (Task 4).
- Produces: `SUCCESSION_DEBOUNCE_MS = 400` (X-5); `DepartureDetailScreen({ id })`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/departure-detail.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';
import type { DepartureDetail } from '@/types/view';

vi.mock('@/lib/api/departures', () => ({
  fetchDeparture: vi.fn(), simulateSuccessionPlan: vi.fn(), saveSuccessors: vi.fn(), sendAcceptanceRequests: vi.fn(),
}));
vi.mock('@/lib/api/entities', () => ({
  fetchEntities: vi.fn().mockResolvedValue([
    { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }, { id: 'person:sara', kind: 'person', name: 'Sara Ali' },
  ]),
  lookupEntityName: (id: string) => id,
}));
import * as depApi from '@/lib/api/departures';
import { DepartureDetailScreen } from '@/features/departures/DepartureDetailScreen';

const unknownFact = { state: 'unknown' as const, display: null, grade: 'unknown' as const, source: null, observedAt: null };
const detail: DepartureDetail = {
  id: 'd1', person: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, role: 'DevOps lead', team: 'Platform',
  leaveDate: '2026-10-14T00:00:00Z', stage: 'initiated', assetsTotal: 2, assetsHandedOver: 0, hasAlert: false,
  detectedFrom: 'entra', group: 'upcoming', stageTimestamps: { initiated: '2026-09-30T10:00:00Z' },
  handover: [
    { asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, criticality: 'critical', currentBackup: unknownFact,
      successor: null, suggestion: { person: { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }, reason: 'edited 6 times' }, acceptance: 'none' },
    { asset: { id: 'automation:7', kind: 'automation', name: 'Slack alerts' }, criticality: 'high', currentBackup: unknownFact,
      successor: null, suggestion: null, acceptance: 'none' },
  ],
  personalCredentialAutomations: [{ workflow: { id: 'automation:7', kind: 'automation', name: 'Slack alerts' }, weeklyRuns: null }],
  undocumented: [{ id: 'automation:41', kind: 'automation', name: 'Invoice sync' }],
  watchLog: [],
};

describe('DepartureDetailScreen', () => {
  beforeEach(() => {
    vi.mocked(depApi.fetchDeparture).mockResolvedValue(detail);
    vi.mocked(depApi.simulateSuccessionPlan).mockResolvedValue({
      coveredCount: 1, stillExposedCount: 1,
      loads: [{ successor: { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }, totalCriticalAssetsOwned: 6, shareOfCompanyCriticalAutomationsPct: 34, overloadWarning: true }],
    });
    vi.mocked(depApi.saveSuccessors).mockResolvedValue(undefined);
    vi.mocked(depApi.sendAcceptanceRequests).mockResolvedValue(undefined);
  });

  it('prefills suggestions, runs the succession test and warns about overload', async () => {
    renderWithSession(<DepartureDetailScreen id="d1" />, ADMIN);
    expect(await screen.findByRole('heading', { level: 1, name: 'Omar Haddad' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Successor for Invoice sync' })).toHaveValue('Yuki Tanaka');
    expect(screen.getByText('Suggested: edited 6 times')).toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Succession test' });
    expect(await within(panel).findByText('1 of 2 covered · 1 still exposed')).toBeInTheDocument();
    expect(within(panel).getByText(/34% of the company's critical automations/)).toBeInTheDocument();
    expect(depApi.simulateSuccessionPlan).toHaveBeenCalledWith('d1', [{ assetId: 'automation:41', successorId: 'person:yuki' }]);
  });

  it('applies one person to all and sends acceptance requests', async () => {
    renderWithSession(<DepartureDetailScreen id="d1" />, ADMIN);
    const all = await screen.findByRole('combobox', { name: 'Apply one person to all' });
    await userEvent.click(all);
    await userEvent.click(await screen.findByRole('option', { name: 'Sara Ali' }));
    expect(screen.getByRole('combobox', { name: 'Successor for Slack alerts' })).toHaveValue('Sara Ali');
    await userEvent.click(screen.getByRole('button', { name: 'Send acceptance requests' }));
    await waitFor(() => expect(depApi.sendAcceptanceRequests).toHaveBeenCalledWith('d1'));
    expect(depApi.saveSuccessors).toHaveBeenCalledWith('d1', [
      { assetId: 'automation:41', successorId: 'person:sara' }, { assetId: 'automation:7', successorId: 'person:sara' },
    ]);
  });

  it('shows credential risks, undocumented systems and the watch state; viewers get no pickers', async () => {
    renderWithSession(<DepartureDetailScreen id="d1" />, VIEWER);
    expect(await screen.findByRole('heading', { name: "Automations on Omar's personal credentials" })).toBeInTheDocument();
    expect(screen.getByText('runs/wk unknown')).toBeInTheDocument();
    expect(screen.getByText('The watch starts when the account is disabled.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Successor for/ })).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<DepartureDetailScreen id="d1" />, ADMIN);
    await screen.findByRole('heading', { level: 1, name: 'Omar Haddad' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/departure-detail.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/departures/DepartureDetailScreen.tsx`**

```tsx
'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { CriticalityDots, FactCell } from '@/components/ui/marks';
import { PageHeader } from '@/components/ui/PageHeader';
import { StageStepper } from '@/components/ui/StageStepper';
import { ErrorState, ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError, type ApiError } from '@/lib/api/client';
import { fetchDeparture, saveSuccessors, sendAcceptanceRequests, simulateSuccessionPlan } from '@/lib/api/departures';
import { firstName, formatDate, formatDateTime, formatNumber, formatRelative, plural } from '@/lib/format';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useResource } from '@/lib/useResource';
import { DEPARTURE_STAGES, type DepartureDetail, type EntityRef, type HandoverAsset, type SuccessionPlanResult, type SuccessorAssignment } from '@/types/view';
import { DETECTED_LABEL } from './DeparturesScreen';

export const SUCCESSION_DEBOUNCE_MS = 400;

const ACCEPTANCE_LABEL: Record<HandoverAsset['acceptance'], string> = {
  none: 'Not requested', requested: 'Requested', accepted: 'Accepted', declined: 'Declined',
};

function toAssignments(map: Record<string, EntityRef | null>): SuccessorAssignment[] {
  return Object.entries(map).filter(([, p]) => !!p).map(([assetId, p]) => ({ assetId, successorId: p!.id }));
}

function HandoverEditor({ d, onSent }: { d: DepartureDetail; onSent: () => void }) {
  const { session } = useSession();
  const canEdit = can(session, 'nameSuccessors');
  const toast = useToast();
  const [map, setMap] = useState<Record<string, EntityRef | null>>(() =>
    Object.fromEntries(d.handover.map((h) => [h.asset.id, h.successor ?? h.suggestion?.person ?? null])));
  const [plan, setPlan] = useState<SuccessionPlanResult | ApiError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assignments = toAssignments(map);
  const key = JSON.stringify(assignments);

  useEffect(() => {
    const list: SuccessorAssignment[] = JSON.parse(key);
    if (list.length === 0) return;
    let live = true;
    const t = setTimeout(() => {
      simulateSuccessionPlan(d.id, list).then((r) => live && setPlan(r), (e) => live && setPlan(toApiError(e)));
    }, SUCCESSION_DEBOUNCE_MS);
    return () => { live = false; clearTimeout(t); };
  }, [d.id, key]);

  async function send() {
    if (assignments.length === 0) { setError('Name at least one successor first.'); return; }
    setError(null);
    try {
      await saveSuccessors(d.id, assignments);
      await sendAcceptanceRequests(d.id);
      toast.show(`Acceptance requests sent for ${plural(assignments.length, 'asset', 'assets')}`);
      onSent();
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  const columns: Column<HandoverAsset>[] = [
    { key: 'asset', header: 'Asset', cell: (h) => <Link href={`/assets/${encodeURIComponent(h.asset.id)}`} className="font-medium text-ink hover:underline">{h.asset.name}</Link> },
    { key: 'crit', header: 'Criticality', cell: (h) => <CriticalityDots level={h.criticality} /> },
    { key: 'backup', header: 'Current backup', cell: (h) => <FactCell fact={h.currentBackup} /> },
    {
      key: 'successor', header: 'Successor', className: 'min-w-[240px] py-2', cell: (h) => canEdit ? (
        <div>
          <EntityPicker hideLabel label={`Successor for ${h.asset.name}`} kinds={['person']} value={map[h.asset.id] ?? null}
            exclude={[d.person.id]} onChange={(p) => setMap((m) => ({ ...m, [h.asset.id]: p }))} />
          {h.suggestion && <p className="mt-1 text-xs text-ink-3">Suggested: {h.suggestion.reason}</p>}
        </div>
      ) : <span className="text-ink">{h.successor?.name ?? 'Not named yet'}</span>,
    },
    { key: 'acc', header: 'Acceptance', cell: (h) => <span className="text-sm text-ink-2">{ACCEPTANCE_LABEL[h.acceptance]}</span> },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {canEdit && (
          <div className="max-w-xs">
            <EntityPicker label="Apply one person to all" kinds={['person']} value={null} exclude={[d.person.id]}
              onChange={(p) => p && setMap(Object.fromEntries(d.handover.map((h) => [h.asset.id, p])))} />
          </div>
        )}
        <DataTable caption="Handover" columns={columns} rows={d.handover} rowKey={(h) => h.asset.id} />
        {canEdit && (
          <div className="flex items-center gap-4">
            <Button variant="primary" onClick={send}>Send acceptance requests</Button>
            {error && <p role="alert" className="text-sm text-st-fail">{error}</p>}
          </div>
        )}
      </div>
      <Card role="region" aria-label="Succession test" className="h-fit lg:sticky lg:top-4">
        <h2 className="text-base font-semibold text-ink">Succession test</h2>
        {!plan && <p className="mt-2 text-sm text-ink-2">Name successors to see coverage after handover.</p>}
        {plan && 'coveredCount' in plan && (
          <div className="mt-3 space-y-3">
            <p className="text-ink">{formatNumber(plan.coveredCount)} of {formatNumber(d.handover.length)} covered · {formatNumber(plan.stillExposedCount)} still exposed</p>
            <ul className="space-y-3">
              {plan.loads.map((l) => (
                <li key={l.successor.id} className="text-sm">
                  <p className="font-medium text-ink">{l.successor.name}</p>
                  <p className="text-ink-2">{plural(l.totalCriticalAssetsOwned, 'critical asset', 'critical assets')} after handover</p>
                  {l.overloadWarning && (
                    <p className="mt-1 flex items-start gap-1.5 font-medium text-amber-ink">
                      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                      Would hold {formatNumber(l.shareOfCompanyCriticalAutomationsPct)}% of the company&apos;s critical automations (over 30%).
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {plan && !('coveredCount' in plan) && <div className="mt-3"><ErrorState error={plan} /></div>}
      </Card>
    </div>
  );
}

export function DepartureDetailScreen({ id }: { id: string }) {
  const dep = useResource(`departure:${id}`, () => fetchDeparture(id));
  return (
    <ResourceView resource={dep}>
      {(d) => {
        const first = firstName(d.person.name);
        const disabledReached = DEPARTURE_STAGES.indexOf(d.stage) >= DEPARTURE_STAGES.indexOf('account_disabled');
        return (
          <div className="space-y-8">
            <PageHeader
              title={d.person.name}
              description={<>Leaves {formatDate(d.leaveDate)} ({formatRelative(d.leaveDate)}){d.role ? ` · ${d.role}` : ''}{d.team ? ` · ${d.team}` : ''}{DETECTED_LABEL[d.detectedFrom] ? ` · ${DETECTED_LABEL[d.detectedFrom]}` : ''}</>}
            />
            <Card><StageStepper variant="full" stage={d.stage} timestamps={d.stageTimestamps} /></Card>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-ink">Handover</h2>
              <HandoverEditor d={d} onSent={dep.reload} />
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="text-lg font-semibold text-ink">Automations on {first}&apos;s personal credentials</h2>
                <p className="mb-3 text-sm text-ink-2">These stop when the account is disabled.</p>
                {d.personalCredentialAutomations.length === 0 ? <p className="text-ink-3">None on record.</p> : (
                  <ul className="divide-y divide-rule">
                    {d.personalCredentialAutomations.map((p) => (
                      <li key={p.workflow.id} className="flex justify-between gap-3 py-2.5">
                        <Link href={`/assets/${encodeURIComponent(p.workflow.id)}`} className="text-ink hover:underline">{p.workflow.name}</Link>
                        <span className="text-sm tabular-nums text-ink-2">{p.weeklyRuns === null ? 'runs/wk unknown' : `${formatNumber(p.weeklyRuns)} runs/wk`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h2 className="mb-3 text-lg font-semibold text-ink">Undocumented systems</h2>
                {d.undocumented.length === 0 ? <p className="text-ink-3">None on record.</p> : (
                  <ul className="space-y-1.5">
                    {d.undocumented.map((u) => <li key={u.id}><Link href={`/assets/${encodeURIComponent(u.id)}`} className="text-ink hover:underline">{u.name}</Link></li>)}
                  </ul>
                )}
              </Card>
            </div>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-ink">72-hour watch</h2>
              {!disabledReached ? <p className="text-ink-2">The watch starts when the account is disabled.</p>
                : d.watchLog.length === 0 ? <p className="text-ink-2">No post-departure errors recorded.</p> : (
                  <ol className="divide-y divide-rule">
                    {d.watchLog.map((w, i) => (
                      <li key={`${w.at}-${i}`} className="flex items-start gap-3 py-2.5">
                        {w.severity === 'alert' && <TriangleAlert aria-label="Alert" className="mt-0.5 size-4 shrink-0 text-st-fail" />}
                        <div>
                          <p className="text-ink"><Link href={`/assets/${encodeURIComponent(w.workflow.id)}`} className="font-medium hover:underline">{w.workflow.name}</Link>: {w.message}</p>
                          <p className="text-xs text-ink-3">{formatDateTime(w.at)}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
            </Card>
          </div>
        );
      }}
    </ResourceView>
  );
}
```

- [ ] **Step 4: Replace `frontend/app/(app)/departures/[id]/page.tsx`**

```tsx
'use client';

import { useParams } from 'next/navigation';
import { DepartureDetailScreen } from '@/features/departures/DepartureDetailScreen';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <DepartureDetailScreen id={decodeURIComponent(id)} />;
}
```

- [ ] **Step 5: Run the test**

Run: `npm test -- tests/features/departure-detail.test.tsx`
Expected: `4 passed`.

- [ ] **Step 6: Commit**

```bash
git add features/departures/DepartureDetailScreen.tsx "app/(app)/departures/[id]/page.tsx" tests/features/departure-detail.test.tsx
git commit -m "feat(departures): handover with per-asset successors, live succession test, credential risks, 72h watch"
```

---

### Task 29: People & Teams

**Files:**
- Create: `frontend/features/people/HoldingsList.tsx`, `frontend/features/people/TeamsScreen.tsx`, `frontend/features/people/TeamScreen.tsx`, `frontend/features/people/PersonScreen.tsx`
- Modify: `frontend/app/(app)/people/page.tsx`, `frontend/app/(app)/people/teams/[id]/page.tsx`, `frontend/app/(app)/people/[id]/page.tsx` (replace stubs)
- Test: `frontend/tests/features/people.test.tsx`

**Interfaces:**
- Consumes: `fetchTeams`, `fetchTeam`, `fetchPerson` (Task 6); `SegmentedBar`, `NamedShareBar` (Task 10), `coverageSegments` (Task 10); `CriticalityDots`, `FactCell` (Task 8); `Card`, `PageHeader` (Task 7); `ResourceView`, `EmptyState` (Task 9); `formatNumber`, `plural` (Task 4).
- Produces: `byName<T extends { person: EntityRef }>(list: T[]): T[]`; `HoldingsList({ holdings })`; `TeamsScreen()`; `TeamScreen({ id })`; `PersonScreen({ id })`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/people.test.tsx`**

```tsx
import { screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { renderWithSession } from '../helpers';
import type { Holding, TeamSummary } from '@/types/view';

vi.mock('@/lib/api/people', () => ({ fetchTeams: vi.fn(), fetchTeam: vi.fn(), fetchPerson: vi.fn() }));
import * as peopleApi from '@/lib/api/people';
import { TeamsScreen } from '@/features/people/TeamsScreen';
import { TeamScreen } from '@/features/people/TeamScreen';
import { PersonScreen } from '@/features/people/PersonScreen';

const cov = { total: 10, covered: 6, exposed: 3, unknown: 1, definition: 'd' };
const finance: TeamSummary = {
  id: 't-fin', name: 'Finance', memberCount: 12, rolledUp: false, coverage: cov,
  concentration: { sentence: "2 people hold 70% of Finance's critical assets", holders: [
    { person: { id: 'p1', kind: 'person', name: 'Ana Ruiz' }, sharePct: 40 },
    { person: { id: 'p2', kind: 'person', name: 'Ben Cole' }, sharePct: 30 },
  ] },
};
const tiny: TeamSummary = { id: 't-legal', name: 'Legal', memberCount: 2, rolledUp: true, coverage: cov, concentration: null };
const holding = (name: string, unknown = false): Holding => ({
  asset: { id: `automation:${name}`, kind: 'automation', name }, relation: 'owns', criticality: 'high',
  backup: unknown ? { state: 'unknown', display: null, grade: 'unknown', source: null, observedAt: null }
    : { state: 'value', display: 'Sara Ali', grade: 'confirmed', source: 'attestation', observedAt: null },
});

describe('People & Teams', () => {
  it('shows teams alphabetically with concentration; small teams are not broken down', async () => {
    vi.mocked(peopleApi.fetchTeams).mockResolvedValue({ teams: [tiny, finance], minGroupSize: 5 });
    const { container } = renderWithSession(<TeamsScreen />);
    const cards = await screen.findAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual(['Finance', 'Legal']);
    expect(within(cards[0]).getByText("2 people hold 70% of Finance's critical assets")).toBeInTheDocument();
    expect(within(cards[1]).getByText('Too small to report separately')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/score|risk rank/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lists team members alphabetically even if the API does not', async () => {
    vi.mocked(peopleApi.fetchTeam).mockResolvedValue({ team: finance, members: [
      { person: { id: 'p3', kind: 'person', name: 'Zoe Hart' }, title: null, holdings: [holding('Payroll', true)] },
      { person: { id: 'p1', kind: 'person', name: 'Ana Ruiz' }, title: 'Controller', holdings: [holding('Invoice sync')] },
    ] });
    renderWithSession(<TeamScreen id="t-fin" />);
    const names = (await screen.findAllByRole('heading', { level: 3 })).map((h) => h.textContent);
    expect(names).toEqual(['Ana Ruiz', 'Zoe Hart']);
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
  });

  it('person page lists holdings, handovers and pending confirmations without any score', async () => {
    vi.mocked(peopleApi.fetchPerson).mockResolvedValue({
      person: { id: 'p1', kind: 'person', name: 'Ana Ruiz' }, title: 'Controller', team: { id: 't-fin', kind: 'group', name: 'Finance' },
      holdings: [holding('Invoice sync')], openHandovers: [{ departureId: 'd1', from: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, assetCount: 5 }],
      pendingConfirmations: 2,
    });
    const { container } = renderWithSession(<PersonScreen id="p1" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Ruiz' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Receiving 5 assets from Omar Haddad' })).toHaveAttribute('href', '/departures/d1');
    expect(screen.getByText('2 confirmations waiting')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/score|rank/i);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/people.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/people/HoldingsList.tsx`**

```tsx
import Link from 'next/link';
import { CriticalityDots, FactCell } from '@/components/ui/marks';
import type { EntityRef, Holding } from '@/types/view';

const RELATION_LABEL: Record<Holding['relation'], string> = { owns: 'Owns', backs_up: 'Backs up', credential: 'Credential holder' };

export function byName<T extends { person: EntityRef }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.person.name.localeCompare(b.person.name));
}

export function HoldingsList({ holdings }: { holdings: Holding[] }) {
  if (holdings.length === 0) return <p className="text-sm text-ink-3">Holds nothing on record.</p>;
  return (
    <ul className="divide-y divide-rule">
      {[...holdings].sort((a, b) => a.asset.name.localeCompare(b.asset.name)).map((h) => (
        <li key={`${h.asset.id}-${h.relation}`} className="grid gap-2 py-2.5 sm:grid-cols-[1fr_120px_140px_200px] sm:items-center">
          <Link href={`/assets/${encodeURIComponent(h.asset.id)}`} className="text-ink hover:underline">{h.asset.name}</Link>
          <span className="text-sm text-ink-2">{RELATION_LABEL[h.relation]}</span>
          <CriticalityDots level={h.criticality} />
          <span className="text-sm"><span className="sr-only">Backup: </span><FactCell fact={h.backup} /></span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Implement `frontend/features/people/TeamsScreen.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { NamedShareBar, SegmentedBar } from '@/components/ui/bars';
import { Card } from '@/components/ui/Card';
import { coverageSegments } from '@/components/ui/CoverageStrip';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchTeams } from '@/lib/api/people';
import { plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';

export function TeamsScreen() {
  const teams = useResource('teams', fetchTeams);
  return (
    <>
      <PageHeader title="People & Teams" description="Who holds what, by team. People are listed by name only." />
      <ResourceView
        resource={teams}
        isEmpty={(d) => d.teams.length === 0}
        empty={<EmptyState title="No teams yet" body="Teams come from your directory's departments and managers." />}
      >
        {(d) => (
          <>
            <p className="mb-4 text-sm text-ink-3">Teams smaller than {d.minGroupSize} people are combined with their parent team.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...d.teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                <Card as="article" key={t.id} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink"><Link href={`/people/teams/${encodeURIComponent(t.id)}`} className="hover:underline">{t.name}</Link></h2>
                    <p className="text-sm text-ink-3">{plural(t.memberCount, 'person', 'people')}</p>
                  </div>
                  {t.rolledUp ? (
                    <p className="text-sm text-ink-2">Too small to report separately</p>
                  ) : (
                    <>
                      <SegmentedBar label={`${t.name} coverage`} segments={coverageSegments(t.coverage).map((s) => ({ ...s, href: undefined }))} />
                      {t.concentration && (
                        <div>
                          <p className="mb-2 text-sm text-ink">{t.concentration.sentence}</p>
                          <NamedShareBar holders={t.concentration.holders} />
                        </div>
                      )}
                    </>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </ResourceView>
    </>
  );
}
```

- [ ] **Step 5: Implement `frontend/features/people/TeamScreen.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourceView } from '@/components/ui/states';
import { fetchTeam } from '@/lib/api/people';
import { plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { HoldingsList, byName } from './HoldingsList';

export function TeamScreen({ id }: { id: string }) {
  const team = useResource(`team:${id}`, () => fetchTeam(id));
  return (
    <ResourceView resource={team}>
      {(d) => (
        <div className="space-y-8">
          <PageHeader title={d.team.name} description={`${plural(d.team.memberCount, 'person', 'people')} · listed alphabetically`} />
          {!d.team.rolledUp && <CoverageStrip coverage={d.team.coverage} />}
          <ul className="space-y-4">
            {byName(d.members).map((m) => (
              <Card as="li" key={m.person.id}>
                <h3 className="font-medium text-ink"><Link href={`/people/${encodeURIComponent(m.person.id)}`} className="hover:underline">{m.person.name}</Link></h3>
                {m.title && <p className="mb-3 text-sm text-ink-3">{m.title}</p>}
                <HoldingsList holdings={m.holdings} />
              </Card>
            ))}
          </ul>
        </div>
      )}
    </ResourceView>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/people/PersonScreen.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourceView } from '@/components/ui/states';
import { fetchPerson } from '@/lib/api/people';
import { plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import { HoldingsList } from './HoldingsList';

export function PersonScreen({ id }: { id: string }) {
  const person = useResource(`person:${id}`, () => fetchPerson(id));
  return (
    <ResourceView resource={person}>
      {(p) => (
        <div className="space-y-6">
          <PageHeader
            title={p.person.name}
            description={<>{p.title}{p.title && p.team ? ' · ' : ''}{p.team && <Link href={`/people/teams/${encodeURIComponent(p.team.id)}`} className="underline">{p.team.name}</Link>}</>}
          />
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-ink">Holdings</h2>
            <HoldingsList holdings={p.holdings} />
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-ink">Open handovers</h2>
              {p.openHandovers.length === 0 ? <p className="text-ink-3">None.</p> : (
                <ul className="space-y-1.5">
                  {p.openHandovers.map((h) => (
                    <li key={h.departureId}>
                      <Link href={`/departures/${encodeURIComponent(h.departureId)}`} className="text-ink hover:underline">
                        Receiving {plural(h.assetCount, 'asset', 'assets')} from {h.from.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-ink">Confirmations</h2>
              <p className="text-ink">{p.pendingConfirmations === 0 ? 'Nothing waiting.' : `${plural(p.pendingConfirmations, 'confirmation', 'confirmations')} waiting`}</p>
            </Card>
          </div>
        </div>
      )}
    </ResourceView>
  );
}
```

- [ ] **Step 7: Replace the three pages**

`frontend/app/(app)/people/page.tsx`:

```tsx
import { TeamsScreen } from '@/features/people/TeamsScreen';

export default function Page() {
  return <TeamsScreen />;
}
```

`frontend/app/(app)/people/teams/[id]/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { TeamScreen } from '@/features/people/TeamScreen';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <TeamScreen id={decodeURIComponent(id)} />;
}
```

`frontend/app/(app)/people/[id]/page.tsx`:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { PersonScreen } from '@/features/people/PersonScreen';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <PersonScreen id={decodeURIComponent(id)} />;
}
```

- [ ] **Step 8: Run the test**

Run: `npm test -- tests/features/people.test.tsx`
Expected: `3 passed`.

- [ ] **Step 9: Commit**

```bash
git add features/people "app/(app)/people" tests/features/people.test.tsx
git commit -m "feat(people): team cards with coverage and named concentration, alphabetical members, person holdings"
```

---

### Task 30: Ask OBA

**Files:**
- Create: `frontend/features/ask/answerLinks.ts`, `frontend/features/ask/AnswerContent.tsx`, `frontend/features/ask/AskScreen.tsx`
- Modify: `frontend/app/(app)/ask/page.tsx` (replace stub)
- Test: `frontend/tests/features/ask.test.tsx`

**Interfaces:**
- Consumes: `fetchConversations`, `fetchConversation`, `sendMessage`, `askOnce` (Task 6); `PENDING_QUESTION_KEY` (Task 16); `GRADE_LABEL` (Task 8); `Button`, `PageHeader` (Task 7); `ErrorState`, `Skeleton` (Task 9); `toApiError` (Task 5); `react-markdown`; `formatRelative` (Task 4).
- Produces: `parseEntityHref(href: string): { kind: 'asset' | 'person'; id: string; grade: EvidenceGrade | null } | null` (X-6 convention); `entityLinkTransform(url: string): string`; `AnswerContent({ message })`; `AskScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/ask.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { renderWithSession } from '../helpers';

vi.mock('@/lib/api/assistant', () => ({ fetchConversations: vi.fn(), fetchConversation: vi.fn(), sendMessage: vi.fn(), askOnce: vi.fn() }));
import * as askApi from '@/lib/api/assistant';
import { parseEntityHref } from '@/features/ask/answerLinks';
import { AskScreen } from '@/features/ask/AskScreen';
import { PENDING_QUESTION_KEY } from '@/components/shell/AskField';

const answer = {
  id: 'm2', role: 'assistant' as const, createdAt: '2026-10-01T09:00:00Z',
  content: 'I found that [Invoice sync](oba://asset/automation%3A41?grade=confirmed) has no backup.',
  sources: [{ label: 'get_failing_checks', detail: 'C1_UNBACKED_CRITICAL on automation:41' }],
};

describe('parseEntityHref', () => {
  it('parses the oba:// convention', () => {
    expect(parseEntityHref('oba://asset/automation%3A41?grade=confirmed')).toEqual({ kind: 'asset', id: 'automation:41', grade: 'confirmed' });
    expect(parseEntityHref('oba://person/person%3Aomar')).toEqual({ kind: 'person', id: 'person:omar', grade: null });
    expect(parseEntityHref('https://example.com')).toBeNull();
  });
});

describe('AskScreen', () => {
  beforeEach(() => {
    vi.mocked(askApi.fetchConversations).mockResolvedValue([{ id: 'cv1', title: 'Invoice backups', updatedAt: '2026-10-01T08:00:00Z' }]);
    vi.mocked(askApi.sendMessage).mockResolvedValue({ conversationId: 'cv2', message: answer });
  });

  it('sends a pending question from the top bar and renders entity chips plus sources', async () => {
    window.sessionStorage.setItem(PENDING_QUESTION_KEY, 'Which critical automations have no backup?');
    renderWithSession(<AskScreen />);
    expect(await screen.findByText('Which critical automations have no backup?')).toBeInTheDocument();
    const chip = await screen.findByRole('link', { name: /Invoice sync/ });
    expect(chip).toHaveAttribute('href', '/assets/automation%3A41');
    expect(within(chip).getByRole('img', { name: 'Confirmed' })).toBeInTheDocument();
    expect(screen.getByText('Sources (1)')).toBeInTheDocument();
    expect(askApi.sendMessage).toHaveBeenCalledWith(null, 'Which critical automations have no backup?');
    expect(window.sessionStorage.getItem(PENDING_QUESTION_KEY)).toBeNull();
  });

  it('falls back to unsaved mode when history is not available', async () => {
    vi.mocked(askApi.fetchConversations).mockRejectedValue(new ApiError(404, 'x', true));
    vi.mocked(askApi.askOnce).mockResolvedValue({ ...answer, sources: [] });
    renderWithSession(<AskScreen />);
    expect(await screen.findByText(/History isn't available on this deployment yet/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Ask OBA' }), 'What depends on OpenAI?{Enter}');
    await waitFor(() => expect(askApi.askOnce).toHaveBeenCalledWith('What depends on OpenAI?'));
  });

  it('opens a past conversation', async () => {
    vi.mocked(askApi.fetchConversation).mockResolvedValue({ conversation: { id: 'cv1', title: 'Invoice backups', updatedAt: '' }, messages: [answer] });
    renderWithSession(<AskScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /Invoice backups/ }));
    expect(await screen.findByRole('link', { name: /Invoice sync/ })).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<AskScreen />);
    await screen.findByRole('button', { name: /Invoice backups/ });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/ask.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/ask/answerLinks.ts`**

```ts
import { defaultUrlTransform } from 'react-markdown';
import type { EvidenceGrade } from '@/types/view';

const GRADES: EvidenceGrade[] = ['stated', 'inferred', 'confirmed', 'unknown'];

/** X-6: assistant links entities as [Name](oba://asset/<id>?grade=<grade>) or oba://person/<id>. */
export function parseEntityHref(href: string): { kind: 'asset' | 'person'; id: string; grade: EvidenceGrade | null } | null {
  const m = /^oba:\/\/(asset|person)\/([^?]+)(?:\?grade=([a-z]+))?$/.exec(href);
  if (!m) return null;
  const grade = m[3] && (GRADES as string[]).includes(m[3]) ? (m[3] as EvidenceGrade) : null;
  return { kind: m[1] as 'asset' | 'person', id: decodeURIComponent(m[2]), grade };
}

export function entityLinkTransform(url: string): string {
  return url.startsWith('oba://') ? url : defaultUrlTransform(url);
}
```

- [ ] **Step 4: Implement `frontend/features/ask/AnswerContent.tsx`**

```tsx
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { GRADE_LABEL } from '@/components/ui/marks';
import { cn } from '@/lib/cn';
import type { ChatMessage, EvidenceGrade } from '@/types/view';
import { entityLinkTransform, parseEntityHref } from './answerLinks';

const DOT: Record<EvidenceGrade, string> = {
  stated: 'bg-ev-stated', inferred: 'bg-ev-inferred', confirmed: 'bg-ev-confirmed', unknown: 'bg-ev-unknown',
};

export function AnswerContent({ message }: { message: ChatMessage }) {
  return (
    <div className="space-y-3 text-ink [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3">
      <ReactMarkdown
        urlTransform={entityLinkTransform}
        components={{
          a: ({ href = '', children }) => {
            const e = parseEntityHref(href);
            if (!e) return <a href={href} className="underline" target="_blank" rel="noreferrer">{children}</a>;
            const to = e.kind === 'asset' ? `/assets/${encodeURIComponent(e.id)}` : `/people/${encodeURIComponent(e.id)}`;
            return (
              <Link href={to} className="mx-0.5 inline-flex items-center gap-1.5 rounded-full border border-rule bg-sunken px-2 py-0.5 text-sm text-ink hover:border-ink-3">
                {e.grade && <span role="img" aria-label={GRADE_LABEL[e.grade]} className={cn('size-2 rounded-full', DOT[e.grade])} />}
                {children}
              </Link>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
      {message.sources.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-2">Sources ({message.sources.length})</summary>
          <ul className="mt-2 space-y-1 text-ink-2">
            {message.sources.map((s, i) => <li key={i}><span className="font-medium text-ink">{s.label}</span>: {s.detail}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement `frontend/features/ask/AskScreen.tsx`**

```tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { PENDING_QUESTION_KEY } from '@/components/shell/AskField';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { askOnce, fetchConversation, fetchConversations, sendMessage } from '@/lib/api/assistant';
import { toApiError, type ApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatRelative } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { ChatMessage } from '@/types/view';
import { AnswerContent } from './AnswerContent';

const EXAMPLES = ['What breaks if the ML team leaves?', 'Which critical automations have no backup?', 'What depends on OpenAI?'];

export function AskScreen() {
  const conversations = useResource('conversations', fetchConversations);
  const unsaved = conversations.status === 'error' && conversations.error.notAvailable;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inputId = useId();
  const sentPending = useRef(false);

  async function send(q: string) {
    const text = q.trim();
    if (!text || thinking) return;
    setError(null);
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', content: text, sources: [], createdAt: new Date().toISOString() }]);
    setThinking(true);
    try {
      if (conversations.status === 'ready') {
        const r = await sendMessage(activeId, text);
        setActiveId(r.conversationId);
        setMessages((m) => [...m, r.message]);
        conversations.reload();
      } else {
        const reply = await askOnce(text);
        setMessages((m) => [...m, reply]);
      }
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setThinking(false);
    }
  }

  useEffect(() => {
    if (sentPending.current || conversations.status === 'loading') return;
    let pending: string | null = null;
    try {
      pending = window.sessionStorage.getItem(PENDING_QUESTION_KEY);
      window.sessionStorage.removeItem(PENDING_QUESTION_KEY);
    } catch { pending = null; }
    sentPending.current = true;
    if (pending) Promise.resolve().then(() => send(pending!));
  });

  async function open(id: string) {
    setError(null);
    try {
      const r = await fetchConversation(id);
      setActiveId(id);
      setMessages(r.messages);
    } catch (e) {
      setError(toApiError(e));
    }
  }

  return (
    <>
      <PageHeader title="Ask OBA" description="Answers come only from OBA's own data, and every claim links to its evidence." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Conversations" className="space-y-2">
          <Button className="w-full" onClick={() => { setActiveId(null); setMessages([]); }}>New conversation</Button>
          {conversations.status === 'loading' && <Skeleton className="h-8" />}
          {unsaved && <p className="text-sm text-ink-3">History isn&apos;t available on this deployment yet. This conversation won&apos;t be saved.</p>}
          {conversations.status === 'error' && !unsaved && <ErrorState error={conversations.error} onRetry={conversations.reload} />}
          {conversations.status === 'ready' && (
            <ul className="space-y-1">
              {conversations.data.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => open(c.id)} aria-current={c.id === activeId ? 'true' : undefined}
                    className={cn('w-full rounded-control px-3 py-2 text-left text-sm', c.id === activeId ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:bg-sunken')}>
                    <span className="block truncate">{c.title}</span>
                    <span className="block text-xs text-ink-3">{formatRelative(c.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section aria-label="Conversation" className="flex min-h-[60vh] flex-col rounded-card border border-rule bg-surface">
          <div className="flex-1 space-y-6 overflow-y-auto p-6" aria-live="polite">
            {messages.length === 0 && !thinking && (
              <div className="space-y-3">
                <p className="text-ink-2">Ask about a person, team, automation or vendor.</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((q) => <Button key={q} size="sm" variant="ghost" onClick={() => send(q)}>{q}</Button>)}
                </div>
              </div>
            )}
            {messages.map((m) => m.role === 'user' ? (
              <div key={m.id} className="ml-auto max-w-[80%] rounded-card bg-sunken px-4 py-3 text-ink">{m.content}</div>
            ) : (
              <div key={m.id} className="max-w-[90%]"><AnswerContent message={m} /></div>
            ))}
            {thinking && <p role="status" className="text-sm text-ink-3">OBA is thinking…</p>}
            {error && <ErrorState error={error} />}
          </div>
          <form className="flex items-end gap-3 border-t border-rule p-4" onSubmit={(e) => { e.preventDefault(); const q = draft; setDraft(''); send(q); }}>
            <label htmlFor={inputId} className="sr-only">Ask OBA</label>
            <textarea id={inputId} rows={2} value={draft} placeholder="Ask OBA about a person, team or automation"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const q = draft; setDraft(''); send(q); } }}
              className="min-h-11 flex-1 resize-none rounded-control border border-rule bg-surface p-3 text-sm text-ink placeholder:text-ink-3" />
            <Button type="submit" variant="primary">Send</Button>
          </form>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Replace `frontend/app/(app)/ask/page.tsx`**

```tsx
import { AskScreen } from '@/features/ask/AskScreen';

export default function Page() {
  return <AskScreen />;
}
```

- [ ] **Step 7: Run the test**

Run: `npm test -- tests/features/ask.test.tsx`
Expected: `5 passed`.

- [ ] **Step 8: Commit**

```bash
git add features/ask "app/(app)/ask/page.tsx" tests/features/ask.test.tsx
git commit -m "feat(ask): Ask OBA page with saved history, evidence chips, sources, unsaved fallback"
```

---
### Task 31: Confirmation form (`/attest/[token]`, phone-first, no login)

**Files:**
- Create: `frontend/features/attest/draft.ts`, `frontend/features/attest/AssetCard.tsx`, `frontend/features/attest/AttestScreen.tsx`
- Modify: `frontend/app/(bare)/attest/[token]/page.tsx` (replace stub)
- Test: `frontend/tests/features/attest-draft.test.ts`, `frontend/tests/features/attest.test.tsx`

**Interfaces:**
- Consumes: `fetchAttestSession`, `saveAttestAnswers`, `loadAttestPeople`, `UnsupportedAnswerError` (Task 6); `ApiError`, `toApiError` (Task 5); `EntityPicker` (Task 13); `Button` (Task 7); `LoadingBlock` (Task 9); `cn`, `plural` (Task 4).
- Produces:
  - `draft.ts`: `interface Draft { isOwner: boolean | null; owner: EntityRef | null; backupKind: 'person' | 'none' | null; backup: EntityRef | null; criticality: 'high' | 'medium' | 'low' | null; reason: string; runbookKind: 'url' | 'not_documented' | null; url: string; fallback: 'yes' | 'no' | 'unknown' | null }`; `EMPTY_DRAFT`; `type DraftField = 'owner' | 'backup' | 'criticality' | 'runbook' | 'fallback'`; `validateDraft(d): { answers: AttestAnswers | null; errors: Partial<Record<DraftField, string>> }`
  - `AssetCard({ session, asset, draft, onDraft, onSaved, onBack })`
  - `AttestScreen({ token })`

- [ ] **Step 1: Write the failing pure test `frontend/tests/features/attest-draft.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, validateDraft } from '@/features/attest/draft';

describe('validateDraft', () => {
  it('reports every unanswered question', () => {
    const { answers, errors } = validateDraft(EMPTY_DRAFT);
    expect(answers).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['backup', 'criticality', 'fallback', 'owner', 'runbook']);
  });

  it('requires a reason, a picked backup person and a full https link', () => {
    const { errors } = validateDraft({
      ...EMPTY_DRAFT, isOwner: true, backupKind: 'person', backup: null, criticality: 'high', reason: ' ',
      runbookKind: 'url', url: 'notion.so/x', fallback: 'no',
    });
    expect(errors).toEqual({ backup: 'Pick a person.', criticality: 'Say why in a few words.', runbook: 'Enter a full link starting with https://.' });
  });

  it('maps a complete draft to answers, keeping "Don\'t know" as unknown', () => {
    const { answers } = validateDraft({
      ...EMPTY_DRAFT, isOwner: true, backupKind: 'none', criticality: 'medium', reason: 'Invoicing runs on it',
      runbookKind: 'not_documented', fallback: 'unknown',
    });
    expect(answers).toEqual({
      isOwner: true, ownerPersonId: null, backup: { kind: 'none' }, criticality: 'medium', criticalityReason: 'Invoicing runs on it',
      runbook: { kind: 'not_documented' }, fallback: 'unknown',
    });
  });
});
```

- [ ] **Step 2: Write the failing screen test `frontend/tests/features/attest.test.tsx`**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { AttestSession } from '@/types/view';

vi.mock('@/lib/api/attest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/attest')>('@/lib/api/attest');
  return { ...actual, fetchAttestSession: vi.fn(), saveAttestAnswers: vi.fn(), loadAttestPeople: vi.fn() };
});
import * as attestApi from '@/lib/api/attest';
import { AttestScreen } from '@/features/attest/AttestScreen';

const session: AttestSession = {
  token: 'tok', legacy: false, reviewer: { name: 'Sara Ali', email: 'sara@acme.com' }, requestedBy: 'Priya Shah',
  company: { name: 'Acme', logoUrl: null }, expired: false, submitted: false,
  assets: [
    { taskId: 't1', asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, status: 'todo' },
    { taskId: 't2', asset: { id: 'automation:7', kind: 'automation', name: 'Slack alerts' }, status: 'saved' },
  ],
};

async function answerAll(fallback: RegExp = /^No$/) {
  const yes = screen.getAllByRole('radio', { name: 'Yes' });
  await userEvent.click(yes[0]);
  await userEvent.click(screen.getByRole('radio', { name: 'No backup' }));
  await userEvent.click(screen.getByRole('radio', { name: 'High' }));
  await userEvent.type(screen.getByRole('textbox', { name: /Why\?/ }), 'Invoicing depends on it');
  await userEvent.click(screen.getByRole('radio', { name: 'Not documented' }));
  await userEvent.click(screen.getAllByRole('radio', { name: fallback })[1] ?? screen.getAllByRole('radio', { name: fallback })[0]);
}

describe('AttestScreen', () => {
  beforeEach(() => {
    vi.mocked(attestApi.fetchAttestSession).mockResolvedValue(session);
    vi.mocked(attestApi.saveAttestAnswers).mockResolvedValue(undefined);
    vi.mocked(attestApi.loadAttestPeople).mockResolvedValue([]);
  });

  it('leads with the customer brand and lists assets with progress', async () => {
    render(<AttestScreen token="tok" />);
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Ownership check requested by Priya Shah')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Confirm 2 automations' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 saved')).toBeInTheDocument();
    expect(screen.getByText('Powered by OBA · Horquva')).toBeInTheDocument();
  });

  it('validates, saves an asset and shows the thank-you state when all are saved', async () => {
    render(<AttestScreen token="tok" />);
    await userEvent.click(await screen.findByRole('button', { name: /Invoice sync/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save and next' }));
    expect(screen.getByText('Choose yes or no.')).toBeInTheDocument();
    expect(attestApi.saveAttestAnswers).not.toHaveBeenCalled();
    await answerAll();
    await userEvent.click(screen.getByRole('button', { name: 'Save and next' }));
    await waitFor(() => expect(attestApi.saveAttestAnswers).toHaveBeenCalledWith(session, 't1', expect.objectContaining({ criticality: 'high', fallback: 'no' })));
    expect(await screen.findByText('Thanks — 2 of 2 confirmed.')).toBeInTheDocument();
  });

  it('shows the legacy "Don\'t know" limitation on the fallback question', async () => {
    vi.mocked(attestApi.saveAttestAnswers).mockImplementation(() => { throw new attestApi.UnsupportedAnswerError('This deployment can’t record “Don’t know” yet.'); });
    render(<AttestScreen token="tok" />);
    await userEvent.click(await screen.findByRole('button', { name: /Invoice sync/ }));
    await answerAll(/Don’t know/);
    await userEvent.click(screen.getByRole('button', { name: 'Save and next' }));
    expect(await screen.findByText(/can’t record “Don’t know” yet/)).toBeInTheDocument();
  });

  it('explains an expired or invalid link', async () => {
    vi.mocked(attestApi.fetchAttestSession).mockRejectedValue(new ApiError(404, 'Review task not found or token expired.'));
    render(<AttestScreen token="bad" />);
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument();
  });

  it('has no axe violations on the asset card', async () => {
    const { container } = render(<AttestScreen token="tok" />);
    await userEvent.click(await screen.findByRole('button', { name: /Invoice sync/ }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 3: Run both to see them fail**

Run: `npm test -- tests/features/attest-draft.test.ts tests/features/attest.test.tsx`
Expected: FAIL, cannot resolve `@/features/attest/draft`.

- [ ] **Step 4: Implement `frontend/features/attest/draft.ts`**

```ts
import type { AttestAnswers, EntityRef } from '@/types/view';

export interface Draft {
  isOwner: boolean | null;
  owner: EntityRef | null;
  backupKind: 'person' | 'none' | null;
  backup: EntityRef | null;
  criticality: 'high' | 'medium' | 'low' | null;
  reason: string;
  runbookKind: 'url' | 'not_documented' | null;
  url: string;
  fallback: 'yes' | 'no' | 'unknown' | null;
}

export const EMPTY_DRAFT: Draft = {
  isOwner: null, owner: null, backupKind: null, backup: null, criticality: null, reason: '', runbookKind: null, url: '', fallback: null,
};

export type DraftField = 'owner' | 'backup' | 'criticality' | 'runbook' | 'fallback';

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateDraft(d: Draft): { answers: AttestAnswers | null; errors: Partial<Record<DraftField, string>> } {
  const errors: Partial<Record<DraftField, string>> = {};
  if (d.isOwner === null) errors.owner = 'Choose yes or no.';
  if (d.backupKind === null) errors.backup = 'Choose a backup or “No backup”.';
  else if (d.backupKind === 'person' && !d.backup) errors.backup = 'Pick a person.';
  if (d.criticality === null) errors.criticality = 'Choose how critical this is.';
  else if (!d.reason.trim()) errors.criticality = 'Say why in a few words.';
  if (d.runbookKind === null) errors.runbook = 'Add a link or choose “Not documented”.';
  else if (d.runbookKind === 'url' && !isHttpUrl(d.url)) errors.runbook = 'Enter a full link starting with https://.';
  if (d.fallback === null) errors.fallback = 'Choose yes, no or don’t know.';
  if (Object.keys(errors).length > 0) return { answers: null, errors };
  return {
    errors,
    answers: {
      isOwner: d.isOwner!,
      ownerPersonId: d.isOwner ? null : d.owner?.id ?? null,
      backup: d.backupKind === 'person' ? { kind: 'person', personId: d.backup!.id } : { kind: 'none' },
      criticality: d.criticality!,
      criticalityReason: d.reason.trim(),
      runbook: d.runbookKind === 'url' ? { kind: 'url', url: d.url.trim() } : { kind: 'not_documented' },
      fallback: d.fallback!,
    },
  };
}
```

- [ ] **Step 5: Implement `frontend/features/attest/AssetCard.tsx`**

```tsx
'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { UnsupportedAnswerError, loadAttestPeople, saveAttestAnswers } from '@/lib/api/attest';
import { toApiError } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import type { AttestAsset, AttestSession } from '@/types/view';
import { validateDraft, type Draft, type DraftField } from './draft';

function Choice({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-4 py-2 text-ink',
      checked ? 'border-amber bg-amber/10' : 'border-rule bg-surface')}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

function Question({ n, title, error, children }: { n: number; title: string; error?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2" aria-invalid={!!error}>
      <legend className="mb-2 font-medium text-ink">{n}. {title}</legend>
      {children}
      {error && <p role="alert" className="text-sm text-st-fail">{error}</p>}
    </fieldset>
  );
}

export function AssetCard({ session, asset, draft, onDraft, onSaved, onBack }: {
  session: AttestSession;
  asset: AttestAsset;
  draft: Draft;
  onDraft: (d: Draft) => void;
  onSaved: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<DraftField | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);
  const base = useId();
  const reasonId = `${base}-reason`;
  const urlId = `${base}-url`;
  const set = (patch: Partial<Draft>) => onDraft({ ...draft, ...patch });
  const people = () => loadAttestPeople(session);

  async function save() {
    const { answers, errors: e } = validateDraft(draft);
    setErrors(e);
    if (!answers) return;
    setSaving(true);
    try {
      await saveAttestAnswers(session, asset.taskId, answers);
      onSaved();
    } catch (err) {
      if (err instanceof UnsupportedAnswerError) setErrors({ fallback: err.message });
      else setErrors({ submit: toApiError(err).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-2 underline">Back to the list</button>
        <h1 className="mt-3 text-2xl font-semibold text-ink">{asset.asset.name}</h1>
      </div>

      <Question n={1} title="Do you still own this?" error={errors.owner}>
        <Choice name={`${base}-own`} checked={draft.isOwner === true} onChange={() => set({ isOwner: true, owner: null })}>Yes</Choice>
        <Choice name={`${base}-own`} checked={draft.isOwner === false} onChange={() => set({ isOwner: false })}>No</Choice>
        {draft.isOwner === false && (
          <EntityPicker label="Who owns it? (optional)" kinds={['person']} value={draft.owner} load={people} onChange={(p) => set({ owner: p })} />
        )}
      </Question>

      <Question n={2} title="Who's your backup?" error={errors.backup}>
        <Choice name={`${base}-backup`} checked={draft.backupKind === 'person'} onChange={() => set({ backupKind: 'person' })}>A person</Choice>
        {draft.backupKind === 'person' && (
          <EntityPicker label="Backup" kinds={['person']} value={draft.backup} load={people} onChange={(p) => set({ backup: p })} />
        )}
        <Choice name={`${base}-backup`} checked={draft.backupKind === 'none'} onChange={() => set({ backupKind: 'none', backup: null })}>No backup</Choice>
      </Question>

      <Question n={3} title="How critical is this?" error={errors.criticality}>
        {(['high', 'medium', 'low'] as const).map((c) => (
          <Choice key={c} name={`${base}-crit`} checked={draft.criticality === c} onChange={() => set({ criticality: c })}>
            {c[0].toUpperCase() + c.slice(1)}
          </Choice>
        ))}
        <label htmlFor={reasonId} className="mt-2 block text-sm font-medium text-ink">Why? (one line)</label>
        <input id={reasonId} value={draft.reason} onChange={(e) => set({ reason: e.target.value })}
          placeholder="Invoicing runs on it every day" className="h-11 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3" />
      </Question>

      <Question n={4} title="Where's the runbook?" error={errors.runbook}>
        <Choice name={`${base}-runbook`} checked={draft.runbookKind === 'url'} onChange={() => set({ runbookKind: 'url' })}>Here's the link</Choice>
        {draft.runbookKind === 'url' && (
          <>
            <label htmlFor={urlId} className="sr-only">Runbook link</label>
            <input id={urlId} type="url" inputMode="url" value={draft.url} onChange={(e) => set({ url: e.target.value })}
              placeholder="https://notion.so/acme/invoice-runbook" className="h-11 w-full rounded-control border border-rule bg-surface px-3 text-ink placeholder:text-ink-3" />
          </>
        )}
        <Choice name={`${base}-runbook`} checked={draft.runbookKind === 'not_documented'} onChange={() => set({ runbookKind: 'not_documented', url: '' })}>Not documented</Choice>
      </Question>

      <Question n={5} title="Is there a fallback if this stops?" error={errors.fallback}>
        <Choice name={`${base}-fallback`} checked={draft.fallback === 'yes'} onChange={() => set({ fallback: 'yes' })}>Yes</Choice>
        <Choice name={`${base}-fallback`} checked={draft.fallback === 'no'} onChange={() => set({ fallback: 'no' })}>No</Choice>
        <Choice name={`${base}-fallback`} checked={draft.fallback === 'unknown'} onChange={() => set({ fallback: 'unknown' })}>Don’t know</Choice>
      </Question>

      {errors.submit && <p role="alert" className="text-sm text-st-fail">{errors.submit}</p>}
      <Button type="submit" variant="primary" disabled={saving} className="h-12 w-full">Save and next</Button>
    </form>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/attest/AttestScreen.tsx`**

```tsx
'use client';

import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { fetchAttestSession } from '@/lib/api/attest';
import { cn } from '@/lib/cn';
import { plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { AttestSession } from '@/types/view';
import { AssetCard } from './AssetCard';
import { EMPTY_DRAFT, type Draft } from './draft';

function Frame({ session, children }: { session: AttestSession | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
      <header className="mb-8 flex items-center gap-3">
        {session?.company?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- customer-supplied logo on an arbitrary host
          <img src={session.company.logoUrl} alt="" className="size-8 rounded-control object-contain" />
        )}
        <div>
          {session?.company && <p className="font-semibold text-ink">{session.company.name}</p>}
          {session?.requestedBy && <p className="text-sm text-ink-2">Ownership check requested by {session.requestedBy}</p>}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-12 text-center text-xs text-ink-3">Powered by OBA · Horquva</footer>
    </div>
  );
}

export function AttestScreen({ token }: { token: string }) {
  const res = useResource(`attest:${token}`, () => fetchAttestSession(token));
  const [openTask, setOpenTask] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, true>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  if (res.status === 'loading') return <Frame session={null}><LoadingBlock /></Frame>;

  const expiredView = (by: string | null) => (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-ink">This link has expired</h1>
      <p className="text-ink-2">{by ? `Ask ${by} for a new one.` : 'Ask the person who sent it for a new one.'}</p>
    </div>
  );

  if (res.status === 'error') {
    const expired = res.error.status === 404 || res.error.status === 410;
    return (
      <Frame session={null}>
        {expired ? expiredView(null) : (
          <div role="alert" className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink">We couldn&apos;t load this check</h1>
            <p className="text-ink-2">{res.error.message}</p>
          </div>
        )}
      </Frame>
    );
  }

  const s = res.data;
  if (s.expired) return <Frame session={s}>{expiredView(s.requestedBy)}</Frame>;

  const assets = s.assets.map((a) => (saved[a.taskId] ? { ...a, status: 'saved' as const } : a));
  const done = assets.filter((a) => a.status === 'saved').length;
  const allAutomations = assets.every((a) => a.asset.kind === 'automation');
  const noun = allAutomations ? ['automation', 'automations'] as const : ['asset', 'assets'] as const;

  if (s.submitted || done === assets.length) {
    return (
      <Frame session={s}>
        <div className="space-y-3 text-center">
          <CircleCheck aria-hidden className="mx-auto size-10 text-st-pass" />
          <h1 className="text-2xl font-semibold text-ink">Thanks — {done} of {assets.length} confirmed.</h1>
          <p className="text-ink-2">You can close this page.</p>
        </div>
      </Frame>
    );
  }

  const current = assets.find((a) => a.taskId === openTask);
  if (current) {
    return (
      <Frame session={s}>
        <AssetCard
          session={s}
          asset={current}
          draft={drafts[current.taskId] ?? EMPTY_DRAFT}
          onDraft={(d) => setDrafts((m) => ({ ...m, [current.taskId]: d }))}
          onBack={() => setOpenTask(null)}
          onSaved={() => {
            setSaved((m) => ({ ...m, [current.taskId]: true }));
            const next = assets.find((a) => a.status === 'todo' && a.taskId !== current.taskId);
            setOpenTask(next?.taskId ?? null);
          }}
        />
      </Frame>
    );
  }

  return (
    <Frame session={s}>
      <h1 className="text-2xl font-semibold text-ink">Confirm {plural(assets.length, noun[0], noun[1])}</h1>
      <p className="mt-1 text-ink-2">About 1 minute each. Your answers save as you go, so you can come back to this link.</p>
      <p className="mt-4 text-sm font-medium tabular-nums text-ink">{done} of {assets.length} saved</p>
      <ul className="mt-4 space-y-2">
        {assets.map((a) => (
          <li key={a.taskId}>
            <button type="button" onClick={() => setOpenTask(a.taskId)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control border border-rule bg-surface px-4 text-left">
              <span className="text-ink">{a.asset.name}</span>
              <span className={cn('text-sm', a.status === 'saved' ? 'text-st-pass' : 'text-ink-3')}>{a.status === 'saved' ? 'Saved' : 'To do'}</span>
            </button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}
```

- [ ] **Step 7: Replace `frontend/app/(bare)/attest/[token]/page.tsx`**

```tsx
'use client';

import { useParams } from 'next/navigation';
import { AttestScreen } from '@/features/attest/AttestScreen';

export default function Page() {
  const { token } = useParams<{ token: string }>();
  return <AttestScreen token={decodeURIComponent(token)} />;
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test -- tests/features/attest-draft.test.ts tests/features/attest.test.tsx`
Expected: `8 passed`.

- [ ] **Step 9: Commit**

```bash
git add features/attest "app/(bare)/attest" tests/features/attest-draft.test.ts tests/features/attest.test.tsx
git commit -m "feat(attest): phone-first multi-asset confirmation form with save-as-you-go and honest Don't-know"
```

---

### Task 32: Reviewer app (`/my`)

**Files:**
- Create: `frontend/features/reviewer/ReviewerShell.tsx`, `frontend/features/reviewer/MyScreen.tsx`, `frontend/app/(reviewer)/layout.tsx`
- Modify: `frontend/app/(reviewer)/my/page.tsx` (replace stub)
- Test: `frontend/tests/features/reviewer.test.tsx`

**Interfaces:**
- Consumes: `fetchReviewerTasks`, `acceptHandover`, `declineHandover` (Task 6); `SessionProvider`, `useSession` (Task 14); `Brand` (Task 15), `UserMenu` (Task 15); `Card`, `Button`, `ButtonLink` (Task 7); `CriticalityDots` (Task 8); `Drawer` (Task 12); `ResourceView`, `EmptyState`, `Skeleton` (Task 9); `useToast` (Task 9); `formatDate`, `plural` (Task 4).
- Produces: `ReviewerShell({ children })`; `MyScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/reviewer.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, renderWithSession } from '../helpers';

vi.mock('@/lib/api/reviewer', () => ({ fetchReviewerTasks: vi.fn(), acceptHandover: vi.fn(), declineHandover: vi.fn() }));
import * as reviewerApi from '@/lib/api/reviewer';
import { MyScreen } from '@/features/reviewer/MyScreen';

const REVIEWER = { ...ADMIN, role: 'reviewer' as const, name: 'Yuki Tanaka' };

describe('MyScreen', () => {
  beforeEach(() => {
    vi.mocked(reviewerApi.fetchReviewerTasks).mockResolvedValue({
      confirmations: [{ token: 'tok1', campaignName: 'Q4 ownership', assetCount: 3, dueDate: '2026-10-08' }],
      handovers: [{ id: 'h1', from: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, assets: [
        { asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, criticality: 'critical', runbookUrl: null, credentialNote: 'Uses Omar’s Stripe key' },
      ] }],
    });
    vi.mocked(reviewerApi.acceptHandover).mockResolvedValue(undefined);
    vi.mocked(reviewerApi.declineHandover).mockResolvedValue(undefined);
  });

  it('lists confirmations and handovers and accepts a handover', async () => {
    renderWithSession(<MyScreen />, REVIEWER);
    expect(await screen.findByRole('link', { name: 'Start' })).toHaveAttribute('href', '/attest/tok1');
    const handover = screen.getByRole('article', { name: 'Omar Haddad is handing you 1 asset' });
    expect(within(handover).getByText('No runbook on record')).toBeInTheDocument();
    await userEvent.click(within(handover).getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(reviewerApi.acceptHandover).toHaveBeenCalledWith('h1'));
  });

  it('declining requires a reason', async () => {
    renderWithSession(<MyScreen />, REVIEWER);
    await userEvent.click(await screen.findByRole('button', { name: "I can't take this" }));
    const sheet = screen.getByRole('dialog', { name: "Decline Omar Haddad's handover" });
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send' }));
    expect(within(sheet).getByText('Say why, so the manager can pick someone else.')).toBeInTheDocument();
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Reason' }), 'On leave in November');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(reviewerApi.declineHandover).toHaveBeenCalledWith('h1', 'On leave in November'));
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<MyScreen />, REVIEWER);
    await screen.findByRole('link', { name: 'Start' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/reviewer.test.tsx`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement `frontend/features/reviewer/ReviewerShell.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Brand } from '@/components/shell/Brand';
import { UserMenu } from '@/components/shell/UserMenu';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { useSession } from '@/lib/session';

export function ReviewerShell({ children }: { children: ReactNode }) {
  const state = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'signed_out') router.replace('/sign-in');
  }, [state.status, router]);

  if (state.status === 'error' && state.error) return <main className="mx-auto max-w-lg p-8"><ErrorState error={state.error} /></main>;
  if (state.status !== 'ready') return <div role="status" aria-label="Loading" className="p-8"><Skeleton className="h-6 w-48" /></div>;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-rule px-4 md:px-8">
        <Brand />
        <UserMenu variant="compact" />
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Implement `frontend/features/reviewer/MyScreen.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { CriticalityDots } from '@/components/ui/marks';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { acceptHandover, declineHandover, fetchReviewerTasks } from '@/lib/api/reviewer';
import { formatDate, plural } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { ReviewerTasks } from '@/types/view';

type Handover = ReviewerTasks['handovers'][number];

function DeclineSheet({ h, onClose, onDone }: { h: Handover; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  async function send() {
    if (!reason.trim()) { setError('Say why, so the manager can pick someone else.'); return; }
    try { await declineHandover(h.id, reason.trim()); onDone(); } catch (e) { setError(toApiError(e).message); }
  }
  return (
    <Drawer open onClose={onClose} size="md" title={`Decline ${h.from.name}'s handover`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={send}>Send</Button></>}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">Reason</label>
      <textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-control border border-rule bg-surface p-3 text-sm text-ink" />
      {error && <p role="alert" className="mt-2 text-sm text-st-fail">{error}</p>}
    </Drawer>
  );
}

export function MyScreen() {
  const tasks = useResource('my-tasks', fetchReviewerTasks);
  const [declining, setDeclining] = useState<Handover | null>(null);
  const toast = useToast();

  return (
    <>
      <h1 className="font-serif text-[40px] leading-[1.1] text-ink">Your confirmations and handovers</h1>
      <div className="mt-8">
        <ResourceView
          resource={tasks}
          isEmpty={(t) => t.confirmations.length === 0 && t.handovers.length === 0}
          empty={<EmptyState title="You're all caught up" body="Nothing is waiting for you." />}
        >
          {(t) => (
            <div className="space-y-10">
              {t.confirmations.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-ink">Confirmations</h2>
                  <ul className="space-y-3">
                    {t.confirmations.map((c) => (
                      <Card as="li" key={c.token} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-ink">{c.campaignName}</p>
                          <p className="text-sm text-ink-3">{plural(c.assetCount, 'asset', 'assets')} · due {formatDate(c.dueDate)}</p>
                        </div>
                        <ButtonLink variant="primary" href={`/attest/${encodeURIComponent(c.token)}`}>Start</ButtonLink>
                      </Card>
                    ))}
                  </ul>
                </section>
              )}
              {t.handovers.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold text-ink">Handovers</h2>
                  <div className="space-y-4">
                    {t.handovers.map((h) => {
                      const title = `${h.from.name} is handing you ${plural(h.assets.length, 'asset', 'assets')}`;
                      return (
                        <Card as="article" key={h.id} aria-label={title}>
                          <h3 className="font-medium text-ink">{title}</h3>
                          <ul className="mt-3 divide-y divide-rule">
                            {h.assets.map((a) => (
                              <li key={a.asset.id} className="space-y-1 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-ink">{a.asset.name}</span>
                                  <CriticalityDots level={a.criticality} />
                                </div>
                                <p className="text-sm text-ink-2">
                                  {a.runbookUrl ? <a href={a.runbookUrl} className="underline" target="_blank" rel="noreferrer">Runbook</a> : 'No runbook on record'}
                                  {a.credentialNote ? ` · ${a.credentialNote}` : ''}
                                </p>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button variant="primary" onClick={async () => {
                              try { await acceptHandover(h.id); toast.show('Handover accepted'); tasks.reload(); }
                              catch (e) { toast.show(toApiError(e).message); }
                            }}>Accept</Button>
                            <Button onClick={() => setDeclining(h)}>I can&apos;t take this</Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </ResourceView>
      </div>
      {declining && <DeclineSheet h={declining} onClose={() => setDeclining(null)} onDone={() => { setDeclining(null); toast.show('Sent'); tasks.reload(); }} />}
    </>
  );
}
```

- [ ] **Step 5: Create `frontend/app/(reviewer)/layout.tsx` and replace `frontend/app/(reviewer)/my/page.tsx`**

```tsx
import { ReviewerShell } from '@/features/reviewer/ReviewerShell';
import { SessionProvider } from '@/lib/session';

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><ReviewerShell>{children}</ReviewerShell></SessionProvider>;
}
```

```tsx
import { MyScreen } from '@/features/reviewer/MyScreen';

export default function Page() {
  return <MyScreen />;
}
```

- [ ] **Step 6: Run the test**

Run: `npm test -- tests/features/reviewer.test.tsx`
Expected: `3 passed`.

- [ ] **Step 7: Commit**

```bash
git add features/reviewer "app/(reviewer)" tests/features/reviewer.test.tsx
git commit -m "feat(reviewer): slim /my app for confirmations and successor acceptance"
```

---

### Task 33: Settings shell, Connections and the n8n Ownership Check

**Files:**
- Modify: `frontend/lib/api/settings.ts` (add connection create/update/delete and CSV upload)
- Create: `frontend/features/settings/SettingsNav.tsx`, `frontend/features/settings/connectionFields.ts`, `frontend/features/settings/ConnectionSheets.tsx`, `frontend/features/settings/ConnectionsScreen.tsx`, `frontend/features/settings/N8nCheckScreen.tsx`, `frontend/app/(app)/settings/layout.tsx`
- Modify: `frontend/app/(app)/settings/connections/page.tsx`, `frontend/app/(app)/settings/connections/n8n-check/page.tsx` (replace stubs)
- Test: `frontend/tests/features/connections.test.tsx`, `frontend/tests/features/n8n-check.test.tsx`

**Interfaces:**
- Consumes: `fetchConnections`, `syncConnection`, `runN8nCheck` (Task 6); `request`, `apiUrl`, `ApiError`, `toApiError` (Task 5); `fetchNavCounts` (Task 6); `Card`, `Button`, `ButtonLink`, `PageHeader` (Task 7); `Drawer` (Task 12); `ResourceView`, `EmptyState`, `ErrorState`, `LoadingBlock` (Task 9); `useToast` (Task 9); `Can` (Task 14); `formatDateTime`, `formatRelative`, `formatNumber` (Task 4).
- Produces:
  - In `lib/api/settings.ts`: `createConnection(type: Exclude<ConnectionType, 'csv'>, name: string, config: Record<string, string>): Promise<void>`; `updateConnection(id, patch: { name?: string; config?: Record<string, string> }): Promise<void>`; `deleteConnection(id): Promise<void>`; `uploadCsv(file: File): Promise<void>` (all planned, B-17)
  - `CONNECTION_FIELDS`, `CONNECTION_LABEL`, `CSV_TEMPLATE_HEADERS`; `SettingsNav()`; `AddConnectionSheet({ initialType, onClose, onDone })`; `EditConnectionSheet`; `DisconnectSheet`; `ConnectionsScreen()`; `N8nCheckScreen()`

- [ ] **Step 1: Append to `frontend/lib/api/settings.ts`**

```ts
import { ApiError, apiUrl } from './client';
import type { ConnectionType } from '@/types/view';

export function createConnection(type: Exclude<ConnectionType, 'csv'>, name: string, config: Record<string, string>): Promise<void> {
  return request<void>('/api/connections', { method: 'POST', body: JSON.stringify({ type, name, config }) }); // (planned) B-17
}

export function updateConnection(id: string, patch: { name?: string; config?: Record<string, string> }): Promise<void> {
  return request<void>(`/api/connections/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }); // (planned) B-17
}

export function deleteConnection(id: string): Promise<void> {
  return request<void>(`/api/connections/${encodeURIComponent(id)}`, { method: 'DELETE' }); // (planned) B-17
}

/** Multipart upload; cannot use request() because it forces a JSON content type. (planned) B-17 */
export async function uploadCsv(file: File): Promise<void> {
  const body = new FormData();
  body.append('file', file);
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/connections/csv'), { method: 'POST', body, credentials: 'include' });
  } catch {
    throw new ApiError(0, "We couldn't reach OBA.");
  }
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, b?.error ?? `Request failed (${res.status}).`, res.status === 404 && !b);
  }
}
```

(Merge the new `import` names into the file's existing import lines rather than adding duplicate import statements.)

- [ ] **Step 2: Write the failing test `frontend/tests/features/connections.test.tsx`**

```tsx
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nav } from '../mocks/navigation';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';

vi.mock('@/lib/api/settings', () => ({
  fetchConnections: vi.fn(), syncConnection: vi.fn(), createConnection: vi.fn(), updateConnection: vi.fn(), deleteConnection: vi.fn(), uploadCsv: vi.fn(),
}));
import * as settingsApi from '@/lib/api/settings';
import { ConnectionsScreen } from '@/features/settings/ConnectionsScreen';

describe('ConnectionsScreen', () => {
  beforeEach(() => {
    nav.pathname = '/settings/connections';
    vi.mocked(settingsApi.fetchConnections).mockResolvedValue([
      { id: 'c1', type: 'n8n', name: 'n8n production', status: 'healthy', lastSyncAt: '2026-10-01T08:42:00Z', itemsSynced: 128, lastError: null, secretHint: '3f9a' },
      { id: 'c2', type: 'entra', name: 'Entra ID', status: 'failed', lastSyncAt: null, itemsSynced: null, lastError: 'The client secret has expired.', secretHint: null },
    ]);
    vi.mocked(settingsApi.createConnection).mockResolvedValue(undefined);
    vi.mocked(settingsApi.syncConnection).mockResolvedValue(undefined);
  });

  it('shows status, last error in plain words and the secret hint only', async () => {
    renderWithSession(<ConnectionsScreen />, ADMIN);
    const n8n = await screen.findByRole('article', { name: 'n8n production' });
    expect(within(n8n).getByText('Healthy')).toBeInTheDocument();
    expect(within(n8n).getByText('Key ending …3f9a')).toBeInTheDocument();
    expect(within(n8n).getByRole('link', { name: 'Run quick check' })).toHaveAttribute('href', '/settings/connections/n8n-check');
    const entra = screen.getByRole('article', { name: 'Entra ID' });
    expect(within(entra).getByText('The client secret has expired.')).toBeInTheDocument();
    expect(within(entra).getByText('Never synced')).toBeInTheDocument();
  });

  it('viewers can read but not change connections', async () => {
    renderWithSession(<ConnectionsScreen />, VIEWER);
    await screen.findByRole('article', { name: 'n8n production' });
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add connection' })).toBeNull();
  });

  it('?add=n8n opens the add sheet with n8n fields and creates the connection', async () => {
    nav.search = 'add=n8n';
    renderWithSession(<ConnectionsScreen />, ADMIN);
    const sheet = await screen.findByRole('dialog', { name: 'Add connection' });
    await userEvent.type(within(sheet).getByLabelText('n8n URL'), 'https://n8n.acme.com');
    await userEvent.type(within(sheet).getByLabelText('API key'), 'secret');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Connect' }));
    await waitFor(() => expect(settingsApi.createConnection).toHaveBeenCalledWith('n8n', 'n8n', { baseUrl: 'https://n8n.acme.com', apiKey: 'secret' }));
  });

  it('has no axe violations', async () => {
    const { container } = renderWithSession(<ConnectionsScreen />, ADMIN);
    await screen.findByRole('article', { name: 'n8n production' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 3: Write the failing test `frontend/tests/features/n8n-check.test.tsx`**

```tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { renderWithSession } from '../helpers';

vi.mock('@/lib/api/settings', () => ({ runN8nCheck: vi.fn() }));
import * as settingsApi from '@/lib/api/settings';
import { N8nCheckScreen } from '@/features/settings/N8nCheckScreen';

describe('N8nCheckScreen', () => {
  it('discloses read-only handling, runs, clears the key and shows counted lists honestly', async () => {
    vi.mocked(settingsApi.runN8nCheck).mockResolvedValue({
      scannedAt: '2026-10-01T09:00:00Z', summary: { totalWorkflows: 42, totalUsers: 7, totalCredentials: 12, aiIntegrationsCount: 5 },
      singleOwner: [{ id: 'w1', name: 'Invoice sync', detail: 'Owned only by Omar Haddad' }], personalCredential: [], failing: null, abandoned: null,
    });
    const { container } = renderWithSession(<N8nCheckScreen />);
    expect(screen.getByText('Read-only. The key is held in memory for this scan only and never saved.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('n8n URL'), 'https://n8n.acme.com');
    await userEvent.type(screen.getByLabelText('API key'), 'k');
    await userEvent.click(screen.getByRole('button', { name: 'Run check' }));
    expect(await screen.findByText('Invoice sync')).toBeInTheDocument();
    expect(settingsApi.runN8nCheck).toHaveBeenCalledWith('https://n8n.acme.com', 'k');
    expect(screen.getByLabelText('API key')).toHaveValue('');
    expect(screen.getByText('None found.')).toBeInTheDocument();
    expect(screen.getAllByText('Not available on this deployment yet.')).toHaveLength(2);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the error from n8n', async () => {
    vi.mocked(settingsApi.runN8nCheck).mockRejectedValue(new ApiError(401, 'Failed to authenticate with n8n instance. Check your URL and API Key.'));
    renderWithSession(<N8nCheckScreen />);
    await userEvent.type(screen.getByLabelText('n8n URL'), 'https://n8n.acme.com');
    await userEvent.type(screen.getByLabelText('API key'), 'k');
    await userEvent.click(screen.getByRole('button', { name: 'Run check' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Failed to authenticate'));
  });
});
```

- [ ] **Step 4: Run both to see them fail**

Run: `npm test -- tests/features/connections.test.tsx tests/features/n8n-check.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 5: Implement `frontend/features/settings/connectionFields.ts`**

```ts
import type { ConnectionType } from '@/types/view';

export interface ConnectionField { key: string; label: string; secret?: boolean; multiline?: boolean; placeholder?: string }

export const CONNECTION_LABEL: Record<ConnectionType, string> = {
  n8n: 'n8n', entra: 'Microsoft Entra ID', google: 'Google Workspace', openai: 'OpenAI', anthropic: 'Anthropic', csv: 'CSV import',
};

/** Field keys are the B-17 contract the backend reads from `config`. */
export const CONNECTION_FIELDS: Record<Exclude<ConnectionType, 'csv'>, ConnectionField[]> = {
  n8n: [
    { key: 'baseUrl', label: 'n8n URL', placeholder: 'https://n8n.yourcompany.com' },
    { key: 'apiKey', label: 'API key', secret: true },
  ],
  entra: [
    { key: 'tenantId', label: 'Tenant ID' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client secret', secret: true },
  ],
  google: [
    { key: 'adminEmail', label: 'Admin email to act as', placeholder: 'admin@yourcompany.com' },
    { key: 'serviceAccountJson', label: 'Service account key (JSON)', secret: true, multiline: true },
  ],
  openai: [{ key: 'adminKey', label: 'Admin API key', secret: true }],
  anthropic: [{ key: 'adminKey', label: 'Admin API key', secret: true }],
};

/** WBS 2.7.2 template headers. */
export const CSV_TEMPLATE_HEADERS = [
  'asset_id', 'asset_name', 'asset_type', 'owner_email', 'backup_email', 'criticality',
  'is_documented', 'runbook_url', 'fallback_exists', 'depends_on_ids',
];
```

- [ ] **Step 6: Implement `frontend/features/settings/ConnectionSheets.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { createConnection, deleteConnection, updateConnection, uploadCsv } from '@/lib/api/settings';
import type { ConnectionType, ConnectionView } from '@/types/view';
import { CONNECTION_FIELDS, CONNECTION_LABEL, CSV_TEMPLATE_HEADERS, type ConnectionField } from './connectionFields';

const INPUT = 'w-full rounded-control border border-rule bg-surface px-3 text-sm text-ink placeholder:text-ink-3';

function Field({ f, value, onChange }: { f: ConnectionField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">{f.label}</label>
      {f.multiline
        ? <textarea id={id} rows={5} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} py-2 font-mono`} />
        : <input id={id} type={f.secret ? 'password' : 'text'} autoComplete="off" value={value} placeholder={f.placeholder}
            onChange={(e) => onChange(e.target.value)} className={`${INPUT} h-10`} />}
    </div>
  );
}

export function AddConnectionSheet({ initialType, onClose, onDone }: { initialType: ConnectionType; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<ConnectionType>(initialType);
  const [values, setValues] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const typeId = useId();
  const fileId = useId();

  async function connect() {
    setError(null);
    try {
      if (type === 'csv') {
        if (!file) { setError('Choose a CSV file.'); return; }
        await uploadCsv(file);
      } else {
        const fields = CONNECTION_FIELDS[type];
        const missing = fields.find((f) => !values[f.key]?.trim());
        if (missing) { setError(`Fill in ${missing.label}.`); return; }
        await createConnection(type, CONNECTION_LABEL[type], Object.fromEntries(fields.map((f) => [f.key, values[f.key].trim()])));
      }
      toast.show(`${CONNECTION_LABEL[type]} connected`);
      onDone();
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  return (
    <Drawer open onClose={onClose} size="md" title="Add connection"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={connect}>Connect</Button></>}>
      <div className="space-y-4">
        <div>
          <label htmlFor={typeId} className="mb-1 block text-sm font-medium text-ink">Source</label>
          <select id={typeId} value={type} onChange={(e) => { setType(e.target.value as ConnectionType); setValues({}); }} className={`${INPUT} h-10`}>
            {(Object.keys(CONNECTION_LABEL) as ConnectionType[]).map((t) => <option key={t} value={t}>{CONNECTION_LABEL[t]}</option>)}
          </select>
        </div>
        {type === 'csv' ? (
          <div>
            <label htmlFor={fileId} className="mb-1 block text-sm font-medium text-ink">CSV file</label>
            <input id={fileId} type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm text-ink" />
            <p className="mt-2 text-xs text-ink-3">Columns: {CSV_TEMPLATE_HEADERS.join(', ')}</p>
          </div>
        ) : CONNECTION_FIELDS[type].map((f) => (
          <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={(v) => setValues((m) => ({ ...m, [f.key]: v }))} />
        ))}
        {type !== 'csv' && <p className="text-xs text-ink-3">OBA only reads. Secrets are stored encrypted and never shown again.</p>}
        {error && <p role="alert" className="text-sm text-st-fail">{error}</p>}
      </div>
    </Drawer>
  );
}

export function EditConnectionSheet({ c, onClose, onDone }: { c: ConnectionView; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(c.name);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const nameId = useId();
  const secretFields = c.type === 'csv' ? [] : CONNECTION_FIELDS[c.type].filter((f) => f.secret);

  async function save() {
    try {
      const config = Object.fromEntries(Object.entries(secrets).filter(([, v]) => v.trim()));
      await updateConnection(c.id, { name: name.trim() || c.name, ...(Object.keys(config).length ? { config } : {}) });
      toast.show('Connection updated');
      onDone();
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  return (
    <Drawer open onClose={onClose} size="md" title={`Edit ${c.name}`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <div>
          <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-ink">Name</label>
          <input id={nameId} value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} h-10`} />
        </div>
        {secretFields.map((f) => (
          <Field key={f.key} f={{ ...f, label: `Replace ${f.label.toLowerCase()}` }} value={secrets[f.key] ?? ''}
            onChange={(v) => setSecrets((m) => ({ ...m, [f.key]: v }))} />
        ))}
        {error && <p role="alert" className="text-sm text-st-fail">{error}</p>}
      </div>
    </Drawer>
  );
}

export function DisconnectSheet({ c, onClose, onDone }: { c: ConnectionView; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  async function confirm() {
    try { await deleteConnection(c.id); toast.show(`${c.name} disconnected`); onDone(); }
    catch (e) { setError(toApiError(e).message); }
  }
  return (
    <Drawer open onClose={onClose} size="md" title={`Disconnect ${c.name}?`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={confirm}>Disconnect</Button></>}>
      <p className="text-ink-2">OBA will stop syncing from {c.name}.</p>
      {error && <p role="alert" className="mt-3 text-sm text-st-fail">{error}</p>}
    </Drawer>
  );
}
```

- [ ] **Step 7: Implement `frontend/features/settings/ConnectionsScreen.tsx`**

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { Card } from '@/components/ui/Card';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { fetchConnections, syncConnection } from '@/lib/api/settings';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { ConnectionType, ConnectionView } from '@/types/view';
import { AddConnectionSheet, DisconnectSheet, EditConnectionSheet } from './ConnectionSheets';
import { CONNECTION_LABEL } from './connectionFields';

const STATUS: Record<ConnectionView['status'], { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'bg-st-pass/10 text-st-pass' },
  failed: { label: 'Failed', cls: 'bg-st-fail/10 text-st-fail' },
  syncing: { label: 'Syncing', cls: 'bg-ev-stated/10 text-ev-stated' },
  never: { label: 'Never synced', cls: 'border border-dashed border-st-unknown text-st-unknown' },
};

export function ConnectionsScreen() {
  const sp = useSearchParams();
  const addParam = sp.get('add') as ConnectionType | null;
  const connections = useResource('connections', fetchConnections);
  const [adding, setAdding] = useState<ConnectionType | null>(addParam && addParam in CONNECTION_LABEL ? addParam : null);
  const [editing, setEditing] = useState<ConnectionView | null>(null);
  const [removing, setRemoving] = useState<ConnectionView | null>(null);
  const toast = useToast();
  const done = () => { setAdding(null); setEditing(null); setRemoving(null); connections.reload(); };

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-ink">Connections</h2>
        <Can do="admin"><Button variant="primary" onClick={() => setAdding('n8n')}>Add connection</Button></Can>
      </div>
      <ResourceView
        resource={connections}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState art title="No sources connected" body="Connect n8n and your directory so OBA can discover who holds what." />}
      >
        {(list) => (
          <div className="grid gap-4 xl:grid-cols-2">
            {list.map((c) => {
              const s = c.lastSyncAt && c.status !== 'never' ? STATUS[c.status] : STATUS.never;
              const status = c.status === 'failed' ? STATUS.failed : s;
              return (
                <Card as="article" key={c.id} aria-label={c.name} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-ink">{c.name}</h3>
                      <p className="text-sm text-ink-3">{CONNECTION_LABEL[c.type]}</p>
                    </div>
                    <span className={cn('rounded-badge px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', status.cls)}>{status.label}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-ink-3">Last sync</dt>
                    <dd className="text-ink" title={c.lastSyncAt ? formatDateTime(c.lastSyncAt) : undefined}>{c.lastSyncAt ? formatRelative(c.lastSyncAt) : 'Never'}</dd>
                    <dt className="text-ink-3">Items synced</dt>
                    <dd className="tabular-nums text-ink">{c.itemsSynced === null ? '—' : formatNumber(c.itemsSynced)}</dd>
                  </dl>
                  {c.lastError && <p className="text-sm text-st-fail">{c.lastError}</p>}
                  {c.secretHint && <p className="text-sm text-ink-2">Key ending …{c.secretHint}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.type === 'n8n' && <ButtonLink size="sm" variant="ghost" href="/settings/connections/n8n-check">Run quick check</ButtonLink>}
                    <Can do="admin">
                      <Button size="sm" onClick={async () => {
                        try { await syncConnection(c.id); toast.show('Sync started'); connections.reload(); }
                        catch (e) { toast.show(toApiError(e).message); }
                      }}>Sync now</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoving(c)}>Disconnect</Button>
                    </Can>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ResourceView>
      {adding && <AddConnectionSheet initialType={adding} onClose={() => setAdding(null)} onDone={done} />}
      {editing && <EditConnectionSheet c={editing} onClose={() => setEditing(null)} onDone={done} />}
      {removing && <DisconnectSheet c={removing} onClose={() => setRemoving(null)} onDone={done} />}
    </>
  );
}
```

- [ ] **Step 8: Implement `frontend/features/settings/N8nCheckScreen.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingBlock } from '@/components/ui/states';
import { toApiError, type ApiError } from '@/lib/api/client';
import { runN8nCheck } from '@/lib/api/settings';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { N8nCheckReport, NamedItem } from '@/types/view';

const STEPS = ['Validate the connection', 'Fetch workflows', 'Audit credentials', 'Analyze executions'];

function ListSection({ title, items }: { title: string; items: NamedItem[] | null }) {
  return (
    <Card>
      <h3 className="mb-2 font-medium text-ink">{title}</h3>
      {items === null ? <p className="text-sm text-ink-3">Not available on this deployment yet.</p>
        : items.length === 0 ? <p className="text-sm text-ink-2">None found.</p>
        : (
          <ul className="divide-y divide-rule">
            {items.map((i) => (
              <li key={i.id} className="py-2">
                <p className="text-ink">{i.name}</p>
                {i.detail && <p className="text-sm text-ink-3">{i.detail}</p>}
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}

export function N8nCheckScreen() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<N8nCheckReport | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const urlId = useId();
  const keyId = useId();

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !key) return;
    setRunning(true);
    setError(null);
    setReport(null);
    try { setReport(await runN8nCheck(url.trim(), key)); }
    catch (err) { setError(toApiError(err)); }
    finally { setKey(''); setRunning(false); }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-ink">n8n Ownership Check</h2>
      <Card>
        <form onSubmit={run} className="space-y-4">
          <p className="text-sm text-ink-2">Read-only. The key is held in memory for this scan only and never saved.</p>
          <p className="text-sm text-ink-3">Use the instance owner&apos;s key (or an admin&apos;s on paid plans). On most plans the key has full access; OBA only calls read endpoints.</p>
          <div>
            <label htmlFor={urlId} className="mb-1 block text-sm font-medium text-ink">n8n URL</label>
            <input id={urlId} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.yourcompany.com"
              className="h-10 w-full rounded-control border border-rule bg-surface px-3 text-sm text-ink placeholder:text-ink-3" />
          </div>
          <div>
            <label htmlFor={keyId} className="mb-1 block text-sm font-medium text-ink">API key</label>
            <input id={keyId} type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)}
              className="h-10 w-full rounded-control border border-rule bg-surface px-3 text-sm text-ink" />
          </div>
          <ol className="grid gap-1 text-sm text-ink-3 sm:grid-cols-4">
            {STEPS.map((s, i) => <li key={s}>{i + 1}. {s}</li>)}
          </ol>
          <Button type="submit" variant="primary" disabled={running}>Run check</Button>
        </form>
      </Card>

      {running && <LoadingBlock label="Running the check" />}
      {error && <ErrorState error={error} />}
      {report && (
        <section aria-label="Check results" className="space-y-4">
          <p className="text-sm text-ink-3">Scanned {formatDateTime(report.scannedAt)}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {([['Workflows', report.summary.totalWorkflows], ['People', report.summary.totalUsers], ['Credentials', report.summary.totalCredentials], ['AI integrations', report.summary.aiIntegrationsCount]] as const).map(([label, n]) => (
              <Card key={label} className="p-4">
                <p className="text-sm text-ink-3">{label}</p>
                <p className="text-[28px] font-semibold tabular-nums text-ink">{formatNumber(n)}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ListSection title="Single-owner workflows" items={report.singleOwner} />
            <ListSection title="Workflows on personal credentials" items={report.personalCredential} />
            <ListSection title="Failing workflows" items={report.failing} />
            <ListSection title="Abandoned workflows (no runs or edits in 60+ days)" items={report.abandoned} />
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Implement `frontend/features/settings/SettingsNav.tsx` and `frontend/app/(app)/settings/layout.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchNavCounts } from '@/lib/api/overview';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useResource } from '@/lib/useResource';

const ITEMS = [
  { href: '/settings/connections', label: 'Connections' },
  { href: '/settings/identity', label: 'Identity queue', badge: true },
  { href: '/settings/users', label: 'Users & roles' },
  { href: '/settings/organization', label: 'Organization' },
  { href: '/settings/audit-log', label: 'Audit log' },
];

export function SettingsNav() {
  const pathname = usePathname();
  const counts = useResource('nav-counts', fetchNavCounts);
  const pending = counts.status === 'ready' ? counts.data.identityPending : 0;
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => {
        const active = pathname === i.href || pathname.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}
            className={cn('flex h-10 items-center justify-between gap-3 whitespace-nowrap rounded-control px-3 text-sm',
              active ? 'bg-surface font-medium text-ink shadow-card' : 'text-ink-2 hover:bg-sunken hover:text-ink')}>
            {i.label}
            {i.badge && pending > 0 && <span className="rounded-full bg-sunken px-2 text-xs font-semibold tabular-nums text-ink-2">{formatNumber(pending)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
```

```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsNav } from '@/features/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 10: Replace the two pages**

`frontend/app/(app)/settings/connections/page.tsx`:

```tsx
import { Suspense } from 'react';
import { LoadingBlock } from '@/components/ui/states';
import { ConnectionsScreen } from '@/features/settings/ConnectionsScreen';

export default function Page() {
  return <Suspense fallback={<LoadingBlock />}><ConnectionsScreen /></Suspense>;
}
```

`frontend/app/(app)/settings/connections/n8n-check/page.tsx`:

```tsx
import { N8nCheckScreen } from '@/features/settings/N8nCheckScreen';

export default function Page() {
  return <N8nCheckScreen />;
}
```

- [ ] **Step 11: Run the tests**

Run: `npm test -- tests/features/connections.test.tsx tests/features/n8n-check.test.tsx`
Expected: `6 passed`.

- [ ] **Step 12: Commit**

```bash
git add lib/api/settings.ts features/settings "app/(app)/settings" tests/features/connections.test.tsx tests/features/n8n-check.test.tsx
git commit -m "feat(settings): settings sub-nav, connections with add/edit/disconnect, stateless n8n ownership check"
```

---

### Task 34: Settings: identity queue, users and roles, organization, audit log

**Files:**
- Create: `frontend/features/settings/IdentityQueueScreen.tsx`, `UsersScreen.tsx`, `OrganizationScreen.tsx`, `AuditLogScreen.tsx`
- Modify: `frontend/app/(app)/settings/identity/page.tsx`, `users/page.tsx`, `organization/page.tsx`, `audit-log/page.tsx` (replace stubs)
- Test: `frontend/tests/features/settings-admin.test.tsx`

**Interfaces:**
- Consumes: `fetchIdentityQueue`, `resolveIdentity`, `fetchUsers`, `updateUser`, `fetchOrganization`, `saveOrganization`, `fetchAuditLog` (Task 6); `EntityPicker` (Task 13); `Drawer`, `DataTable` (Task 12); `Card`, `Button` (Task 7); `ResourceView`, `EmptyState` (Task 9); `useToast` (Task 9); `Can`, `useSession`, `can` (Task 14); `toApiError` (Task 5); `formatDateTime` (Task 4).
- Produces: `IdentityQueueScreen()`, `UsersScreen()`, `MIN_GROUP_FLOOR = 3`, `OrganizationScreen()`, `AuditLogScreen()`.

- [ ] **Step 1: Write the failing test `frontend/tests/features/settings-admin.test.tsx`**

```tsx
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, VIEWER, renderWithSession } from '../helpers';

vi.mock('@/lib/api/settings', () => ({
  fetchIdentityQueue: vi.fn(), resolveIdentity: vi.fn(), fetchUsers: vi.fn(), updateUser: vi.fn(),
  fetchOrganization: vi.fn(), saveOrganization: vi.fn(), fetchAuditLog: vi.fn(),
}));
vi.mock('@/lib/api/entities', () => ({ fetchEntities: vi.fn().mockResolvedValue([]), lookupEntityName: (id: string) => id }));
import * as api from '@/lib/api/settings';
import { IdentityQueueScreen } from '@/features/settings/IdentityQueueScreen';
import { UsersScreen } from '@/features/settings/UsersScreen';
import { OrganizationScreen } from '@/features/settings/OrganizationScreen';
import { AuditLogScreen } from '@/features/settings/AuditLogScreen';

describe('settings admin screens', () => {
  beforeEach(() => {
    vi.mocked(api.fetchIdentityQueue).mockResolvedValue([
      { id: 'q1', source: 'n8n', displayName: 'o.haddad', emailCandidate: 'omar.h@acme.io',
        suggestion: { person: { id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, reason: 'same name, different domain' } },
    ]);
    vi.mocked(api.resolveIdentity).mockResolvedValue(undefined);
    vi.mocked(api.fetchUsers).mockResolvedValue([
      { id: 'u2', name: 'Zoe Hart', email: 'zoe@acme.com', role: 'viewer', isHrManager: false },
      { id: 'u1', name: 'Ana Ruiz', email: 'ana@acme.com', role: 'admin', isHrManager: true },
    ]);
    vi.mocked(api.updateUser).mockResolvedValue(undefined);
    vi.mocked(api.fetchOrganization).mockResolvedValue({ companyName: 'Acme', logoUrl: null, minGroupSize: 5, departmentMappings: [{ raw: 'FIN-OPS', mapped: 'Finance' }] });
    vi.mocked(api.saveOrganization).mockResolvedValue(undefined);
    vi.mocked(api.fetchAuditLog).mockResolvedValue([{ id: 'a1', at: '2026-10-01T09:00:00Z', actor: 'Ana Ruiz', action: 'identity.link', resource: 'q1', details: 'Linked to Omar Haddad' }]);
  });

  it('identity queue: link to the suggested person, or mark as service account', async () => {
    renderWithSession(<IdentityQueueScreen />, ADMIN);
    const item = await screen.findByRole('article', { name: 'o.haddad' });
    expect(within(item).getByText('Suggested: Omar Haddad — same name, different domain')).toBeInTheDocument();
    await userEvent.click(within(item).getByRole('button', { name: 'Link to Omar Haddad' }));
    await waitFor(() => expect(api.resolveIdentity).toHaveBeenCalledWith('q1', { action: 'link', personId: 'person:omar' }));
    await userEvent.click(within(item).getByRole('button', { name: 'Service account' }));
    expect(api.resolveIdentity).toHaveBeenCalledWith('q1', { action: 'service_account' });
  });

  it('users: alphabetical, role changes save; viewers see text only', async () => {
    const { unmount } = renderWithSession(<UsersScreen />, ADMIN);
    const rows = within(await screen.findByRole('table', { name: 'Users' })).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Ana Ruiz');
    await userEvent.selectOptions(within(rows[1]).getByRole('combobox', { name: 'Role for Zoe Hart' }), 'admin');
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith('u2', { role: 'admin' }));
    unmount();
    renderWithSession(<UsersScreen />, VIEWER);
    await screen.findByRole('table', { name: 'Users' });
    expect(screen.queryByRole('combobox', { name: /Role for/ })).toBeNull();
  });

  it('organization: enforces the minimum team size floor of 3', async () => {
    renderWithSession(<OrganizationScreen />, ADMIN);
    const size = await screen.findByLabelText('Minimum team size');
    fireEvent.change(size, { target: { value: '2' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Use 3 or more.')).toBeInTheDocument();
    expect(api.saveOrganization).not.toHaveBeenCalled();
    fireEvent.change(size, { target: { value: '6' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.saveOrganization).toHaveBeenCalledWith(expect.objectContaining({ minGroupSize: 6, departmentMappings: [{ raw: 'FIN-OPS', mapped: 'Finance' }] })));
  });

  it('audit log lists entries and has no axe violations', async () => {
    const { container } = renderWithSession(<AuditLogScreen />, ADMIN);
    expect(await screen.findByText('Linked to Omar Haddad')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npm test -- tests/features/settings-admin.test.tsx`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement `frontend/features/settings/IdentityQueueScreen.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { fetchIdentityQueue, resolveIdentity } from '@/lib/api/settings';
import { useResource } from '@/lib/useResource';
import type { EntityRef, IdentityQueueItemView, IdentityResolution } from '@/types/view';

const DONE: Record<IdentityResolution['action'], string> = {
  link: 'Linked', service_account: 'Marked as a service account', departed: 'Marked as departed', ignore: 'Ignored',
};

export function IdentityQueueScreen() {
  const queue = useResource('identity-queue', fetchIdentityQueue);
  const [linking, setLinking] = useState<IdentityQueueItemView | null>(null);
  const [person, setPerson] = useState<EntityRef | null>(null);
  const toast = useToast();

  async function resolve(id: string, r: IdentityResolution) {
    try { await resolveIdentity(id, r); toast.show(DONE[r.action]); queue.reload(); }
    catch (e) { toast.show(toApiError(e).message); }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-ink">Identity queue</h2>
      <p className="mb-6 text-sm text-ink-2">Accounts we couldn&apos;t match to someone in your directory. Until they&apos;re resolved, assets they created show an Unknown owner.</p>
      <ResourceView resource={queue} isEmpty={(l) => l.length === 0}
        empty={<EmptyState title="No accounts waiting for review" body="Every account we found matches someone in your directory." />}>
        {(list) => (
          <div className="space-y-3">
            {list.map((i) => {
              const label = i.displayName ?? i.emailCandidate ?? i.id;
              return (
                <Card as="article" key={i.id} aria-label={label} className="space-y-3">
                  <div>
                    <p className="font-medium text-ink">{label}</p>
                    <p className="text-sm text-ink-3">{i.source}{i.emailCandidate ? ` · ${i.emailCandidate}` : ''}</p>
                  </div>
                  {i.suggestion && <p className="text-sm text-ink-2">Suggested: {i.suggestion.person.name} — {i.suggestion.reason}</p>}
                  <Can do="admin">
                    <span className="flex flex-wrap gap-2">
                      {i.suggestion
                        ? <Button size="sm" onClick={() => resolve(i.id, { action: 'link', personId: i.suggestion!.person.id })}>Link to {i.suggestion.person.name}</Button>
                        : null}
                      <Button size="sm" variant="ghost" onClick={() => { setPerson(null); setLinking(i); }}>Link to someone else</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolve(i.id, { action: 'service_account' })}>Service account</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolve(i.id, { action: 'departed' })}>Departed</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolve(i.id, { action: 'ignore' })}>Ignore</Button>
                    </span>
                  </Can>
                </Card>
              );
            })}
          </div>
        )}
      </ResourceView>
      {linking && (
        <Drawer open onClose={() => setLinking(null)} size="md" title={`Link ${linking.displayName ?? linking.emailCandidate ?? 'account'}`}
          footer={<><Button variant="ghost" onClick={() => setLinking(null)}>Cancel</Button>
            <Button variant="primary" onClick={async () => { if (!person) return; await resolve(linking.id, { action: 'link', personId: person.id }); setLinking(null); }}>Link</Button></>}>
          <EntityPicker label="Person" kinds={['person']} value={person} onChange={setPerson} />
        </Drawer>
      )}
    </>
  );
}
```

- [ ] **Step 4: Implement `frontend/features/settings/UsersScreen.tsx`**

```tsx
'use client';

import { DataTable } from '@/components/ui/DataTable';
import { ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { fetchUsers, updateUser } from '@/lib/api/settings';
import { can } from '@/lib/permissions';
import { useSession } from '@/lib/session';
import { useResource } from '@/lib/useResource';
import type { Role, UserView } from '@/types/view';

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', viewer: 'Viewer', reviewer: 'Reviewer' };

export function UsersScreen() {
  const users = useResource('users', fetchUsers);
  const { session } = useSession();
  const editable = can(session, 'admin');
  const toast = useToast();

  async function patch(u: UserView, p: Partial<Pick<UserView, 'role' | 'isHrManager'>>) {
    try { await updateUser(u.id, p); toast.show(`${u.name} updated`); users.reload(); }
    catch (e) { toast.show(toApiError(e).message); }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-ink">Users &amp; roles</h2>
      <p className="mb-6 text-sm text-ink-2">People sign in with your company account. Roles control what they can see and change.</p>
      <ResourceView resource={users}>
        {(list) => (
          <DataTable<UserView>
            caption="Users"
            rows={[...list].sort((a, b) => a.name.localeCompare(b.name))}
            rowKey={(u) => u.id}
            columns={[
              { key: 'name', header: 'Name', cell: (u) => <span className="text-ink">{u.name}</span> },
              { key: 'email', header: 'Email', cell: (u) => <span className="text-ink-2">{u.email}</span> },
              {
                key: 'role', header: 'Role', cell: (u) => editable ? (
                  <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => patch(u, { role: e.target.value as Role })}
                    className="h-9 rounded-control border border-rule bg-surface px-2 text-sm text-ink">
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                ) : <span className="text-ink">{ROLE_LABEL[u.role]}</span>,
              },
              {
                key: 'hr', header: 'HR / manager', cell: (u) => editable ? (
                  <input type="checkbox" aria-label={`HR or manager permission for ${u.name}`} checked={u.isHrManager}
                    onChange={(e) => patch(u, { isHrManager: e.target.checked })} />
                ) : <span className="text-ink-2">{u.isHrManager ? 'Yes' : 'No'}</span>,
              },
            ]}
          />
        )}
      </ResourceView>
    </>
  );
}
```

- [ ] **Step 5: Implement `frontend/features/settings/OrganizationScreen.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Can } from '@/components/ui/Can';
import { Card } from '@/components/ui/Card';
import { ResourceView } from '@/components/ui/states';
import { useToast } from '@/components/ui/Toast';
import { toApiError } from '@/lib/api/client';
import { fetchOrganization, saveOrganization } from '@/lib/api/settings';
import { useResource } from '@/lib/useResource';
import type { OrganizationSettings } from '@/types/view';

export const MIN_GROUP_FLOOR = 3;
const INPUT = 'h-10 w-full rounded-control border border-rule bg-surface px-3 text-sm text-ink';

function OrgForm({ initial, onSaved }: { initial: OrganizationSettings; onSaved: () => void }) {
  const [s, setS] = useState(initial);
  const [sizeText, setSizeText] = useState(String(initial.minGroupSize));
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const ids = { name: useId(), logo: useId(), size: useId() };

  async function save() {
    const n = Number(sizeText);
    if (!Number.isInteger(n) || n < MIN_GROUP_FLOOR) { setError(`Use ${MIN_GROUP_FLOOR} or more.`); return; }
    setError(null);
    try {
      await saveOrganization({ ...s, minGroupSize: n, departmentMappings: s.departmentMappings.filter((m) => m.raw.trim() && m.mapped.trim()) });
      toast.show('Organization settings saved');
      onSaved();
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  return (
    <Card className="space-y-6">
      <div>
        <label htmlFor={ids.name} className="mb-1 block text-sm font-medium text-ink">Company name</label>
        <input id={ids.name} className={INPUT} value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} />
        <p className="mt-1 text-xs text-ink-3">Shown at the top of confirmation forms.</p>
      </div>
      <div>
        <label htmlFor={ids.logo} className="mb-1 block text-sm font-medium text-ink">Logo URL (optional)</label>
        <input id={ids.logo} type="url" className={INPUT} value={s.logoUrl ?? ''} onChange={(e) => setS({ ...s, logoUrl: e.target.value || null })} />
      </div>
      <div>
        <label htmlFor={ids.size} className="mb-1 block text-sm font-medium text-ink">Minimum team size</label>
        <input id={ids.size} type="number" min={MIN_GROUP_FLOOR} className={`${INPUT} w-28`} value={sizeText} onChange={(e) => setSizeText(e.target.value)} />
        <p className="mt-1 text-xs text-ink-3">Teams smaller than this are combined with their parent team so no one can be singled out.</p>
        {error && <p role="alert" className="mt-1 text-sm text-st-fail">{error}</p>}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Department names</legend>
        <p className="mb-3 text-xs text-ink-3">Map messy directory department names to the team names OBA shows.</p>
        <div className="space-y-2">
          {s.departmentMappings.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <input aria-label={`Directory name ${i + 1}`} className={INPUT} value={m.raw}
                onChange={(e) => setS({ ...s, departmentMappings: s.departmentMappings.map((x, j) => (j === i ? { ...x, raw: e.target.value } : x)) })} />
              <span aria-hidden className="text-ink-3">→</span>
              <input aria-label={`Shown as ${i + 1}`} className={INPUT} value={m.mapped}
                onChange={(e) => setS({ ...s, departmentMappings: s.departmentMappings.map((x, j) => (j === i ? { ...x, mapped: e.target.value } : x)) })} />
              <Button size="sm" variant="ghost" aria-label={`Remove mapping ${i + 1}`}
                onClick={() => setS({ ...s, departmentMappings: s.departmentMappings.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3" onClick={() => setS({ ...s, departmentMappings: [...s.departmentMappings, { raw: '', mapped: '' }] })}>Add mapping</Button>
      </fieldset>
      <Can do="admin"><Button variant="primary" onClick={save}>Save</Button></Can>
    </Card>
  );
}

export function OrganizationScreen() {
  const org = useResource('organization', fetchOrganization);
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-ink">Organization</h2>
      <ResourceView resource={org}>{(o) => <OrgForm initial={o} onSaved={org.reload} />}</ResourceView>
    </>
  );
}
```

- [ ] **Step 6: Implement `frontend/features/settings/AuditLogScreen.tsx`**

```tsx
'use client';

import { useId, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ResourceView } from '@/components/ui/states';
import { fetchAuditLog } from '@/lib/api/settings';
import { formatDateTime } from '@/lib/format';
import { useResource } from '@/lib/useResource';
import type { AuditEntry } from '@/types/view';

const INPUT = 'h-9 rounded-control border border-rule bg-surface px-3 text-sm text-ink';

export function AuditLogScreen() {
  const [filters, setFilters] = useState({ action: '', from: '', to: '' });
  const log = useResource(`audit:${JSON.stringify(filters)}`, () => fetchAuditLog(filters));
  const ids = { action: useId(), from: useId(), to: useId() };
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-ink">Audit log</h2>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={ids.action} className="mb-1 block text-xs text-ink-3">Action contains</label>
          <input id={ids.action} className={INPUT} value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
        </div>
        <div>
          <label htmlFor={ids.from} className="mb-1 block text-xs text-ink-3">From</label>
          <input id={ids.from} type="date" className={INPUT} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <label htmlFor={ids.to} className="mb-1 block text-xs text-ink-3">To</label>
          <input id={ids.to} type="date" className={INPUT} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
      </div>
      <ResourceView resource={log} isEmpty={(l) => l.length === 0} empty={<EmptyState title="No entries" body="Nothing matches these filters." />}>
        {(list) => (
          <DataTable<AuditEntry>
            caption="Audit log"
            rows={list}
            rowKey={(a) => a.id}
            columns={[
              { key: 'at', header: 'When', cell: (a) => <span className="whitespace-nowrap text-ink-2">{formatDateTime(a.at)}</span> },
              { key: 'actor', header: 'Who', cell: (a) => <span className="text-ink">{a.actor}</span> },
              { key: 'action', header: 'Action', cell: (a) => <code className="text-xs text-ink">{a.action}</code> },
              { key: 'resource', header: 'Resource', cell: (a) => <span className="text-ink-2">{a.resource}</span> },
              { key: 'details', header: 'Details', cell: (a) => <span className="text-ink-2">{a.details}</span> },
            ]}
          />
        )}
      </ResourceView>
    </>
  );
}
```

- [ ] **Step 7: Replace the four stub pages**

Each file gets this body with its screen:

| File | Import and render |
|---|---|
| `app/(app)/settings/identity/page.tsx` | `IdentityQueueScreen` from `@/features/settings/IdentityQueueScreen` |
| `app/(app)/settings/users/page.tsx` | `UsersScreen` from `@/features/settings/UsersScreen` |
| `app/(app)/settings/organization/page.tsx` | `OrganizationScreen` from `@/features/settings/OrganizationScreen` |
| `app/(app)/settings/audit-log/page.tsx` | `AuditLogScreen` from `@/features/settings/AuditLogScreen` |

For example, `frontend/app/(app)/settings/identity/page.tsx`:

```tsx
import { IdentityQueueScreen } from '@/features/settings/IdentityQueueScreen';

export default function Page() {
  return <IdentityQueueScreen />;
}
```

- [ ] **Step 8: Run the test**

Run: `npm test -- tests/features/settings-admin.test.tsx`
Expected: `4 passed`.

- [ ] **Step 9: Commit**

```bash
git add features/settings "app/(app)/settings" tests/features/settings-admin.test.tsx
git commit -m "feat(settings): identity queue, users and roles, organization (min team size, department mapping), audit log"
```

---

## Phase E — Hardening

### Task 35: Guard tests, remove the stub, full verification

**Files:**
- Delete: `frontend/features/_pending/`
- Test: `frontend/tests/design/guards.test.ts`

**Interfaces:**
- Consumes: the whole tree.
- Produces: tests that fail if anyone reintroduces palette classes, hex literals, fabricated fallback data, the old font, or the stub.

- [ ] **Step 1: Write the guard test `frontend/tests/design/guards.test.ts`**

```ts
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));

function files(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const SOURCE = ['app', 'components', 'features', 'lib'].flatMap((d) => files(join(root, d)));
const PALETTE = /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder|decoration|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/;
const FABRICATION = /fallback(?:Data|Metrics|Alerts|Entities|Campaigns)|demo data|sample data|demo preview/i;

function offenders(re: RegExp, list = SOURCE) {
  return list.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
}

describe('design guards', () => {
  it('uses tokens, never Tailwind palette classes', () => {
    expect(offenders(PALETTE)).toEqual([]);
  });

  it('has no hex color literals outside globals.css', () => {
    expect(offenders(HEX)).toEqual([]);
  });

  it('never fabricates data', () => {
    expect(offenders(FABRICATION)).toEqual([]);
  });

  it('no longer uses DM Sans or the stub screen', () => {
    expect(offenders(/DM_Sans|PendingScreen/)).toEqual([]);
    expect(existsSync(join(root, 'features/_pending'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npm test -- tests/design/guards.test.ts`
Expected: FAIL only on the `_pending` assertion (every stub page was replaced in Tasks 19–34; if any other assertion fails, fix the offending file it names).

- [ ] **Step 3: Delete the stub**

```bash
git rm -r features/_pending
```

- [ ] **Step 4: Full verification**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass; lint reports 0 errors and 0 warnings; the build lists every route from Task 18's `REQUIRED` list.

- [ ] **Step 5: Commit**

```bash
git add tests/design/guards.test.ts
git commit -m "test(design): guard against palette classes, hex literals, fabricated data and leftover stubs"
```

---

### Task 36: Playwright end-to-end flows with a mocked API

**Files:**
- Modify: `frontend/package.json` (dev dependency + `e2e` script)
- Create: `frontend/playwright.config.ts`, `frontend/e2e/mockApi.ts`, `frontend/e2e/overview-assets.spec.ts`, `frontend/e2e/what-if-map.spec.ts`, `frontend/e2e/attest-mobile.spec.ts`

**Interfaces:**
- Consumes: the running Next dev server; every API call is answered by `page.route`, so no backend is needed. Unmapped API paths get Express-style `Cannot GET` 404s, so they exercise the "not available yet" states.
- Produces: `npm run e2e`.

- [ ] **Step 1: Install and add the script**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Add to `frontend/package.json` scripts: `"e2e": "playwright test"`.

- [ ] **Step 2: Create `frontend/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export const MOCK_API = 'http://localhost:4999';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3001', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001/sign-in',
    reuseExistingServer: true,
    env: { NEXT_PUBLIC_API_URL: MOCK_API },
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile/ },
  ],
});
```

- [ ] **Step 3: Create `frontend/e2e/mockApi.ts`**

```ts
import type { Page } from '@playwright/test';

export const ADMIN = { userId: 'u1', name: 'Guido Rossi', email: 'guido@acme.com', role: 'admin', isHrManager: true, title: 'Chief Executive Officer' };

const fact = (display: string | null, state: 'value' | 'unknown' | 'none' = 'value') =>
  ({ state, display, grade: state === 'unknown' ? 'unknown' : 'stated', source: state === 'unknown' ? null : 'n8n', observedAt: '2026-10-01T08:42:00Z' });

export const INVOICE = {
  id: 'automation:41', kind: 'automation', name: 'Invoice sync', isCritical: true,
  owner: fact('Omar Haddad'), backup: fact(null, 'unknown'),
  criticality: { level: 'critical', grade: 'confirmed', source: 'attestation', observedAt: null },
  documented: fact(null, 'none'), fallback: fact('Yes'), runsPerWeek: fact('1,200'), checkStatus: 'UNKNOWN',
};

export const DEFAULTS: Record<string, unknown> = {
  'GET /api/auth/session': ADMIN,
  'GET /api/continuity/overview': { metrics: { totalCriticalAssets: 52, fullyCoveredCriticalAssets: 38, exposedCriticalAssets: 9, unknownCriticalFacts: 5, unknownCriticalAssets: 5, definition: 'Confirmed backup, runbook and fallback.' } },
  'GET /api/changes/summary': { since: null, peopleLeft: 0, backupsLost: 0, newlyExposed: 0, resolved: 0 },
  'GET /api/changes': { events: [] },
  'GET /api/connections': { connections: [{ id: 'c1', type: 'n8n', name: 'n8n', status: 'healthy', lastSyncAt: new Date().toISOString(), itemsSynced: 10, lastError: null, secretHint: '3f9a' }] },
  'GET /api/nav-counts': { departuresSoon: 1, openCriticalActions: 3, identityPending: 0 },
  'GET /api/actions': { actions: [] },
  'GET /api/departures': { departures: [] },
  'GET /api/continuity/spof-assets': { assets: [] },
  'GET /api/assets': { assets: [INVOICE] },
  [`GET /api/assets/${encodeURIComponent('automation:41')}`]: {
    asset: INVOICE, checks: [{ checkId: 'C1', entityId: 'automation:41', status: 'UNKNOWN', evidenceFactIds: [], reason: 'Backup is not on record.' }],
    upstream: [], downstream: [], history: [],
  },
  'GET /api/continuity/inventory': { entities: [{ id: 'person:omar', kind: 'person', name: 'Omar Haddad' }, { id: 'person:yuki', kind: 'person', name: 'Yuki Tanaka' }] },
  'POST /api/continuity/simulations/leaver': { success: true, result: {
    orphanedCriticalAssets: [{ entityId: 'automation:41', name: 'Invoice sync', priorOwnerId: 'person:omar', criticality: 'critical' }],
    stoppedPersonalCredentialAutomations: [], totalRunsPerWeekAffected: 1200, affectedDownstreamAssetIds: [], unknownFactsEncountered: 1 } },
  'GET /api/continuity/simulations/worst-losses': { vendorsAndModels: [], peopleHoldingManyUnbacked: 0, threshold: 3 },
  'GET /api/graph/neighbourhood': { rootId: 'automation:41', nodes: [
    { id: 'automation:41', kind: 'automation', name: 'Invoice sync', ring: 'unknown' },
    { id: 'person:omar', kind: 'person', name: 'Omar Haddad', ring: null }],
    edges: [{ id: 'e1', from: 'person:omar', to: 'automation:41', type: 'owns', grade: 'stated' }] },
  'GET /api/attest/tok': { reviewer: { name: 'Sara Ali', email: 'sara@acme.com' }, requestedBy: 'Priya Shah', company: { name: 'Acme', logoUrl: null },
    expired: false, submitted: false, assets: [{ taskId: 't1', asset: { id: 'automation:41', kind: 'automation', name: 'Invoice sync' }, status: 'todo' }] },
  'PUT /api/attest/tok/tasks/t1': null,
};

export async function mockApi(page: Page, overrides: Record<string, unknown> = {}) {
  const table = { ...DEFAULTS, ...overrides };
  await page.route('http://localhost:4999/api/**', async (route) => {
    const url = new URL(route.request().url());
    const key = `${route.request().method()} ${url.pathname}`;
    if (key in table) {
      const body = table[key];
      return body === null ? route.fulfill({ status: 204 }) : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    return route.fulfill({ status: 404, contentType: 'text/html', body: `<pre>Cannot ${route.request().method()} ${url.pathname}</pre>` });
  });
}
```

- [ ] **Step 4: Create `frontend/e2e/overview-assets.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

test('overview coverage drills into assets and the provenance drawer', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Guido.');
  await expect(page.getByRole('heading', { name: '38 of 52 critical assets fully covered' })).toBeVisible();
  await page.getByRole('link', { name: /5 unknown/ }).click();
  await expect(page).toHaveURL(/\/assets\?coverage=unknown/);
  await page.getByRole('row', { name: /Invoice sync/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Invoice sync' });
  await expect(drawer.getByText('Backup is not on record.')).toBeVisible();
  await expect(page.getByText('None').first()).toBeVisible();
});

test('a screen whose backend is missing says so instead of showing fake data', async ({ page }) => {
  await mockApi(page);
  await page.goto('/people');
  await expect(page.getByText("isn't available on this deployment yet")).toBeVisible();
});
```

- [ ] **Step 5: Create `frontend/e2e/what-if-map.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

test('what-if leaver scenario shows counted results', async ({ page }) => {
  await mockApi(page);
  await page.goto('/what-if?add=person%3Aomar&kind=person');
  await expect(page.getByRole('button', { name: 'Remove Omar Haddad' })).toBeVisible();
  await page.getByRole('button', { name: 'Run scenario' }).click();
  const results = page.getByRole('region', { name: 'Scenario results' });
  await expect(results.getByText('1,200')).toBeVisible();
  await expect(results.getByRole('link', { name: 'Invoice sync' })).toBeVisible();
});

test('map renders the neighbourhood canvas', async ({ page }) => {
  await mockApi(page);
  await page.goto('/map?root=automation%3A41');
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Omar Haddad' })).toBeVisible();
});
```

- [ ] **Step 6: Create `frontend/e2e/attest-mobile.spec.ts`**

```ts
import { expect, test } from '@playwright/test';
import { mockApi } from './mockApi';

test('reviewer confirms an asset on a phone', async ({ page }) => {
  await mockApi(page);
  await page.goto('/attest/tok');
  await expect(page.getByText('Ownership check requested by Priya Shah')).toBeVisible();
  await page.getByRole('button', { name: /Invoice sync/ }).click();
  await page.getByRole('radio', { name: 'Yes' }).first().check();
  await page.getByRole('radio', { name: 'No backup' }).check();
  await page.getByRole('radio', { name: 'High' }).check();
  await page.getByLabel(/Why\?/).fill('Invoicing depends on it');
  await page.getByRole('radio', { name: 'Not documented' }).check();
  await page.getByRole('radio', { name: 'Don’t know' }).check();
  await page.getByRole('button', { name: 'Save and next' }).click();
  await expect(page.getByText('Thanks — 1 of 1 confirmed.')).toBeVisible();
});
```

- [ ] **Step 7: Run e2e**

Run: `npm run e2e`
Expected: `5 passed` (4 desktop, 1 mobile).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json playwright.config.ts e2e
git commit -m "test(e2e): Playwright flows for overview→assets, what-if, map and phone attestation with a mocked API"
```

---

## Appendix A — Backend contracts the frontend depends on

Each item is a follow-up for a separate backend plan. Request and response shapes are the types in `frontend/types/view.ts`; the client functions are in `frontend/lib/api/*.ts`. Until a contract ships, the UI shows "Not available yet". It never shows invented data.

| ID | Contract | Endpoints | Used by |
|---|---|---|---|
| B-01 | Partition coverage: `exposedCriticalAssets` must exclude assets whose status is unknown; add `unknownCriticalAssets` | `GET /api/continuity/overview` (extend `metrics`) | Overview coverage strip, team coverage |
| B-02 | SSO sign-in, session, RBAC, users | `GET /api/auth/session` → `Session` (401 when signed out); `GET /api/auth/providers` → `{ providers }`; `GET /api/auth/:provider/start`; `POST /api/auth/sign-out`; `GET /api/users`; `PATCH /api/users/:id` | Shell, sign-in, Users & roles |
| B-03 | Change feed + "since last visit" summary (per-user last-seen) | `GET /api/changes?acknowledged=false` → `{ events: ChangeEventView[] }`; `POST /api/changes/:id/ack`; `POST /api/changes/ack-all`; `GET /api/changes/summary` → `ChangeSummary` | Bell, Overview hero |
| B-04 | Single-point-of-failure assets (assets, never people) | `GET /api/continuity/spof-assets?limit=` → `{ assets: SpofAsset[] }` | Overview, Map suggestion |
| B-05 | Nav badge counts | `GET /api/nav-counts` → `NavCounts` | Sidebar, Settings nav |
| B-06 | Asset rows with facts + detail with checks, deps, SCD2 history | `GET /api/assets` → `{ assets: AssetRow[] }`; `GET /api/assets/:id` → `AssetDetail` | Assets, drawers |
| B-07 | Ranked actions with status, assign backup, accept risk (reason, expiry, audit; still counted exposed) | `GET /api/actions?status=&limit=`; `POST /api/actions/:id/assign-backup`; `POST /api/actions/:id/accept-risk` | Overview priorities, Actions |
| B-08 | Campaign preview, detail, and honouring `introLine` + `sendAt` on create | `POST /api/attestation/campaigns/preview` → `CampaignPreview`; `GET /api/attestation/campaigns/:id` → `CampaignDetail`; extend `POST /api/attestation/campaigns` | Confirmations, wizard |
| B-09 | Departure lifecycle (EPIC 8) | `GET/POST /api/departures`; `GET /api/departures/:id` → `DepartureDetail`; `POST /api/departures/:id/succession-test`; `PUT /api/departures/:id/successors`; `POST /api/departures/:id/acceptance-requests` | Departures, Overview |
| B-10 | Teams, members, person holdings with min group size roll-up | `GET /api/people/teams`; `GET /api/people/teams/:id`; `GET /api/people/:id` | People & Teams |
| B-11 | Graph neighbourhood and blast radius | `GET /api/graph/neighbourhood?root=&hops=`; `GET /api/graph/blast-radius?root=` | Map, What-If |
| B-12 | v0 n8n check named lists | extend `POST /api/v0/n8n-check` with `singleOwner`, `personalCredential`, `failing`, `abandoned` (`NamedItem[]`) | n8n check |
| B-13 | Combined scenarios (S4) and worst single losses (S6, vendors/models only + people count) | `POST /api/continuity/simulations/combined` → `ScenarioResult`; `GET /api/continuity/simulations/worst-losses` → `WorstLosses` | What-If |
| B-14 | Ask OBA persisted conversations; answers use the `oba://` link convention (X-6) and structured `sources` | `GET /api/assistant/conversations`; `GET /api/assistant/conversations/:id`; `POST /api/assistant/messages` | Ask OBA |
| B-15 | Multi-asset attestation token with partial save, "Don't know" support, reviewer-scoped people search | `GET /api/attest/:token` → `AttestSession` (minus `token`, `legacy`); `PUT /api/attest/:token/tasks/:taskId` (`AttestAnswers`); `GET /api/attest/:token/people` | Confirmation form |
| B-16 | Reviewer tasks and successor acceptance | `GET /api/me/tasks` → `ReviewerTasks`; `POST /api/handovers/:id/accept`; `POST /api/handovers/:id/decline` | `/my` |
| B-17 | Connections CRUD, sync, CSV upload (config keys per `CONNECTION_FIELDS`) | `GET/POST /api/connections`; `PATCH/DELETE /api/connections/:id`; `POST /api/connections/:id/sync`; `POST /api/connections/csv` (multipart `file`) | Connections, freshness |
| B-18 | Identity queue (EPIC 3) | `GET /api/identity-queue` → `{ items }`; `POST /api/identity-queue/:id/resolve` (`IdentityResolution`) | Identity queue |
| B-19 | Organization settings | `GET/PUT /api/settings/organization` → `OrganizationSettings` | Organization, form branding |
| B-20 | Audit log query | `GET /api/audit-log?action=&from=&to=` → `{ entries: AuditEntry[] }` | Audit log |

**Existing endpoints used as-is:** `GET /api/continuity/inventory`, `POST /api/continuity/simulations/{leaver,outage,succession}`, `POST /api/continuity/assistant/ask`, `GET /api/continuity/briefing`, `GET/POST /api/attestation/campaigns`, `GET/POST /api/attestation/review/:token` (legacy form fallback), `POST /api/v0/n8n-check`.

## Appendix B — Spec coverage

| Spec section | Tasks |
|---|---|
| §0 Principles (counted facts, unknown ≠ no, evidence, no ranking, never fabricate, AI marked) | 6, 8, 9, 10, 20, 22, 24, 29, 30, 35 |
| §1 Brand | 2, 15, 19 |
| §2 Color system (light, semantic, dark, amber rule) | 2, 8, 35 |
| §3 Typography | 2, 7 |
| §4 Shape, elevation, spacing, icons, motion | 2, 7, 12 |
| §5 Voice and formatting | 4, all screen tasks |
| §6.1 Data states | 5, 9 |
| §6.2 Fact cells | 8, 22 |
| §6.3 Roles | 14, 16, 17, 32 |
| §7 Shell, sidebar, top bar, bell, Ask field, responsive, sign-in | 15, 16, 17, 18, 19 |
| §8.1 Overview | 20, 21 |
| §8.2 Departures | 27, 28 |
| §8.3 People & Teams | 29 |
| §8.4 Assets | 22 |
| §8.5 Map | 23 |
| §8.6 What-If | 24 |
| §8.7 Actions + Confirmations wizard | 25, 26 |
| §8.8 Ask OBA | 30 |
| §9.1 Confirmation form | 31 |
| §9.2 Reviewer app | 32 |
| §10 Settings (incl. n8n check) | 33, 34 |
| §11 Component inventory | 7–14 |
| §11.1 Accessibility | every task's axe test, 12, 13, 17, 23, 36 |
| §13 Code changes required | 18, 35 |
