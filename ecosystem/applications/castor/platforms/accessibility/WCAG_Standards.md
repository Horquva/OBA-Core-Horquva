# WCAG Standards — Castor Accessibility Baseline

## Status
- **Baseline:** WCAG 2.2, Level AA
- **Source:** Accessibility Standards v0.1 (Day 2), extended by Accessible Design System Engineering — Week 3.
- **Status:** Draft / pending formal CTO and Design System owner approval.

## Purpose
Translate the WCAG 2.2 / POUR baseline into specific, testable rules that the Castor Design System and Engineering teams can build against.

## Standards

### 1. Color Contrast
- Normal text: **4.5:1 minimum**.
- Large text: **3:1 minimum**.
- Non-text elements that convey meaning, including icons, input borders, and focus indicators: **3:1 minimum**.
- Color must never be the only channel communicating meaning.
- Check every text/background pairing with a contrast checker before shipping.

### 2. Touch Targets
- Web: **24×24 CSS px minimum**; **44×44 px preferred**.
- Android: **48×48 dp**.
- iOS: **44×44 pt**.
- Adjacent targets must have adequate spacing to avoid accidental taps.

### 3. Typography & Resizing
- Content must remain readable and functional at **200% zoom**.
- Avoid meaningful text inside images.
- Body text defaults to a minimum readable size of **16px-equivalent** on web.
- Body copy uses a minimum **1.5× line height**.
- Layout must reflow rather than clip at 200% zoom.
- Truncated text must retain a full-text equivalent for sighted users and must not truncate the accessible name for screen readers.

### 4. Keyboard Navigation
- Every interactive element must be reachable with **Tab / Shift+Tab**.
- Controls must be operable with **Enter or Space**, with arrow keys where relevant.
- Keyboard order must follow the logical/visual order.
- No functionality may become mouse-only.

### 5. Focus Indicators
- Every focusable element must have a clearly visible focus indicator.
- Focus indicators must meet **3:1 contrast** against adjacent colors.
- Never remove the default focus outline without an equally visible replacement.
- The Design System must provide a dedicated focus-ring token.

### 6. Semantic Labelling
- Use native elements for their intended purpose, such as `<button>`, `<input>`, `<nav>`, and logical `<h1>`–`<h6>`.
- Do not replace interactive semantics with styled `<div>` or `<span>`.
- Heading levels must not skip.

### 7. Icons & Non-Text Controls
- Icon-only controls require a programmatic accessible label, such as `aria-label`.
- Decorative icons must be hidden from screen readers, such as with `aria-hidden="true"`.

### 8. Forms & Labels
- Every input requires a visible, programmatically linked label.
- Placeholder text must not be the only label.
- Required fields must be indicated in text, not by color/symbol alone.
- Grouped fields require a group label.

### 9. Error Messages
- Errors must state what is wrong and how to fix it.
- Errors must not rely on color alone.
- Errors must be programmatically associated with their field.
- Errors must be announced to screen readers when they appear.

### 10. Responsive & Zoom Behavior
- Functionality available at default size must remain available at zoomed/small viewports.
- Content should reflow rather than require horizontal scrolling at standard zoom levels.

## Design System Extensions
- Interactive and disabled state changes must be perceivable without relying on hue alone.
- Charts/data series must be distinguishable without color and each series must meet 3:1 contrast against its background.
- Status colors must be paired with icon + text.
- Light and dark themes require independent contrast verification.
- Design tokens need a high-contrast fallback path.
- Motion must respect reduced-motion settings; avoid autoplaying, looping, or large-parallax motion without a reduced-motion fallback.

## Source Boundary
These rules are the requirements supported by the supplied Castor accessibility documents. Formal approval was still pending in the source material.
