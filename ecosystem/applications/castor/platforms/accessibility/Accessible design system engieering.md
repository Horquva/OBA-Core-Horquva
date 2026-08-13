**Accessible Design System Engineering**

**Week 3 --- CASTOR Accessibility Platform**

*Author: Ayla Sajid \| Platform: Accessibility Platform \| Week 3 \| Based on: Week 2 (Days 1--4) --- Accessibility Fundamentals, Standards v0.1, Review Framework, Readiness Report \| Roadmap Reference: PART-3 --- Accessible Design System Engineering*

0\. Purpose & Continuity from Week 2

Week 2 established what accessibility means for Castor (Day 1), a testable rule set --- Standards v0.1 (Day 2), a set of practical review checklists (Day 3), and an honest account of what was still unproven (Day 4). The Week 3 Readiness Report flagged five specific gaps. This document is structured so each PART directly closes or advances one of those gaps rather than starting a parallel track.

  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Week 2 Gap (Day 4 Report)**                                              **Addressed In**
  -------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------
  Standards not yet validated against real Design System components          Part D --- Core Component Accessibility Audit

  No component-level specification exists yet                                Part E --- Component Accessibility Contract

  No enforcement mechanism / gate for when checklists run                    Part F --- Accessible Component Review Pipeline

  Standards v0.1 not yet reviewed/approved, some rules may need adjustment   Part A/B/C --- Standards extended to tokens; flagged for the same CTO/Design System sign-off

  Mobile (Flutter) coverage lighter than web                                 Carried forward --- explicitly scoped out of Week 3, flagged in Section 10 for Week 4/5
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

1\. Objective

Move from accessibility documentation to accessibility implementation standards, so the Castor Design System produces accessible experiences by default rather than relying on every product engineer to re-derive Week 2\'s rules independently.

2\. Part A --- Design Token Accessibility

Every token category is audited against the same five-step model used throughout this document: Token → Accessibility Requirement → Allowed Usage → Forbidden Usage → Validation Method. Requirements below are derived directly from Accessibility Standards v0.1 (Day 2) --- no new numeric thresholds are introduced without tracing back to an existing rule.

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Token Category**   **Accessibility Requirement**                                                                                           **Allowed Usage**                                                                   **Forbidden Usage**                                                                **Validation Method**
  -------------------- ----------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------- ---------------------------------------------------------------------------------- --------------------------------------------------------------------------------------
  Color Tokens         Every text/background and non-text pairing must meet WCAG 2.2 AA contrast (4.5:1 text, 3:1 large text/icons/borders).   Tokens from the approved contrast-checked palette only.                             Ad hoc hex values; low-contrast pairings for body text or status colors.           Automated contrast check (Figma plugin / CI contrast linter) on every token pairing.

  Typography Tokens    Text must stay legible and reflow at up to 200% zoom; body text defaults to a readable minimum size.                    Rem/em-based type scale; minimum 16px-equivalent body size.                         Fixed px sizes that block browser zoom; meaningful text baked into images.         Zoom-to-200% visual regression check; automated font-size lint.

  Spacing Tokens       Spacing must preserve tap-target separation and reading order at all breakpoints.                                       Spacing scale that keeps adjacent touch targets separated to avoid mis-taps.        Negative/zero spacing that causes overlapping interactive elements.                Responsive snapshot review at standard breakpoints.

  Sizing Tokens        Interactive elements must meet minimum touch-target sizing per platform.                                                Web 24x24px minimum (44x44px preferred); iOS 44x44pt; Android 48x48dp.              Icon-only controls sized below platform minimums.                                  Component checklist target-size measurement (Day 3 framework).

  Border Tokens        Borders used to convey state (error, focus, required) must carry a non-color signal too.                                Border-width tokens paired with icon/text state cues.                               Color-only borders as the sole indicator of validity or state.                     Manual review against Rule 9 (Error Messages) and Rule 7 (Icons).

  Elevation            Elevation/shadow must not be the only cue separating interactive from static content.                                   Shadow tokens paired with clear boundaries or labels.                               Relying on subtle shadow alone to imply clickability.                              Design review + screen-reader spot check (elevation is invisible to AT).

  Motion               Animation must respect reduced-motion system settings and avoid vestibular triggers.                                    Motion tokens gated behind prefers-reduced-motion; short, purposeful transitions.   Auto-playing, looping, or large-parallax motion with no reduced-motion fallback.   Automated prefers-reduced-motion check + manual review.

  Focus Tokens         Every focusable element must show a visible indicator meeting 3:1 contrast against adjacent colors.                     Dedicated focus-ring token, never fully removed.                                    outline: none (or equivalent) with no replacement style.                           Keyboard Testing Checklist (Day 3) --- focus indicator step.

  State Tokens         Hover, active, disabled, selected, and error states must remain perceivable without relying on color alone.             State tokens paired with icon, text, or pattern changes.                            State communicated by color shift only (e.g., disabled = grey text alone).         Component checklist + automated contrast check per state.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

3\. Part B --- Color Accessibility

Extends Standards v0.1 Rule 1 (Color Contrast) and Rule 9 (Error Messages) from generic text/background rules into the specific surfaces the Design System has to cover: interactive states, charts, status colors, and theming.

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Surface**                             **Rule**                                                                                                               **Source / Status**
  --------------------------------------- ---------------------------------------------------------------------------------------------------------------------- ---------------------------------------------------------------------------------
  Text contrast                           4.5:1 normal text / 3:1 large text (18pt+ / 14pt+ bold)                                                                Carried forward from Standards v0.1, Rule 1.

  Non-text contrast                       3:1 for icons, input borders, focus indicators                                                                         Carried forward from Standards v0.1, Rule 1.

  Interactive & disabled states           State changes must be visible in contrast, not color hue alone                                                         New --- extends Rule 1 to component states for the Design System.

  Charts & data visualization             Series must be distinguishable without color (pattern, label, or shape) and each series meets 3:1 against background   New for Week 3 --- required for Visualization Platform alignment.

  Status colors (error/success/warning)   Always paired with icon + text, never color-only                                                                       Directly extends Rule 9 (Error Messages) to all status colors, not just errors.

  Dark mode / light mode                  Contrast ratios re-verified independently in each theme; tokens are not assumed to invert safely                       New --- Day 1/2 research flagged dark mode as unaddressed.

  High-contrast scenarios                 Design tokens must have a high-contrast fallback path                                                                  New --- supports users with low vision / OS-level high-contrast settings.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**Critical principle carried forward unchanged from Day 1: color must never be the only channel communicating meaning.**

4\. Part C --- Typography

Validates the typography rule from Standards v0.1 (Rule 3) at the token and component level:

-   Text hierarchy: heading levels map 1:1 to type-scale tokens --- no skipped levels (Rule 6, Semantic Labelling).

-   Readable sizing: body text defaults to 16px-equivalent minimum.

-   Line height, spacing, and long-form readability: minimum 1.5x line height for body copy.

-   Text scaling / zoom: layout must reflow, not clip, at up to 200% (Rule 3 and Rule 10).

-   Truncation & overflow: truncated text must retain a full-text equivalent (title attribute or tooltip) for sighted users, and never truncate the accessible name for screen readers.

5\. Part D --- Core Component Accessibility Audit

This is the first pass the Day 4 report called for: validating Standards v0.1 and the Day 3 checklists against Castor\'s actual Design System components, one component at a time. Each row below is queued against the Component Checklist (or the more specific checklist noted) and will be updated with Pass / Fail / Needs Remediation as audits complete.

  ------------------------------------------------------------------------------------------------------------------------------------------------------
  **Component**   **Audit Status**                       **Checklist Applied**                                         **Owner**
  --------------- -------------------------------------- ------------------------------------------------------------- ---------------------------------
  Button          Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Link            Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Input           Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Textarea        Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Select          Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Checkbox        Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Radio           Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Switch          Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Combobox        Not yet audited --- queued this week   Component + Keyboard Testing Checklist (focus trap/restore)   Component Owner (Design System)

  Dropdown        Not yet audited --- queued this week   Component + Keyboard Testing Checklist (focus trap/restore)   Component Owner (Design System)

  Dialog          Not yet audited --- queued this week   Component + Keyboard Testing Checklist (focus trap/restore)   Component Owner (Design System)

  Modal           Not yet audited --- queued this week   Component + Keyboard Testing Checklist (focus trap/restore)   Component Owner (Design System)

  Tooltip         Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Popover         Not yet audited --- queued this week   Component + Keyboard Testing Checklist (focus trap/restore)   Component Owner (Design System)

  Tabs            Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Accordion       Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Navigation      Not yet audited --- queued this week   Navigation Validation Checklist                               Component Owner (Design System)

  Breadcrumb      Not yet audited --- queued this week   Navigation Validation Checklist                               Component Owner (Design System)

  Pagination      Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Table           Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Card            Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Alert           Not yet audited --- queued this week   Component Checklist + Dynamic Content review (Week 4)         Component Owner (Design System)

  Toast           Not yet audited --- queued this week   Component Checklist + Dynamic Content review (Week 4)         Component Owner (Design System)

  Loading         Not yet audited --- queued this week   Component Checklist + Dynamic Content review (Week 4)         Component Owner (Design System)

  Empty State     Not yet audited --- queued this week   Component Checklist                                           Component Owner (Design System)

  Error State     Not yet audited --- queued this week   Component Checklist + Dynamic Content review (Week 4)         Component Owner (Design System)
  ------------------------------------------------------------------------------------------------------------------------------------------------------

*This table is the seed of the Component Accessibility Matrix deliverable --- it will be updated in place rather than recreated as audits complete.*

6\. Part E --- Component Accessibility Contract

A reusable specification every Design System component must satisfy before it is considered accessibility-complete. Fields map directly to the Component and Screen Reader checklists from Day 3, so passing a contract review is equivalent to passing those checklists --- the contract exists so this doesn\'t have to be reasoned about from scratch per component.

Contract Template

-   Role --- the semantic role the component exposes to the accessibility tree

-   Name --- how its accessible name is computed

-   Description --- optional supplementary context (aria-describedby)

-   Keyboard --- every key that operates it and what each does

-   Focus --- entry, interaction, exit, and recovery behavior

-   State --- how state changes are exposed (not by color alone)

-   Error --- how validation/error states attach, if applicable

-   Responsive --- touch target and reflow behavior across breakpoints

-   Screen Reader --- exactly what gets announced, and when

-   Automated Tests --- which CI rule set covers this component

Worked Example --- Button

  ---------------------------------------------------------------------------------------------------------------------
  **Field**         **Specification**
  ----------------- ---------------------------------------------------------------------------------------------------
  Role              button (native \<button\> or role=\"button\" only when a native element is unavailable)

  Name              Visible label text, or aria-label for icon-only buttons

  Description       Optional aria-describedby for supplementary context (e.g., \"Opens in a new tab\")

  Keyboard          Reachable via Tab; activates on Enter and Space; no custom key trapping

  Focus             Visible focus ring meeting 3:1 contrast; focus never removed or hidden

  State             Disabled, loading, and pressed states exposed via aria-disabled / aria-pressed, not styling alone

  Error             N/A at the component level; inherited from the form field it submits, if applicable

  Responsive        Minimum touch target maintained at all breakpoints (24--44px web, platform minimums on native)

  Screen Reader     Announces role \"button\", accessible name, and current state (e.g., \"disabled\")

  Automated Tests   axe-core rule set: button-name, color-contrast, focus-visible, aria-allowed-attr
  ---------------------------------------------------------------------------------------------------------------------

*The remaining 25 components in Part D each receive this same contract as their audit status moves from \"Not yet audited\" to \"Reviewed.\" Button is completed first because it is the highest-reuse, highest-risk component in the system --- a defect here propagates everywhere.*

7\. Part F --- Accessible Component Review Pipeline

This directly answers the Day 4 report\'s open question: \"no enforcement mechanism yet --- no process for when checklists get run.\" Every component entering the Castor Design System now passes through eight gates, in order, before it is release-eligible.

  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Gate**                            **Owner**                               **Pass Condition**
  ----------------------------------- --------------------------------------- ----------------------------------------------------------------------------------------------------------
  1\. Design Review                   Design System owner                     Component design uses approved tokens; states, error, and empty variants are specified.

  2\. Semantic Review                 Ayla (Accessibility Platform)           Correct native element / ARIA role chosen; no div/span substituting for interactive semantics.

  3\. Keyboard Review                 Ayla + Frontend Engineering             Full Keyboard Testing Checklist (Day 3) run against the component in isolation.

  4\. Focus Review                    Ayla + Frontend Engineering             Entry, interaction, exit, and recovery focus behavior verified per the Component Accessibility Contract.

  5\. Screen Reader Review            Ayla                                    Screen Reader Checklist (Day 3) run with VoiceOver/NVDA; announced name, role, and state confirmed.

  6\. Responsive Review               Design System owner                     Component holds up at 200% zoom and at minimum supported viewport width.

  7\. Automated Accessibility Tests   Experience Quality Platform (Khubaib)   axe-core / equivalent CI rule set passes with zero violations before merge is unblocked.

  8\. Quality Review                  Experience Quality Platform             Final sign-off recorded in the Component Accessibility Matrix; component marked release-eligible.
  --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

A component that fails any gate returns to the owning stage rather than proceeding --- gates are sequential, not parallel checkboxes, so a Keyboard failure blocks Screen Reader review from starting.

8\. Deliverables

-   Accessible Design System Audit (tracker --- this document, Part D)

-   Accessibility Token Standard (Part A)

-   Color Accessibility Standard (Part B)

-   Typography Accessibility Standard (Part C)

-   Component Accessibility Contracts (template + Button worked example, Part E)

-   Keyboard Interaction Standards (carried forward from Day 3, extended in Part E)

-   Focus Management Standards (carried forward from Day 3, extended in Part E)

-   Accessible Form Standard (extends Standards v0.1 Rule 8, scheduled for component-level pass)

-   Accessible Feedback Standard (extends Rule 9; covers Alert/Toast --- scheduled for component-level pass)

-   Accessible State Standard (Part A, State Tokens)

-   Component Accessibility Matrix (tracking sheet seeded in Part D, populated as audits complete)

-   Design System Accessibility Readiness Report (Section 10 of this document --- Carried-Forward Risks Into Week 4)

9\. Exit Gate

**Ayla must demonstrate that Castor\'s foundational components can be consumed by Frontend Engineering without requiring every product engineer to independently reinvent accessibility behavior.**

Practically, this means: the Component Accessibility Contract exists and is populated for at least the highest-reuse components (starting with Button), the Review Pipeline is documented and has an assigned owner per gate, and the Component Accessibility Matrix is live and trackable rather than theoretical.

10\. Carried-Forward Risks Into Week 4

-   Mobile (Flutter) component contracts are not yet started --- Day 1 flagged custom-painted widgets as the specific risk area; this needs its own pass once mobile screens are further along.

-   Standards v0.1 and this week\'s token/color extensions are both still pending formal CTO / Design System owner sign-off.

-   Automated CI integration (gate 7 of the Review Pipeline) depends on the Experience Quality Platform\'s test infrastructure, which is PART-4 scope, not yet built.

-   No real assistive-technology user testing has occurred yet --- the Screen Reader Review gate currently relies on Ayla\'s own testing, not an external AT user.