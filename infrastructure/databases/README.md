# Databases

**Owners:** Janita, Affan
**Path:** `infrastructure/databases/`

Connection and migration conventions for OCOS. Every capability that persists data uses this.

---

## Start the development database

Requires Docker.

```bash
docker compose -f infrastructure/databases/docker-compose.yml up -d
```

PostgreSQL 16, on **host port 5433**. Port 5433 rather than 5432 so it does not collide with a PostgreSQL already installed on your machine.

Confirm it is up:

```bash
docker compose -f infrastructure/databases/docker-compose.yml ps
```

## Configure your connection

```bash
cp infrastructure/databases/.env.example infrastructure/databases/.env
```

The defaults match the compose file. Never commit `.env`.

## Apply migrations

```bash
set -a && source infrastructure/databases/.env && set +a
bash infrastructure/databases/migrate.sh
```

Safe to run repeatedly. Applied migrations are recorded in `schema_migrations` and skipped on later runs.

## Stop

```bash
docker compose -f infrastructure/databases/docker-compose.yml down
```

Add `-v` to delete the data volume and start clean.

---

## Adding a migration

1. Create `migrations/NNNN_short_name.sql`. Number sequentially, four digits, no gaps.
2. Write forward-only SQL. Use `IF NOT EXISTS` so a partial apply can be re-run.
3. One migration is one concern. Do not combine unrelated changes.
4. Never edit a migration that has been applied anywhere other than your own machine. Write a new one.
5. Run `migrate.sh` twice locally before opening a PR. The second run must be a no-op — CI checks this.

**Ownership.** You write migrations for your own capability's tables. Evidence tables are Janita's, classification records are Maaz's, and so on. `0001_signal_trace` is integration's and holds no domain data.

## Naming

| | |
|---|---|
| Tables | `snake_case`, plural — `evidence_records` |
| Columns | `snake_case` |
| Primary key | `id` |
| Foreign key | `<table_singular>_id` |
| Timestamps | `timestamptz`, always UTC |
| Signal reference | `signal_id uuid` — the envelope identifier, never a locally generated value |

Every table whose rows originate from an ingested signal carries `signal_id`, and it is indexed. This is what makes a signal traceable across capabilities without coordinating joins between owners.

---

## Environments

| | Dev | Staging |
|---|---|---|
| Host | Docker, local | Horquva-owned hosted PostgreSQL |
| Database | `ocos_dev` | `ocos_staging` |
| Credentials | `.env.example` defaults | Provider-issued, not committed |
| Migrations | `migrate.sh` | `migrate.sh`, same files, same order |

The same migration files run against both. There is no environment-specific schema.

---

## Tables owned here

| Table | Migration | Purpose |
|---|---|---|
| `schema_migrations` | created by `migrate.sh` | Applied migration record |
| `signal_trace` | `0001_signal_trace` | One row per hop per signal. Backs the trace envelope. |

### Tracing a signal

Where a signal reached, and where it stopped:

```sql
SELECT hop, status, entered_at, exited_at, detail
FROM signal_trace
WHERE signal_id = '<uuid>'
ORDER BY entered_at;
```

Signals that failed, grouped by the hop that stopped them:

```sql
SELECT hop, count(*), max(entered_at) AS latest
FROM signal_trace
WHERE status = 'failed'
GROUP BY hop
ORDER BY count DESC;
```

The first query, returning all eight hops in order for one real signal, is the trace evidence for the T1 gate.
