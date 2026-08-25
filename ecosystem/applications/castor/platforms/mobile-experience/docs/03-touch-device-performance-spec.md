# Mobile Touch & Device Performance — Specification & Implementation Record

**Author:** Asfand Nadeem — Mobile Experience Engineer
**Component:** Mobile Experience Platform
**Branch:** `platform/mobile-experience`
**Related Constitutional Reference:** Castor v1.0, Part B.6 / Part D.3

---

## 1. Purpose

Defines engineering requirements for touch usability and runtime performance on real mobile
hardware and network conditions — not just emulator/demo conditions.

## 2. Touch Target Rules

- Minimum interactive target: **44×44px** (Apple HIG / WCAG 2.5.5 aligned), including padding —
  visual icon may be smaller than the tappable hit-area.
- Minimum 8px spacing between adjacent touch targets to prevent mis-taps.
- `hitSlop`/expanded hit-area technique used when a visual element must stay smaller than 44px
  (e.g. dense icon rows) rather than shrinking the tap target.

## 3. Press & Gesture Feedback

- All touch targets provide immediate visual feedback on `touchstart` (< 100ms), not only on
  `touchend`, so the interface feels responsive.
- Press feedback uses opacity/scale transform (GPU-accelerated), never triggers layout reflow.
- Accidental-activation prevention: press is cancelled if the touch point moves beyond an 8px
  threshold before release (treated as a scroll, not a tap).

## 4. Scroll Performance

- Scroll containers use `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain`.
- Long lists use windowing/virtualization once item count exceeds ~50 to keep frame time under
  16ms (60fps budget).
- Scroll-linked effects (parallax, sticky headers) are throttled via `requestAnimationFrame`,
  never computed directly in unthrottled scroll handlers.

## 5. Image & Asset Delivery

- Responsive images via `srcset`/`sizes` — mobile never downloads desktop-resolution assets.
- Lazy-loading (`loading="lazy"`) for below-the-fold images; above-the-fold hero content is eager.
- Explicit `width`/`height` or `aspect-ratio` on every image to reserve layout space and prevent
  cumulative layout shift (CLS).

## 6. Memory & Rendering

- Off-screen/unmounted route content is not retained in memory beyond an approved cache boundary
  (e.g. last N screens), to bound memory footprint on low-end devices.
- Animations prefer `transform`/`opacity` (compositor-only) over properties that trigger layout
  (`width`, `top`, `left`).
- Heavy computation (filtering/sorting large lists) is debounced/deferred off the main interaction
  thread where the platform allows.

## 7. Orientation Change Handling

- Portrait ↔ landscape transitions do not cause loss of scroll position, form input, or navigation
  state.
- Layout recomputes safe-area insets and breakpoint class on orientation change (see Spec 01 §6).
- Video/media components adjust aspect handling without forcing a full remount.

## 8. Network-Aware Behavior

- Loading states appear within 100ms of an interaction that triggers a network request, so the UI
  never appears frozen.
- Retry affordance provided on failure; no silent failures on poor/unstable mobile networks.
- Where supported, `navigator.connection.effectiveType` may inform (not gate) asset quality
  decisions — this is a progressive enhancement, not a hard dependency.

## 9. Performance Budgets

| Metric | Mobile Target |
|---|---|
| Time to Interactive (mid-tier device) | < 3.5s |
| Input latency (touch → visual feedback) | < 100ms |
| Scroll frame budget | ≤ 16ms/frame (60fps) |
| Cumulative Layout Shift | < 0.1 |

## 10. Deliverable Status

Implemented in code under `code/layout/` and `code/navigation/`:
- Touch target + press-feedback conventions applied across `BottomNav.jsx`, `SideDrawer.jsx`,
  `ModalSheet.jsx`.
- `useSwipeGesture.js` implements the 8px-threshold accidental-activation guard.

Status: **Specification complete — reference implementation follows these constraints; full
performance-budget verification requires profiling inside the actual Castor repository/build.**
