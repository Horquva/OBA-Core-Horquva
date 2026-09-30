-- =============================================================================
-- Horquva Continuity Platform — Migration 001: Initial Core Schema
-- =============================================================================
-- Built strictly from the Architecture Decisions (AD-1 to AD-11) and SRS v0-v2.
-- Implements ELT raw landing, SCD Type 2 facts, deterministic checks,
-- attestation campaigns, identity review queue, and prediction ledger.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Cryptographic helper functions for secret encryption at rest
CREATE OR REPLACE FUNCTION horquva_encrypt_secret(secret text, master_key text) 
RETURNS bytea AS $$
  SELECT pgp_sym_encrypt(secret, master_key, 'cipher-algo=aes256');
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION horquva_decrypt_secret(encrypted_secret bytea, master_key text) 
RETURNS text AS $$
  SELECT pgp_sym_decrypt(encrypted_secret, master_key);
$$ LANGUAGE SQL IMMUTABLE;

-- 1. CONNECTIONS: Config & Encrypted Credentials for Source Platforms
CREATE TABLE IF NOT EXISTS connection (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL, -- 'n8n', 'entra', 'google', 'openai', 'anthropic', 'pagerduty', 'csv'
    name VARCHAR(255) NOT NULL,
    config_encrypted JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'disconnected', -- 'connected', 'syncing', 'error', 'disconnected'
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SYNC RUNS: Execution Audit & Stats
CREATE TABLE IF NOT EXISTS sync_run (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id VARCHAR(64) NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    stats JSONB NOT NULL DEFAULT '{"fetched": 0, "facts_created": 0, "facts_updated": 0, "errors": 0}',
    error_message TEXT
);

-- 3. RAW PAYLOAD STORE: Immutable Landing Zone for Ingested Data (Replayability)
CREATE TABLE IF NOT EXISTS raw_payload (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_run_id UUID REFERENCES sync_run(id) ON DELETE CASCADE,
    connection_id VARCHAR(64) NOT NULL REFERENCES connection(id) ON DELETE CASCADE,
    resource_type VARCHAR(64) NOT NULL, -- 'workflow', 'user', 'credential', 'execution', 'app_registration'
    external_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_payload_conn_res ON raw_payload (connection_id, resource_type, external_id);

-- 4. CANONICAL ENTITIES: People, Automations, Credentials, Models, Vendors
CREATE TABLE IF NOT EXISTS entity (
    id VARCHAR(128) PRIMARY KEY, -- e.g. 'person:omar@acme.com', 'automation:n8n:41'
    kind VARCHAR(32) NOT NULL,   -- 'person', 'automation', 'credential', 'model', 'vendor', 'group', 'app'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    external_refs JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_kind ON entity(kind);

-- 5. CANONICAL EDGES: Relationships & Dependencies
CREATE TABLE IF NOT EXISTS edge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    to_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL, -- 'owns', 'backs_up', 'depends_on', 'calls_model', 'runs_on_credentials_of', 'member_of'
    grade VARCHAR(32) NOT NULL DEFAULT 'stated', -- 'stated', 'inferred', 'confirmed', 'unknown'
    source VARCHAR(64) NOT NULL,
    source_ref VARCHAR(255),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    CONSTRAINT uq_edge_temporal UNIQUE(from_id, to_id, type, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_edge_from ON edge(from_id) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_edge_to ON edge(to_id) WHERE valid_to IS NULL;

-- 6. FACT STORE (SCD Type 2): Provenance & Evidence on Every Fact
CREATE TABLE IF NOT EXISTS fact (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    attribute VARCHAR(64) NOT NULL, -- 'criticality', 'documented', 'fallback_exists', 'run_volume_weekly', 'status'
    value JSONB NOT NULL,
    grade VARCHAR(32) NOT NULL DEFAULT 'stated', -- 'stated', 'inferred', 'confirmed', 'unknown'
    source VARCHAR(64) NOT NULL,
    source_ref VARCHAR(255),
    attested_by VARCHAR(128),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    CONSTRAINT uq_fact_temporal UNIQUE(entity_id, attribute, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_fact_active ON fact(entity_id, attribute) WHERE valid_to IS NULL;

-- 7. CHANGE EVENTS: Emitted from Snapshot Diffs
CREATE TABLE IF NOT EXISTS change_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind VARCHAR(64) NOT NULL, -- 'person_left', 'owner_changed', 'workflow_edited', 'model_swapped', 'credential_risk', 'failures_spiked'
    entity_id VARCHAR(128) REFERENCES entity(id) ON DELETE SET NULL,
    before_state JSONB,
    after_state JSONB,
    impact_summary JSONB NOT NULL DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_change_event_detected ON change_event(detected_at DESC);

-- 8. CONFIRMATION CAMPAIGNS & ATTESTATION TASKS (Access-Review Pattern)
CREATE TABLE IF NOT EXISTS campaign (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'completed', 'expired'
    scope JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attestation_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    reviewer_person_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    asset_entity_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'escalated'
    token VARCHAR(64) NOT NULL UNIQUE,
    answers JSONB NOT NULL DEFAULT '{}', -- { "is_owner": true, "backup_person_id": "...", "criticality": "high", "is_documented": true, "doc_url": "...", "fallback_exists": true }
    escalated_to_manager_id VARCHAR(128) REFERENCES entity(id) ON DELETE SET NULL,
    reminders_sent INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestation_token ON attestation_task(token);
CREATE INDEX IF NOT EXISTS idx_attestation_reviewer ON attestation_task(reviewer_person_id, status);

-- 9. IDENTITY REVIEW QUEUE: For Unmatched External Accounts
CREATE TABLE IF NOT EXISTS identity_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_account_id VARCHAR(255) NOT NULL,
    source VARCHAR(64) NOT NULL,
    display_name VARCHAR(255),
    email_candidate VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending', 'linked', 'service_account', 'departed', 'ignored'
    linked_person_id VARCHAR(128) REFERENCES entity(id) ON DELETE SET NULL,
    notes TEXT,
    reviewed_by VARCHAR(128),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_queue_status ON identity_queue(status);

-- 10. PREDICTION LEDGER: Immutable Record for Calibration Scoring (Brier Score)
CREATE TABLE IF NOT EXISTS prediction_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_type VARCHAR(64) NOT NULL, -- 'disruption_probability_range', 'automation_failure_trend'
    target_entity_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    predicted_range JSONB NOT NULL, -- e.g. {"p_min": 0.15, "p_max": 0.28, "p_expected": 0.21}
    model_version VARCHAR(32) NOT NULL DEFAULT 'v1.1-base-rate',
    inputs JSONB NOT NULL DEFAULT '{}',
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluation_due_at TIMESTAMPTZ NOT NULL,
    actual_outcome BOOLEAN,
    brier_score NUMERIC(6,5),
    evaluated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prediction_eval_due ON prediction_ledger(evaluation_due_at) WHERE actual_outcome IS NULL;

-- 11. AUDIT LOG: Tamper-Evident Admin & User Audit Trail
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64),
    resource_id VARCHAR(128),
    details JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- 12. A/B TESTING ENGINE: Zero-Third-Party Deterministic Experiment Tracking
CREATE TABLE IF NOT EXISTS ab_experiment (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'exp_attestation_magic_link_v1'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    variants JSONB NOT NULL DEFAULT '["control", "variant_a"]',
    traffic_allocation JSONB NOT NULL DEFAULT '{"control": 50, "variant_a": 50}', -- percentage breakdown summing to 100
    status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'draft', 'active', 'paused', 'completed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_id VARCHAR(64) NOT NULL REFERENCES ab_experiment(id) ON DELETE CASCADE,
    subject_id VARCHAR(128) NOT NULL, -- user_id, email, or anon session id
    variant VARCHAR(64) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    conversion_metric VARCHAR(64),
    conversion_value NUMERIC(10,2),
    CONSTRAINT uq_subject_experiment UNIQUE(experiment_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_ab_assignment_exp ON ab_assignment(experiment_id, variant);

