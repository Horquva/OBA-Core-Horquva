# Horquva Design Tokens — Canonical Source + Build Pipeline

Canonical token contract for the Horquva Design System: raw -> semantic ->
component token layers, a validation script, and a build pipeline exporting
to Web (CSS) and Flutter (Dart).

## Structure

```
tokens/tokens.json         <- canonical source of truth
config.js                  <- Style Dictionary build configuration
scripts/validate-tokens.js <- naming/structure/reference validation
build/web/tokens.css       <- generated CSS custom properties
build/flutter/tokens.dart  <- generated Dart constants class
```

## Token layers

1. **Raw tokens** — `color.primary.*`, `color.neutral.*`, `spacing.*`, `radius.*`,
   `elevation.*`, `motion.*`, `typography.*`, `breakpoint.*`
2. **Semantic tokens** — `color.text.*`, `color.surface.*`, `color.border.*`,
   `color.semantic.*` — reference raw tokens, carry meaning rather than a literal value
3. **Component tokens** (`component.*`) — one block per component (button, input, card,
   table, badge, chip, avatar, dialog, navigation), covering every state built in Figma:
   default, hover, focus, active, disabled, loading, error where applicable.

Example chain: `component.button.background.hover` -> `color.primary.700` -> raw hex.

## Validating tokens

Run before every build to catch naming issues, broken references, and structural errors:

```
node scripts/validate-tokens.js
```

Checks performed:
- **Naming convention** — every key must be alphanumeric only (camelCase), no spaces/
  hyphens/underscores, so generated variable names stay consistent across platforms
- **Broken references** — every `{category.path.value}` must resolve to a real token
- **Empty/missing values** — no leaf token may have a blank value
- **Duplicate raw values** (warning only) — flags coincidentally-identical values within
  a category as candidates for consolidation into a shared semantic token

Exit code 0 = pass, 1 = fail — safe to wire into a CI check later.

## Rebuilding after a token change

```
npm install style-dictionary@3
node scripts/validate-tokens.js   # run this first
node -e "
const StyleDictionary = require('style-dictionary');
const config = require('./config.js');
const sd = StyleDictionary.extend(config);
sd.buildAllPlatforms();
"
```

## Usage

**Web:**
```css
@import "tokens.css";
.button { background: var(--component-button-background-default); }
.button:hover { background: var(--component-button-background-hover); }
.card { box-shadow: var(--component-card-elevation-default); }
```

**Flutter:**
```dart
import 'tokens.dart';
Container(color: HorquvaTokens.componentButtonBackgroundDefault)
```

## Notes for reviewers

- Never edit `build/web/tokens.css` or `build/flutter/tokens.dart` directly — generated
  files. All changes go through `tokens/tokens.json`, then re-run validate + rebuild.
- Component tokens map 1:1 to the state matrices built in Figma.
- Current validation run: 140 tokens checked, 0 errors, 10 informational warnings
  (coincidental value overlaps, not structural problems).
- Not yet included: formal per-token metadata (usage rules, accessibility notes) and
  semver-style versioning rules — flagged as follow-up work.
