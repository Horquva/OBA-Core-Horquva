-- Arcturus Simulation Platform — Database Schema Blueprint
-- Engine: SQLite (Local Persistence)
-- Concurrency Strategy: WAL mode + 30s busy timeout

PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 30000;
PRAGMA foreign_keys = ON;

-- 1. Experiments table
CREATE TABLE IF NOT EXISTS experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    seed INTEGER NOT NULL,
    config JSON NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 2. Simulation Runs table
CREATE TABLE IF NOT EXISTS simulation_runs (
    run_id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    trace_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_exp ON simulation_runs(experiment_id);

-- 3. Simulation Events table
CREATE TABLE IF NOT EXISTS simulation_events (
    event_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    affected_entities JSON NOT NULL,
    observed_state_changes JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simulation_events_run_tick ON simulation_events(run_id, tick);

-- 4. Checkpoints table (State snapshots for pause/resume/replay)
CREATE TABLE IF NOT EXISTS checkpoints (
    checkpoint_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,
    state_snapshot JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_run_tick ON checkpoints(run_id, tick);

-- 5. Synthetic Artifacts table (Data Factory output with lineage)
CREATE TABLE IF NOT EXISTS synthetic_artifacts (
    artifact_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    content JSON NOT NULL,
    metadata JSON NOT NULL,
    lifecycle_state TEXT NOT NULL DEFAULT 'ACCEPTED',
    provenance JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synthetic_artifacts_run ON synthetic_artifacts(run_id);
CREATE INDEX IF NOT EXISTS idx_synthetic_artifacts_type ON synthetic_artifacts(artifact_type);

-- 6. Validation Results table
CREATE TABLE IF NOT EXISTS validation_results (
    run_id TEXT PRIMARY KEY REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
    passed_rules JSON NOT NULL,
    failed_rules JSON NOT NULL,
    flagged_rules JSON NOT NULL,
    final_status TEXT NOT NULL, -- 'VALIDATED', 'REJECTED', 'INCONCLUSIVE'
    reason TEXT,
    metrics JSON NOT NULL DEFAULT '{}',
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Synthetic Lineage table (Tracks origin of artifacts)
CREATE TABLE IF NOT EXISTS synthetic_lineage (
    lineage_id TEXT PRIMARY KEY,
    artifact_id TEXT NOT NULL REFERENCES synthetic_artifacts(artifact_id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    generation_method TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synthetic_lineage_artifact ON synthetic_lineage(artifact_id);

-- 8. Synthetic Rejected Artifacts table (Items failing hard validation)
CREATE TABLE IF NOT EXISTS synthetic_rejected_artifacts (
    rejection_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    content JSON NOT NULL,
    rejection_reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synthetic_rejected_run ON synthetic_rejected_artifacts(run_id);
