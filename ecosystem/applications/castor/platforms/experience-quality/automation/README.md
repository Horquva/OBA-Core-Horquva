# Experience Quality Automation

Automated QA testing suite for the Castor Experience Quality platform,
built with Playwright + TypeScript.

**Status:** Week 1 foundation. No live application URL is wired in yet —
see `.env.example` for the `BASE_URL` placeholder this suite is built
around.

## Quick start

```bash
npm install
npx playwright install        # downloads browser binaries
cp .env.example .env           # then set BASE_URL to a real environment
npm run test:smoke
```

## Structure

```
automation/
├── playwright.config.ts     # Test runner config: browser matrix, reporting, timeouts
├── tsconfig.json
├── package.json
├── .env.example              # BASE_URL and other non-secret config placeholders
├── fixtures/                 # Reusable Playwright fixtures
│   ├── base.fixtures.ts
│   └── index.ts
├── test-data/                # Non-secret test data + local-override pattern
│   ├── environments.json
│   ├── users.template.json
│   └── README.md
├── tests/
│   ├── smoke/                # Fast "is the app alive" checks
│   │   └── app-launch.spec.ts
│   └── regression/           # Confirmed-behavior regression suite (scaffolded)
│       └── README.md
├── docs/
│   ├── TEST_ARCHITECTURE.md  # Test pyramid, runner, browser matrix, reporting
│   ├── LOCATOR_STRATEGY.md   # Selector priority and rules
│   └── CODING_STANDARDS.md   # Naming, organization, fixtures, test data, waits
└── reports/                   # Generated output (gitignored) — HTML/JSON/traces
```

## Scripts

| Command                  | Description                              |
|---------------------------|-------------------------------------------|
| `npm test`                 | Run the full suite across all browsers    |
| `npm run test:smoke`       | Run only smoke tests                      |
| `npm run test:regression`  | Run only regression tests                 |
| `npm run test:headed`      | Run with a visible browser window         |
| `npm run test:debug`       | Run in Playwright's step debugger         |
| `npm run report`           | Open the last HTML report                 |
| `npm run codegen`          | Launch Playwright's codegen recorder      |

## Read next

- `docs/TEST_ARCHITECTURE.md` for the overall test strategy.
- `docs/LOCATOR_STRATEGY.md` before writing any selector.
- `docs/CODING_STANDARDS.md` before writing any test.
