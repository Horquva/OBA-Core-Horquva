from __future__ import annotations

import hashlib
import json
import random
from typing import Any
from uuid import UUID

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ArcturusValidationError,
    SimulationContext,
)
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticGenerationRequest,
    SyntheticGenerationResult,
    SyntheticRelationshipContract,
)
from pydantic import ValidationError

from ecosystem.applications.arcturus.contracts.simulation.base_models import ExperimentResultPackage
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    LineageRecord,
    RejectedArtifactRecord,
    SyntheticArtifactContract,
    SyntheticDataCorpus,
)
from ecosystem.applications.arcturus.src.lineage.lineage_tracker import build_lineage_record

class SyntheticGenerationService:
    """
    Week 3 local generation engine for the Synthetic Data Platform.

    Responsibilities:
    - consume SyntheticGenerationRequest
    - generate deterministic synthetic artifacts
    - preserve SimulationContext
    - build generation provenance
    - build synthetic-data-owned relationships
    - produce a deterministic SyntheticGenerationResult

    This service does not call or import sibling platform implementations.
    """

    PLATFORM_SOURCE = "synthetic_data"

    # These artifact families come directly from the Synthetic Data roadmap.
    SUPPORTED_ARTIFACT_TYPES = frozenset(
        {
            "document",
            "communication",
            "meeting",
            "policy",
            "report",
            "ticket",
            "knowledge_article",
            "project_information",
            "organizational_record",
            "audit_information",
        }
    )

    DEFAULT_ARTIFACT_TYPE = "document"
    def _generate_corpus_from_result(self, result: ExperimentResultPackage) -> SyntheticDataCorpus:
        context = result.context
        snapshot = result.state_snapshot

        if snapshot is None:
            raw_artifacts = []
            clock_step = 0
        elif isinstance(snapshot, dict):
            raw_artifacts = snapshot.get("artifacts", [])
            clock_step = snapshot.get("clock_step", 0)
        else:
            raw_artifacts = getattr(snapshot, "artifacts", [])
            clock_step = getattr(snapshot, "clock_step", 0)

        if not isinstance(raw_artifacts, list):
            return SyntheticDataCorpus(
                context=context,
                accepted_artifacts=[],
                rejected_artifacts=[RejectedArtifactRecord(
                    candidate_artifact_id="UNKNOWN-MALFORMED-SNAPSHOT",
                    rejection_reason=f"state_snapshot artifacts must be a list, got {type(raw_artifacts).__name__}",
                    event_id=f"STATE-{context.run_id}-{clock_step}-malformed",
                )],
                lineage=[],
            )

        accepted: list[SyntheticArtifactContract] = []
        rejected: list[RejectedArtifactRecord] = []
        lineage: list[LineageRecord] = []
        accepted_ids_seen: set[str] = set()

        for index, raw_artifact in enumerate(raw_artifacts):
            event_id = f"STATE-{context.run_id}-{clock_step}-{index}"

            if isinstance(raw_artifact, SyntheticArtifactContract):
                artifact = raw_artifact
            else:
                try:
                    artifact = SyntheticArtifactContract.model_validate(raw_artifact)
                except (ValidationError, TypeError) as exc:
                    candidate_id = (
                        raw_artifact.get("artifact_id", f"UNKNOWN-{index}")
                        if isinstance(raw_artifact, dict) else f"UNKNOWN-{index}"
                    )
                    rejected.append(RejectedArtifactRecord(
                        candidate_artifact_id=candidate_id,
                        rejection_reason=f"failed SyntheticArtifactContract validation: {exc}",
                        event_id=event_id,
                    ))
                    continue

            if artifact.artifact_id in accepted_ids_seen:
                rejected.append(RejectedArtifactRecord(
                    candidate_artifact_id=artifact.artifact_id,
                    rejection_reason=f"duplicate artifact_id already accepted in this batch: {artifact.artifact_id}",
                    event_id=event_id,
                ))
                continue

            accepted_ids_seen.add(artifact.artifact_id)
            accepted.append(artifact)
            lineage.append(build_lineage_record(
                context=context, tick=clock_step, event_id=event_id, data_point_id=artifact.artifact_id,
            ))

        return SyntheticDataCorpus(
            context=context, accepted_artifacts=accepted, rejected_artifacts=rejected, lineage=lineage,
        )

    def generate_corpus(
        self,
        result: ExperimentResultPackage | None = None,
        context: SimulationContext | None = None,
        events: list[Any] | None = None,
    ) -> SyntheticDataCorpus:
        """
        Two calling conventions:
        1. generate_corpus(result=ExperimentResultPackage) — PR #137, tested.
           Delegates to _generate_corpus_from_result, unchanged.
        2. generate_corpus(context=, events=) — matches the orchestrator's
           real call in _step_synthetic_data. Its upstream (_step_runtime)
           is still stubbed and always passes events=[], so that case
           returns a valid EMPTY corpus. A non-empty events list has no
           confirmed schema (the SimulationEventStream theory was retracted
           by the team lead) — raises rather than guessing a parse.
        """
        if result is not None:
            return self._generate_corpus_from_result(result)

        if context is not None:
            if not events:
                return SyntheticDataCorpus(
                    context=context, accepted_artifacts=[], rejected_artifacts=[], lineage=[]
                )
            raise ArcturusValidationError(
                message=(
                    "generate_corpus(context=, events=) got a non-empty events list "
                    "with no confirmed schema. Wire _step_runtime to a real "
                    "ExperimentResultPackage and call generate_corpus(result=...) "
                    "instead of guessing this parse."
                ),
                platform_source=self.PLATFORM_SOURCE,
            )

        raise ArcturusValidationError(
            message="generate_corpus requires result= or context=",
            platform_source=self.PLATFORM_SOURCE,
        )
    
    def generate_snapshot(
        self,
        request: SyntheticGenerationRequest,
    ) -> SyntheticGenerationResult:
        """
        Generate one deterministic synthetic-data snapshot.

        Same request context + same seed + same generation configuration
        produces the same artifacts, relationships, and fingerprint.
        """

        self._validate_request(request)

        artifact_types = self._resolve_artifact_types(request)
        artifact_count = self._resolve_artifact_count(
            request=request,
            artifact_types=artifact_types,
        )

        rng = random.Random(request.context.global_seed)

        artifacts: list[SyntheticArtifactContract] = []

        for index in range(artifact_count):
            artifact_type = artifact_types[index % len(artifact_types)]

            artifact_id = self._build_artifact_id(
                context=request.context,
                artifact_type=artifact_type,
                artifact_index=index,
            )

            artifact = SyntheticArtifactContract(
                artifact_id=artifact_id,
                artifact_type=artifact_type,
                content=self._build_content(
                    rng=rng,
                    artifact_type=artifact_type,
                    artifact_index=index,
                ),
                metadata={
                    "source_platform": self.PLATFORM_SOURCE,
                    "sequence": index + 1,
                    "experiment_id": request.context.experiment_id,
                },
                lifecycle_state="generated",
                version=1,
                created_at=request.context.created_at,
                provenance=self.build_provenance(
                    context=request.context,
                    artifact_index=index,
                    artifact_type=artifact_type,
                ),
            )

            artifacts.append(artifact)

        relationships = self.link_relationships(
            artifacts=artifacts,
            context=request.context,
        )

        deterministic_fingerprint = self._build_fingerprint(
            context=request.context,
            artifacts=artifacts,
            relationships=relationships,
        )

        return SyntheticGenerationResult(
            context=request.context,
            artifacts=artifacts,
            relationships=relationships,
            deterministic_fingerprint=deterministic_fingerprint,
        )

    def link_relationships(
        self,
        artifacts: list[SyntheticArtifactContract],
        context: SimulationContext,
    ) -> list[SyntheticRelationshipContract]:
        """
        Link every generated artifact to the canonical simulation run.

        Day 2 intentionally does not invent enterprise/workforce/project IDs.
        Those references require real upstream contracts and integration work.
        """

        relationships: list[SyntheticRelationshipContract] = []

        for artifact in artifacts:
            relationships.append(
                SyntheticRelationshipContract(
                    source_artifact_id=artifact.artifact_id,
                    target_id=str(context.run_id),
                    target_type="simulation_run",
                    relationship_type="generated_for_run",
                    metadata={
                        "experiment_id": context.experiment_id,
                    },
                )
            )

        return relationships

    def build_provenance(
        self,
        context: SimulationContext,
        artifact_index: int,
        artifact_type: str,
    ) -> dict[str, Any]:
        """
        Build traceable provenance using only canonical shared context values.
        """

        return {
            "platform_source": self.PLATFORM_SOURCE,
            "run_id": str(context.run_id),
            "trace_id": str(context.trace_id),
            "experiment_id": context.experiment_id,
            "global_seed": context.global_seed,
            "artifact_index": artifact_index,
            "artifact_type": artifact_type,
            "context_created_at": context.created_at.isoformat(),
        }

    def _validate_request(
        self,
        request: SyntheticGenerationRequest,
    ) -> None:
        if not isinstance(request, SyntheticGenerationRequest):
            raise ArcturusValidationError(
                message="Expected SyntheticGenerationRequest",
                platform_source=self.PLATFORM_SOURCE,
            )

        invalid_types = [
            value
            for value in request.requested_artifact_types
            if not value.strip()
        ]

        if invalid_types:
            raise ArcturusValidationError(
                message="Artifact type values cannot be empty",
                platform_source=self.PLATFORM_SOURCE,
            )

        unsupported_types = sorted(
            {
                value.strip().lower()
                for value in request.requested_artifact_types
                if value.strip().lower()
                not in self.SUPPORTED_ARTIFACT_TYPES
            }
        )

        if unsupported_types:
            raise ArcturusValidationError(
                message=(
                    "Unsupported artifact type(s): "
                    + ", ".join(unsupported_types)
                ),
                platform_source=self.PLATFORM_SOURCE,
            )

    def _resolve_artifact_types(
        self,
        request: SyntheticGenerationRequest,
    ) -> list[str]:
        if not request.requested_artifact_types:
            return [self.DEFAULT_ARTIFACT_TYPE]

        normalized: list[str] = []

        for value in request.requested_artifact_types:
            artifact_type = value.strip().lower()

            if artifact_type not in normalized:
                normalized.append(artifact_type)

        return normalized

    def _resolve_artifact_count(
        self,
        request: SyntheticGenerationRequest,
        artifact_types: list[str],
    ) -> int:
        if request.requested_artifact_count is not None:
            return request.requested_artifact_count

        return len(artifact_types)

    def _build_artifact_id(
        self,
        context: SimulationContext,
        artifact_type: str,
        artifact_index: int,
    ) -> str:
        source = (
            f"{context.run_id}:"
            f"{context.experiment_id}:"
            f"{context.global_seed}:"
            f"{artifact_type}:"
            f"{artifact_index}"
        )

        digest = hashlib.sha256(source.encode("utf-8")).hexdigest()

        return f"ART-{digest[:16].upper()}"

    def _build_content(
        self,
        rng: random.Random,
        artifact_type: str,
        artifact_index: int,
    ) -> dict[str, Any]:
        """
        Build small deterministic synthetic content for the Week 3 slice.

        Deeper artifact-specific content generation remains outside the
        compressed Day 2 vertical slice.
        """

        return {
            "synthetic": True,
            "artifact_type": artifact_type,
            "sequence": artifact_index + 1,
            "record_number": rng.randint(100000, 999999),
            "label": f"{artifact_type}-{artifact_index + 1:03d}",
        }

    def _build_fingerprint(
        self,
        context: SimulationContext,
        artifacts: list[SyntheticArtifactContract],
        relationships: list[SyntheticRelationshipContract],
    ) -> str:
        """
        Produce a stable SHA-256 fingerprint of the canonical generated output.
        """

        fingerprint_payload = {
            "context": context.model_dump(mode="json"),
            "artifacts": [
                artifact.model_dump(mode="json")
                for artifact in artifacts
            ],
            "relationships": [
                relationship.model_dump(mode="json")
                for relationship in relationships
            ],
        }

        canonical_json = json.dumps(
            fingerprint_payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )

        return hashlib.sha256(
            canonical_json.encode("utf-8")
        ).hexdigest()

GenerationService = SyntheticGenerationService  # orchestrator import alias