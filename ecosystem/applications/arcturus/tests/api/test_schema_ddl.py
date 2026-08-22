"""
Tests for SQLite Database Schema DDL Blueprint (Day 0 foundation).
"""
import sqlite3
from pathlib import Path
import pytest

SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "api" / "database_schema.sql"


def test_schema_file_exists():
    assert SCHEMA_PATH.exists(), f"Schema file not found at {SCHEMA_PATH}"


def test_schema_executes_in_sqlite():
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    
    # Connect to in-memory SQLite database
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    
    # Execute script
    cursor.executescript(sql)
    
    # Verify tables created
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row[0] for row in cursor.fetchall()]
    
    expected_tables = [
        "checkpoints",
        "experiments",
        "simulation_events",
        "simulation_runs",
        "synthetic_artifacts",
        "validation_results",
    ]
    
    for tbl in expected_tables:
        assert tbl in tables, f"Expected table '{tbl}' not found in SQLite master: {tables}"
        
    conn.close()


def test_schema_foreign_key_and_insert():
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.executescript(sql)
    
    # Insert experiment
    cursor.execute(
        "INSERT INTO experiments (id, name, seed, config, status) VALUES (?, ?, ?, ?, ?)",
        ("exp-01", "Test Exp", 42, '{"ticks": 100}', "CREATED")
    )
    
    # Insert run
    cursor.execute(
        "INSERT INTO simulation_runs (run_id, experiment_id, trace_id, status) VALUES (?, ?, ?, ?)",
        ("run-uuid-1", "exp-01", "trace-uuid-1", "RUNNING")
    )
    
    # Insert event
    cursor.execute(
        "INSERT INTO simulation_events (event_id, run_id, tick, event_type, affected_entities, observed_state_changes) VALUES (?, ?, ?, ?, ?, ?)",
        ("evt-01", "run-uuid-1", 1, "TICK", "[]", "{}")
    )
    
    # Insert validation result
    cursor.execute(
        "INSERT INTO validation_results (run_id, passed_rules, failed_rules, flagged_rules, final_status, reason) VALUES (?, ?, ?, ?, ?, ?)",
        ("run-uuid-1", "[]", "[]", "[]", "VALIDATED", "All rules passed")
    )
    
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM simulation_events WHERE run_id = 'run-uuid-1'")
    assert cursor.fetchone()[0] == 1
    
    conn.close()
