# SEC-4: General Audit Log — Design

Date: 2026-09-16
Owner: Security Team (lead: Usman Faraz)
Implemented by: Web Dev Team — WD-3 (lead: Hanzala Rehman)
Branch base: `5017dcc` + SEC-1/SEC-2/SEC-3

This is the schema and behaviour spec WD-3 builds against. WD-3 should not start wiring until this
document has been reviewed. Anything WD-3 finds that this document does not cover is flagged back
to Security, not decided in code.

---

## 1. What the audit log is for

One append-only record per **privilege-relevant action**, so an admin can later answer:
*who did what, to what, when, through which endpoint, and did it work?*

It is **not** a request log (`middleware/validate.js`'s `requestLogger` already prints every
request to the console), not an analytics store, and not Spec 1's Score/Evidence model.

## 2. Constraints this design follows

| Constraint | Source | Effect here |
|---|---|---|
| Free tier only, no new services | Handout §2.4 | Plain Postgres table in the existing Supabase project. No log shipping, no Redis, no scheduler. |
| Single tenant | D-01, `lib/orgGuard.js` | No `org` column. |
| Admin-only access | Handout §7, SEC-3 | Reading the log uses `requireAdmin` from `middleware/requireRole.js`. |
| Migrations only via runner | Handout §5.4 | New file `backend/sql/17_audit_log.sql`, applied by `run_migrations.js`. |
| No agent-team scope | Handout §2.1 | No logging inside `routes/avatar/*` or any W-L code in this pass. |

## 3. Table schema

```sql
-- backend/sql/17_audit_log.sql — SEC-4 / WD-3
create table if not exists audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),

  -- who
  actor_id     text,          -- app_users.id (uuid as text), 'admin' for the ADMIN_EMAIL
                              -- env-fallback login, 'cli' for backend/tools scripts,
                              -- NULL when nobody is authenticated (e.g. failed login)
  actor_email  text,          -- copied at write time; survives the user being deleted
  actor_role   text,          -- role from the token at the time of the action

  -- what
  action       text not null, -- dotted name from the vocabulary in §4
  outcome      text not null check (outcome in ('success', 'failure', 'denied')),
  reason       text,          -- short machine code for failure/denied, e.g. 'invalid_credentials'

  -- to what
  target_type  text,          -- 'agent', 'app_user', 'session', ...
  target_id    text,          -- the target's id as text
  changes      jsonb,         -- {"field": {"from": x, "to": y}} for data writes only (§5)

  -- from where (no client IP — decision 2026-09-16, §10)
  http_method  text,
  path         text,          -- req.originalUrl WITHOUT the query string
  user_agent   text           -- truncated to 256 chars
);

create index if not exists idx_audit_log_occurred_at on audit_log (occurred_at desc);
create index if not exists idx_audit_log_actor       on audit_log (actor_id, occurred_at desc);
create index if not exists idx_audit_log_action      on audit_log (action, occurred_at desc);
create index if not exists idx_audit_log_target      on audit_log (target_type, target_id);

-- Nobody reaches this table through Supabase's public API. The backend uses the
-- service-role key, which bypasses RLS, so this only closes the anon/authenticated path.
alter table audit_log enable row level security;
revoke all on audit_log from anon, authenticated;
```

Why these types:

- `actor_id` is `text`, not a `uuid` foreign key. `app_users.id` is a uuid, but the env-fallback
  admin's token carries `sub: 'admin'` (`routes/auth/auth.js`), and CLI tools have no user row at
  all. A foreign key would also block deleting a user who has audit history.
- `actor_email` and `actor_role` are copied, not joined, because the log must say what was true
  *when the action happened*, even after the user's role changes or the user is removed.
- `bigint identity` gives a stable sort order for the cursor-based read endpoint (§7).

## 4. Action vocabulary (v1)

WD-3 wires exactly these. New actions are added to this table first, then to code.

| `action` | Where it is written | `outcome` values | `target_type` / `target_id` | `reason` examples |
|---|---|---|---|---|
| `auth.login` | `POST /api/auth/login` | `success`, `failure` | `app_user` / user id (success only) | `invalid_credentials`, `missing_fields` |
| `audit.write_failed` | `lib/audit.js` itself, on the next successful write after one or more failed ones (§6) | `failure` | — | `insert_error` |
| `auth.login_rate_limited` | `middleware/rateLimit.js` when it answers 429 on the login route | `denied` | — | `rate_limited` |
| `auth.logout` | `POST /api/auth/logout` | `success` | `session` / token `jti` | — |
| `auth.password_change` | `POST /api/auth/change-password` | `success`, `failure` | `app_user` / user id | `wrong_current_password`, `too_short`, `same_as_current` |
| `authz.denied` | `requireRole` (SEC-3, `middleware/requireRole.js`) 403, and the SEC-2 CSRF 403 in `requireAuth` | `denied` | — | `role_required:admin`, `missing_client_header` |
| `agent.owner_update` | `PATCH /api/agents/:id/owner` (after a successful update) | `success`, `failure` | `agent` / agent id | `unknown_employee`, `unknown_agent` |
| `user.create` | `backend/tools/provision-user.js` | `success` | `app_user` / new user id | — |
| `audit.purge` | `backend/tools/purge-audit-log.js` (§8) | `success` | — | — |

Planned but **not** wired in this pass, because no code path for them exists yet: `user.role_change`,
`user.delete`, organization changes. When a route for any of these is added, it must write the
matching action in the same PR.

Not logged: plain `GET` reads of organisational data, `401`s from requests with no token at all
(noise; `requestLogger` already prints them), and anything under `routes/avatar/*` (agent team).

## 5. What must never be written

These are hard rules. A test should fail if any of them is violated (§9).

- No passwords, password hashes, JWTs, cookie values, `Authorization` headers or `JWT_SECRET`.
- No full request or response bodies.
- `changes` holds **only** the fields the action actually changed, as
  `{"owner_id": {"from": 1, "to": 3}}`. No other fields of the row.
- `path` is stored without its query string.
- No client IP address anywhere in the row (decision 2026-09-16, §10).
- For a failed login, `actor_id` and `actor_email` are both NULL. The attempted email is **not**
  stored (decision 2026-09-16, §10). The row still records that a failed login happened, when, and
  through which endpoint.

## 6. How the code writes entries

WD-3 adds one helper and calls it at the points listed in §4. No route builds rows by hand.

```js
// backend/lib/audit.js
// recordAudit(req, { action, outcome, reason, targetType, targetId, changes, actor })
//   - actor defaults to req.user ({ sub, email, role }); pass `actor: null` for failed
//     logins (nothing about the attempted account is stored) and { id: 'cli' } for CLI tools.
//   - fills http_method, path (no query), user_agent (truncated). Never reads req.ip.
//   - never throws. On a failed insert it flags the failure (below) and returns, so the
//     user's request still completes.
// auditHealth() -> { write_failures_since_boot, last_failure_at }
```

**Fail-open, but flagged** (decision 2026-09-16, §10). If Supabase is briefly unreachable, logins
and ownership changes keep working. A failed write is never silent. It is flagged three ways:

1. `console.error('[AUDIT] write failed:', action, errorMessage)` — the action name and the
   database error only, never the row contents.
2. An in-memory counter `write_failures_since_boot` and `last_failure_at` in `lib/audit.js`,
   exposed through `auditHealth()` and returned by `GET /api/audit-log` (§7), so an admin sees
   that entries may be missing.
3. On the next successful write after one or more failures, the helper first inserts one
   `audit.write_failed` row with `changes` = `{"failed_writes": {"from": null, "to": <count since last flag>}}`,
   so the gap is also recorded in the log itself.

The counter is in memory, like rate limiting (handout §2.4); it resets when the server restarts.

**Writes happen after the outcome is known.** For `agent.owner_update`, the route reads the current
`owner_id` first, performs the update, then records `{from, to}`. Two admins updating the same agent
at the same instant can make `from` slightly stale; that is acceptable for this pass and noted here
rather than hidden.

**Append-only.** No route, helper or tool other than §8's purge script issues `update` or `delete`
against `audit_log`. The service-role key could technically do so, which is acceptable for the MVP
and stated here so nobody assumes stronger tamper-resistance than exists.

## 7. Reading the log

```
GET /api/audit-log            requireAuth (global) + requireAdmin
  ?actor_id=      exact match
  ?action=        exact match, e.g. auth.login
  ?outcome=       success | failure | denied
  ?target_type=   with optional ?target_id=
  ?from= ?to=     ISO timestamps on occurred_at
  ?limit=         default 50, max 200
  ?before_id=     cursor: return rows with id < before_id

200 → { entries: [ { id, occurred_at, actor_id, actor_email, actor_role, action, outcome,
                     reason, target_type, target_id, changes, http_method, path,
                     user_agent } ],
        next_before_id: <id of last row, or null>,
        health: { write_failures_since_boot, last_failure_at } }
```

Rows are ordered by `id desc`. Invalid filter values return `400`, not an empty list. A non-admin
gets `403` from `requireAdmin` (and that denial is itself logged as `authz.denied`).

This is the "queryable by an admin — who did what, and when" line of WD-3's definition of done.
A UI page is not part of WD-3.

## 8. Retention

- Entries are kept for **6 months (180 days)** (decision 2026-09-16, §10).
- Deletion is manual, because the cohort adds no scheduler (handout §7). WD-3 writes this new
  script alongside the table:
  `node backend/tools/purge-audit-log.js [--dry-run]` deletes rows with
  `occurred_at < now() - interval '180 days'`, prints the count, and records one `audit.purge`
  entry with the number deleted in `changes` (`{"deleted": {"from": null, "to": 1234}}`).
- An admin runs it once a month. `--dry-run` only prints the count.

Size check: a row is roughly 0.5 KB. Even 20,000 entries a month is about 10 MB a month and
roughly 60 MB at the 180-day cap, which fits comfortably in a free-tier Supabase database
alongside the existing data.

## 9. Tests WD-3 must add

Offline, in the existing no-framework style (`tests/*.test.js`, Supabase stubbed through
`require.cache`), and listed in `tests/run-all.js`:

1. A successful login writes one `auth.login` / `success` row with the user's id, email and role.
2. A failed login writes `auth.login` / `failure` / `invalid_credentials` with `actor_id` and
   `actor_email` NULL, and the stored row contains neither the submitted password nor the
   submitted email (search every string value of the inserted row for both).
3. Logout and password change each write their action.
4. A non-admin `PATCH /api/agents/:id/owner` writes `authz.denied` with `role_required:admin`.
5. An admin ownership change writes `agent.owner_update` with `changes.owner_id.from/to` correct,
   and no other keys in `changes`.
6. No inserted row ever contains the JWT or the `horquva_session` cookie value.
7. When the stubbed insert fails, the original request still returns its normal status,
   `auditHealth().write_failures_since_boot` goes up, and the next successful write is preceded
   by one `audit.write_failed` row.
9. No inserted row and no `GET /api/audit-log` entry has an `ip` field.
8. `GET /api/audit-log`: admin → 200 with entries newest first; member → 403; `limit=500` is capped
   to 200; a bad `outcome` value → 400; `path` never includes a query string.

Before calling WD-3 done, also run it against a real local Supabase project (handout §6.3): log in,
change an agent owner, log out, then read the entries back through `GET /api/audit-log`.

## 10. Decisions (Affan, 2026-09-16)

These were open questions in the first version of this document and are now decided.

| Question | Decision |
|---|---|
| Retention | 6 months (180 days), rotated by the purge script |
| Store the attempted email on a failed login? | No |
| Store the client IP? | No |
| Audit write fails — block the action or continue? | Continue (fail-open), but the failure must be flagged (§6) |

## 11. Out of scope

- Any UI for the audit log.
- Shipping logs to an external service.
- Tamper-proofing beyond "no code path updates or deletes rows".
- Logging inside AI-agent / Avatar code (separate team).
- Reconciling with Spec 1 Evidence records.
