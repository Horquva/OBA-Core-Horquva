#!/usr/bin/env bash
# Apply OCOS migrations in order.
#
#   bash infrastructure/databases/migrate.sh
#
# Connection comes from standard PG* environment variables. Load them from
# your .env first, or export them directly. See README.md.
#
# Safe to run repeatedly: applied migrations are recorded in schema_migrations
# and skipped on subsequent runs.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$DIR/migrations"

: "${PGHOST:?PGHOST is not set}"
: "${PGPORT:?PGPORT is not set}"
: "${PGUSER:?PGUSER is not set}"
: "${PGDATABASE:?PGDATABASE is not set}"

psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     text        PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
SQL

applied=0
skipped=0

for file in "$MIGRATIONS"/*.sql; do
  [ -e "$file" ] || { echo "No migrations found in $MIGRATIONS"; exit 0; }
  version="$(basename "$file" .sql)"

  exists="$(psql -tAX -c "SELECT 1 FROM schema_migrations WHERE version = '$version'")"
  if [ "$exists" = "1" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  echo "applying  $version"
  psql -v ON_ERROR_STOP=1 -q --single-transaction \
    -f "$file" \
    -c "INSERT INTO schema_migrations (version) VALUES ('$version')"
  applied=$((applied + 1))
done

echo "migrations: $applied applied, $skipped already present"
