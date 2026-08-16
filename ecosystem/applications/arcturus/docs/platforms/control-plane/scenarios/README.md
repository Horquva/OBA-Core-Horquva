# Scenario Engineering Platform

**Owner:** Maryam Yaqoob (`@Maryam-Yaqoob`)  
**Plane:** Control Plane  
**Source:** `src/control_plane/scenarios/`  
**Contracts:** `contracts/control/scenarios/`  
**Tests:** `tests/scenarios/`, `tests/scenario_engineering/`

---

## Purpose

The Scenario Engineering Platform provides the DSL for defining *what should happen* in a simulation. A scenario is a declarative specification — it defines a trigger event, participants, organizational scope, preconditions, constraints, and expected outcomes. The Simulation Runtime consumes the compiled scenario to drive execution. Amina's Validation platform uses the expected outcomes to evaluate the run.

---

## Key Contracts

| Contract | Description |
|---|---|
| `ScenarioDSLPayload` | The compiled scenario — trigger, participants, constraints, expectations |
| `ScenarioConstraintContract` | A single constraint on simulation state |
| `ScenarioExpectationContract` | A single expected outcome used for validation |

---

## Key Files

| File | Purpose |
|---|---|
| `contracts/control/scenarios/base_models.py` | Core scenario contracts |
| `src/control_plane/scenarios/scenario_engine.py` | `ScenarioEngine.compile_scenario()` |
| `src/control_plane/scenarios/scenario_adapters.py` | Contract translation |

---

## Outbound Contracts

- `ScenarioDSLPayload` → Maaz (Simulation Runtime)
- `ScenarioExpectedOutcome` → Amina (Validation)

---

## Running Scenario Tests

```bash
pytest ecosystem/applications/arcturus/tests/scenarios/ -v
```
