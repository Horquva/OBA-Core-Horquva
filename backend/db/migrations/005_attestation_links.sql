-- =============================================================================
-- Horquva Continuity Platform — Migration 005: Attestation campaigns on Postgres
-- =============================================================================
-- Campaigns, tasks and magic links move out of process memory. The product
-- sends ONE link per reviewer per campaign covering all their assets, so the
-- per-task token in 001 is replaced by attestation_link. Links are stored as a
-- SHA-256 hash (lookup) plus an AES-GCM copy (so reminders and the reviewer's
-- own queue can show the link); a database dump alone can't answer a review.
-- =============================================================================

ALTER TABLE campaign ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE campaign ADD COLUMN IF NOT EXISTS intro_line TEXT;
ALTER TABLE campaign ADD COLUMN IF NOT EXISTS email JSONB; -- { subject, bodyText } as sent, reused for reminders

DROP INDEX IF EXISTS idx_attestation_token;
ALTER TABLE attestation_task DROP COLUMN IF EXISTS token;
ALTER TABLE attestation_task ALTER COLUMN answers DROP NOT NULL;
ALTER TABLE attestation_task ALTER COLUMN answers DROP DEFAULT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_attestation_task_asset ON attestation_task(campaign_id, reviewer_person_id, asset_entity_id);

CREATE TABLE IF NOT EXISTS attestation_link (
    token_hash CHAR(64) PRIMARY KEY,
    token_encrypted JSONB NOT NULL,
    campaign_id UUID NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    reviewer_person_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reminders_sent INT NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    UNIQUE (campaign_id, reviewer_person_id)
);
