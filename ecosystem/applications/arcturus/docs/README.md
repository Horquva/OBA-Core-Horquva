# Arcturus — Documentation Hub

> **Arcturus Simulation Engineering Governance Platform**  
> Horquva Technologies · Internal Engineering  
> Repository Boundary: `ecosystem/applications/arcturus/`

---

## What is Arcturus?

Arcturus is Horquva's **Synthetic Enterprise Simulation Platform** — a contract-driven, deterministic, governance-enforced system that can build, run, and evaluate a complete synthetic organization end-to-end. It allows the Organizational Brain (OBA) to experiment, validate, and predict organizational behaviours in a safe, reproducible environment.

Think of it as a **digital twin factory**: you describe an organization's structure, workforce, workflows, and scenarios; Arcturus assembles a faithful simulation, executes it, and produces validated, evidence-backed results.

---

## Quick Navigation

### 🚀 New Here? Start With Getting Started

| Document | Purpose |
|---|---|
| [Onboarding Guide](getting-started/onboarding.md) | First-day setup for new engineers |
| [Architecture Overview](architecture/system-overview.md) | Big-picture platform map |
| [Glossary](reference/glossary.md) | Key terms and concepts |

---

### 🏛️ Architecture

| Document | Purpose |
|---|---|
| [System Overview](architecture/system-overview.md) | Full 8-plane architecture diagram |
| [Data Flow](architecture/data-flow.md) | How contracts pass between platforms |
| [Contract Design](architecture/contract-design.md) | Pydantic contract rules and patterns |
| [Governance Model](architecture/governance-model.md) | Automated enforcement and compliance laws |

---

### 🧩 Platform Docs (by Team)

#### Control Plane
| Platform | Owner | Docs |
|---|---|---|
| Enterprise Ontology | Muhammad Hamza | [→ docs](platforms/control-plane/ontology/README.md) |
| Synthetic Enterprise | Ajwa Zainab | [→ docs](platforms/control-plane/enterprise/README.md) |
| Scenario Engineering | Maryam Yaqoob | [→ docs](platforms/control-plane/scenarios/README.md) |

#### Execution Plane
| Platform | Owner | Docs |
|---|---|---|
| Synthetic Workforce | Syeda Dua e Farwa | [→ docs](platforms/execution-plane/workforce/README.md) |
| Behavior & Workflows | Javeria Rafhan | [→ docs](platforms/execution-plane/workflows/README.md) |

#### Core Systems
| Platform | Owner | Docs |
|---|---|---|
| Simulation Runtime | Muhammad Maaz Khan | [→ docs](platforms/simulation/README.md) |
| Validation & Evaluation | Amina Khan | [→ docs](platforms/evaluation/README.md) |
| Synthetic Data | Ahmed Raza | [→ docs](platforms/synthetic-data/README.md) |
| Governance | Hashim Ali Khan | [→ docs](platforms/governance/README.md) |

---

### 📋 Week 3 Sprint

| Document | Purpose |
|---|---|
| [Sprint Overview](week3-sprint/sprint-overview.md) | Goals, scorecard, and constraints |
| [Day-by-Day Blueprint](week3-sprint/day-by-day.md) | Exact file targets for each day and person |
| [E2E Vertical Slice](week3-sprint/e2e-vertical-slice.md) | How to run the end-to-end chain |
| [Completion Status](week3-sprint/completion-status.md) | What's done, what's deferred |

---

### 🔧 Engineering Reference

| Document | Purpose |
|---|---|
| [Coding Standards](engineering/coding-standards.md) | Naming, testing, logging rules |
| [Git Workflow](engineering/git-workflow.md) | Branching, commits, PR protocol |
| [Running Tests](engineering/running-tests.md) | pytest commands and coverage |
| [Import Rules](engineering/import-rules.md) | §2.1 boundary enforcement explained |

---

### 📖 Reference

| Document | Purpose |
|---|---|
| [Glossary](reference/glossary.md) | Key term definitions |
| [Contract Inventory](reference/contract-inventory.md) | All Pydantic models by platform |

---

### 📐 Architecture Decision Records (ADRs)

| ADR | Title |
|---|---|
| [ADR-001](adr/ADR-001-Initial-Setup.md) | Initial Repository & Governance Setup |
| [ADR-002](adr/ADR-002-Contract-Over-Coupling.md) | No Cross-Platform Direct Imports |
| [ADR-003](adr/ADR-003-Control-Plane-Structure.md) | Control Plane Directory Refactoring |

---

## Repository Layout

```
ecosystem/applications/arcturus/
├── contracts/          # Shared Pydantic payload models (cross-platform comms)
│   ├── shared/         # SimulationContext, ContractEnvelope, errors
│   ├── control/        # ontology/, enterprise/, scenarios/
│   ├── execution/      # workforce/, workflows/
│   ├── simulation/     # SimulationContext, ExperimentResultPackage
│   ├── evaluation/     # ValidationRun, EvidenceContract
│   └── synthetic_data/ # SyntheticGenerationRequest, SyntheticArtifact
│
├── schemas/            # Pydantic schema enums and value types
│
├── src/                # Platform implementation code
│   ├── control_plane/  # ontology/, enterprise/, scenarios/
│   ├── execution_plane/# workforce/, workflows/
│   ├── simulation/     # runtime_engine, checkpoint_store
│   ├── evaluation_plane/
│   ├── synthetic_data/
│   ├── governance/     # compliance_scanner, import_boundary_checker
│   └── integration/    # e2e_chain, per-platform chain files
│
├── tests/              # Pytest test suite (171 tests, all passing)
│   ├── control/
│   ├── execution/
│   ├── simulation/
│   ├── evaluation/
│   ├── governance/
│   └── shared/
│
└── docs/               # ← You are here
```

---

> **Governance Owner:** Hashim Ali Khan (`@Hashimali-khan`)  
> **Last Updated:** Week 3, Day 5  
> **Test Status:** 171/171 passing