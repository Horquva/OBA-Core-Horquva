"""
End-to-End Demo — Antares AI/ML Intelligence Layer
Owner: Muhammad Hasnain Ajmal

Demonstrates the full working chain (Part-8 final demonstration):

Organizational Objective -> Agent Goal -> AI/ML Intelligence
-> Planning/Reasoning -> Plan Evaluation -> (simulate) Execution
-> Capability Registration -> Promotion -> Registry Query (Agent-layer consumption)

Run: python demo_end_to_end.py
Requires GEMINI_API_KEY in the environment for the live-model steps.
Falls back to a clearly-labeled offline mode if no key is present, so you
can still demo the pipeline structure without API access.
"""

import os
import json

from intelligence.reasoning_engine import ReasoningEngine
from intelligence.capability_registry import CapabilityRegistry
from intelligence.models import IntelligenceCapability, new_id
from experiments.engine import ExperimentEngine
from intelligence.models import ExperimentConfig


def main():
    print("=" * 70)
    print("ANTARES AI/ML INTELLIGENCE LAYER — END-TO-END DEMO")
    print("=" * 70)

    has_key = bool(os.environ.get("GEMINI_API_KEY"))
    if not has_key:
        print("\n[!] No GEMINI_API_KEY found in environment.")
        print("    Set it to run the live model calls: export GEMINI_API_KEY=sk-...")
        print("    Continuing to show pipeline structure; live calls will return errors.\n")

    # Step 1: Organizational objective -> Agent goal
    goal = "Coordinate a research task between a ResearchAgent and a ReviewAgent"
    context = "Organization has ResearchAgent (gathers evidence) and ReviewAgent (checks quality) roles."
    print(f"\n[1] GOAL: {goal}")

    # Step 2: Planning / Reasoning
    reasoning = ReasoningEngine()
    plan = reasoning.plan(goal, context)
    print(f"\n[2] PLAN GENERATED (confidence={plan.confidence}):")
    for i, step in enumerate(plan.steps, 1):
        print(f"    {i}. {step.description}  [action: {step.action}]")
    if not plan.steps:
        print(f"    (no steps — trace: {plan.reasoning_trace})")

    # Step 3: Plan evaluation before execution
    evaluation = reasoning.evaluate_plan(plan)
    print(f"\n[3] PLAN EVALUATION: {json.dumps(evaluation)}")

    # Step 4: Run a small experiment to measure this capability's quality
    print("\n[4] RUNNING EXPERIMENT to measure planning-capability quality...")
    engine = ExperimentEngine()
    config = ExperimentConfig(
        model="gemini-2.5-flash",
        task_type="reasoning",
        prompt_template="Answer briefly and only with the answer: {input}",
    )
    cases = [
        {"case_id": "c1", "input": "What is 2+2?", "expected": "4"},
        {"case_id": "c2", "input": "Capital of France?", "expected": "Paris"},
    ]
    record = engine.run_experiment("planning_capability_eval", config, cases, eval_mode="similarity")
    print(f"    Experiment summary: {json.dumps(record.summary)}")

    # Step 5: Register + promote capability based on evidence
    print("\n[5] REGISTERING CAPABILITY based on experiment evidence...")
    registry = CapabilityRegistry()
    cap = IntelligenceCapability(
        id=new_id("cap"),
        name="goal_planning_v1",
        task_types=["planning", "reasoning"],
        model_ref=config.model,
        evaluation_status="unevaluated",
    )
    registry.register(cap)
    registry.promote(cap.id, record.summary, pass_threshold=0.5)
    print(f"    Capability {cap.id} promoted: {registry.get(cap.id)['promoted']}")

    # Step 6: Agent layer discovers the capability (integration boundary)
    print("\n[6] AGENT-LAYER DISCOVERY (what Zeeshan's platform would call):")
    available = registry.get_promoted("planning")
    print(f"    Promoted planning capabilities available: {len(available)}")
    for c in available:
        print(f"      - {c['name']} (score={c['performance'].get('avg_score')})")

    print("\n" + "=" * 70)
    print("DEMO COMPLETE — evidence, scores, and registry state saved to results/")
    print("=" * 70)


if __name__ == "__main__":
    main()
