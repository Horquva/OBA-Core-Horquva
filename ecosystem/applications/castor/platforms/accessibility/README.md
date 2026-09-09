# Accessibility Platform — Week 2

**Author:** Ayla Sajid
**Platform:** Accessibility Platform
**Status:** Draft foundation — pending CTO / Design System owner review

## Overview

This week's work builds the foundation for how Castor approaches accessibility, moving from core concepts through to enforceable standards, practical review checklists, and a readiness report for leadership. The four documents below were produced in sequence, each building on the last:

**what accessibility means → what the specific rules are → how to check compliance → where things stand overall**

## Contents

| Day | Document | Description |
|---|---|---|
| 1 | [Accessibility_Fundamentals_DAY1.md](./Accessibility_Fundamentals_DAY1.md) | Research notes covering WCAG 2.2, the POUR framework (Perceivable, Operable, Understandable, Robust), key terminology, inclusive design principles, and platform-specific guidance (Material Design, Flutter). Establishes shared vocabulary for the team. |
| 2 | [Accessibility_Standards_v_01_DAY_2.md](./Accessibility_Standards_v_01_DAY_2.md) | v0.1 of 10 specific, testable rules covering color contrast, touch targets, typography, keyboard navigation, focus indicators, semantic structure, icons, forms, error messages, and responsive/zoom behavior. |
| 3 | [Accessibility_Review_Framework_Day_3.md](./Accessibility_Review_Framework_Day_3.md) | Six practical yes/no checklists — Component, Page, Keyboard Testing, Screen Reader, Navigation Validation, and an Issue Reporting Template — for reviewing work before it ships. |
| 4 | [Accessibility_Readiness_Report_Day_4.md](./Accessibility_Readiness_Report_Day_4.md) | Leadership-facing summary of what was completed, key decisions made, remaining risks/gaps, and recommended next steps. |

## Baseline

**Target:** WCAG 2.2, Level AA — the industry-standard bar used by most companies and referenced in most accessibility law.

## Key Numeric Thresholds

- **Contrast:** 4.5:1 for normal text, 3:1 for large text and non-text elements (icons, borders, focus indicators)
- **Touch targets:** 24x24px minimum / 44x44px recommended (Web, WCAG); 48x48dp (Android, Material Design); 44x44pt (iOS, Apple HIG)
- **Zoom/resize:** Layout and functionality must remain intact up to 200% zoom

## Remaining Gaps

- Standards not yet validated against Castor's existing Design System components
- No real assistive-technology user testing performed yet
- Mobile (Flutter) coverage is lighter than web
- Standards are still v0.1 — pending CTO and Design System owner sign-off
- No enforcement mechanism decided yet (e.g. PR gate, design review gate, QA sign-off)

## Recommended Next Steps

1. Review and sign off on Accessibility Standards v0.1 with the CTO and Design System owner
2. Run an initial audit of existing high-traffic components/pages against the Day 3 checklists
3. Decide on an enforcement point in the workflow
4. Schedule real assistive-technology testing once the audit surfaces priority areas

See the full [Readiness Report](./Accessibility_Readiness_Report_Day_4.md) for details.