# Mobile-First Adaptive Navigation — Specification & Implementation Record

**Author:** Asfand Nadeem — Mobile Experience Engineer
**Component:** Mobile Experience Platform
**Branch:** `platform/mobile-experience`
**Related Constitutional Reference:** Castor v1.0, Part B.4 / Part D

---

## 1. Purpose

Defines and implements the approved adaptive navigation model: how primary navigation changes shape
across device classes while preserving user context and route state.

## 2. Navigation Shape by Breakpoint

| Breakpoint | Navigation Shape | Trigger |
|---|---|---|
| `xs` / `sm` (mobile) | Touch-optimized **Bottom Navigation Bar** (persistent, max 5 items) | Always visible |
| `md` (tablet) | **Collapsible Side Drawer** (overlay, dismissible) | Hamburger toggle |
| `lg` / `xl` (desktop) | **Collapsible Side Drawer** (push/persistent, expandable) | Toggle or default-open |

Rationale: bottom nav keeps primary actions within thumb reach on mobile; a drawer suits larger
surfaces where horizontal space allows persistent navigation without competing with content.

## 3. Component Contracts

### 3.1 `BottomNav` (mobile)
- Fixed to viewport bottom, padded for safe-area-inset-bottom.
- Max 5 destinations; overflow items go into a "More" sheet, never truncated silently.
- Active item indicated by both color **and** icon fill state (not color alone — accessibility).
- Touch targets ≥ 44×44px (see Spec 03).

### 3.2 `SideDrawer` (tablet/desktop)
- Tablet: overlay drawer, dismiss on backdrop tap or route change.
- Desktop: persistent by default, user-collapsible; collapsed state remembered per-session.
- Traps focus while open as an overlay (tablet); does not trap focus when persistent (desktop).

### 3.3 `ModalSheet` (adaptive)
- Mobile: bottom sheet, swipe-down-to-dismiss gesture, drag handle.
- Tablet/Desktop: centered modal dialog — same component, different presentation via breakpoint prop.
- Always renders behind a scrim; scrim tap dismisses unless `dismissible={false}` (e.g. destructive
  confirmation flows).

## 4. Navigation State Model

```
User Intent → Navigation Action → Router → Route State → Screen Composition → Context → Back/Return
```

- Route state is the single source of truth for active navigation item — UI never derives "active"
  from local component state alone, to avoid drift between nav highlight and actual route.
- Drawer/sheet open-state is local UI state; it is explicitly NOT persisted into route/URL state
  (per Castor B.4 — UI State ≠ Application State ≠ Server State).

## 5. Back / Return Behavior

- Mobile hardware/gesture back closes an open sheet/drawer **before** navigating the route stack back.
- Deep-linked routes restore the correct nav highlight and drawer/bottom-nav shape for the current
  viewport on load — no flash of incorrect navigation state.

## 6. Touch Gesture Handling

- `ModalSheet` supports vertical drag-to-dismiss with a velocity + distance threshold (prevents
  accidental dismissal from small scroll gestures inside the sheet).
- `SideDrawer` (tablet overlay mode) supports edge-swipe-to-open and swipe-to-close.
- Gesture handlers use passive listeners where possible to avoid blocking scroll performance.

## 7. Failure & Recovery

- Invalid/unavailable route inside a drawer/bottom-nav destination renders an inline error state
  within the content area — navigation chrome itself never disappears or breaks.
- Network failure while loading a routed screen shows retry affordance without discarding nav state.

## 8. Deliverable Status

Implemented in code under `code/navigation/`:
- `BottomNav.jsx`, `SideDrawer.jsx`, `ModalSheet.jsx`
- `useSwipeGesture.js` — shared drag/swipe gesture hook

Status: **Specification complete — reference implementation provided, pending integration with the
locked Castor router and route-state model.**
