-- =============================================================================
-- Horquva Continuity Platform — Migration 002: Sprint 2 Operational Tables
-- =============================================================================
-- Adds tables for:
-- 1. Departures & Handovers workflow state machine
-- 2. Action records & Risk acceptance
-- 3. Organization settings
-- 4. User accounts
-- =============================================================================

-- 1. DEPARTURES & HANDOVERS
CREATE TABLE IF NOT EXISTS departure (
    id VARCHAR(128) PRIMARY KEY,
    person_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    leave_date TIMESTAMPTZ NOT NULL,
    stage VARCHAR(32) NOT NULL DEFAULT 'initiated', -- 'initiated', 'successor_named', 'accepted', 'account_disabled', 'verified'
    note TEXT,
    detected_from VARCHAR(32) NOT NULL DEFAULT 'manual', -- 'manual', 'entra', 'google'
    stage_timestamps JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departure_handover (
    id VARCHAR(128) PRIMARY KEY,
    departure_id VARCHAR(128) NOT NULL REFERENCES departure(id) ON DELETE CASCADE,
    asset_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    successor_id VARCHAR(128) REFERENCES entity(id) ON DELETE SET NULL,
    acceptance VARCHAR(32) NOT NULL DEFAULT 'none', -- 'none', 'requested', 'accepted', 'declined'
    decline_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_person ON departure(person_id);
CREATE INDEX IF NOT EXISTS idx_departure_stage ON departure(stage);
CREATE INDEX IF NOT EXISTS idx_handover_departure ON departure_handover(departure_id);
CREATE INDEX IF NOT EXISTS idx_handover_successor ON departure_handover(successor_id);

-- 2. ACTION RECORDS & RISK ACCEPTANCE
CREATE TABLE IF NOT EXISTS action_record (
    id VARCHAR(128) PRIMARY KEY,
    check_id VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'accepted_risk'
    accepted_risk_reason TEXT,
    accepted_risk_expires_at TIMESTAMPTZ,
    accepted_risk_by VARCHAR(128),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_status ON action_record(status);
CREATE INDEX IF NOT EXISTS idx_action_entity ON action_record(entity_id);

-- 3. ORGANIZATION SETTINGS
CREATE TABLE IF NOT EXISTS organization_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    company_name VARCHAR(255) NOT NULL DEFAULT 'Acme Corporation',
    logo_url TEXT,
    min_group_size INT NOT NULL DEFAULT 5,
    department_mappings JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USER ACCOUNTS
CREATE TABLE IF NOT EXISTS user_account (
    id VARCHAR(128) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL DEFAULT 'viewer', -- 'admin', 'viewer', 'reviewer'
    is_hr_manager BOOLEAN NOT NULL DEFAULT FALSE,
    title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
