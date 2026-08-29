# Accessible Component Review Pipeline

## Purpose
Every component entering the Castor Design System passes through **eight sequential gates** before becoming release-eligible.

A failure at any gate returns the component to the owning stage. Gates are sequential, not parallel.

## Gate 1 — Design Review
**Owner:** Design System owner

**Pass condition**
- Component uses approved accessibility tokens.
- States are specified.
- Error and empty variants are specified where applicable.

## Gate 2 — Semantic Review
**Owner:** Ayla — Accessibility Platform

**Pass condition**
- Correct native element or ARIA role is selected.
- No `div`/`span` substitutes for interactive semantics.

## Gate 3 — Keyboard Review
**Owner:** Ayla + Frontend Engineering

**Pass condition**
- Full Keyboard Testing Checklist is run against the component in isolation.
- All required keyboard operations work.

## Gate 4 — Focus Review
**Owner:** Ayla + Frontend Engineering

**Pass condition**
- Focus entry, interaction, exit, and recovery behavior are verified against the Component Accessibility Contract.
- Focus indicator is visible and meets the required contrast.

## Gate 5 — Screen Reader Review
**Owner:** Ayla — Accessibility Platform

**Pass condition**
- Screen Reader Checklist is run with VoiceOver/NVDA.
- Announced name, role, and state are confirmed.

## Gate 6 — Responsive Review
**Owner:** Design System owner

**Pass condition**
- Component works at 200% zoom.
- Component works at the minimum supported viewport width.
- Content does not become clipped or unusable.

## Gate 7 — Automated Accessibility Tests
**Owner:** Experience Quality Platform (Khubaib)

**Pass condition**
- axe-core or equivalent CI rule set passes with **zero violations**.
- Merge remains blocked until automated accessibility violations are resolved.

## Gate 8 — Quality Review
**Owner:** Experience Quality Platform

**Pass condition**
- Final sign-off is recorded in the Component Accessibility Matrix.
- Component is marked release-eligible.

## Review Sequence
**Design → Semantic → Keyboard → Focus → Screen Reader → Responsive → Automated Tests → Quality**

If Keyboard Review fails, Screen Reader Review does not begin until the failure is remediated.

## Evidence / Tracking
Record the result in the Component Accessibility Matrix:
- Component
- Gate/review stage
- Pass / Fail / Needs Remediation
- Owner
- Issues
- Final approval/sign-off

## Current Constraints From Source Material
- Automated CI integration depends on Experience Quality Platform test infrastructure and was not yet built in the Week 3 source.
- Formal CTO / Design System owner approval of Standards v0.1 and token/color extensions was still pending.
- External assistive-technology user testing had not yet occurred.
