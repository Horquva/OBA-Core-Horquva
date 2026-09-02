# Automation Test Architecture

**Platform:** Experience Quality (Castor)
**Owner:** Khubaib Ijaz
**Scope:** Week 1 — automation foundation

---

## 1. Test Pyramid

This suite follows a standard automation test pyramid, weighted toward fast,
stable checks at the base:

```
        ▲
       /E2E\        Few — critical user journeys only
      /-----\
     /Regres-\      Moderate — confirmed feature behavior
    /--sion---\
   /-----------\
  /   Smoke     \   Small, fast — "is the app alive and reachable"
 /----------------\
```

- **Smoke tests** (`tests/smoke/`): minimal, fast checks that the
  application is reachable and rendering. Run on every change.
- **Regression tests** (`tests/regression/`): verify previously confirmed
  behavior doesn't break. Grows as real application features are confirmed.
- **E2E tests**: reserved for critical, multi-step user journeys once the
  application's core flows are confirmed. Not yet populated — see note in
  Section 6.

## 2. Test Runner

Playwright (`@playwright/test`) with TypeScript, configured in
`playwright.config.ts` at the automation root.

Rationale: Playwright provides first-class TypeScript support, built-in
auto-waiting (reducing flaky hard-waits), a unified API across Chromium,
Firefox, and WebKit, and native trace/screenshot/video capture — matching
this platform's reporting requirements without extra tooling.

## 3. Browser Matrix

| Project        | Engine      | Purpose                              |
|----------------|-------------|---------------------------------------|
| chromium       | Chromium    | Primary desktop coverage              |
| firefox        | Gecko       | Cross-engine desktop coverage         |
| webkit         | WebKit      | Safari-equivalent desktop coverage    |
| mobile-chrome  | Chromium    | Representative mobile viewport (Pixel 7) |
| mobile-safari  | WebKit      | Representative mobile viewport (iPhone 14) |

Run a single project with `npx playwright test --project=chromium`, or all
projects (default) with `npm test`.

## 4. Fixtures

Defined in `fixtures/base.fixtures.ts`, extending Playwright's base `test`.
Fixtures exist to remove duplicated setup from individual specs. Only one
fixture (`appReady`) is currently implemented, because it's the only one
that doesn't depend on unconfirmed application behavior. Authentication and
API-context fixtures are documented as extension points rather than
implemented with invented flows — see the file for details.

## 5. Test Data

Documented in `test-data/README.md`. Static, non-secret reference data is
JSON; anything requiring generation logic is a TypeScript factory. No
secrets are ever committed — see that file for the local-override pattern.

## 6. E2E Strategy

No E2E journeys are implemented yet. Writing them now would require
inventing pages, flows, and elements that haven't been confirmed to exist
in the Castor application, which this task explicitly avoids. Once real
application routes and flows are available:

1. Identify the top 3–5 critical user journeys with the product/platform
   owners.
2. Add one `.spec.ts` per journey under a new `tests/e2e/` directory.
3. Reuse `fixtures/` and `test-data/` rather than duplicating setup.

## 7. Locator Strategy

See `LOCATOR_STRATEGY.md`.

## 8. Reporting

Configured in `playwright.config.ts`:

- **HTML report** → `reports/html-report/` (`npm run report` to view).
- **JSON results** → `reports/results.json` (for CI ingestion/dashboards).
- **List reporter** → concise console output while running locally.
- **Screenshots** → captured only on failure (`screenshot: 'only-on-failure'`).
- **Traces** → captured on first retry (`trace: 'on-first-retry'`), viewable
  with `npx playwright show-trace <trace.zip>`.
- **Video** → retained only on failure to control artifact size.

All generated artifacts live under `reports/` and are gitignored (see
`automation/.gitignore`) — reports are build output, not source.
