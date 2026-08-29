import os
import json
from intelligence.reasoning_engine import ReasoningEngine
from intelligence.capability_registry import CapabilityRegistry
from intelligence.models import IntelligenceCapability, new_id, ExperimentConfig
from experiments.engine import ExperimentEngine


def main():
    print("=" * 70)
    print("ANTARES AI/ML INTELLIGENCE LAYER -- END-TO-END DEMO")
    print("=" * 70)

    has_key = bool(os.environ.get("GEMINI_API_KEY"))
    if not has_key:
        print("\n[!] No GEMINI_API_KEY found. Set it to run live: export GEMINI_API_KEY=...\n")

    goal = "Coordinate a research task between a ResearchAgent and a ReviewAgent"
    context = "Organization has ResearchAgent (gathers evidence) and ReviewAgent (checks quality) roles."
    print(f"\n[1] GOAL: {goal}")

    reasoning = ReasoningEngine()
    plan = reasoning.plan(goal, context)
    print(f"\n[2] PLAN GENERATED (confidence={plan.confidence}):")
    for i, step in enumerate(plan.steps, 1):
        print(f"    {i}. {step.description}  [action: {step.action}]")

    evaluation = reasoning.evaluate_plan(plan)
    print(f"\n[3] PLAN EVALUATION: {json.dumps(evaluation)}")

    print("\n[4] RUNNING EXPERIMENT to measure planning-capability quality...")
    engine = ExperimentEngine()
    config = ExperimentConfig(model="gemini-2.5-flash", task_type="reasoning",
                               prompt_template="Answer briefly and only with the answer: {input}")
    cases = [{"case_id": "c1", "input": "What is 2+2?", "expected": "4"},
             {"case_id": "c2", "input": "Capital of France?", "expected": "Paris"}]
    record = engine.run_experiment("planning_capability_eval", config, cases, eval_mode="similarity")
    print(f"    Experiment summary: {json.dumps(record.summary)}")

    print("\n[5] REGISTERING CAPABILITY based on experiment evidence...")
    registry = CapabilityRegistry()
    cap = IntelligenceCapability(id=new_id("cap"), name="goal_planning_v1",
                                  task_types=["planning", "reasoning"],
                                  model_ref=config.model, evaluation_status="unevaluated")
    registry.register(cap)
    registry.promote(cap.id, record.summary, pass_threshold=0.5)
    print(f"    Capability {cap.id} promoted: {registry.get(cap.id)['promoted']}")

    print("\n[6] AGENT-LAYER DISCOVERY (what Zeeshan's platform would call):")
    available = registry.get_promoted("planning")
    print(f"    Promoted planning capabilities available: {len(available)}")
    for c in available:
        print(f"      - {c['name']} (score={c['performance'].get('avg_score')})")

    print("\n" + "=" * 70)
    print("DEMO COMPLETE -- evidence, scores, and registry state saved to results/")
    print("=" * 70)


if __name__ == "__main__":
    main()
