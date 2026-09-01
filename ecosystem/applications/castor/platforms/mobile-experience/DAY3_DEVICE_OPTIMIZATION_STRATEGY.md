# Day 3 — Device Optimization Strategy

**Platform:** Mobile Experience Platform
**Owner:** Asfand Nadeem
**Sprint:** Castor Week 2
**Status:** Draft for review

---

## 1. Objective

Document performance and optimization guidelines so that future mobile implementation (expected to use Flutter for cross-platform delivery) remains fast, reliable, and battery/network-conscious across a wide range of devices.

---

## 2. Performance Guidelines

- **Target 60fps** for all animations and scroll interactions; any frame consistently taking longer than ~16ms causes visible jank.
- **First meaningful content under 2 seconds** on a typical mid-range device and 4G connection.
- **Avoid layout thrash** — batch UI updates instead of triggering multiple re-layouts per frame.
- **Defer non-critical work** (analytics calls, prefetching) until after the first frame renders.

---

## 3. Device Optimization Strategy

| Concern | Strategy |
|---|---|
| **Low-end devices** | Provide a "lite" rendering path: fewer simultaneous animations, simpler shadows/blurs |
| **Variable network quality** | Cache aggressively, degrade gracefully to cached/offline data rather than blocking UI |
| **Battery constraints** | Avoid continuous background polling; prefer push/notification-driven updates over polling loops |
| **Memory constraints** | Virtualize long lists (never render off-screen items), release image caches for off-screen content |

---

## 4. Responsive Component Behavior

Components must declare how they behave at each breakpoint (from Day 1) rather than relying on ad-hoc per-screen logic:

- **Cards** — full width on Compact, grid of 2–3 on Expanded+.
- **Data tables** — become stacked "card per row" on Compact; remain tabular on Expanded+.
- **Charts** — simplify axis labels and legends on Compact; full detail on Expanded+.
- Components should expose a single "density" or "compact" prop rather than maintaining separate mobile/desktop component versions — this keeps the Design System's component count sustainable.

---

## 5. Loading Experience Concepts

- **Skeleton screens** over spinners wherever the layout shape is known in advance (dashboards, lists) — this reduces perceived load time.
- **Progressive loading** — render the shell and critical content first, then stream in secondary widgets/charts.
- **Optimistic UI** for user actions (e.g., marking a notification read) — update the UI immediately, reconcile with the server in the background.

---

## 6. Offline Experience Recommendations

- Cache the last-known state of dashboards/lists locally so the app is usable (read-only) without connectivity.
- Clearly indicate offline/stale-data state with a persistent but unobtrusive banner, not a blocking error screen.
- Queue user actions taken while offline (e.g., acknowledging an alert) and sync when connectivity returns.
- Distinguish "no connection" from "server error" in messaging — they require different user understanding and recovery paths.

---

## 7. Screen Transition Guidelines

- Transitions should reinforce navigation hierarchy: pushing forward = slide-in from the right (phone), detail panels = fade/slide from the right edge (tablet side panel).
- Keep transition duration short (~200–300ms) — enterprise users performing repetitive tasks are sensitive to sluggish animation.
- Respect the OS-level "reduce motion" accessibility setting by substituting cross-fades for slides/scale animations.

---

## 8. Resource Optimization Principles

- **Images:** serve responsively sized/compressed images per device density (1x/2x/3x) rather than one large asset everywhere.
- **Fonts:** subset and preload only the weights actually used.
- **Code splitting / lazy loading:** load platform-specific or rarely used screens on demand rather than at app startup.
- **Caching layer:** shared caching strategy with the Frontend Engineering Platform so mobile and web don't diverge in cache invalidation logic.

---

## 9. Flutter-Specific Optimization Notes (for future implementation)

Since Flutter is the anticipated cross-platform framework, the following official-guidance-aligned practices are documented for the implementation phase:

- Use **`const` constructors** wherever widgets don't change, so Flutter can skip rebuilding them.
- Use **`ListView.builder`** (or `SliverList`) instead of building all list items up front — this is Flutter's built-in virtualization for long lists.
- Avoid unnecessary `setState()` calls at the top of a widget tree; scope state updates to the smallest widget that needs to rebuild.
- Use `RepaintBoundary` around complex widgets (charts, custom-painted visualizations) to isolate repaints.
- Prefer **cached network images** with disk caching for dashboard/report imagery to reduce redundant network calls.
- Profile with **Flutter DevTools** (frame rendering, widget rebuild counts) before optimizing — avoid guessing at bottlenecks.

*(Note: these are documented as guidance for the eventual engineering phase — Week 2 scope is research and documentation only, no implementation.)*

---

## 10. Device Compatibility Documentation

| Platform | Minimum Target (draft) | Notes |
|---|---|---|
| iOS | iOS 15+ | Covers ~95%+ of active iPhones as of 2026 |
| Android | Android 9 (API 28)+ | Balances reach vs. maintenance burden |
| Tablet | iPadOS 15+, Android tablets 9+ | Same OS floor as phone |
| Web (responsive fallback) | Evergreen browsers (Chrome, Safari, Edge, Firefox, last 2 versions) | For browser-based mobile access |

*(Exact minimum OS versions to be confirmed with Frontend Engineering Platform before finalizing.)*

---

## 11. AI Usage Note

AI (Claude) was used to research Flutter performance/optimization practices and general mobile resource-optimization strategies. Flutter-specific recommendations were cross-checked conceptually against official Flutter performance documentation before inclusion; the team should verify against the current Flutter docs at implementation time since framework guidance evolves.

---

## 12. Next Steps (Day 4 preview)

Day 4 reviews and validates everything produced across Days 1–3, audits consistency, and produces the final Mobile Experience Readiness Report for CTO review.
