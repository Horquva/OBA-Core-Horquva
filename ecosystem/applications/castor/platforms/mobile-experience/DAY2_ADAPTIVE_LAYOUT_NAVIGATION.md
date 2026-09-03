# Day 2 — Adaptive Layout & Navigation

**Platform:** Mobile Experience Platform
**Owner:** Asfand Nadeem
**Sprint:** Castor Week 2
**Status:** Draft for review

---

## 1. Objective

Define how users navigate Horquva experiences on mobile and tablet devices, and how layouts adapt as orientation and screen size change — building directly on the breakpoints and device categories from Day 1.

---

## 2. Mobile Navigation Architecture

Three navigation patterns are recommended, chosen based on breakpoint (from Day 1):

| Pattern | Used At | Description |
|---|---|---|
| **Bottom Navigation Bar** | Compact (phones) | 3–5 top-level destinations, always visible, thumb-reachable |
| **Navigation Rail** | Medium / Expanded (tablets) | Condensed vertical bar on the left edge; icons + optional labels |
| **Navigation Drawer** | Expanded+ (tablet landscape, desktop-adjacent) | Full labeled sidebar, expandable from the rail |

This mirrors Material Design 3's adaptive navigation guidance and keeps the same destinations available at every breakpoint — only the *presentation* changes.

---

## 3. Bottom Navigation Concepts

For phones (Compact breakpoint):

- **3–5 destinations maximum.** More than 5 forces a cramped layout or a "More" overflow, which hides content and hurts discoverability.
- Persistent across the primary screens of the app; hidden only during focused tasks (e.g., a full-screen data entry flow).
- Each item: icon + short label, active state indicated by both color and icon fill change (not color alone, for accessibility).
- Badge support for notifications/alerts (e.g., unread insights from OBA).

**Proposed top-level destinations (draft, to align with Executive Workspace Platform):**
1. Home / Overview
2. Explore (Organizational Explorer)
3. Insights / Dashboards
4. Notifications
5. Profile / Settings

---

## 4. Tablet Navigation

At Medium/Expanded breakpoints, bottom navigation is replaced with a **navigation rail**:

- Collapsed rail: icons only, ~72px wide, anchored to the left edge.
- Expanded rail (on demand or in landscape): icons + labels, functions like a drawer.
- Rail persists regardless of orientation change — only its width/label visibility adapts.
- Supports split-view: navigation rail + list + detail pane simultaneously, since tablets have room for the two-column layout defined in Day 1.

---

## 5. Adaptive Layout Rules

- **Reflow at breakpoints, not mid-transition.** Layout shifts should be discrete jumps tied to the breakpoint table from Day 1, not continuous resizing that could disorient users mid-interaction.
- **Preserve scroll position and state** across a layout reflow (e.g., rotating a tablet) — nothing should reset to the top or lose entered data.
- **Detail views:** on Compact, detail opens as a full-screen push (with back navigation); on Expanded+, detail opens as a side panel next to the list, so context isn't lost.
- **Modals over drawers on phones**, drawers over modals on tablets — smaller screens favor full-screen focused modals.

---

## 6. Responsive Content Hierarchy

When space is constrained, content is deprioritized in this order (last to be shown, first to be hidden):

1. Primary task / main data (never hidden)
2. Key metadata (e.g., timestamps, status) — collapses into a "details" toggle
3. Secondary actions — moved into an overflow ("⋮") menu
4. Supplementary content (related items, tips) — collapsed by default on phones, shown by default on tablets/desktop

---

## 7. Orientation Behavior

| Orientation | Behavior |
|---|---|
| **Portrait (phone)** | Single column, bottom navigation |
| **Landscape (phone)** | Single column retained, but bottom nav may compress to icon-only to reclaim vertical space |
| **Portrait (tablet)** | Navigation rail (collapsed) + single/double column depending on width |
| **Landscape (tablet)** | Navigation rail (expanded) + two-column layout |

Rotation should never force a reload — state and scroll position persist through the `Adaptive Layout Rules` above.

---

## 8. Gesture Interaction Concepts

Documented (not yet implemented) gesture standards:

- **Swipe back** — standard iOS/Android back gesture from the screen edge, mirroring the platform's native back behavior.
- **Pull to refresh** — on list/dashboard views backed by live organizational data.
- **Swipe to dismiss** — for notifications and transient cards.
- **Long-press for contextual actions** — surfaces a quick-action menu without navigating away, useful for dashboard widgets.
- Gestures are always paired with a visible tappable alternative (e.g., a refresh button) for accessibility and discoverability — gestures should never be the *only* way to perform an action.

---

## 9. Navigation Flow Diagram (textual)

```
[App Launch]
     |
     v
[Home / Overview] --(bottom nav / rail)--> [Explore]
     |                                          |
     |--(tap card)--> [Detail View]             |--(tap node)--> [Detail View]
     |     (full-screen on phone,               |
     |      side panel on tablet)               |
     v                                          v
[Insights/Dashboards] <--(bottom nav / rail)--> [Notifications] --> [Profile/Settings]
```

- On Compact: each arrow = a full navigation transition (push/pop).
- On Expanded+: "Detail View" arrows open a side panel instead of navigating away from the list.

---

## 10. Cross-Platform Coordination Note

This navigation model was drafted with the Executive Workspace Platform's structure in mind so that top-level destinations stay consistent between mobile and executive/desktop experiences. Final alignment on destination names/icons to be confirmed with the Executive Workspace Platform Owner.

---

## 11. AI Usage Note

AI (Claude) was used to compare mobile navigation patterns (bottom nav vs. rail vs. drawer) across Material Design 3 and Apple HIG, and to validate common enterprise dashboard navigation conventions. All recommendations were reviewed before documenting.

---

## 12. Next Steps (Day 3 preview)

Day 3 covers device optimization strategy — performance, loading states, offline behavior, and Flutter-specific optimization guidance for future implementation.
