"""
Synthetic Data schema boundary.

The canonical Pydantic contract definitions live in
ecosystem.applications.arcturus.contracts.synthetic_data.base_models.

This module intentionally re-exports those models instead of creating shadow
or duplicate cross-platform schemas.
"""

from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract,
    SyntheticGenerationRequest,
    SyntheticGenerationResult,
    SyntheticRelationshipContract,
)

__all__ = [
    "SyntheticGenerationRequest",
    "SyntheticArtifactContract",
    "SyntheticRelationshipContract",
    "SyntheticGenerationResult",
]