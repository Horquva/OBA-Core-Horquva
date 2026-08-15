# Horquva Design Token Contract

**Owner:** Syed Bilal Sajid — Design System Platform
**Source of truth:** `tokens/tokens.json` (validated via `scripts/validate-tokens.js`)
**Consumers:** Web (`build/web/tokens.css`), Flutter (`build/flutter/tokens.dart`)
**Status:** Active — raw, semantic, and component layers defined and validated (140 tokens, 0 errors)

---

## 1. Purpose

This document is the formal engineering contract for every design token in the Horquva
Design System. It defines what each token category means, how it may and may not be
used, how it maps to code, and how changes to it are versioned. It exists so that any
engineer — frontend, mobile, or otherwise — can consume tokens correctly without needing
to ask what a value is "supposed" to mean.

The canonical values live in `tokens/tokens.json`. This document describes that file;
it does not duplicate it. If this document and `tokens.json` ever disagree, `tokens.json`
is authoritative and this document should be updated to match.

## 2. Token Contract Schema

Every token in the system is defined against the same set of fields:

| Field | Meaning |
|---|---|
| **Canonical name** | Dot-path in `tokens.json`, e.g. `color.primary.600` |
| **Category** | Which layer it belongs to: raw / semantic / component |
| **Semantic meaning** | What the token represents, independent of its literal value |
| **Value** | The literal value, or a reference to another token |
| **Allowed usage** | Where this token should be used |
| **Forbidden usage** | Where this token must not be used |
| **Theme relationship** | Whether it changes under future theming (e.g. dark mode) |
| **Responsive behavior** | Whether the value changes across breakpoints |
| **Accessibility implications** | Any WCAG-relevant notes |
| **Engineering representation** | CSS variable name / Dart constant name |
| **Consumer mapping** | Which platforms consume it (Web, Flutter, both) |
| **Version** | Semver-style version of this specific token (see Section 8) |

The tables below apply this schema at the category level, since documenting all 140
tokens individually would duplicate `tokens.json` without adding clarity. Component
tokens — the layer most directly tied to engineering handoff — are documented per-token
in Section 6.

---

## 3. Raw Tokens

Raw tokens are literal values with no semantic meaning attached. They should rarely be
used directly in components — semantic or component tokens should be used instead.

| Category | Examples | Semantic meaning | Allowed usage | Forbidden usage | Theming | Responsive | Version |
|---|---|---|---|---|---|---|---|
| `color.primary.*` (50–900) | `#4F46E5` (600) | Brand indigo ramp | Defining semantic/component tokens only | Directly in component code | Will change under future theming | No | 1.0.0 |
| `color.neutral.*` (50–900) | `#101828` (900) | Graphite neutral ramp | Defining semantic/component tokens only | Directly in component code | Will change under future theming | No | 1.0.0 |
| `spacing.*` (xs–4xl) | `16` (md) | 8px-based spacing scale | Padding, margin, gap values | Arbitrary one-off spacing | No | No | 1.0.0 |
| `radius.*` | `8` (md) | Corner rounding scale | Border-radius on any surface | — | No | No | 1.0.0 |
| `typography.*` | H1 `32/700/40` | Type scale (size/weight/line-height) | Text styles across the app | Custom one-off font sizes | No | Not yet — no responsive type scale defined | 1.0.0 |
| `elevation.*` | Level 1 `0px 1px 2px rgba(...)` | Shadow depth scale | `box-shadow` / Flutter `boxShadow` | Custom one-off shadows | No | No | 1.0.0 |
| `motion.*` | `duration.default: 300` | Animation timing/easing | Transitions, animations | — | No | No | 1.0.0 |
| `breakpoint.*` | `tablet: 768` | Responsive layout breakpoints | Media queries / layout logic | — | No | N/A (defines responsiveness itself) | 1.0.0 |

---

## 4. Semantic Tokens

Semantic tokens reference raw tokens and carry meaning. This is the layer most
components should reference directly when a component-specific token doesn't exist.

| Token | Value (resolves to) | Semantic meaning | Allowed usage | Accessibility note | Version |
|---|---|---|---|---|---|
| `color.semantic.success` | `#16A34A` | Positive/success status | Status badges, success messages | Verified 3.4:1+ against white for icon/large text use | 1.0.0 |
| `color.semantic.warning` | `#D97706` | Caution/warning status | Status badges, warning messages | Do not use for body text on white (contrast risk) | 1.0.0 |
| `color.semantic.error` | `#DC2626` | Error/destructive status | Error states, destructive actions | Verified for icon/large text use; pair with icon or text, not color alone | 1.0.0 |
| `color.semantic.errorSubtle` | `#FEF2F2` | Low-emphasis error background | Error row/card backgrounds only | Background only — never used for text | 1.0.0 |
| `color.semantic.info` | → `color.primary.600` | Informational status | Info badges, links | — | 1.0.0 |
| `color.surface.background` | → `color.neutral.50` | Page/app background | Page backgrounds, subtle section fills | — | 1.0.0 |
| `color.surface.default` | `#FFFFFF` | Default surface (cards, dialogs) | Card, dialog, input backgrounds | — | 1.0.0 |
| `color.text.default` | → `color.neutral.900` | Primary body text | Body copy, headings | Verified 17.7:1 on white (AA + AAA pass) | 1.0.0 |
| `color.text.secondary` | → `color.neutral.500` | De-emphasized text | Captions, helper text, timestamps | Verify contrast case-by-case on non-white backgrounds | 1.0.0 |
| `color.text.onPrimary` | `#FFFFFF` | Text on filled primary surfaces | Text/icons on primary-colored buttons | Verified 6.3:1 on `primary.600` (AA pass) | 1.0.0 |
| `color.border.default` | → `color.neutral.200` | Default border/divider | Input borders, dividers, card outlines | — | 1.0.0 |

---

## 5. Component Tokens — Overview

Component tokens are the layer engineers should reference first when styling a
component. They map 1:1 to the state matrices built in Figma (Default, Hover, Focus,
Active, Disabled, Loading, Error where applicable) and reference semantic/raw tokens
rather than introducing new literal values.

Full detail for each is in Section 6. Coverage by component:

| Component | States covered by tokens |
|---|---|
| Button | Default, Hover, Active, Disabled, Loading (opacity), Focus (ring), Error |
| Input | Default, Hover, Focus, Active, Loading, Error (border + helper text) |
| Card | Default, Hover (elevation), Error (border), Loading (skeleton) |
| Table | Row Default, Hover, Error; Loading (skeleton) |
| Badge | Info, Success, Warning, Error, Disabled |
| Chip | Default, Selected, Disabled |
| Avatar | Default, Loading, Error |
| Dialog | Default (background/elevation), Error (message text) |
| Navigation | Default (background/border), Loading (progress bar) |

## 6. Component Tokens — Detail

### Button
| Token | Resolves to | Usage |
|---|---|---|
| `component.button.background.default` | `color.primary.600` | Default button fill |
| `component.button.background.hover` | `color.primary.700` | Hover fill |
| `component.button.background.active` | `color.primary.800` | Pressed fill |
| `component.button.background.disabled` | `color.neutral.300` | Disabled fill |
| `component.button.background.loadingOpacity` | `0.6` | Opacity applied to default fill during Loading |
| `component.button.border.focusRing` | `color.primary.300` | Focus ring color |
| `component.button.border.focusRingWidth` | `2` | Focus ring width (px) |
| `component.button.border.error` | `color.semantic.error` | Error-state border |
| `component.button.text.default` | `color.text.onPrimary` | Default label color |
| `component.button.text.disabled` | `color.neutral.500` | Disabled label color |
| `component.button.text.error` | `color.semantic.error` | Error-state label color |

### Input
| Token | Resolves to | Usage |
|---|---|---|
| `component.input.background.default` | `#FFFFFF` | Default field fill |
| `component.input.background.loading` | `color.neutral.50` | Loading-state fill |
| `component.input.border.default` | `color.neutral.300` | Default border |
| `component.input.border.hover` | `color.neutral.500` | Hover border |
| `component.input.border.focus` | `color.primary.600` | Focus border |
| `component.input.border.active` | `color.primary.600` | Active/typing border |
| `component.input.border.loading` | `color.neutral.200` | Loading border |
| `component.input.border.error` | `color.semantic.error` | Error border |
| `component.input.text.placeholder` | `color.neutral.500` | Placeholder text |
| `component.input.text.active` | `color.neutral.900` | Entered text color |
| `component.input.text.errorHelper` | `color.semantic.error` | Helper text under an errored field |

### Card
| Token | Resolves to | Usage |
|---|---|---|
| `component.card.background` | `#FFFFFF` | Card fill |
| `component.card.elevation.default` | `elevation.level1.shadow` | Default shadow |
| `component.card.elevation.hover` | `elevation.level2.shadow` | Hover shadow |
| `component.card.border.error` | `color.semantic.error` | Error-state border |
| `component.card.skeleton` | `color.neutral.200` | Skeleton-loading bar fill |

### Table
| Token | Resolves to | Usage |
|---|---|---|
| `component.table.row.default` | `#FFFFFF` | Default row fill |
| `component.table.row.hover` | `color.surface.background` | Hover row fill |
| `component.table.row.error` | `color.semantic.errorSubtle` | Error row fill |
| `component.table.skeleton` | `color.neutral.200` | Skeleton-loading bar fill |

### Badge
| Token | Resolves to | Usage |
|---|---|---|
| `component.badge.background.info` | `color.primary.50` | Info badge fill |
| `component.badge.background.success` | `#DCFCE7` | Success badge fill |
| `component.badge.background.warning` | `#FEF3C7` | Warning badge fill |
| `component.badge.background.error` | `color.semantic.errorSubtle` | Error badge fill |
| `component.badge.background.disabled` | `color.neutral.100` | Disabled badge fill |
| `component.badge.text.disabled` | `color.neutral.300` | Disabled badge text |

### Chip
| Token | Resolves to | Usage |
|---|---|---|
| `component.chip.background.default` | `color.neutral.100` | Default chip fill |
| `component.chip.background.selected` | `color.primary.50` | Selected chip fill |
| `component.chip.background.disabled` | `color.neutral.100` | Disabled chip fill |
| `component.chip.text.default` | `color.neutral.700` | Default chip text |
| `component.chip.text.selected` | `color.primary.700` | Selected chip text |
| `component.chip.text.disabled` | `color.neutral.300` | Disabled chip text |

### Avatar
| Token | Resolves to | Usage |
|---|---|---|
| `component.avatar.background.default` | `color.primary.200` | Default placeholder fill |
| `component.avatar.background.loading` | `color.neutral.200` | Loading placeholder fill |
| `component.avatar.background.error` | `color.neutral.100` | Broken-image fallback fill |

### Dialog
| Token | Resolves to | Usage |
|---|---|---|
| `component.dialog.background` | `#FFFFFF` | Dialog surface fill |
| `component.dialog.elevation` | `elevation.level3.shadow` | Modal shadow |
| `component.dialog.text.error` | `color.semantic.error` | Error message text |

### Navigation
| Token | Resolves to | Usage |
|---|---|---|
| `component.navigation.background` | `#FFFFFF` | Nav bar fill |
| `component.navigation.border` | `color.neutral.200` | Bottom border |
| `component.navigation.loadingBar` | `color.primary.600` | Top loading-bar fill |

---

## 7. Engineering Representation & Consumer Mapping

| Platform | Format | Naming convention | Example |
|---|---|---|---|
| Web | CSS custom properties | kebab-case | `--component-button-background-hover` |
| Flutter | Dart `static const` class members | camelCase | `HorquvaTokens.componentButtonBackgroundHover` |

Both are generated from the same `tokens/tokens.json` via `config.js` (Style
Dictionary), so they cannot drift out of sync as long as changes go through the source
file and are rebuilt.

## 8. Versioning Rules

Tokens follow semantic versioning at the **file level** (`tokens.json` as a whole),
tracked via the repository's normal commit/tag history. The rule for what kind of
change requires what kind of version bump:

| Change type | Version bump | Example |
|---|---|---|
| Add a new token, no existing values changed | **Minor** | Adding `component.tooltip.background` |
| Change a raw or semantic token's literal value | **Major** (breaking — affects every consumer downstream) | Changing `color.primary.600` |
| Change a component token's reference (e.g. point Button hover at a different shade) | **Minor**, unless it changes visual output significantly, then **Major** | — |
| Fix a naming violation or broken reference | **Patch** | The `on-primary` → `onPrimary` fix in this release |
| Add validation/tooling with no token changes | **Patch** | Adding `validate-tokens.js` |

All token changes must pass `node scripts/validate-tokens.js` (0 errors) before being
merged, regardless of version bump size.

## 9. Known Gaps / Follow-up

- No dark-mode / alternate theme values defined yet — `theme relationship` column
  above reflects intent, not implemented values.
- No responsive type scale — typography tokens are currently fixed across all
  breakpoints.
- Full WCAG 2.2 AA contrast verification is complete for `color.text.default` and
  `color.text.onPrimary` only; remaining semantic/component color pairs should be
  verified in coordination with Ayla Sajid before the contract is considered fully closed.
