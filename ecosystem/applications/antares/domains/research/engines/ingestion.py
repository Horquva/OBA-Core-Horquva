"""
Signal ingestion + evidence engine (roadmap Part-3, tasks 1-3).

Pipeline:
    validate -> normalize -> deduplicate -> classify -> persist -> capture provenance

Deduplication is by normalized title key. If a signal already exists, the new
submission is merged into it (new evidence, extra themes/organizations) instead
of creating a near-duplicate record.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..domain import taxonomy
from ..domain.models import (
    EmergingSignal,
    EvidenceItem,
    EvidenceStatus,
    LifecycleState,
    SourceProvenance,
    SourceType,
    normalize_text,
)
from ..storage import Repository


class ValidationError(ValueError):
    """Input rejected at the platform boundary."""


@dataclass
class IngestionResult:
    signal: EmergingSignal
    created: bool
    merged_into: str | None = None
    warnings: list[str] = None

    def __post_init__(self) -> None:
        if self.warnings is None:
            self.warnings = []


REQUIRED_SIGNAL_FIELDS = ("title", "description")
MIN_TITLE_LEN = 8
MIN_DESCRIPTION_LEN = 30


class IngestionEngine:
    def __init__(self, repo: Repository) -> None:
        self.repo = repo

    # -- validation --------------------------------------------------------
    def _validate_signal_payload(self, payload: dict[str, Any]) -> None:
        for f in REQUIRED_SIGNAL_FIELDS:
            if not payload.get(f):
                raise ValidationError(f"Missing required field '{f}'")
        if len(payload["title"].strip()) < MIN_TITLE_LEN:
            raise ValidationError(
                f"Title too short (min {MIN_TITLE_LEN} chars) — a signal title must be "
                f"specific enough to deduplicate against."
            )
        if len(payload["description"].strip()) < MIN_DESCRIPTION_LEN:
            raise ValidationError(
                f"Description too short (min {MIN_DESCRIPTION_LEN} chars)."
            )
        for dim in payload.get("dimensions", []):
            taxonomy.validate_dimension(dim)
        for theme in payload.get("themes", []):
            taxonomy.validate_theme(theme)

    # -- ingestion ---------------------------------------------------------
    def ingest_signal(self, payload: dict[str, Any], actor: str = "system") -> IngestionResult:
        self._validate_signal_payload(payload)

        title = payload["title"].strip()
        description = payload["description"].strip()
        key = normalize_text(title)

        # classification: explicit themes win, otherwise deterministic keyword match
        themes = payload.get("themes") or taxonomy.classify(f"{title} {description}")
        dimensions = payload.get("dimensions") or taxonomy.dimensions_for_themes(themes)

        warnings: list[str] = []
        if not themes:
            warnings.append(
                "No taxonomy theme matched. Signal stored as unclassified and flagged "
                "for human review — do not let it enter pattern detection until classified."
            )

        existing = self.repo.find_signal_by_key(key)
        if existing:
            # merge rather than duplicate
            for t in themes:
                if t not in existing.themes:
                    existing.themes.append(t)
            for d in dimensions:
                if d not in existing.dimensions:
                    existing.dimensions.append(d)
            for org in payload.get("organizations", []):
                if org not in existing.organizations:
                    existing.organizations.append(org)
            existing.version += 1
            self.repo.save_signal(existing, actor)
            return IngestionResult(existing, created=False, merged_into=existing.id,
                                   warnings=warnings + ["Merged into existing signal (duplicate title)."])

        signal = EmergingSignal(
            title=title,
            description=description,
            themes=themes,
            dimensions=dimensions,
            organizations=payload.get("organizations", []),
        )
        self.repo.save_signal(signal, actor)
        return IngestionResult(signal, created=True, warnings=warnings)

    # -- evidence ----------------------------------------------------------
    def attach_evidence(self, signal_id: str, payload: dict[str, Any],
                        actor: str = "system") -> EvidenceItem:
        signal = self.repo.get_signal(signal_id)
        if not signal:
            raise ValidationError(f"Unknown signal '{signal_id}'")

        for f in ("title", "excerpt", "source_name", "source_type"):
            if not payload.get(f):
                raise ValidationError(f"Evidence missing required field '{f}'")

        try:
            source_type = SourceType(payload["source_type"])
        except ValueError:
            raise ValidationError(
                f"Unknown source_type '{payload['source_type']}'. "
                f"Known: {[s.value for s in SourceType]}"
            )

        item = EvidenceItem(
            signal_id=signal_id,
            title=payload["title"].strip(),
            excerpt=payload["excerpt"].strip(),
            status=EvidenceStatus(payload.get("status", "UNVERIFIED")),
            observed_at=payload.get("observed_at", ""),
            provenance=SourceProvenance(
                source_name=payload["source_name"],
                source_type=source_type,
                source_url=payload.get("source_url", ""),
                published_at=payload.get("published_at", ""),
                retrieved_by=actor,
            ),
        )
        self.repo.save_evidence(item, actor)

        # first evidence moves the signal forward in its lifecycle
        if signal.state == LifecycleState.DISCOVERED:
            signal.transition(LifecycleState.EVIDENCE_CAPTURED,
                              note=f"evidence {item.id} attached", actor=actor)
            self.repo.save_signal(signal, actor)
        return item
