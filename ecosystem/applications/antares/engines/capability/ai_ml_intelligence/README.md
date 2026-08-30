# AI/ML Intelligence Layer — Antares

**Owner:** Muhammad Hasnain Ajmal — AI/ML Intelligence Engineer
**Platform:** AI Agents & Autonomous Organizations (owned by Zeeshan Farooq)
**Location:** `ecosystem/applications/antares/engines/capability/ai_ml_intelligence/`

## Overview

This module gives Antares agents the ability to plan, reason about goals, and
have that reasoning measured and validated before being trusted. It does not
own agent orchestration, platform architecture, governance, or organizational
modeling. This layer produces validated AI/ML capabilities that other Antares
platforms can discover and consume.

## Components

| File | Purpose |
|---|---|
| `intelligence/models.py` | Core data models |
| `intelligence/model_adapter.py` | Interface to the LLM (Gemini) |
| `intelligence/evaluator.py` | Scoring functions and aggregate metrics |
| `experiments/engine.py` | Runs reproducible experiments |
| `intelligence/reasoning_engine.py` | Planning loop: plan() -> evaluate_plan() -> replan() |
| `intelligence/capability_registry.py` | Registers and promotes validated capabilities |
| `zeeshan_planner_adapter.py` | Real integration adapter matching Zeeshan's runtime's pluggable planner/tool_executor interface |
| `test_real_wiring.py` | Structural integration test proving the adapter fits Zeeshan's real agent_engine.run_agent_task() |
| `tests/test_intelligence.py` | 18 unit tests |
| `demo_end_to_end.py` | Full working demonstration |
| `docs/PART1_REALITY_BASELINE.md` | Honest inventory of what's implemented, tested, and verified |
| `docs/PART2_INTEGRATION_CONTRACT_DRAFT.md` | Draft request/response contract, pending Zeeshan's confirmation |

## Setup

```bash
pip install -r requirements.txt
```
Add your Gemini key to `.env` (get one free at aistudio.google.com/apikey).

## Running

```bash
python -m pytest tests/ -v
python demo_end_to_end.py
```

## Integration Status

**Verified:** planning, evaluation, experiment scoring, capability
registration/promotion — all tested and demonstrated live against Gemini.

**Verified (structural):** `zeeshan_planner_adapter.py` was tested against
Zeeshan's real, unmodified `run_agent_task()` — a task was taken from
`pending` to `completed` through his real engine. This test used a stubbed
model response (no network access in the test environment) to isolate and
confirm the wiring itself; a live-model version of this same test is the
immediate next step.

**Not yet done:** live (non-stubbed) run of the integration test with a real
Gemini call; confirmation from Zeeshan on the exact contract shape in
`docs/PART2_INTEGRATION_CONTRACT_DRAFT.md`.
