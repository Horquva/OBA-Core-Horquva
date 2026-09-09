**Accessibility Review Framework**

**Author:** Ayla Sajid | **Platform:** Accessibility Platform | **Day 3 — Week 2** **Based on:** Accessibility Standards v0.1 (Day 2)

**Purpose**

These checklists turn the Day 2 standards into fast, practical yes/no reviews that anyone on the team — designer, engineer, or QA — can run against a component, page, or feature before it ships. Each item should take seconds to check, not minutes.

**1. Component Checklist**

*Use when reviewing any individual UI element (button, input, card, icon, etc.)*

- [ ] Text meets 4.5:1 contrast ratio (3:1 if large/bold text)

- [ ] Non-text elements (icons, borders) meet 3:1 contrast

- [ ] Touch target for web(WCAG) is at least 24x24px (44x44px preferred)

- [ ] Touch target for Android (Material Design) is 48x48 dp

- [ ] Touch target for iOS (Apple HIG) is 44x44 pt

- [ ] Component is reachable via Tab key

- [ ] Component is operable via Enter/Space (or arrow keys if applicable)

- [ ] Component shows a visible focus indicator when tabbed to

- [ ] Real semantic element used (<button>, <input>, etc.) — not a styled <div>

- [ ] Icon-only controls have an aria-label (or are hidden if purely decorative)

- [ ] Component still works/looks correct at 200% zoom

**2. Page Checklist**

*Use when reviewing a full page or screen*

- [ ] Page has exactly one clear H1

- [ ] Heading order is logical, no skipped levels (H1 → H2 → H3)

- [ ] Tab order follows the visual/logical reading order

- [ ] No functionality is mouse-only

- [ ] Page reflows properly at 200% zoom (no clipped or overlapping content)

- [ ] No horizontal scrolling required at standard zoom/viewport

- [ ] Color is never the only way information is conveyed (e.g. errors, status)

- [ ] All images have appropriate alt text (or empty alt if purely decorative)

- [ ] Any auto-playing audio/video can be paused or stopped

**3. Keyboard Testing Checklist**

*Put the mouse away. Navigate the entire flow using only Tab, Shift+Tab, Enter, Space, and arrow keys.*

- [ ] Can reach every interactive element using Tab alone

- [ ] Tab order matches the visual layout (no jumping around unpredictably)

- [ ] Can activate every button/link with Enter or Space

- [ ] A visible focus indicator is present at every single step

- [ ] Focus never gets "trapped" in a modal/component with no way out (Escape or Tab should exit)

- [ ] Focus is not lost or reset unexpectedly (e.g. after a component closes, focus returns somewhere sensible)

- [ ] Dropdowns/menus can be opened, navigated, and closed via keyboard

**4. Screen Reader Checklist**

*Turn on a screen reader — VoiceOver (Mac/iOS, free, built-in) or NVDA (Windows, free download) — and navigate with it on, eyes-closed-style if you can.*

- [ ] Every image has alt text that is announced and makes sense

- [ ] Every form field announces its label when focused

- [ ] Buttons announce a clear, descriptive name (not "button" or a filename)

- [ ] Headings are announced with their level (e.g. "Heading level 2")

- [ ] Error messages are announced automatically when they appear

- [ ] Links make sense out of context (avoid vague link text like "click here")

- [ ] Decorative elements are silent (not announced as clutter)

- [ ] Reading order matches the visual/logical order

**5. Navigation Validation Checklist**

*Use when reviewing site/app-wide navigation (main nav, menus, breadcrumbs, skip links)*

- [ ] A "skip to main content" link is available and is the first focusable element on the page

- [ ] Main navigation is wrapped in a proper landmark (e.g. <nav>) so it's announced as navigation

- [ ] Navigation structure and order is consistent across pages (doesn't reshuffle between screens)

- [ ] Current page/section is clearly indicated, not just visually (e.g. aria-current="page")

- [ ] Dropdown/expandable menus can be opened, navigated, and closed via keyboard alone

- [ ] Nested menu items are reachable in a logical Tab order

- [ ] Breadcrumbs (if present) are marked up as an ordered list/navigation landmark, not plain text

- [ ] Link text makes sense out of context (no "click here" / "read more" with no surrounding label)

- [ ] Mobile/hamburger menu toggle is keyboard-operable and announces its expanded/collapsed state

- [ ] Screen reader users can identify how many navigation items exist and where they are in the list (e.g. "link, 3 of 8")

**6. Issue Reporting Template**

*Use this format for any accessibility issue found during a review, so issues are consistent and actionable.*

Issue: [short description of the problem]

Location: [page/component/screen where it occurs]

Why it's a problem: [who it affects and how]

Suggested fix: [what should change]

Severity: [ ] Blocker [ ] Major [ ] Minor

**Severity guide:**

- **Blocker** — completely prevents a user from completing a task (e.g. can't submit a form via keyboard at all)

- **Major** — significantly harder to use but a workaround exists (e.g. low contrast makes text hard to read)

- **Minor** — polish issue, doesn't block usage (e.g. inconsistent focus outline styling)


- Screen reader testing takes practice; it's fine to go slowly the first few times.

- Any item that fails should be logged using the Issue Reporting Template above and routed to the relevant component/page owner.

- This framework feeds into Day 4's readiness review — flag any patterns of recurring failures for that report.

**7. Review Summary**

*Complete this after running the checklists above, to record the overall outcome of the review.*

- **Overall Result:** [ ] Pass   [ ] Pass with Minor Issues   [ ] Fail

- Total issues found: ______ (Blocker: ___ Major: ___ Minor: ___)

- Summary comments: [brief note on overall state, patterns noticed, or areas needing follow-up]

- Follow-up required: [ ] Yes — logged in Issue Reporting Template [ ] No

**8. Reviewer Details**

*Record who performed this review and when, for traceability.*

| **Reviewer Name**                 | [enter name]                    |
|-----------------------------------|-----------------------------------|
| **Role / Title**                  | [e.g. QA Engineer, Design Lead] |
| **Date Reviewed**                 | [dd/mm/yyyy]                    |
| **Component(s)/Page(s) Reviewed** | [what was checked]              |
| **Approval / Sign-off**           | [name / signature]              |