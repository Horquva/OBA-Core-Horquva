# Mobile Experience Platform

**Owner:** Asfand Nadeem
**Branch:** platform/mobile-experience
**Week:** 2
**Status:** In Progress

---

## About This Platform
See the task document provided by Horquva for full responsibilities and deliverables.

## Deliverables

### Responsive Layout Infrastructure (`src/`)
A standalone TypeScript/React package, `@castor/mobile-experience-layout`, providing:

- **Breakpoints** (`breakpoints.ts`) — centralized, deterministic device-class
  boundaries (small mobile / large mobile / tablet / desktop at 0 / 400 / 768 /
  1024px), plus a pure `resolveBreakpoint(width)` function and media-query
  helpers. All other primitives derive from this single source.
- **Layout primitives** (`Box`, `Stack`, `Row`, `Cluster`) — reusable
  composition primitives instead of one-off flex/margin styling.
- **Container** — fluid width with per-breakpoint max-width, safe-area-aware
  horizontal padding via `env(safe-area-inset-*)`.
- **Grid** — adaptive grid with explicit, deterministic column counts per
  breakpoint (CSS-driven, no resize listener).
- **Overflow guard** — applied by default on every primitive to prevent
  accidental horizontal scroll (long content, oversized images/tables/flex
  children).
- **`useBreakpoint()` / `useOrientation()`** — `matchMedia`-based hooks (not
  `resize` listeners) for the rare cases where JS, not CSS, needs to branch
  on device class or orientation.
- **`layout.css`** — the CSS layer backing all of the above (custom
  properties, media queries, safe-area handling).

### Design System Gap (see `src/tokens.ts` for details)
`ecosystem/applications/castor/packages/design-tokens/` and
`ecosystem/applications/castor/packages/ui/` currently contain no published
tokens or components (empty except `.gitkeep`). This package therefore
defines a **small, clearly-scoped placeholder spacing scale**, not a
competing design system — it exists only so the primitives above have
deterministic values instead of hardcoded magic numbers. When the Design
System platform publishes canonical tokens, `tokens.ts` should be updated to
re-export them so consumers of this package don't need to change imports.

### Validation
- `npm run typecheck` — passes (`tsc --noEmit`)
- `npm run lint` — passes (ESLint, 0 errors/warnings)
- `npm test` — 21/21 tests passing (Vitest + Testing Library), covering
  breakpoint resolution, Container safe-area/overflow behavior, Grid column
  overrides, Stack/Row/Cluster spacing and wrapping, and orientation
  detection.

### Boundary note
This package is intentionally standalone (its own `package.json`,
`tsconfig.json`) rather than wired into a monorepo tool, because no
monorepo/workspace tooling exists at the repo root and the only real
frontend app (`/frontend`, Next.js) sits outside this platform's directory
boundary. See PR description / commit message for the full inspection
findings that led to this approach.

## Notes
Any decisions, blockers, or important notes go here.
