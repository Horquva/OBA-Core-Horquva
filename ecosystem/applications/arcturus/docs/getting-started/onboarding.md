# Onboarding Guide — New Engineer Setup

**Arcturus Simulation Engineering Governance Platform**  
Welcome to the team. This guide gets you from zero to running your first test in under 30 minutes.

---

## 1. What You're Working On

Arcturus is a **synthetic enterprise simulation engine** built by Horquva. It lets Horquva's Organizational Brain (OBA) simulate entire companies — their structure, workforce, workflows, and decision-making — in a safe, reproducible, contract-governed way.

The system is made up of **8 platforms** owned by individual engineers. Each platform exposes its capabilities through shared **Pydantic contracts** rather than direct code imports. This is the single most important rule: **platforms talk to each other through contracts, not imports.**

---

## 2. Prerequisites

| Tool | Required Version | Purpose |
|---|---|---|
| Python | 3.13+ | Core runtime |
| Git | Any recent | Source control |
| pytest | 9.x | Test runner |

> **No Docker, no cloud infrastructure required.** The entire platform runs in-process.

---

## 3. Repository Setup

### 3.1 Clone & Navigate

```bash
git clone <repo-url>
cd OBA-Core-Horquva
```

### 3.2 Install Dependencies

```bash
pip install pydantic pytest
```

### 3.3 Verify Your Setup

Run the full test suite. All 171 tests should pass:

```bash
pytest ecosystem/applications/arcturus/tests -q
```

Expected output:
```
171 passed in 1.26s
```

If any tests fail, check that your Python version is 3.13+ and that pydantic is installed.

---

## 4. Understanding the Repository Layout

All Arcturus code lives **exclusively** under:

```
ecosystem/applications/arcturus/
```

> ⚠️ **Never** use the singular `ecosystem/application/arcturus/`. This path is illegal under §2.2 of the architectural laws and will be blocked by the governance scanner.

Here is the layout you need to know:

```
ecosystem/applications/arcturus/
│
├── contracts/       ← Platform communication layer (read/write from here)
│   ├── shared/      ← SimulationContext, ContractEnvelope — used by EVERYONE
│   ├── control/     ← Ontology, Enterprise, Scenario contracts
│   ├── execution/   ← Workforce, Workflow contracts
│   ├── simulation/  ← Runtime and experiment contracts
│   └── evaluation/  ← Validation contracts
│
├── src/             ← Platform implementation (internal, do NOT import cross-platform)
│   ├── control_plane/
│   ├── execution_plane/
│   ├── simulation/
│   ├── evaluation_plane/
│   ├── synthetic_data/
│   └── governance/
│
├── tests/           ← Pytest test files
└── docs/            ← You are here
```

---

## 5. The Golden Rule — Contracts, Not Imports

This is the most important concept to understand:

### ✅ Correct — communicate via a contract
```python
# In your platform code, consume a shared Pydantic model
from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext
from ecosystem.applications.arcturus.contracts.control.ontology.base_models import OntologySnapshotContract
```

### ❌ Forbidden — direct cross-platform import
```python
# NEVER do this — imports from another platform's src/ directly
from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_service import OntologyService
```

The governance scanner (`import_boundary_checker.py`) will automatically flag forbidden imports in CI.

---

## 6. Run Your First End-to-End Simulation

This command triggers the full 8-platform vertical slice with real data:

```python
# demo.py
from ecosystem.applications.arcturus.src.integration.e2e_chain import execute_day5_e2e_chain

result = execute_day5_e2e_chain(experiment_id="MY-EXP-001", global_seed=42)
print("Success:", result["success"])
for step in result["steps_executed"]:
    print(" -", step)
```

```bash
python demo.py
```

The chain runs all 8 platforms in sequence:
1. **Ontology** → builds org structure blueprint
2. **Enterprise** → generates synthetic company
3. **Workforce** → materializes agents
4. **Workflows** → compiles governance procedures
5. **Scenarios** → defines what should happen
6. **Synthetic Data** → generates artifact records
7. **Runtime** → executes the simulation
8. **Validation** → evaluates the results

---

## 7. Key Contacts

| Platform | Engineer | GitHub Handle |
|---|---|---|
| Governance & Architecture | Hashim Ali Khan | `@Hashimali-khan` |
| Enterprise Ontology | Muhammad Hamza | `@MuhammadHamza-7035` |
| Synthetic Enterprise | Ajwa Zainab | `@AjwaZainab` |
| Scenario Engineering | Maryam Yaqoob | `@Maryam-Yaqoob` |
| Synthetic Workforce | Syeda Dua e Farwa | `@Syeda-Dua-Farwa` |
| Behavior & Workflows | Javeria Rafhan | `@javeria1234-aaly` |
| Simulation Runtime | Muhammad Maaz Khan | `@Khan5002` |
| Validation & Evaluation | Amina Khan | `@Amina-Khan380` |
| Synthetic Data | Ahmed Raza | `@4hmad69` |

---

## 8. Next Steps

- Read the [System Overview](../architecture/system-overview.md) to understand how platforms connect
- Read the [Import Rules](../engineering/import-rules.md) for detailed §2.1 guidance
- Read the platform doc for your assigned area under [`platforms/`](../platforms/)
- Run governance tests: `pytest ecosystem/applications/arcturus/tests/governance/ -v`
