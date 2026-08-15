"""
Arcturus Day 5 — Validation & Evaluation Chain Step
=====================================================
Platform Owner: Amina Khan (Validation & Evaluation Platform)

Day 5 E2E chain position (last step):
  Ontology -> Enterprise -> Workforce -> Workflows -> Scenarios
  -> Synthetic Data -> Runtime -> Validation

This module exposes the Validation & Evaluation Platform's step of the
Day 5 end-to-end vertical slice, using shared contracts as the
communication layer (in-process, no HTTP), consistent with
integration/e2e_chain.py.

run_validation_chain(package)
    Takes Maaz's confirmed ExperimentResultPackage and runs it through
    the real adapter -> engine -> outbound pipeline built in Days 1-4.
"""
from __future__ import annotations

import logging
from typing import Any

from ecosystem.applications.arcturus.contracts.evaluation.base_models import ValidationRun
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine
from ecosystem.applications.arcturus.src.evaluation_plane.validation_adapters import (
    experiment_result_to_evidence,
    validation_result_to_intelligence_payload,
)

logger = logging.getLogger(__name__)


def run_validation_chain(package: ExperimentResultPackage) -> dict[str, Any]:
    """
    Runs Maaz's confirmed ExperimentResultPackage through the full
    Validation & Evaluation pipeline: adapter -> ValidationEngine -> result.

    This is the entry point for this platform's step in the Day 5 chain.
    It reuses the exact adapter and engine built and tested across
    Days 1-4, with no duplicated logic.
    """
    logger.info(
        "-> [Validation] starting for run_id=%s, experiment_id=%s",
        package.context.run_id,
        package.context.experiment_id,
    )

    evidence = experiment_result_to_evidence(package)
    run = ValidationRun(context=package.context, evidence=evidence)
    result = ValidationEngine().run_validation(run)
    payload = validation_result_to_intelligence_payload(result)

    logger.info(
        "<- [Validation] finished, final_status=%s",
        result.final_status,
    )

    return payload