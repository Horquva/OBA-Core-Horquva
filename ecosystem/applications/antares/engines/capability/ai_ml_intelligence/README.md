# AI/ML Intelligence Layer — Antares

**Owner:** Muhammad Hasnain Ajmal — AI/ML Intelligence Engineer
**Platform:** AI Agents & Autonomous Organizations (owned by Zeeshan Farooq)
**Location:** `ecosystem/applications/antares/engines/capability/ai_ml_intelligence/`

## Overview

This module gives Antares agents the ability to plan, reason about goals, and
have that reasoning measured and validated before being trusted. It does not
own agent orchestration, platform architecture, governance, or organizational
modeling — those responsibilities belong to their respective platform owners.
This layer produces validated AI/ML capabilities that other Antares platforms
can discover and consume.

## Architecture

```
Goal → Reasoning Engine → Plan → Plan Evaluation
                                       ↓
Experiment Engine → Model Adapter → Evaluator → Scored Evidence
                                       ↓
                          Capability Registry → Promotion
                                       ↓
                        Agent Layer Discovery (Zeeshan's platform)
```

## Components

| File | Purpose |
|---|---|
| `intelligence/models.py` | Core data models: ExperimentConfig/Result, Plan, PlanStep, IntelligenceCapability |
| `intelligence/model_adapter.py` | Swappable interface to the underlying LLM (currently Gemini). Captures latency and errors. |
| `intelligence/evaluator.py` | Scoring functions (exact match, similarity, keyword) and aggregate metrics |
| `experiments/engine.py` | Runs reproducible experiments: input → model execution → evaluation → persisted result |
| `intelligence/reasoning_engine.py` | Agent planning loop: `plan()` → `evaluate_plan()` → `replan()` |
| `intelligence/capability_registry.py` | Registers and promotes validated capabilities for downstream consumption |
| `tests/test_intelligence.py` | 18 unit tests covering evaluator logic, plan parsing, and registry behavior |
| `demo_end_to_end.py` | Full working demonstration of the pipeline against a live model |

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Add your model API key to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
   `.env` is excluded from version control via `.gitignore`.

## Running

```bash
python -m pytest tests/ -v          # run the test suite
python demo_end_to_end.py           # run the full end-to-end demonstration
```

## Integration Point

Downstream platforms consume validated capabilities via:

```python
from intelligence.capability_registry import CapabilityRegistry
registry = CapabilityRegistry()
available = registry.get_promoted(task_type="planning")
```

Only capabilities that meet the evaluation threshold (based on real experiment
evidence) are returned — unvalidated or failing capabilities are excluded.

## Status

**Complete:**
- Experiment engine, reasoning/planning engine, capability registry, evaluator, and model adapter implemented and tested
- 18/18 unit tests passing
- End-to-end demonstration verified against a live model

**In progress:**
- Live integration with the agent layer's execution code
- Extended performance optimization (caching, batching)
- Additional adversarial/failure-case test coverage

## Non-Ownership Boundaries

This module does not own: agent orchestration, platform architecture,
governance/trust enforcement, knowledge operationalization, or organizational
modeling. It produces validated AI/ML capabilities for those platforms to
consume through the registry interface above.
