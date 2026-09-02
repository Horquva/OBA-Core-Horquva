# Regression Test Suite

This directory holds regression tests that guard previously verified
application behavior against future breakage.

## Status

No regression tests exist yet — the Castor application's confirmed feature
surface has not been connected to this automation suite. This directory is
scaffolded and ready to receive suites as features are confirmed.

## Conventions (see also `../../docs/CODING_STANDARDS.md`)

- One file per feature/flow: `<feature-name>.spec.ts`.
- Group related assertions with `test.describe`.
- Prefer `getByRole` / `getByLabel` / `data-testid` locators over CSS/XPath.
- Each regression test should be independent and runnable in isolation.
- Tag long-running or environment-dependent tests, e.g.
  `test('...', { tag: '@slow' }, async ({ page }) => { ... })`, so they can
  be filtered with `--grep-invert @slow` when needed.

## Adding the first regression suite

When the first confirmed feature is ready to be covered:

1. Create `tests/regression/<feature-name>.spec.ts`.
2. Reuse fixtures from `../../fixtures` rather than duplicating setup.
3. Source any test data from `../../test-data`.
4. Run locally with `npm run test:regression` before opening a PR.
