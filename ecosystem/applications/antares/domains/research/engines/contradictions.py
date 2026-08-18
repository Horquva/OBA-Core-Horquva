"""
Contradiction engine (roadmap Part-5, task 4).

The system must not reinforce its own conclusions. This module is the part
of the platform whose job is to argue against the pattern engine.

Detects: conflicting evidence, contradictory signals, weak evidence,
outdated evidence, duplicated sources, unsupported assumptions.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ..domain.models import EvidenceStatus, ImpactDirection
from ..storage import Repository

OUTDATED_AFTER_DAYS = 730          # evidence older than 2 years is stale
WEAK_EVIDENCE_THRESHOLD = 0.4      # effective weight below this is weak
MIN_SOURCES_FOR_CLAIM = 2


def _parse(ts: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(ts)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


class ContradictionEngine:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    def check_signal(self, signal_id: str) -> list[dict[str, Any]]:
        findings: list[dict[str, Any]] = []
        evidence = self.repo.evidence_for(signal_id)

        if not evidence:
            findings.append({
                "type": "UNSUPPORTED_ASSUMPTION",
                "severity": "HIGH",
                "detail": "Signal has no evidence attached.",
                "signal_id": signal_id,
            })
            return findings

        # duplicated sources — three items from one blog is one source, not three
        by_source: dict[str, int] = {}
        for e in evidence:
            by_source[e.provenance.source_name] = by_source.get(e.provenance.source_name, 0) + 1
        for name, count in by_source.items():
            if count > 1 and len(by_source) == 1:
                findings.append({
                    "type": "DUPLICATED_SOURCE",
                    "severity": "MEDIUM",
                    "detail": f"All {count} evidence items come from a single source ({name}). "
                              f"Recurrence here is repetition, not independent corroboration.",
                    "signal_id": signal_id,
                })

        if len(by_source) < MIN_SOURCES_FOR_CLAIM:
            findings.append({
                "type": "INSUFFICIENT_SOURCE_DIVERSITY",
                "severity": "MEDIUM",
                "detail": f"Only {len(by_source)} distinct source(s); "
                          f"{MIN_SOURCES_FOR_CLAIM} required for a pattern claim.",
                "signal_id": signal_id,
            })

        # weak / outdated / retracted evidence
        cutoff = datetime.now(timezone.utc) - timedelta(days=OUTDATED_AFTER_DAYS)
        for e in evidence:
            if e.status == EvidenceStatus.RETRACTED:
                findings.append({
                    "type": "RETRACTED_EVIDENCE", "severity": "HIGH",
                    "detail": f"Evidence '{e.title}' is retracted but still linked.",
                    "signal_id": signal_id, "evidence_id": e.id,
                })
            elif e.status == EvidenceStatus.DISPUTED:
                findings.append({
                    "type": "CONFLICTING_EVIDENCE", "severity": "HIGH",
                    "detail": f"Evidence '{e.title}' is marked disputed.",
                    "signal_id": signal_id, "evidence_id": e.id,
                })
            if e.weight < WEAK_EVIDENCE_THRESHOLD:
                findings.append({
                    "type": "WEAK_EVIDENCE", "severity": "LOW",
                    "detail": f"Evidence '{e.title}' has effective weight {e.weight} "
                              f"(source: {e.provenance.source_type.value}).",
                    "signal_id": signal_id, "evidence_id": e.id,
                })
            observed = _parse(e.observed_at)
            if observed and observed < cutoff:
                findings.append({
                    "type": "OUTDATED_EVIDENCE", "severity": "MEDIUM",
                    "detail": f"Evidence '{e.title}' predates the {OUTDATED_AFTER_DAYS}-day "
                              f"freshness window (observed {e.observed_at}).",
                    "signal_id": signal_id, "evidence_id": e.id,
                })

        # contradictory impact direction on the same dimension across related signals
        for rel in self.repo.relationships_for(signal_id):
            if rel.relation != "CONTRADICTS":
                continue
            findings.append({
                "type": "CONTRADICTORY_SIGNAL", "severity": "HIGH",
                "detail": f"Signal contradicts {rel.target_signal_id}: {rel.explanation}",
                "signal_id": signal_id,
            })

        return findings

    def check_pattern(self, signal_ids: list[str]) -> list[dict[str, Any]]:
        """Contradictions across the whole set of signals backing a pattern."""
        findings: list[dict[str, Any]] = []
        for sid in signal_ids:
            findings.extend(self.check_signal(sid))

        # opposite directions on the same dimension inside one pattern
        seen: dict[str, set[str]] = {}
        for sid in signal_ids:
            for imp in self.repo.impacts_for(sid):
                seen.setdefault(imp.dimension, set()).add(imp.direction.value)
        for dimension, directions in seen.items():
            if {ImpactDirection.INCREASES.value, ImpactDirection.DECREASES.value} <= directions:
                findings.append({
                    "type": "CONFLICTING_IMPACT_DIRECTION", "severity": "HIGH",
                    "detail": f"Signals in this pattern claim both increase and decrease "
                              f"on '{dimension}'. The pattern cannot be confirmed until resolved.",
                })
        return findings

    @staticmethod
    def penalty(findings: list[dict[str, Any]]) -> float:
        """Confidence penalty in 0..1. Feeds the pattern scorer."""
        weights = {"HIGH": 0.20, "MEDIUM": 0.10, "LOW": 0.04}
        total = sum(weights.get(f.get("severity", "LOW"), 0.04) for f in findings)
        return min(total, 0.9)
