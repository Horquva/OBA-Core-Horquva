from uuid import UUID
import pytest

from ecosystem.applications.arcturus.contracts.shared.base_models import ArcturusValidationError, SimulationContext
from ecosystem.applications.arcturus.src.synthetic_data.generation_service import (
    GenerationService,
    SyntheticGenerationService,
)


def build_context() -> SimulationContext:
    return SimulationContext(experiment_id="EXP-DAY4", global_seed=7)


def test_generation_service_alias_matches_orchestrator_import() -> None:
    assert GenerationService is SyntheticGenerationService


def test_empty_events_produces_valid_empty_corpus() -> None:
    corpus = GenerationService().generate_corpus(context=build_context(), events=[])
    assert corpus.accepted_artifacts == []
    assert corpus.lineage == []


def test_nonempty_events_fails_honestly_not_fabricated() -> None:
    with pytest.raises(ArcturusValidationError):
        GenerationService().generate_corpus(context=build_context(), events=[{"tick": 1}])