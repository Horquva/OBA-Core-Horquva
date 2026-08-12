"""
Scenario Engineering Platform — Contracts
Owner: Maryam Yaqoob

Canonical Pydantic contracts for the Scenario Engineering Platform. Per the
Arcturus Week 3 master execution guide, this platform has NO inbound
contract dependency for Day 1 — it defines the canonical scenario contract
that downstream platforms (Simulation Runtime, Validation & Evaluation)
consume.

Outbound consumers:
  - Muhammad Maaz Khan (Simulation Runtime & Experiment)  -> ScenarioDSLPayload
  - Amina Khan (Validation & Evaluation)                  -> ScenarioExpectationContract

Field derivation: the 13-field Scenario DSL locked in
`docs/scenario_engineering_platform_spec.md` (Part-1, PR #12, merged) is
split across three contracts so each downstream consumer only receives the
slice of the scenario it actually needs:

  ScenarioDSLPayload         -> identity, trigger, participants, scope,
                                 preconditions, variables
  ScenarioConstraintContract -> constraints (budget/timeline/policy limits)
  ScenarioExpectationContract-> success_criteria, failure_conditions,
                                 expected_outcomes, metrics,
                                 termination_conditions

Status: DRAFT — matches the canonical shape shown in
`week3-master-execution-guide.md` section 5.1. Maaz's local stub of
`ScenarioDSLPayload` in `contracts/simulation/base_models.py` currently
carries a top-level `seed` field and an `extra_fields` dict that do not
appear in the canonical guide example (seed lives on
`context.global_seed` via ContractEnvelope). This has NOT yet been
re-confirmed with Maaz — flagged here rather than silently resolved.
"""

from __future__ import annotations

from typing import Any

from pydantic import Field

from ecosystem.applications.arcturus.contracts.shared.base_models import (
    ContractEnvelope,
)

# Constitutional identifier pattern locked in Part-1 spec, e.g. SCN-WF-004
SCENARIO_ID_PATTERN = r"^SCN-[A-Z]{2}-\d{3}$"


# ---------------------------------------------------------------------------
# 1. CORE SCENARIO DEFINITION — outbound to Muhammad Maaz Khan (Runtime)
# ---------------------------------------------------------------------------

class ScenarioDSLPayload(ContractEnvelope):
    """
    Canonical scenario definition. This is the contract Maaz's Simulation
    Runtime consumes to initialize a run. Constraints and expectations are
    deliberately NOT included here — they travel as separate contracts
    (ScenarioConstraintContract, ScenarioExpectationContract) so each
    consumer only receives what it needs.
    """

    scenario_id: str = Field(
        ...,
        pattern=SCENARIO_ID_PATTERN,
        description="Unique constitutional identifier, e.g. 'SCN-WF-004'",
    )
    description: str = Field(
        ..., min_length=1, description="Plain-language summary of the situation"
    )
    trigger_event: str = Field(
        ..., min_length=1, description="The event that initiates the scenario"
    )
    participants: list[str] = Field(
        default_factory=list,
        description="Roles/actors involved, e.g. ['Executive', 'HR Lead']",
    )
    organizational_scope: list[str] = Field(
        default_factory=list,
        description="Departments/systems affected, e.g. ['Leadership', 'Governance']",
    )
    preconditions: list[str] = Field(
        default_factory=list,
        description="State the organization must be in for the scenario to activate",
    )
    variables: dict[str, Any] = Field(
        default_factory=dict,
        description="Adjustable parameters, e.g. severity, duration, affected headcount %",
    )


# ---------------------------------------------------------------------------
# 2. CONSTRAINTS — outbound to Muhammad Maaz Khan (Runtime)
# ---------------------------------------------------------------------------

class ScenarioConstraintContract(ContractEnvelope):
    """
    Rules/limits the scenario must respect during execution (budget caps,
    timelines, policy limits). Kept separate from ScenarioDSLPayload so the
    Runtime can evaluate execution boundaries without parsing the full
    scenario definition.
    """

    scenario_id: str = Field(
        ...,
        pattern=SCENARIO_ID_PATTERN,
        description="References ScenarioDSLPayload.scenario_id",
    )
    constraints: list[str] = Field(
        default_factory=list,
        description="Rules/limits as plain statements, e.g. 'Notice period fixed at 30 days'",
    )
    hard_limits: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured numeric/boolean limits usable directly by the Runtime, "
        "e.g. {'budget_cap': 120000, 'max_duration_days': 30}",
    )


# ---------------------------------------------------------------------------
# 3. EXPECTATIONS — outbound to Amina Khan (Validation & Evaluation)
# ---------------------------------------------------------------------------

class ScenarioExpectationContract(ContractEnvelope):
    """
    Baseline expectations against which Amina's Validation & Evaluation
    Platform scores an executed run. This is the Scenario Platform's
    definition of "well-handled" vs "poorly-handled" — it does NOT score
    outcomes itself (that remains Amina's boundary).
    """

    scenario_id: str = Field(
        ...,
        pattern=SCENARIO_ID_PATTERN,
        description="References ScenarioDSLPayload.scenario_id",
    )
    success_criteria: list[str] = Field(
        default_factory=list,
        description="Conditions that define a 'well-handled' outcome",
    )
    failure_conditions: list[str] = Field(
        default_factory=list,
        description="Conditions that define a 'poorly-handled' outcome",
    )
    expected_outcomes: list[str] = Field(
        default_factory=list,
        description="Baseline expected organizational response",
    )
    metrics: list[str] = Field(
        default_factory=list,
        description="Measurable indicators, e.g. 'recovery time', 'cost impact', 'morale score'",
    )
    termination_conditions: list[str] = Field(
        default_factory=list,
        description="Conditions under which the scenario ends",
    )
