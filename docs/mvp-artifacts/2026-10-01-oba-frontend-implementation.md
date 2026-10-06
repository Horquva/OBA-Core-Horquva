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
| X-5 | What-If succession panel and departure succession panel re-run **400ms** after the last change | Tasks 23, 28 |
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
| D — Screens | 19–33 | Every screen, reviewer surfaces, Settings |
| E — Hardening | 34–35 | Token/a11y guard tests, Playwright e2e, final build |

All commands run from `frontend/` unless stated otherwise.

---

## Phase A — Foundation

### Task 1: Frontend test tooling

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`, `frontend/vitest.setup.ts`, `frontend/tests/mocks/navigation.ts`, `frontend/tests/helpers.tsx`, `frontend/tests/smoke.test.tsx`

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom). A global `next/navigation` mock driven by `nav` from `tests/mocks/navigation.ts` (`nav.pathname`, `nav.search`, `nav.params`, `nav.push`, `nav.replace`). `renderWithSession(ui, session?)` in `tests/helpers.tsx` (it imports `SessionContext` from Task 15; until Task 15 lands, the helper file is created in Task 15. In this task, create only the navigation mock and setup).

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
import { afterEach, expect, vi } from 'vitest';
import { nav, resetNav } from './tests/mocks/navigation';

expect.extend(axeMatchers);

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
- Create: `frontend/lib/theme.ts`
- Test: `frontend/tests/lib/theme.test.ts`

**Interfaces:**
- Produces: `type ThemePreference = 'light' | 'dark' | 'system'`; `THEME_STORAGE_KEY = 'oba-theme'`; `readThemePreference(): ThemePreference`; `applyThemePreference(p: ThemePreference): void`; `setThemePreference(p): void` (persists + applies + notifies); `useThemePreference(): [ThemePreference, (p: ThemePreference) => void]`; `themeInitScript: string` (inline `<head>` script, run before paint).

- [ ] **Step 1: Write the failing test `frontend/tests/lib/theme.test.ts`**

```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY, applyThemePreference, readThemePreference, setThemePreference, themeInitScript, useThemePreference,
} from '@/lib/theme';

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

- [ ] **Step 3: Implement `frontend/lib/theme.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'oba-theme';

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

export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p);}}catch(e){}})();`;
```

- [ ] **Step 4: Run it**

Run: `npm test -- tests/lib/theme.test.ts`
Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts tests/lib/theme.test.ts
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
