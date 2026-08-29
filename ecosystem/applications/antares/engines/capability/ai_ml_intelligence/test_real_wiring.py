"""
Structural Integration Test — Hasnain's planner adapter wired into
Zeeshan's real, actual agent_engine.run_agent_task().

HONEST SCOPE NOTE: This sandbox has no network access to the Gemini API,
so the real ReasoningEngine.plan() call is monkeypatched to return a
fixed, clearly-labeled stub plan instead of a live model call. This test
therefore proves:
  - The adapter's function SIGNATURE matches what Zeeshan's engine expects
  - The full pipeline (org -> unit -> capability -> workflow -> task ->
    agent role -> capability grant -> run_agent_task) executes without
    error using the REAL, unmodified code from both sides
  - The task reaches a real terminal state (completed) with a real result

This test does NOT prove a live Gemini call succeeded through this path —
that must be run on a machine with real network access to Gemini, using
the real GEMINI_API_KEY, which is the next step handed back to Hasnain.
"""
import sys
sys.path.insert(0, "/home/claude/zeeshan_review/final_submission/future_org_engine_code")
sys.path.insert(0, "/home/claude/antares_ai_ml_connector_full")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.agent_engine import run_agent_task

import zeeshan_planner_adapter as adapter

# ---- STUB the model call only (no network in this sandbox) ----
import intelligence.model_adapter as model_adapter_module

def _stub_run(self, prompt, system=None):
    return {
        "text": '{"steps": [{"description": "Assign task to ResearchAgent", "action": "Assign()"}, '
                '{"description": "Gather evidence", "action": "Gather()"}], '
                '"confidence": 0.9, "reasoning": ["stubbed for offline sandbox test"]}',
        "latency_ms": 12.3,
        "error": None,
    }

model_adapter_module.ModelAdapter.run = _stub_run
# ------------------------------------------------------------------

# Real in-memory DB, same fixture pattern Zeeshan's own tests use
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
session = SessionLocal()

# Real setup, using Zeeshan's real service functions
org = create_organization(session, name="Test Org", mission="Integration test")
unit = create_organizational_unit(session, organization_id=org.id, name="Research Unit")
cap = assign_capability(session, organization_id=org.id, name="Research Coordination")
wf = create_workflow(session, capability_id=cap.id, name="Research Workflow")
task = create_task(session, workflow_id=wf.id, title="Coordinate a research task between agents")
agent_role = define_agent_role(session, unit_id=unit.id, title="ResearchCoordinatorAgent")
grant_capability_to_agent(session, agent_role_id=agent_role.id, capability_id=cap.id, granted_by="hasnain")

print("=" * 70)
print("STRUCTURAL INTEGRATION TEST -- Hasnain's adapter x Zeeshan's runtime")
print("=" * 70)
print(f"Task before execution: status={task.status}")

result_task = run_agent_task(
    session, agent_role, task,
    planner=adapter.ai_ml_planner,
    tool_executor=adapter.ai_ml_tool_executor,
)

print(f"\nTask after execution: status={result_task.status}")
print(f"Result: {result_task.result}")
print("\n" + "=" * 70)
if result_task.status == "completed":
    print("WIRING CONFIRMED: adapter successfully plugged into Zeeshan's real "
          "run_agent_task() and reached a completed state.")
else:
    print(f"WIRING ISSUE: task ended in status '{result_task.status}', not 'completed'.")
print("=" * 70)
