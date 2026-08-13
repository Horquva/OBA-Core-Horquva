from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.evaluation.base_models import (
    EvidenceContract,
    ValidationRun,
)
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine


context = SimulationContext(experiment_id="exp-002", global_seed=7)

# Case 1: a result that should PASS both checks
good_evidence = EvidenceContract(
    context=context,
    source_execution_id="exp-002",
    observed_value={
        "productivity_change": 11.0,
        "related_values": {"department_a": 5.0, "department_b": 3.0},
    },
    expected_value=10.0,
)

good_run = ValidationRun(context=context, evidence=good_evidence)

engine = ValidationEngine()
result = engine.run_validation(good_run)

print("--- CASE 1: Expected to PASS ---")
print(result)
print()

# Case 2: a result that should FAIL the logic check (way beyond expected)
bad_evidence = EvidenceContract(
    context=context,
    source_execution_id="exp-002",
    observed_value={
        "productivity_change": 200.0,
        "related_values": {"department_a": 5.0, "department_b": -3.0},
    },
    expected_value=10.0,
)

bad_run = ValidationRun(context=context, evidence=bad_evidence)

result_bad = engine.run_validation(bad_run)

print("--- CASE 2: Expected to FAIL ---")
print(result_bad)