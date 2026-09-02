# Test Data Strategy

## Principles

- **No secrets in the repository.** No real passwords, API keys, tokens, or
  production data are ever committed. Files ending in `.template.json` show
  shape only, with placeholder values.
- **Local overrides are gitignored.** Real values for local runs go in
  `users.local.json` / `.env` (see `automation/.env.example`), both excluded
  from version control.
- **Data is disposable.** Tests should create the data they need and clean
  up after themselves rather than depending on long-lived shared records.
- **JSON for static reference data, TypeScript for generated/dynamic data.**
  Static lookup values (environments, role definitions) live in `.json`.
  Anything requiring logic (e.g. generating unique emails per test run)
  should be a `.ts` factory function, not a static file.

## Structure

```
test-data/
├── environments.json        # Non-secret environment metadata (base URLs)
├── users.template.json      # Shape of user records - placeholders only
└── README.md
```

## Adding new test data

1. If the data is static and non-secret, add a `.json` file here.
2. If the data involves secrets, add a `.template.json` file with
   placeholders and document the real, gitignored counterpart here.
3. If the data must be generated per test run (unique IDs, timestamps),
   write a small `.ts` factory in this folder instead of a static file.
