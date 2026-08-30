import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from intelligence.evaluator import score_exact_match, score_similarity, score_contains_keywords, evaluate_case, aggregate_summary
from intelligence.models import Plan, PlanStep, IntelligenceCapability, new_id
from intelligence.reasoning_engine import ReasoningEngine
from intelligence.capability_registry import CapabilityRegistry


def test_exact_match_true():
    assert score_exact_match("Paris", "paris") == 1.0

def test_exact_match_false():
    assert score_exact_match("London", "Paris") == 0.0

def test_similarity_partial():
    s = score_similarity("The capital is Paris", "Paris")
    assert 0 < s < 1

def test_keywords_partial_hit():
    s = score_contains_keywords("The plan involves risk and governance", ["risk", "governance", "unrelated"])
    assert abs(s - (2/3)) < 1e-6

def test_evaluate_case_pass():
    result = evaluate_case("4", "4", mode="exact")
    assert result["passed"] is True

def test_evaluate_case_fail_threshold():
    result = evaluate_case("completely different text", "specific expected answer", mode="similarity", threshold=0.9)
    assert result["passed"] is False

def test_aggregate_summary_empty():
    assert aggregate_summary([]) == {"count": 0}

def test_aggregate_summary_basic():
    results = [{"score": 1.0, "passed": True, "latency_ms": 100, "error": None},
               {"score": 0.0, "passed": False, "latency_ms": 200, "error": "boom"}]
    summary = aggregate_summary(results)
    assert summary["pass_rate"] == 0.5

def test_safe_json_parse_plain():
    parsed = ReasoningEngine._safe_json_parse('{"steps": [], "confidence": 0.5}')
    assert parsed["confidence"] == 0.5

def test_safe_json_parse_with_fences():
    text = '```json\n{"steps": [], "confidence": 0.7}\n```'
    parsed = ReasoningEngine._safe_json_parse(text)
    assert parsed["confidence"] == 0.7

def test_safe_json_parse_garbage():
    assert ReasoningEngine._safe_json_parse("not json at all") is None

def test_safe_json_parse_none():
    assert ReasoningEngine._safe_json_parse(None) is None

def test_evaluate_plan_empty():
    engine = ReasoningEngine.__new__(ReasoningEngine)
    plan = Plan(id=new_id("plan"), goal="test", steps=[], confidence=0.0)
    result = engine.evaluate_plan(plan)
    assert result["viable"] is False

def test_evaluate_plan_low_confidence_flagged():
    engine = ReasoningEngine.__new__(ReasoningEngine)
    steps = [PlanStep(step_id=new_id("s"), description="Do a real concrete thing", action="act")]
    plan = Plan(id=new_id("plan"), goal="test", steps=steps, confidence=0.1)
    result = engine.evaluate_plan(plan)
    assert result["viable"] is False

def test_evaluate_plan_viable():
    engine = ReasoningEngine.__new__(ReasoningEngine)
    steps = [PlanStep(step_id=new_id("s"), description="Do a real concrete thing", action="act")]
    plan = Plan(id=new_id("plan"), goal="test", steps=steps, confidence=0.8)
    result = engine.evaluate_plan(plan)
    assert result["viable"] is True

def test_registry_register_and_promote(tmp_path):
    reg = CapabilityRegistry(path=os.path.join(tmp_path, "reg.json"))
    cap = IntelligenceCapability(id=new_id("cap"), name="test_cap", task_types=["planning"],
                                  model_ref="test-model", evaluation_status="unevaluated")
    reg.register(cap)
    reg.promote(cap.id, {"avg_score": 0.9}, pass_threshold=0.6)
    assert len(reg.get_promoted("planning")) == 1

def test_registry_promote_below_threshold(tmp_path):
    reg = CapabilityRegistry(path=os.path.join(tmp_path, "reg2.json"))
    cap = IntelligenceCapability(id=new_id("cap"), name="weak_cap", task_types=["planning"],
                                  model_ref="test-model", evaluation_status="unevaluated")
    reg.register(cap)
    reg.promote(cap.id, {"avg_score": 0.2}, pass_threshold=0.6)
    assert reg.get_promoted("planning") == []

def test_replan_produces_new_plan_from_stubbed_model():
    class StubAdapter:
        def run(self, prompt, system=None):
            return {
                "text": '{"steps": [{"description": "Corrected concrete step", "action": "act2"}], '
                        '"confidence": 0.8, "reasoning": ["fixed the vague step"]}',
                "latency_ms": 1.0, "error": None,
            }
    engine = ReasoningEngine(adapter=StubAdapter())
    old_plan = Plan(id=new_id("plan"), goal="test goal", steps=[], confidence=0.0)
    new_plan = engine.replan(old_plan, failure_reason="empty plan")
    assert new_plan.confidence == 0.8
    assert len(new_plan.steps) == 1
    assert new_plan.steps[0].description == "Corrected concrete step"
    assert new_plan.reasoning_trace[0] == "Replanned after: empty plan"

def test_replan_handles_model_error():
    class FailingAdapter:
        def run(self, prompt, system=None):
            return {"text": None, "latency_ms": 1.0, "error": "connection refused"}
    engine = ReasoningEngine(adapter=FailingAdapter())
    old_plan = Plan(id=new_id("plan"), goal="test goal", steps=[], confidence=0.0)
    new_plan = engine.replan(old_plan, failure_reason="empty plan")
    assert new_plan.confidence == 0.0
    assert "Replanning failed" in new_plan.reasoning_trace[0]

def test_registry_unknown_capability_raises(tmp_path):
    reg = CapabilityRegistry(path=os.path.join(tmp_path, "reg3.json"))
    try:
        reg.promote("does_not_exist", {"avg_score": 1.0})
        assert False
    except ValueError:
        pass
