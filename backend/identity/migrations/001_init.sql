-- +migrate up
-- Baseline migration for the Sentinel Identity & Trust database.
-- Enables pgcrypto (digest/HMAC/gen_random_bytes) used later for secret protection.
-- gen_random_uuid() is built into PostgreSQL 13+ core, so no uuid-ossp is required.
create extension if not exists pgcrypto;

-- +migrate down
-- Intentionally a no-op: dropping a shared extension could affect other objects.
-- The schema_migrations record is removed by the runner on rollback.
select 1;
