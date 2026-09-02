# Locator / Selector Strategy

## Priority order

Use the most stable, user-facing locator that correctly identifies the
element. In order of preference:

1. **`getByRole()`** — matches how assistive technology and real users
   perceive the page. Preferred default for buttons, links, headings,
   form controls, etc.
   ```ts
   page.getByRole('button', { name: 'Submit' });
   ```
2. **`getByLabel()`** — for form fields associated with a visible label.
   ```ts
   page.getByLabel('Email address');
   ```
3. **`getByText()`** — for static, non-interactive content where role
   matching doesn't apply. Use exact matches where possible to avoid
   accidentally matching unrelated text.
   ```ts
   page.getByText('No results found', { exact: true });
   ```
4. **`data-testid` / `data-test-id`** — when no accessible role, label, or
   stable text exists (e.g. a decorative icon button, a dynamic list item
   used purely for automation hooks). Requires the attribute to be added
   in application code; coordinate with the owning platform team before
   depending on one.
   ```ts
   page.getByTestId('experience-card-1');
   ```

## What to avoid

- **Raw CSS selectors** tied to class names or DOM structure
  (`.btn.btn-primary.mt-2`) — break on any styling refactor.
- **XPath** — brittle, hard to read, and rarely necessary given the above.
- **nth-child / positional selectors** — break when list order or item
  count changes.
- **Selectors coupled to implementation details** (auto-generated
  framework class names, internal component names).

## Guidelines

- Prefer scoping locators to a container (`page.getByRole('region', {name: 'Sidebar'}).getByRole('link', ...)`)
  over globally unique text when the same label could appear more than once.
- Never chain a fragile CSS selector "just this once" — if `getByRole` /
  `getByLabel` / `getByText` genuinely can't identify the element, that's
  the signal to request a `data-testid` be added, not to reach for CSS.
- Keep locators close to the test/page object that uses them; don't build a
  giant shared "selectors" file that becomes its own maintenance burden.
