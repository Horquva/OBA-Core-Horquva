# Simulation Runtime Platform

**Owner:** Muhammad Maaz Khan (`@Khan5002`)  
**Source:** `src/simulation/`  
**Contracts:** `contracts/simulation/`  
**Tests:** `tests/simulation/`

---

## Purpose

The Simulation Runtime is the **operational core** of Arcturus. It receives all upstream contracts — the ontology, enterprise structure, workforce roster, workflow definitions, scenario DSL, and synthetic data — and orchestrates their execution across a series of simulation ticks.

> "Where the Scenario Engineering Platform defines *what should happen*, this platform defines and governs *how it actually runs* — deterministically, reproducibly, and under scientific rigor."

---

## Lifecycle

The runtime follows a strict three-phase lifecycle enforced by the state machine:

```
UNINITIALIZED
     │
     ▼  initialize_run(context)
  RUNNING
     │
     ▼  step()  ×  N ticks
  RUNNING (stepped)
     │
     ▼  finalize_run()
  COMPLETED
```

Violating the lifecycle (e.g., calling `step()` before `initialize_run()`) raises a `BusinessRuleViolation`.

---

## Key Files

| File | Purpose |
|---|---|
| `src/simulation/runtime_engine.py` | `RuntimeEngine` — main execution loop |
| `src/simulation/checkpoint_store.py` | `CheckpointStore` — persists state per tick |
| `src/simulation/runtime_adapters.py` | Contract ↔ internal translation |
| `contracts/simulation/base_models.py` | `SimulationContext`, `ExperimentResultPackage` |
| `schemas/simulation/base_schemas.py` | Status enums |

---

## Inbound Contracts

The Runtime Engine is the **single largest consumer** in Arcturus, receiving from all upstream platforms:

| Contract | From |
|---|---|
| `SimulationContext` | Shared — the root execution context |
| `OntologySnapshotContract` | Hamza |
| `EnterpriseInstanceContract` | Ajwa |
| `WorkforceAgentRoster` | Syeda |
| `WorkflowDefinitionContract` | Javeria |
| `ScenarioDSLPayload` | Maryam |
| `SyntheticGenerationResult` | Ahmed |

---

## Outbound Contracts

| Contract | To | Purpose |
|---|---|---|
| `ExperimentResultPackage` | Amina (Validation) | Evidence of what happened during the run |
| `RunHistoryRecord` | Internal registry | Maaz's own audit log |

---

## Checkpointing

The runtime saves state after every tick to a JSON checkpoint file. This enables:
- **Replay:** re-run from any checkpoint
- **Audit:** full tick-by-tick trace of what happened
- **Recovery:** resume a failed run from the last good state

```python
from ecosystem.applications.arcturus.src.simulation.checkpoint_store import CheckpointStore

store = CheckpointStore(root=Path("/tmp/checkpoints"))
store.save(run_id=ctx.run_id, step=3, state={"tick": 3, "agents": [...]})
state = store.load_latest(run_id=ctx.run_id)
```

---

## Usage Example

```python
import tempfile
from pathlib import Path
from ecosystem.applications.arcturus.src.simulation.runtime_engine import RuntimeEngine

with tempfile.TemporaryDirectory() as tmp:
    engine = RuntimeEngine(checkpoint_root=Path(tmp))
    engine.initialize_run(ctx)
    
    for tick in range(3):
        engine.step()
    
    record = engine.finalize_run()
    print(record.status)    # "completed"
    print(record.ended_at)  # datetime of completion
```

---

## Running Simulation Tests

```bash
pytest ecosystem/applications/arcturus/tests/simulation/ -v
```
