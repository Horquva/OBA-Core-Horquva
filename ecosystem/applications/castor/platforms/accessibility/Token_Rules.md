# Accessibility Token Rules — Castor Design System

## Token Rule Model
Every token category is evaluated using:

**Token → Accessibility Requirement → Allowed Usage → Forbidden Usage → Validation Method**

The rules below are derived from Accessibility Standards v0.1 and the Week 3 Design System extension.

## 1. Color Tokens
**Requirement**
- Text/background pairings: 4.5:1 for normal text; 3:1 for large text.
- Non-text meaning-bearing elements: 3:1.

**Allowed**
- Approved, contrast-checked palette only.

**Forbidden**
- Ad hoc hex values.
- Low-contrast body-text or status-color pairings.
- Color-only communication of state or meaning.

**Validation**
- Figma/plugin or CI contrast linting on every token pairing.
- Re-check light and dark themes independently.

## 2. Typography Tokens
**Requirement**
- Text must remain legible and reflow at 200% zoom.
- Body text defaults to 16px-equivalent minimum.
- Body copy uses 1.5× minimum line height.

**Allowed**
- Rem/em-based type scale.

**Forbidden**
- Fixed px sizing that blocks browser zoom.
- Meaningful text baked into images.

**Validation**
- 200% zoom visual regression.
- Automated font-size lint.
- Verify truncation retains a full-text equivalent and accessible name.

## 3. Spacing Tokens
**Requirement**
- Preserve tap-target separation and reading order across breakpoints.

**Allowed**
- Spacing scale that separates adjacent touch targets.

**Forbidden**
- Negative/zero spacing that causes interactive elements to overlap.

**Validation**
- Responsive snapshot review at standard breakpoints.

## 4. Sizing Tokens
**Requirement**
- Interactive elements meet platform minimum sizing.

**Allowed**
- Web: 24×24px minimum, 44×44px preferred.
- iOS: 44×44pt.
- Android: 48×48dp.

**Forbidden**
- Icon-only controls below platform minimums.

**Validation**
- Component checklist target-size measurement.

## 5. Border Tokens
**Requirement**
- Borders conveying error, focus, required, or other state must have a non-color signal too.

**Allowed**
- Border-width tokens paired with icon/text state cues.

**Forbidden**
- Color-only borders as the sole state/validity indicator.

**Validation**
- Manual review against Error Messages and Icons rules.

## 6. Elevation Tokens
**Requirement**
- Shadow/elevation must not be the only distinction between interactive and static content.

**Allowed**
- Shadows paired with clear boundaries or labels.

**Forbidden**
- Subtle shadow alone implying clickability.

**Validation**
- Design review + screen-reader spot check.

## 7. Motion Tokens
**Requirement**
- Respect reduced-motion system settings and avoid vestibular triggers.

**Allowed**
- Motion gated behind `prefers-reduced-motion`.
- Short, purposeful transitions.

**Forbidden**
- Autoplaying, looping, or large-parallax motion without a reduced-motion fallback.

**Validation**
- Automated reduced-motion check + manual review.

## 8. Focus Tokens
**Requirement**
- Every focusable element has a visible indicator with 3:1 contrast against adjacent colors.

**Allowed**
- Dedicated focus-ring token.

**Forbidden**
- `outline: none` or equivalent with no replacement.

**Validation**
- Keyboard/focus checklist.

## 9. State Tokens
**Requirement**
- Hover, active, disabled, selected, and error states remain perceivable without color alone.

**Allowed**
- Pair state tokens with icon, text, or pattern changes.

**Forbidden**
- Communicating state only through a color shift.

**Validation**
- Component checklist + contrast check for each state.

## Core Token Principle
Tokens should make accessible behavior the default rather than requiring product engineers to recreate accessibility rules independently.
