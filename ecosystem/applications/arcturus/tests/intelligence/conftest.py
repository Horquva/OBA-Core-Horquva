import json
import sqlite3
from uuid import uuid4

import pytest


class FakeSettings:
    def __init__(self, db_path):
        self.db_path = db_path
        self.gemini_api_key = "test-key"


@pytest.fixture()
def db_path(tmp_path):
    path = tmp_path / "test.db"
    conn = sqlite3.connect(str(path))
    conn.executescript("""
        CREATE TABLE experiments (id TEXT PRIMARY KEY, seed INTEGER NOT NULL);
        CREATE TABLE simulation_runs (run_id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, trace_id TEXT NOT NULL);
        CREATE TABLE validation_results (
            run_id TEXT PRIMARY KEY, passed_rules JSON, failed_rules JSON,
            flagged_rules JSON, final_status TEXT NOT NULL, reason TEXT
        );
        CREATE TABLE synthetic_artifacts (
            artifact_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, artifact_type TEXT NOT NULL, content JSON
        );
    """)
    conn.commit()
    conn.close()
    return path


def seed_run(db_path, run_id, experiment_id="EXP-001", seed=7, final_status="VALIDATED", artifacts=None):
    conn = sqlite3.connect(str(db_path))
    conn.execute("INSERT INTO experiments (id, seed) VALUES (?, ?)", (experiment_id, seed))
    conn.execute("INSERT INTO simulation_runs (run_id, experiment_id, trace_id) VALUES (?, ?, ?)",
                 (run_id, experiment_id, str(uuid4())))
    if final_status is not None:
        conn.execute(
            "INSERT INTO validation_results (run_id, passed_rules, failed_rules, flagged_rules, final_status) "
            "VALUES (?, '[]', '[]', '[]', ?)", (run_id, final_status))
    for artifact_id, content in (artifacts or []):
        conn.execute("INSERT INTO synthetic_artifacts (artifact_id, run_id, artifact_type, content) VALUES (?, ?, 'document', ?)",
                     (artifact_id, run_id, json.dumps(content)))
    conn.commit()
    conn.close()


class FakeGeminiResponse:
    def __init__(self, payload: dict):
        self.text = json.dumps(payload)


class FakeGeminiModel:
    def __init__(self, response_payload: dict | None = None, raise_error: bool = False):
        self._payload = response_payload
        self._raise = raise_error

    def generate_content(self, prompt, generation_config=None):
        if self._raise:
            raise RuntimeError("simulated Gemini outage")
        return FakeGeminiResponse(self._payload)