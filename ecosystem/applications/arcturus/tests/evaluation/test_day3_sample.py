from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.schemas.evaluation.base_schemas import ExperimentResultPackage
from ecosystem.applications.arcturus.src.evaluation_plane.validation_adapters import (
    experiment_result_to_evidence,
    validation_result_to_intelligence_payload,
)
from ecosystem.applications.arcturus.contracts.evaluation.base_models import ValidationRun
from ecosystem.applications.arcturus.src.evaluation_plane.validation_engine import ValidationEngine


# Step 1: build a fake context (as if Maaz's runtime created it)
context = SimulationContext(experiment_id="exp-003", global_seed=99)

# Step 2: build a fake ExperimentResultPackage using the REAL confirmed shape
fake_maaz_result = ExperimentResultPackage(
    context=context,
    scenario_id="SCN-AB-001",
    final_status="completed",
    state_snapshot={"productivity_change": 12.0},
    event_count=42,
    checkpoint_refs=["chk-1", "chk-2"],
)

# Step 3: run it through the inbound adapter
evidence = experiment_result_to_evidence(fake_maaz_result)
print("--- Converted Evidence ---")
print(evidence)
print()

# Step 4: run it through your ValidationEngine, same as Day 2
run = ValidationRun(context=context, evidence=evidence)
engine = ValidationEngine()
result = engine.run_validation(run)
print("--- Validation Result ---")
print(result)
print()

# Step 5: run it through the outbound adapter
payload = validation_result_to_intelligence_payload(result)
print("--- Outbound Payload for Simulation Intelligence ---")
print(payload)