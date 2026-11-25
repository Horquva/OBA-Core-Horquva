-- =============================================================================
-- Horquva Continuity Platform — Migration 009: identity_link table
-- =============================================================================
-- Moves account-to-person linking out of identity_queue.linked_person_id into
-- a temporal, evidence-graded identity_link table with partial unique indexes
-- enforcing at most one active non-suggested link per account and at most one
-- active suggestion per (account_id, person_id) pair.
-- =============================================================================

CREATE TABLE IF NOT EXISTS identity_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    person_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    grade VARCHAR(16) NOT NULL CHECK (grade IN ('stated', 'confirmed', 'inferred')),
    method VARCHAR(16) NOT NULL CHECK (method IN ('exact_email', 'admin_link', 'suggested')),
    linked_by VARCHAR(128),
    note TEXT,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_link_active_account
    ON identity_link (account_id)
    WHERE valid_to IS NULL AND method <> 'suggested';

CREATE UNIQUE INDEX IF NOT EXISTS uq_identity_link_active_suggestion_pair
    ON identity_link (account_id, person_id)
    WHERE valid_to IS NULL AND method = 'suggested';

CREATE INDEX IF NOT EXISTS idx_identity_link_active_person
    ON identity_link (person_id)
    WHERE valid_to IS NULL;

INSERT INTO identity_link (account_id, person_id, grade, method, linked_by, note, valid_from)
SELECT
    acc.id,
    per.id,
    'confirmed',
    'admin_link',
    iq.reviewed_by,
    COALESCE(iq.notes, 'Backfilled from identity_queue.linked_person_id'),
    COALESCE(iq.reviewed_at, iq.created_at, NOW())
FROM identity_queue iq
JOIN entity acc ON acc.id = iq.external_account_id OR acc.id = ('account:' || iq.source || ':' || iq.external_account_id)
JOIN entity per ON per.id = iq.linked_person_id
WHERE iq.linked_person_id IS NOT NULL AND iq.status = 'linked'
ON CONFLICT DO NOTHING;

ALTER TABLE identity_queue DROP COLUMN IF EXISTS linked_person_id;
