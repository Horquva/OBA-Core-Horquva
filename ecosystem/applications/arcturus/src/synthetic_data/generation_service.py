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

    def generate_corpus(self, result: ExperimentResultPackage) -> SyntheticDataCorpus:
        """
        Day 4 — trusted corpus boundary, built from ExperimentResultPackage.state_snapshot.

        Per team lead confirmation  state_snapshot is a dict
        on ExperimentResultPackage, not a separate typed class, with keys:
            artifacts (list, Ahmed's SyntheticArtifactContract shape,
                       round-tripped through the runtime)
            relationships (list — not yet represented in SyntheticDataCorpus,
                           intentionally out of scope here, see PR note)
            deterministic_fingerprint (str)
            clock_step (int — tick the run reached)
            last_step_at (timestamp)

        Every artifact gets a lineage record. Anything that fails
        SyntheticArtifactContract validation is rejected with a reason,
        never silently dropped and never fabricated (Day 6 rule). An
        empty or missing state_snapshot produces an empty corpus, not
        an error.
        """
        context = result.context
        snapshot = result.state_snapshot or {}
        raw_artifacts = snapshot.get("artifacts", [])
        clock_step = snapshot.get("clock_step", 0)

        accepted: list[SyntheticArtifactContract] = []
        rejected: list[RejectedArtifactRecord] = []
        lineage: list[LineageRecord] = []

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
                    rejected.append(
                        RejectedArtifactRecord(
                            candidate_artifact_id=candidate_id,
                            rejection_reason=f"failed SyntheticArtifactContract validation: {exc}",
                            event_id=event_id,
                        )
                    )
                    continue

            accepted.append(artifact)
            lineage.append(
                build_lineage_record(
                    context=context, tick=clock_step,
                    event_id=event_id, data_point_id=artifact.artifact_id,
                )
            )

        return SyntheticDataCorpus(
            context=context,
            accepted_artifacts=accepted,
            rejected_artifacts=rejected,
            lineage=lineage,
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