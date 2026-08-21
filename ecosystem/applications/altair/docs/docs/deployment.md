# Deployment Readiness

## Development

Install once:

```bash
npm install
```

For the simplest local run:

```bash
npm run dev:all
```

This starts both the API/worker and Vite frontend.

If you prefer two terminals:

```bash
npm run server
npm run dev
```

The Vite dev server proxies `/api` to `127.0.0.1:3001`.

Demo account:

```text
Email: admin@altair.local
Password: AltairDemo123!
```

Override these with `ALTAIR_DEMO_EMAIL` and `ALTAIR_DEMO_PASSWORD`.

## Production prerequisites

- PostgreSQL or approved transactional database
- Shared durable queue
- Secret manager
- TLS termination
- Real external integration adapters
- Centralized logs
- Metrics and tracing backend
- CI test runner with browser E2E support
- Backup/restore strategy
- Migration strategy

Do not use the development JSON store for a horizontally scaled production deployment.
