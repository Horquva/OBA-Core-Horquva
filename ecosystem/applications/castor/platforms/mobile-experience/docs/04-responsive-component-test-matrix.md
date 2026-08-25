# Responsive Component Test Matrix — Specification & Implementation Record

**Author:** Asfand Nadeem — Mobile Experience Engineer
**Component:** Mobile Experience Platform
**Branch:** `platform/mobile-experience`
**Related Constitutional Reference:** Castor v1.0, Part C.5 / Part D.6

---

## 1. Purpose

Defines the required test dimensions for every applicable Mobile Experience component, and
provides a reference test matrix + example test implementations.

## 2. Viewport Test Set

| Viewport Class | Reference Width | Reference Height |
|---|---|---|
| Small Mobile (`xs`) | 320px | 640px |
| Large Mobile (`sm`) | 414px | 896px |
| Tablet (`md`) | 834px | 1112px |
| Desktop (`lg`) | 1280px | 800px |

## 3. Test Dimension Matrix

For every applicable component, tests must cover the intersection of:

| Component | xs | sm | md | lg | Loading | Error | Empty | Disabled | Keyboard | A11y |
|---|---|---|---|---|---|---|---|---|---|---|
| `Container` | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ |
| `Grid` | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — | ✅ |
| `BottomNav` | ✅ | ✅ | n/a | n/a | — | — | — | ✅ | ✅ | ✅ |
| `SideDrawer` | n/a | n/a | ✅ | ✅ | — | — | — | — | ✅ | ✅ |
| `ModalSheet` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |

`n/a` marks a breakpoint the component is not designed to render at (e.g. `BottomNav` is
mobile-only by contract, not an oversight).

## 4. Behavioral (not snapshot-only) Assertions

Per Castor Part C.5, tests validate **behavior**, not just visual snapshots:

- **Touch target size**: computed bounding box ≥ 44×44px at `xs`/`sm`.
- **Focus order**: tab sequence matches visual/DOM reading order at every breakpoint.
- **Route sync**: nav active-state matches current route after programmatic navigation.
- **Gesture dismissal**: `ModalSheet` dismisses only past the drag distance+velocity threshold,
  not on small internal scroll gestures.
- **Safe-area padding**: fixed nav elements apply non-zero bottom padding when
  `env(safe-area-inset-bottom)` is present (simulated in test environment).
- **No horizontal overflow**: `document.documentElement.scrollWidth` does not exceed viewport
  width at any tested breakpoint.

## 5. Accessibility Assertions

- Every interactive element has an accessible name (visible text or `aria-label`).
- Active/selected nav state is exposed via `aria-current` or `aria-selected`, not color alone.
- Overlay components (`SideDrawer` overlay mode, `ModalSheet`) trap focus while open and restore
  focus to the trigger element on close.

## 6. Reference Test Implementation

Implemented in code under `code/tests/`:
- `responsive-test-matrix.test.jsx` — example test suite exercising the matrix above against
  `BottomNav`, `SideDrawer`, and `ModalSheet` using a viewport-mocking helper.

## 7. Deliverable Status

Status: **Specification complete — reference test suite provided as a pattern for the team;
full CI integration (lint/type/build/test pipeline) must occur inside the locked Castor repository
per Part A.6 and Part C.6 quality gates.**
