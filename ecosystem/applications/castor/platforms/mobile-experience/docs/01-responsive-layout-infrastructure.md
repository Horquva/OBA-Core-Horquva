# Responsive Layout Infrastructure — Specification & Implementation Record

**Author:** Asfand Nadeem — Mobile Experience Engineer
**Component:** Mobile Experience Platform
**Branch:** `platform/mobile-experience`
**Related Constitutional Reference:** Castor v1.0, Part C.1

---

## 1. Purpose

This document specifies the reusable responsive layout infrastructure that all Castor frontend
features must build on top of. It replaces one-off, per-feature media-query logic with a shared,
deterministic set of layout primitives.

## 2. Breakpoint Matrix

| Class | Alias | Min Width | Max Width | Typical Devices |
|---|---|---|---|---|
| `xs` | Small Mobile | 0px | 359px | Small phones |
| `sm` | Large Mobile | 360px | 767px | Standard/large phones |
| `md` | Tablet | 768px | 1023px | Tablets, foldables (unfolded) |
| `lg` | Desktop | 1024px | 1439px | Laptops, small desktops |
| `xl` | Wide Desktop | 1440px+ | — | Large monitors |

Breakpoints are defined once, centrally, and consumed everywhere — never hard-coded inline in a
component.

## 3. Layout Primitives

| Primitive | Responsibility |
|---|---|
| `Container` | Constrains max-width, applies responsive horizontal padding, centers content |
| `Stack` | Vertical/horizontal flex layout with responsive gap |
| `Grid` | Adaptive column grid (auto-collapses column count by breakpoint) |
| `SafeArea` | Applies `env(safe-area-inset-*)` padding for notches/home-indicators |
| `AspectBox` | Maintains aspect ratio for media/cards across viewports |

## 4. Fluid Sizing Rules

- Typography scales using `clamp()` between a mobile-min and desktop-max, never fixed `px` alone.
- Spacing uses a fixed 4px-based scale (4/8/12/16/24/32/48/64) — no arbitrary spacing values.
- Components never use fixed pixel widths for content containers; only `max-width` + fluid `width`.
- Images/media use `width: 100%; height: auto` with explicit `aspect-ratio` to prevent layout shift.

## 5. Overflow & Scrolling Rules

- No component may cause horizontal page overflow at any supported breakpoint (`xs` → `xl`).
- Long text truncates via `text-overflow: ellipsis` with an accessible full-text fallback (title/aria-label),
  never silent clipping.
- Scroll containers use `overscroll-behavior: contain` to prevent scroll-chaining into the page body
  (critical for modal sheets and drawers).

## 6. Orientation Handling

- Layout primitives listen to orientation via `matchMedia('(orientation: portrait)')`, not just width,
  since a landscape phone and a portrait tablet can share a width range.
- Bottom navigation and modal sheets recompute safe-area insets on orientation change.

## 7. Safe-Area Handling

- All fixed-position UI (bottom nav, drawers, sheets) pads using `env(safe-area-inset-bottom)`,
  `env(safe-area-inset-top)`, `env(safe-area-inset-left/right)`.
- `viewport-fit=cover` is required in the document meta viewport for safe-area insets to resolve.

## 8. Engineering Constraints

- Deterministic: a component's layout at a given viewport width must be reproducible, not
  "approximately right."
- No competing spacing/typography scale may be introduced outside this system — gaps are recorded
  and escalated to the Design System Platform (per Castor Part C.3), not silently patched locally.

## 9. Deliverable Status

Implemented in code under `code/layout/`:
- `breakpoints.js` — central breakpoint tokens + media query helpers
- `useBreakpoint.js` — React hook exposing current breakpoint class
- `Container.jsx`, `Grid.jsx` — layout primitives
- `safe-area.css` — safe-area utility classes

Status: **Specification complete — reference implementation provided, pending integration into the
locked Castor repository and Design System token wiring.**
