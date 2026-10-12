-- =============================================================================
-- Horquva Continuity Platform — Migration 004: Persistent Runtime State
-- =============================================================================
-- Lets DataService write through to Postgres instead of holding departures,
-- changes and the audit trail only in process memory, and lets connector
-- syncs close relationships that vanished at the source.
-- =============================================================================

-- 1. Departures keep their frozen handover pack and post-departure watch log.
ALTER TABLE departure ADD COLUMN IF NOT EXISTS handover_pack JSONB;
ALTER TABLE departure ADD COLUMN IF NOT EXISTS watch_log JSONB NOT NULL DEFAULT '[]';
ALTER TABLE departure_handover ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- 2. Change feed: the app's ids are short strings, and the feed needs the
--    human-readable title/impact/link it shows in the bell. Table was unused.
ALTER TABLE change_event ALTER COLUMN id DROP DEFAULT;
ALTER TABLE change_event ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE change_event ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;
ALTER TABLE change_event ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE change_event ADD COLUMN IF NOT EXISTS impact TEXT NOT NULL DEFAULT '';
ALTER TABLE change_event ADD COLUMN IF NOT EXISTS href TEXT;

-- 3. Audit log: keep the app's entry ids; resources can be longer than 128.
ALTER TABLE audit_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE audit_log ALTER COLUMN id TYPE VARCHAR(64) USING id::text;
ALTER TABLE audit_log ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;
ALTER TABLE audit_log ALTER COLUMN resource_id TYPE TEXT;

-- 4. Onboarding guide can be dismissed per org.
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;

-- 5. Which connection asserted an edge/fact, so a sync can close the ones it
--    no longer sees (a person removed from Entra, an owner removed in n8n).
ALTER TABLE edge ADD COLUMN IF NOT EXISTS connection_id VARCHAR(64) REFERENCES connection(id) ON DELETE SET NULL;
ALTER TABLE fact ADD COLUMN IF NOT EXISTS connection_id VARCHAR(64) REFERENCES connection(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_edge_connection_active ON edge(connection_id) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_fact_connection_active ON fact(connection_id) WHERE valid_to IS NULL;

-- At most one active version of a relationship / attribute.
CREATE UNIQUE INDEX IF NOT EXISTS uq_edge_active ON edge(from_id, to_id, type) WHERE valid_to IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_fact_active ON fact(entity_id, attribute) WHERE valid_to IS NULL;

-- 6. Sync runs are recorded when queued, before the work starts, so a failed
--    run still leaves a row (persistSync used to create it inside its own
--    transaction, which a failure rolled back).
ALTER TABLE sync_run ALTER COLUMN status SET DEFAULT 'queued';

-- 7. App-layer AES-256-GCM replaces the pgcrypto helpers, which took the
--    plaintext and the master key as query parameters.
DROP FUNCTION IF EXISTS horquva_encrypt_secret(text, text);
DROP FUNCTION IF EXISTS horquva_decrypt_secret(bytea, text);
