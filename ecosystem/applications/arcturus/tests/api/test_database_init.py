import sqlite3
import pytest
from pathlib import Path
from ecosystem.applications.arcturus.api.database import init_database

def test_init_database_creates_tables(tmp_path: Path):
    db_path = tmp_path / "test_arcturus.db"
    
    init_database(db_path)
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = {row[0] for row in cursor.fetchall()}
    conn.close()
    
    expected_tables = {
        "experiments",
        "simulation_runs",
        "simulation_events",
        "synthetic_artifacts",
        "validation_results",
    }
    
    # Assert that all expected tables are in the created tables
    assert expected_tables.issubset(tables)
