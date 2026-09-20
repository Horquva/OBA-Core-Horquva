# SEC-4 Audit Log

`audit_log` is an append-only Postgres table created by `sql/17_audit_log.sql` and applied by
`run_migrations.js`. `lib/audit.js` is the only application write helper. It records the actor
snapshot, action, outcome, safe target/change metadata, method, query-free path, and truncated user
agent. It never reads or stores request IPs, bodies, credentials, authorization headers, cookies,
tokens, password values or failed-login email addresses.

Supported events are `auth.login`, `auth.login_rate_limited`, `auth.logout`,
`auth.password_change`, `authz.denied`, `agent.owner_update`, `user.create`,
`audit.write_failed`, and `audit.purge`.

Audit writes fail open: the primary operation continues, the server logs `[AUDIT] write failed`,
and `auditHealth()` exposes the in-memory failure count and latest failure time. The next successful
write records an `audit.write_failed` marker for the gap. `GET /api/audit-log` is protected by the
global authentication middleware and `requireAdmin`; it returns cursor-paginated rows plus health.

Records older than 180 days are removed manually with `node backend/tools/purge-audit-log.js`.
Use `--dry-run` to count without deleting. The repository has no scheduler, so deployment or an
operator must run this command monthly. The purge records an `audit.purge` event after deletion.