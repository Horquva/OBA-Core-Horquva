# Altair Design Foundation

## Visual rules

- Use design tokens from `theme.js` for color, spacing, radius, and focus styling.
- Prefer predictable spacing scales: xs, sm, md, lg, xl.
- Use semantic colors for status rather than arbitrary colors.
- Keep typography readable across narrow and wide screens.
- Favor clear visual hierarchy and consistent padding.

## Form and state rules

- Field states should distinguish default, error, and success visually.
- Use focus rings on interactive controls.
- Do not rely on color alone to communicate status.
- Loading and error states must be clearly labeled, not implied.

## Responsive rules

- Layout should collapse gracefully on smaller breakpoints.
- Text and controls should maintain touch accessibility.
- Panels should stack or reorganize without overflow.
- Tables and dense layouts should degrade into card or stacked patterns on narrow screens.

## Reusability

Components should consume the shared design tokens and not hardcode values in multiple places.
