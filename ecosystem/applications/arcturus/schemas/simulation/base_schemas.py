"""
Simulation Runtime schema boundary.

The canonical Pydantic contract definitions live in
ecosystem.applications.arcturus.contracts.simulation.base_models.

This module intentionally re-exports those models instead of creating shadow
or duplicate cross-platform schemas.
"""

from ecosystem.applications.arcturus.contracts.simulation.base_models import (
    ExecutionStatus as ExecutionStatusSchema,
)

__all__ = ["ExecutionStatusSchema"]
