"""
Persistence layer (roadmap Part-2, task 3).

SQLite is used so the platform runs with zero infrastructure during
development. The Repository interface is deliberately narrow — swap the
implementation for the storage engine mandated by the locked Antares
repository architecture without touching the engines.

Supported: create, read, update, search, relationship retrieval,
versioning, provenance, history, status transitions.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict
from typing import Any, Iterable

from .domain.models import (
    ConfidenceScore,
    EmergingSignal,
    EvidenceItem,
    EvidenceStatus,
    FuturePatternCandidate,
    ImpactDirection,
    IntelligenceArtifact,
    LifecycleState,
    OrganizationalImpact,
    SignalRelationship,
    SourceProvenance,
    SourceType,
    Trajectory,
    utc_now,
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    normalized_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    themes TEXT NOT NULL,
    dimensions TEXT NOT NULL,
    organizations TEXT NOT NULL,
    state TEXT NOT NULL,
    version INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    history TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_key ON signals(normalized_key);

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    signal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    status TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    published_at TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    retrieved_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_evidence_signal ON evidence(signal_id);

CREATE TABLE IF NOT EXISTS impacts (
    id TEXT PRIMARY KEY,
    signal_id TEXT NOT NULL,
    dimension TEXT NOT NULL,
    direction TEXT NOT NULL,
    severity INTEGER NOT NULL,
    horizon_months INTEGER NOT NULL,
    rationale TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_impacts_signal ON impacts(signal_id);

CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    source_signal_id TEXT NOT NULL,
    target_signal_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    strength REAL NOT NULL,
    explanation TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_signal_id);

CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT NOT NULL,
    signal_ids TEXT NOT NULL,
    dimensions TEXT NOT NULL,
    confidence_value REAL NOT NULL,
    confidence_factors TEXT NOT NULL,
    explanation TEXT NOT NULL,
    contradictions TEXT NOT NULL,
    trajectory TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    pattern_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    detail TEXT NOT NULL
);
"""


class Repository:
    def __init__(self, path: str = "fsi.db") -> None:
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    # -- audit -------------------------------------------------------------
    def log(self, entity_type: str, entity_id: str, action: str,
            actor: str = "system", detail: str = "") -> None:
        self.conn.execute(
            "INSERT INTO audit_log (at, entity_type, entity_id, action, actor, detail)"
            " VALUES (?,?,?,?,?,?)",
            (utc_now(), entity_type, entity_id, action, actor, detail),
        )
        self.conn.commit()

    def audit_trail(self, entity_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT * FROM audit_log WHERE entity_id=? ORDER BY seq", (entity_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    # -- signals -----------------------------------------------------------
    def save_signal(self, signal: EmergingSignal, actor: str = "system") -> EmergingSignal:
        existing = self.get_signal(signal.id)
        self.conn.execute(
            "INSERT INTO signals VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
            " ON CONFLICT(id) DO UPDATE SET"
            " title=excluded.title, description=excluded.description,"
            " themes=excluded.themes, dimensions=excluded.dimensions,"
            " organizations=excluded.organizations, state=excluded.state,"
            " version=excluded.version, updated_at=excluded.updated_at,"
            " history=excluded.history",
            (
                signal.id, signal.normalized_key, signal.title, signal.description,
                json.dumps(signal.themes), json.dumps(signal.dimensions),
                json.dumps(signal.organizations), signal.state.value, signal.version,
                signal.created_at, signal.updated_at, json.dumps(signal.history),
            ),
        )
        self.conn.commit()
        self.log("signal", signal.id, "UPDATE" if existing else "CREATE", actor,
                 f"state={signal.state.value} v{signal.version}")
        return signal

    def get_signal(self, signal_id: str) -> EmergingSignal | None:
        row = self.conn.execute("SELECT * FROM signals WHERE id=?", (signal_id,)).fetchone()
        return self._row_to_signal(row) if row else None

    def find_signal_by_key(self, normalized_key: str) -> EmergingSignal | None:
        row = self.conn.execute(
            "SELECT * FROM signals WHERE normalized_key=?", (normalized_key,)
        ).fetchone()
        return self._row_to_signal(row) if row else None

    def list_signals(self, state: LifecycleState | None = None,
                     theme: str | None = None, query: str | None = None) -> list[EmergingSignal]:
        sql, params = "SELECT * FROM signals WHERE 1=1", []
        if state:
            sql += " AND state=?"
            params.append(state.value)
        if theme:
            sql += " AND themes LIKE ?"
            params.append(f"%{theme}%")
        if query:
            sql += " AND (title LIKE ? OR description LIKE ?)"
            params += [f"%{query}%", f"%{query}%"]
        sql += " ORDER BY updated_at DESC"
        return [self._row_to_signal(r) for r in self.conn.execute(sql, params).fetchall()]

    @staticmethod
    def _row_to_signal(row: sqlite3.Row) -> EmergingSignal:
        return EmergingSignal(
            id=row["id"], normalized_key=row["normalized_key"], title=row["title"],
            description=row["description"], themes=json.loads(row["themes"]),
            dimensions=json.loads(row["dimensions"]),
            organizations=json.loads(row["organizations"]),
            state=LifecycleState(row["state"]), version=row["version"],
            created_at=row["created_at"], updated_at=row["updated_at"],
            history=json.loads(row["history"]),
        )

    # -- evidence ----------------------------------------------------------
    def save_evidence(self, item: EvidenceItem, actor: str = "system") -> EvidenceItem:
        p = item.provenance
        self.conn.execute(
            "INSERT OR REPLACE INTO evidence VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (item.id, item.signal_id, item.title, item.excerpt, item.status.value,
             item.observed_at, item.created_at, p.source_name, p.source_type.value,
             p.source_url, p.published_at, p.retrieved_at, p.retrieved_by),
        )
        self.conn.commit()
        self.log("evidence", item.id, "CREATE", actor, f"signal={item.signal_id}")
        return item

    def evidence_for(self, signal_id: str) -> list[EvidenceItem]:
        rows = self.conn.execute(
            "SELECT * FROM evidence WHERE signal_id=? ORDER BY observed_at", (signal_id,)
        ).fetchall()
        return [
            EvidenceItem(
                id=r["id"], signal_id=r["signal_id"], title=r["title"], excerpt=r["excerpt"],
                status=EvidenceStatus(r["status"]), observed_at=r["observed_at"],
                created_at=r["created_at"],
                provenance=SourceProvenance(
                    source_name=r["source_name"], source_type=SourceType(r["source_type"]),
                    source_url=r["source_url"], published_at=r["published_at"],
                    retrieved_at=r["retrieved_at"], retrieved_by=r["retrieved_by"],
                ),
            )
            for r in rows
        ]

    # -- impacts -----------------------------------------------------------
    def save_impact(self, impact: OrganizationalImpact, actor: str = "system") -> OrganizationalImpact:
        self.conn.execute(
            "INSERT OR REPLACE INTO impacts VALUES (?,?,?,?,?,?,?,?)",
            (impact.id, impact.signal_id, impact.dimension, impact.direction.value,
             impact.severity, impact.horizon_months, impact.rationale, impact.created_at),
        )
        self.conn.commit()
        self.log("impact", impact.id, "CREATE", actor, impact.dimension)
        return impact

    def impacts_for(self, signal_id: str) -> list[OrganizationalImpact]:
        rows = self.conn.execute(
            "SELECT * FROM impacts WHERE signal_id=?", (signal_id,)
        ).fetchall()
        return [
            OrganizationalImpact(
                id=r["id"], signal_id=r["signal_id"], dimension=r["dimension"],
                direction=ImpactDirection(r["direction"]), severity=r["severity"],
                horizon_months=r["horizon_months"], rationale=r["rationale"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    # -- relationships -----------------------------------------------------
    def save_relationship(self, rel: SignalRelationship) -> SignalRelationship:
        self.conn.execute(
            "INSERT OR REPLACE INTO relationships VALUES (?,?,?,?,?,?,?)",
            (rel.id, rel.source_signal_id, rel.target_signal_id, rel.relation,
             rel.strength, rel.explanation, rel.created_at),
        )
        self.conn.commit()
        return rel

    def relationships_for(self, signal_id: str) -> list[SignalRelationship]:
        rows = self.conn.execute(
            "SELECT * FROM relationships WHERE source_signal_id=? OR target_signal_id=?",
            (signal_id, signal_id),
        ).fetchall()
        return [
            SignalRelationship(
                id=r["id"], source_signal_id=r["source_signal_id"],
                target_signal_id=r["target_signal_id"], relation=r["relation"],
                strength=r["strength"], explanation=r["explanation"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def all_relationships(self) -> list[SignalRelationship]:
        rows = self.conn.execute("SELECT * FROM relationships").fetchall()
        return [
            SignalRelationship(
                id=r["id"], source_signal_id=r["source_signal_id"],
                target_signal_id=r["target_signal_id"], relation=r["relation"],
                strength=r["strength"], explanation=r["explanation"],
                created_at=r["created_at"],
            )
            for r in rows
        ]

    # -- patterns ----------------------------------------------------------
    def save_pattern(self, pattern: FuturePatternCandidate) -> FuturePatternCandidate:
        self.conn.execute(
            "INSERT OR REPLACE INTO patterns VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (pattern.id, pattern.name, pattern.theme, json.dumps(pattern.signal_ids),
             json.dumps(pattern.dimensions), pattern.confidence.value,
             json.dumps(pattern.confidence.factors), json.dumps(pattern.explanation),
             json.dumps(pattern.contradictions), pattern.trajectory.value,
             pattern.state.value, pattern.created_at),
        )
        self.conn.commit()
        self.log("pattern", pattern.id, "UPSERT", "system",
                 f"confidence={pattern.confidence.value}")
        return pattern

    def list_patterns(self) -> list[FuturePatternCandidate]:
        rows = self.conn.execute(
            "SELECT * FROM patterns ORDER BY confidence_value DESC"
        ).fetchall()
        return [
            FuturePatternCandidate(
                id=r["id"], name=r["name"], theme=r["theme"],
                signal_ids=json.loads(r["signal_ids"]),
                dimensions=json.loads(r["dimensions"]),
                confidence=ConfidenceScore(
                    value=r["confidence_value"],
                    factors=json.loads(r["confidence_factors"]),
                ),
                explanation=json.loads(r["explanation"]),
                contradictions=json.loads(r["contradictions"]),
                trajectory=Trajectory(r["trajectory"]),
                state=LifecycleState(r["state"]), created_at=r["created_at"],
            )
            for r in rows
        ]

    def get_pattern(self, pattern_id: str) -> FuturePatternCandidate | None:
        return next((p for p in self.list_patterns() if p.id == pattern_id), None)

    # -- artifacts ---------------------------------------------------------
    def save_artifact(self, artifact: IntelligenceArtifact) -> IntelligenceArtifact:
        self.conn.execute(
            "INSERT OR REPLACE INTO artifacts VALUES (?,?,?,?,?)",
            (artifact.id, artifact.pattern_id, artifact.schema_version,
             json.dumps(artifact.payload), artifact.created_at),
        )
        self.conn.commit()
        self.log("artifact", artifact.id, "CREATE", "system", artifact.pattern_id)
        return artifact

    def list_artifacts(self) -> list[IntelligenceArtifact]:
        rows = self.conn.execute("SELECT * FROM artifacts").fetchall()
        return [
            IntelligenceArtifact(
                id=r["id"], pattern_id=r["pattern_id"],
                schema_version=r["schema_version"], payload=json.loads(r["payload"]),
                created_at=r["created_at"],
            )
            for r in rows
        ]

    def close(self) -> None:
        self.conn.close()
