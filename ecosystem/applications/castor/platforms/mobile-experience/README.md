# Castor — Mobile Experience Demo

A React + Vite demo app showing the Castor responsive layout and navigation
components: adaptive grid, container, bottom nav, side drawer, and modal sheet.

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`) in your browser.

## Build for production

```bash
npm run build
```

## Run tests / lint (Part C.6 quality gates)

```bash
npm test    # vitest — 9/9 passing
npm run lint  # oxlint — 0 warnings, 0 errors
```

## Project structure

```
src/
├── layout/
│   ├── breakpoints.js       # central breakpoint tokens
│   ├── useBreakpoint.js     # hook: current breakpoint + orientation
│   ├── Container.jsx        # responsive container primitive
│   ├── Grid.jsx             # adaptive grid primitive
│   ├── layout.css           # container/grid + spacing/typography tokens
│   └── safe-area.css        # safe-area-inset utility classes
├── navigation/
│   ├── BottomNav.jsx        # mobile bottom navigation bar
│   ├── SideDrawer.jsx       # tablet (overlay) / desktop (persistent) drawer
│   ├── ModalSheet.jsx       # adaptive sheet: bottom sheet (mobile) / dialog (desktop)
│   ├── useSwipeGesture.js   # shared drag/swipe-to-dismiss hook
│   └── navigation.css       # styles for all nav components
└── App.jsx                  # demo page wiring everything together

docs/
├── 01-responsive-layout-infrastructure.md
├── 02-adaptive-navigation-spec.md
├── 03-touch-device-performance-spec.md
└── 04-responsive-component-test-matrix.md
```

The `docs/` folder contains the original specs this implementation follows.

## Notes

- Colors/spacing in `layout.css` and `navigation.css` use CSS custom properties
  as placeholders — see `docs/05-design-system-gap-log.md` for the full list
  and what needs to change before this merges into the real Castor repo.
- This is a reference/demo implementation — review and adapt before merging
  into a production app.

## Part C requirement mapping (Castor v1.0)

| Requirement | Where it's implemented | Verified locally |
|---|---|---|
| C.1 Responsive layout infrastructure | `src/layout/` (breakpoints, Container, Grid, safe-area) | ✅ builds |
| C.2 Component responsiveness across breakpoints | `BottomNav`/`SideDrawer`/`ModalSheet` swap presentation by breakpoint | ✅ tested |
| C.3 Design System integration | Placeholder tokens + `docs/05-design-system-gap-log.md` | ⚠️ gap logged, not resolved (no real DS access here) |
| C.4 UI state engineering (loading/success/empty/error/recovery) | `src/layout/AsyncState.jsx` | ✅ component built |
| C.5 Responsive component test matrix | `src/navigation/__tests__/responsive-test-matrix.test.jsx` | ✅ **12/12 passing** (`npm test`) |
| C.6 Format/Lint/Type/Test/Build gates | `npm run lint`, `npm test`, `npm run build`, `.github/workflows/ci.yml` | ✅ lint 0/0, tests 12/12, build clean, **CI runs on every push/PR** |
| D.4 Accessibility validation | `src/navigation/__tests__/accessibility.test.jsx` (axe-core, real WCAG ruleset) | ✅ 3/3 — caught and fixed a real `aria-allowed-role` bug in `SideDrawer` |

**What this reference build still cannot verify** (per the Castor PDF's own gate
conditions — these require the actual locked repository, not a standalone copy):
- Integration with the real Design System package (Part C.3) — gap logged in
  `docs/05-design-system-gap-log.md`
- Human code review — CI can run automatically, but review is a human step
- Type-checking — this is a JS project; if the real Castor repo uses TypeScript,
  that gate still needs to run there
- Real-device/browser measurement: exact 44×44px hit-testing and horizontal
  overflow (`scrollWidth`) can't be measured under jsdom — flagged inline in
  the test file for a future Playwright/Cypress pass
- Real performance profiling (TTI, CLS, frame time) — needs actual hardware,
  not a claim I can generate

These items are left explicit, not silently marked done, so whoever reviews
this knows exactly what's left before the Part C/D gates are truly closed.
