**Accessibility Standards v0.1**

**Author:** Ayla Sajid | **Platform:** Accessibility Platform | **Day 2 — Week 2** **Status:** Draft for review — pending CTO approval **Baseline:** WCAG 2.2, Level AA

**Purpose**

This document translates the WCAG 2.2 / POUR principles researched on Day 1 into specific, testable rules that the Design System and Engineering teams can build against. Each rule is written so it can be checked with a clear yes/no answer — this is what makes it enforceable rather than just a guideline.

These are v0.1 — a first draft baseline. They are expected to be reviewed, challenged, and refined by the CTO and Design System owner before being finalized.

**1. Color Contrast**

**Rule:** Text must meet a minimum contrast ratio against its background:

- Normal text (under ~18pt, or under ~14pt bold): **4.5:1** minimum

- Large text (18pt+ regular, or 14pt+ bold): **3:1** minimum

- Non-text elements that convey meaning (icons, input borders, focus indicators): **3:1** minimum

**Why it matters:** Low-vision and color-blind users can't distinguish text from background at low contrast. This is one of the most common — and most expensive to retrofit — accessibility failures.

**How to check:** Use a contrast checker (e.g. WebAIM Contrast Checker, or built into most design tools like Figma plugins) on every text/background color pairing before it ships.

**2. Touch Targets**

**Rule:** Interactive elements (buttons, icons, links, form controls) must have:

- **Android (Material Design):** Use 48x48dp (density-independent pixels) for the full touch area.

- **iOS (Apple HIG):** Use 44x44pt (points) for interactive controls.

- **Web (WCAG):** Use a minimum of 24x24 CSS pixels, though 44x44px is strongly recommended for comfort. 24x24px is the official WCAG 2.2 AA requirement; 44x44px is WCAG's own AAA/enhanced target plus the Apple/Google platform standard — use it for primary buttons.


- Adequate spacing between adjacent targets to avoid accidental taps

**Why it matters:** Small tap targets are hard or impossible to use for people with tremors, limited fine motor control, or larger fingers — and cause frustration for everyone on mobile. Thus the above touch targets are for different types of interfaces used by the users.

**3. Typography & Resizing**

**Rule:**

- Text must remain readable and functional when resized up to **200%** without breaking layout or cutting off content.

- Avoid embedding meaningful text inside images — use real text so it can be resized, read by screen readers, and translated.

- Body text should default to a minimum readable size (commonly 16px equivalent on web).

**Why it matters:** Low-vision users often zoom browsers/apps significantly. If layout breaks or text gets clipped at 200%, the content becomes unusable.

**4. Keyboard Navigation**

**Rule:** Every interactive element must be:

- Reachable using **Tab** / **Shift+Tab**

- Operable using **Enter** or **Space** (and arrow keys where relevant, e.g. menus, sliders)

- Reachable in a logical order that matches the visual layout

**Why it matters:** Many users — including those with motor impairments and screen reader users — cannot or do not use a mouse. If something can't be reached or activated by keyboard, it's completely unusable to them, not just inconvenient.

**5. Focus Indicators**

**Rule:**

- Every focusable element must show a clearly visible focus indicator (e.g. outline, highlight) when navigated to via keyboard.

- Focus indicators must meet the **3:1** contrast rule against adjacent colors.

- Never remove default focus outlines (e.g. outline: none in CSS) without replacing them with an equally visible custom style.

**Why it matters:** Without a visible focus indicator, keyboard users lose track of where they are on the page entirely.

**6. Semantic Labelling**

**Rule:**

- Use real HTML/native elements for their intended purpose **(<button> for buttons, <nav> for navigation, proper heading tags <h1>–<h6> in logical order).**

- **Do not use generic containers (<div>, <span>)** styled to look like interactive elements without the correct semantics.

- Heading levels must not skip (e.g. don't jump from H1 straight to H3).

**Why it matters:** Screen readers build a "map" of the page from semantic structure. Skipping this makes navigation confusing or broken for screen reader users, even if the page looks fine visually.

**7. Icons & Non-Text Controls**

**Rule:**

- Any icon used as a button/control (with no visible text label) must have a programmatic label (e.g. aria-label="Close") so screen readers can announce its function.

- Decorative icons that convey no information should be hidden from screen readers (e.g. aria-hidden="true") so they don't add noise.

**Why it matters:** A screen reader can't infer meaning from an icon's shape — without a label, it either announces nothing useful or reads a meaningless filename.

**8. Forms & Labels**

**Rule:**

- Every input field must have a visible, programmatically-linked label — not placeholder text alone (placeholders disappear on input and often fail contrast rules).

- Required fields must be indicated in text, not by color/symbol alone.

- Grouped fields (e.g. radio button sets) must have a group label.

**Why it matters:** Placeholder-only labels vanish once a user starts typing, and screen readers may not reliably announce them — leaving users unsure what a field is for.

**9. Error Messages**

**Rule:**

- Errors must be described in specific text (what's wrong + how to fix it), not conveyed by color alone.

- Errors must be programmatically associated with their field and announced to screen readers when they appear (not just visually inserted).

**Why it matters:** A red border alone communicates nothing to colorblind users or screen reader users, and vague messages ("Invalid input") don't tell anyone what to actually fix.

**10. Responsive & Zoom Behavior**

**Rule:**

- All functionality available at default zoom/screen size must remain available when zoomed in or on small viewports — no features should become mouse-only or disappear.

- Content should reflow rather than requiring horizontal scrolling at standard zoom levels.

**Why it matters:** Users who zoom in (low vision) or use small devices shouldn't lose access to functionality that's available to everyone else.