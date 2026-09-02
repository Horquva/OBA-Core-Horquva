# Button Accessibility Contract

## Purpose
This contract defines the minimum accessibility behavior for the Castor Design System Button component. The contract follows the Component Accessibility Contract model so button accessibility does not have to be re-derived for each implementation.

## Contract

### Role
- Use the native `<button>` element.
- Use `role="button"` only when a native button is unavailable.

### Accessible Name
- Use the visible label text as the accessible name.
- Icon-only buttons must provide an accessible name, such as an `aria-label`.
- The name must describe the button's function.

### Description
- Optional `aria-describedby` may provide supplementary context.
- Example use: explaining that an action opens a new tab.

### Keyboard
- Button is reachable with **Tab**.
- Button activates with **Enter**.
- Button activates with **Space**.
- No custom keyboard trapping is introduced.

### Focus
- A visible focus ring is required.
- Focus ring must meet **3:1 contrast** against adjacent colors.
- Focus must never be removed or hidden without an equally visible replacement.
- Use the Design System focus-ring token.

### States
The component must expose relevant states programmatically rather than through styling alone:
- Disabled: expose through `aria-disabled` where the contract requires it.
- Loading: expose the loading state appropriately to assistive technology.
- Pressed: expose with `aria-pressed` where the button represents a toggle/pressed state.
- State must remain perceivable without relying on color alone.

### Error
- Error is not a button-level concern by default.
- If the button submits a form, applicable validation/error behavior is inherited from the associated form field/form pattern.
- Errors must still follow the Error Messages standard: specific text, programmatic association, and screen-reader announcement.

### Responsive / Touch Target
- Maintain the minimum web touch target at all breakpoints:
  - **24×24px minimum**
  - **44×44px preferred**
- Native/platform implementations must follow the applicable platform minimum.

### Screen Reader
A screen reader should announce:
- Role: **button**
- Accessible name
- Current relevant state, such as disabled or pressed

### Semantic Requirements
- Do not implement the button as a styled `<div>` or `<span>`.
- Icon-only buttons require a programmatic label.
- Decorative icons inside a button must not create unnecessary screen-reader noise.

### Automated Tests
The Week 3 worked example specifies these axe-core rule areas:
- `button-name`
- `color-contrast`
- `focus-visible`
- `aria-allowed-attr`

## Review Acceptance Checklist
- [ ] Native button semantics used.
- [ ] Accessible name is clear and descriptive.
- [ ] Icon-only button has a programmatic label.
- [ ] Tab reaches the button.
- [ ] Enter activates it.
- [ ] Space activates it.
- [ ] Focus ring is visible.
- [ ] Focus ring meets 3:1 contrast.
- [ ] Disabled/loading/pressed states are exposed appropriately.
- [ ] State is not communicated by color alone.
- [ ] Touch target meets minimum size.
- [ ] Screen reader announces role, name, and relevant state.
- [ ] Required automated accessibility rules pass.

## Source Rationale
The Button was selected as the first completed worked example because it is described in the Week 3 source as the highest-reuse, highest-risk component: a defect can propagate throughout the system.
