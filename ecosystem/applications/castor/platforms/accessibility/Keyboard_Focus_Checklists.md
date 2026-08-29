# Keyboard & Focus Accessibility Checklists

## A. Component Keyboard Checklist
Use for individual components.

- [ ] Component is reachable with Tab.
- [ ] Component can be activated with Enter or Space where applicable.
- [ ] Arrow keys work where the interaction pattern requires them.
- [ ] Keyboard order follows the logical/visual layout.
- [ ] No functionality is mouse-only.
- [ ] Visible focus indicator appears when reached by keyboard.
- [ ] Focus indicator meets 3:1 contrast.
- [ ] Focus is never removed without an accessible replacement.
- [ ] Native semantic element is used where available.
- [ ] Icon-only controls have an accessible label.
- [ ] Component remains functional at 200% zoom.

## B. Full Keyboard Flow Checklist
Put the mouse away and test the entire flow using Tab, Shift+Tab, Enter, Space, and relevant arrow keys.

- [ ] Every interactive element is reachable using Tab.
- [ ] Tab order is predictable and matches the visual/logical order.
- [ ] Every button/link can be activated with the required keyboard key.
- [ ] A visible focus indicator is present at every step.
- [ ] Focus never becomes trapped without a way out.
- [ ] Focus is not lost or reset unexpectedly.
- [ ] When a component closes, focus returns somewhere sensible.
- [ ] Dropdowns/menus can be opened, navigated, and closed using the keyboard.
- [ ] Modal/dialog focus entry, interaction, exit, and recovery behavior are correct.

## C. Focus Management Checklist
For dialogs, modals, popovers, dropdowns, and other focus-managed components:

- [ ] Focus entry behavior is defined.
- [ ] Focus remains within the intended interaction while required.
- [ ] Keyboard exit behavior is defined.
- [ ] Focus restoration target is defined and verified.
- [ ] Focus indicator remains visible throughout.
- [ ] Focus cannot disappear behind or outside an active interaction unexpectedly.

## D. Screen Reader Focus Verification
Using VoiceOver or NVDA:

- [ ] Focused controls announce a clear accessible name.
- [ ] Buttons announce their role and current state.
- [ ] State changes are announced when applicable.
- [ ] Error messages are announced when they appear.
- [ ] Reading/focus order matches the visual/logical order.
- [ ] Decorative elements are not announced as clutter.

## E. Navigation Focus Checklist
- [ ] Skip-to-main-content link is the first focusable element.
- [ ] Main navigation uses a proper navigation landmark.
- [ ] Navigation order remains consistent across screens.
- [ ] Current page/section is programmatically indicated.
- [ ] Dropdown/expandable navigation works by keyboard alone.
- [ ] Nested menu items have logical keyboard order.
- [ ] Mobile menu toggle is keyboard-operable and exposes expanded/collapsed state.

## Failure Handling
Any failed item should be logged using the accessibility Issue Reporting Template and routed to the relevant component/page owner. Severity:
- **Blocker:** completely prevents task completion.
- **Major:** significantly harder to use, but a workaround exists.
- **Minor:** polish issue that does not block usage.
