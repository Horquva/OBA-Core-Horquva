"""
Day 5 — Simulation Intelligence Platform. Owner: Ahmed Raza.

Reads directly from confirmed SQLite tables (simulation_runs, experiments,
validation_results, synthetic_artifacts) rather than importing Amina's
ValidationResult contract — same DB-driven pattern as synthetic_data.py,
avoiding a third guess-the-contract cycle.

Anti-hallucination boundary, three layers:
1. No VALIDATED row -> no assessment attempted.
2. No synthetic_artifacts for the run -> no assessment.
3. Every citation Gemini returns is cross-checked against the real
   fetched artifact_id set; unknown citations are dropped. If nothing
   real remains, no assessment is returned — never a fallback fabrication.

REPO-VERIFY: assumes Settings exposes `gemini_api_key`. Confirm in
api/config.py before merge.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Any
from uuid import UUID

import google.generativeai as genai

from ecosystem.applications.arcturus.api.config import Settings
from ecosystem.applications.arcturus.api.database import get_db_connection
from ecosystem.applications.arcturus.contracts.evaluation.intelligence_models import (
    GEMINI_SYSTEM_PROMPT,
    StructuredAssessment,
)
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)

PLATFORM_SOURCE = "simulation_intelligence"
GEMINI_MODEL_NAME = "gemini-2.5-flash"  # REPO-VERIFY: confirm current model name/availability


class IntelligenceUnavailable(Exception):
    """Gemini couldn't be reached. Caller must surface this honestly, never fabricate a result."""


class IntelligenceService:
    def __init__(self, settings: Settings | None = None, model: Any = None) -> None:
        self.settings = settings or Settings()
        self._model = model  # injectable for tests
        if self._model is None:
            genai.configure(api_key=self.settings.gemini_api_key)

    
    def generate_assessment(self, run_id: str) -> StructuredAssessment | None:
        with get_db_connection(self.settings.db_path) as db:
            run_context = self._fetch_run_context(db, run_id)
            if run_context is None:
                return None

            validation_row = self._fetch_validation(db, run_id)
            if validation_row is None or not self._is_validated(validation_row["final_status"]):
                return None

            artifact_rows = self._fetch_artifacts(db, run_id)
       
        if not artifact_rows:
            return None

        prompt = self._build_prompt(validation_row=validation_row, artifact_rows=artifact_rows)

        try:
            raw_response = self._call_gemini(prompt)
        except Exception as exc:
            raise IntelligenceUnavailable(f"Gemini call failed: {exc}") from exc

        return self._to_structured_assessment(
            raw_response=raw_response,
            run_context=run_context,
            known_artifact_ids={row["artifact_id"] for row in artifact_rows},
        )

    def _fetch_run_context(self, db: sqlite3.Connection, run_id: str) -> sqlite3.Row | None:
        return db.execute(
            "SELECT sr.run_id, sr.trace_id, sr.experiment_id, e.seed "
            "FROM simulation_runs sr JOIN experiments e ON sr.experiment_id = e.id "
            "WHERE sr.run_id = ?",
            (run_id,),
        ).fetchone()

    def _fetch_validation(self, db: sqlite3.Connection, run_id: str) -> sqlite3.Row | None:
        return db.execute(
            "SELECT final_status, passed_rules, failed_rules, flagged_rules, reason "
            "FROM validation_results WHERE run_id = ?",
            (run_id,),
        ).fetchone()

    def _fetch_artifacts(self, db: sqlite3.Connection, run_id: str) -> list[sqlite3.Row]:
        return db.execute(
            "SELECT artifact_id, artifact_type, content FROM synthetic_artifacts WHERE run_id = ?",
            (run_id,),
        ).fetchall()

    def _build_prompt(self, validation_row: sqlite3.Row, artifact_rows: list[sqlite3.Row]) -> str:
        evidence = [
            {
                "artifact_id": row["artifact_id"],
                "artifact_type": row["artifact_type"],
                "content": json.loads(row["content"]) if row["content"] else {},
            }
            for row in artifact_rows
        ]
        return json.dumps({
            "validation_summary": {
                "passed_rules": json.loads(validation_row["passed_rules"]) if validation_row["passed_rules"] else [],
                "failed_rules": json.loads(validation_row["failed_rules"]) if validation_row["failed_rules"] else [],
                "flagged_rules": json.loads(validation_row["flagged_rules"]) if validation_row["flagged_rules"] else [],
                "reason": validation_row["reason"],
            },
            "evidence": evidence,
            "output_instructions": (
                'Respond ONLY with JSON: {"assessment_summary": str, '
                '"confidence_score": float 0-1, "risk_factors": [str], '
                '"recommendations": [str], "evidence_citations": [artifact_id strings '
                "that MUST come from the evidence list above]}."
            ),
        })

    def _call_gemini(self, prompt: str) -> dict[str, Any]:
        model = self._model or genai.GenerativeModel(GEMINI_MODEL_NAME, system_instruction=GEMINI_SYSTEM_PROMPT)
        response = model.generate_content(
            prompt, generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        return json.loads(response.text)

    def _to_structured_assessment(
        self, raw_response: dict[str, Any], run_context: sqlite3.Row, known_artifact_ids: set[str],
    ) -> StructuredAssessment | None:
        cited = [a for a in raw_response.get("evidence_citations", []) if a in known_artifact_ids]
        if not cited:
            return None  # nothing real cited -> not trusted, no fallback fabrication

        try:
            return StructuredAssessment(
                context=SimulationContext(
                    run_id=UUID(run_context["run_id"]),
                    trace_id=UUID(run_context["trace_id"]),
                    experiment_id=run_context["experiment_id"],
                    global_seed=run_context["seed"],
                ),
                assessment_summary=raw_response.get("assessment_summary", ""),
                confidence_score=raw_response.get("confidence_score", 0.0),
                risk_factors=raw_response.get("risk_factors", []),
                recommendations=raw_response.get("recommendations", []),
                evidence_citations=cited,
            )
        except Exception as exc:
            raise ArcturusValidationError(
                message=f"Gemini response failed StructuredAssessment validation: {exc}",
                platform_source=PLATFORM_SOURCE,
            )

    def _is_validated(self, final_status: str | None) -> bool:
        """
        Case-insensitive on purpose: Amina's ValidationResultContract docstring
        says lowercase ("validated"), Hashim's database_schema.sql comment says
        uppercase ("VALIDATED"). Whichever her ValidationEngine actually writes,
        this matches it — flagged to her to confirm the real convention.
        """
        return (final_status or "").strip().upper() == "VALIDATED"        