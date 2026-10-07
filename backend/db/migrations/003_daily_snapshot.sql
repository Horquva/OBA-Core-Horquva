-- =============================================================================
-- Horquva Continuity Platform — Migration 003: Daily Continuity Snapshots (TRD-01)
-- =============================================================================
-- Stores a dated daily snapshot of headline measures:
-- - Coverage count (covered, exposed, unknown, total)
-- - Ownerless assets, open handovers, unconfirmed facts
-- - Team concentration and automation failure aggregates
-- Enables diffing continuity across sign-in visits (backupsLost, newlyExposed).
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL UNIQUE,
    headline JSONB NOT NULL,
    team_concentration JSONB NOT NULL DEFAULT '[]',
    automation_failures JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshot_date ON daily_snapshot(snapshot_date DESC);
