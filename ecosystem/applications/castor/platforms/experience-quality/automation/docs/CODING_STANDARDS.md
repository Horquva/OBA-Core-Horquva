# Automation Coding Standards

## Naming conventions

- Spec files: `<feature-or-flow>.spec.ts`, kebab-case (e.g. `app-launch.spec.ts`).
- Fixture files: `<domain>.fixtures.ts` (e.g. `base.fixtures.ts`).
- Test data files: `<entity>.json` or `<entity>.template.json` when the
  entity contains secret-shaped fields.
- Describe blocks name the feature/area under test; test names are full
  sentences describing observable behavior, not implementation
  (`'shows a validation error when email is empty'`, not `'test1'`).

## Test organization

- One `test.describe` per feature/flow per file.
- Group by user-facing capability, not by page or component name, so tests
  read as behavior specs.
- Keep `tests/smoke/` limited to fast, high-value "is it alive" checks.
  Anything that verifies specific business behavior belongs in
  `tests/regression/` (or a future `tests/e2e/`).

## Locator rules

See `LOCATOR_STRATEGY.md`. In short: `getByRole` > `getByLabel` >
`getByText` > `data-testid`. Never CSS/XPath unless genuinely no
alternative exists, and treat that as a signal to request a `data-testid`.

## Fixture rules

- Fixtures live in `fixtures/` and are imported via the `fixtures/index.ts`
  barrel — tests never import `@playwright/test` directly, they import from
  `../../fixtures` so all tests share one extended `test`/`expect`.
- A fixture should do one thing (provide one piece of setup/teardown), not
  bundle unrelated setup together.
- Never invent an application flow inside a fixture (e.g. a fake login) —
  document it as an extension point until the real flow is confirmed.

## Test data rules

- No secrets committed, ever. See `test-data/README.md`.
- Tests generate/own the data they need; don't depend on data left over
  from a previous test run.
- Prefer factories (functions that build fresh data per call) over shared
  mutable fixtures when tests run in parallel.

## Avoiding hard waits

- Never use `page.waitForTimeout()` as a substitute for a real wait
  condition — it's the #1 source of flaky suites.
- Rely on Playwright's built-in auto-waiting (actions wait for
  actionability by default).
- When an explicit wait is truly needed, wait for a specific condition:
  `page.waitForResponse(...)`, `locator.waitFor({ state: 'visible' })`, or
  an assertion with Playwright's built-in retry (`expect(locator).toBeVisible()`).

## Test independence

- Every test must be runnable alone and in any order — no test should
  depend on state left behind by another.
- Avoid shared mutable state across tests (e.g. a module-level variable
  written by one test and read by another).
- Use fixtures for setup/teardown rather than `beforeAll` hooks that couple
  tests together, unless the cost of per-test setup is genuinely
  prohibitive and the shared state is read-only.

## Meaningful test descriptions

- Test titles describe observable behavior and, where useful, the
  condition that triggers it: `'disables submit while the form is invalid'`.
- Avoid vague titles (`'works correctly'`, `'test the button'`).
- Prefer failure messages on assertions (`expect(x, 'why this matters').toBe(y)`)
  for anything non-obvious, so a failing report is self-explanatory.
