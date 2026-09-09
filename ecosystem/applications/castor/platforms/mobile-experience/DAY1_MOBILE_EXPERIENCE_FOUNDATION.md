# Day 1 — Mobile Experience Foundation

**Platform:** Mobile Experience Platform
**Owner:** Asfand Nadeem
**Sprint:** Castor Week 2
**Status:** Draft for review

---

## 1. Objective

Establish the foundational architecture for how Horquva experiences (starting with WOBA) adapt across mobile phones, tablets, and future devices. This document defines the responsive principles, breakpoint strategy, device categories, and layout adaptation model that every future Castor interface will inherit.

---

## 2. Mobile Experience Architecture

The Mobile Experience Platform sits inside Castor's Experience Engineering layer and is responsible for translating the same organizational intelligence delivered on desktop into a form that works naturally on smaller, touch-first, and often single-handed devices.

Core architectural layers:

1. **Content Layer** — the organizational data/intelligence coming from OBA (Organizational Brain), unchanged across devices.
2. **Adaptation Layer** — device-aware logic that decides how content is laid out, reordered, or collapsed (this is what the Mobile Experience Platform owns).
3. **Presentation Layer** — the actual rendered components, shared with the Design System Platform.

Rather than building a separate "mobile app" experience, the architecture treats mobile as a **first-class rendering target** of the same constitutional design system — not a scaled-down desktop.

---

## 3. Responsive Design Principles

These principles guide every Mobile Experience decision:

- **Mobile-first, not desktop-shrunk.** Design the smallest viewport first, then progressively enhance for larger screens. This forces prioritization of the most important content.
- **Content reflows, it doesn't just resize.** Elements should reorganize (e.g., a table becomes a stacked card list) rather than simply shrinking, which would harm readability.
- **Touch-first interaction.** All primary actions must be reachable and usable with a thumb, not just a mouse pointer.
- **One primary action per screen.** Mobile screens have limited real estate; each view should have a clear, single primary task.
- **Progressive disclosure.** Secondary information is hidden behind expandable sections, tabs, or drill-downs rather than shown all at once.
- **Consistent visual language across devices.** Typography scale, color tokens, and spacing units come from the same Design System — only their arrangement changes.

---

## 4. Breakpoint Strategy

Horquva's breakpoints are based on common industry standards (Material Design 3 and Apple Human Interface Guidelines), adapted for enterprise dashboard use:

| Breakpoint Name | Width Range | Primary Devices |
|---|---|---|
| **Compact** | 0 – 599px | Phones (portrait) |
| **Medium** | 600 – 904px | Phones (landscape), small tablets |
| **Expanded** | 905 – 1239px | Tablets (landscape), small laptops |
| **Large** | 1240 – 1439px | Laptops, desktops |
| **Extra Large** | 1440px+ | Desktop, executive workspace monitors |

**Rules:**
- Layout changes should happen *at* a breakpoint, not somewhere in between — this keeps behavior predictable.
- No experience should assume a fixed device; breakpoints are defined by **viewport width**, not device type, since foldables and split-screen multitasking blur that line.
- Breakpoints are shared tokens with the Design System Platform so components adapt consistently everywhere they're used.

---

## 5. Device Categories

| Category | Examples | Key Constraints |
|---|---|---|
| **Phone** | iPhone, Android phones | Small viewport, one-handed use, interruptions common |
| **Tablet** | iPad, Android tablets | Larger viewport, two-hand or propped use, supports split-view |
| **Foldable / Dual-screen** | Samsung Fold, Surface Duo | Viewport can change at runtime; must handle re-layout without reload |
| **Desktop/Laptop** | Windows, macOS browsers | Mouse + keyboard, largest viewport, multitasking with other windows |

---

## 6. Layout Adaptation Model

Horquva mobile layouts follow a **column-collapse model**:

- **Desktop:** Multi-column layout (e.g., sidebar + main content + detail panel).
- **Tablet:** Two-column layout (sidebar collapses to icons, or detail panel becomes a slide-over).
- **Phone:** Single-column layout (navigation moves to a bottom bar or hamburger menu; detail panels become full-screen pushes).

This model ensures no information is lost — it's re-prioritized and re-sequenced, not removed.

---

## 7. Mobile Design Guidelines (Draft v0.1)

- Minimum touch target size: **44x44pt** (iOS) / **48x48dp** (Android).
- Base spacing unit: **8px grid**, consistent with Design System tokens.
- Font scaling must respect system-level accessibility text size settings.
- Avoid hover-dependent interactions (tooltips, hover menus) since mobile has no hover state — provide tap-based alternatives.
- Safe-area insets must be respected on notched/dynamic-island devices.

---

## 8. Screen Hierarchy

A standard Horquva mobile screen follows this hierarchy, top to bottom:

1. **Status/App Bar** — title, back navigation, primary contextual action.
2. **Primary Content Zone** — the single most important task or dataset for that screen.
3. **Secondary Content** — collapsible sections, tabs, or "show more."
4. **Bottom Navigation / Primary Actions** — persistent access to core sections of the app.

---

## 9. Responsive Planning Document Summary

| Deliverable | Status |
|---|---|
| Breakpoint strategy | Defined |
| Device categories | Defined |
| Layout adaptation model | Defined |
| Design guidelines v0.1 | Drafted |
| Screen hierarchy | Defined |

---

## 10. AI Usage Note

Research was assisted using AI (Claude) to compare responsive design methodologies and enterprise mobile patterns (Material Design 3, Apple HIG, common breakpoint conventions). All recommendations were reviewed and adapted to Horquva's context before inclusion.

---

## 11. Next Steps (Day 2 preview)

Day 2 will build on this foundation to define mobile navigation architecture (bottom nav, tablet nav, gesture handling) and adaptive layout rules in more detail.
