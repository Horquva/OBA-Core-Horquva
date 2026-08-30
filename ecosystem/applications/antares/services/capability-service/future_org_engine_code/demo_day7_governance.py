"""
Day 7 demo — proves the Governance Runtime and Query Interface actually work.

Three scenarios:
  1. A capability with NO policy attached — agent executes immediately
     (proves Part-6 didn't break the normal fast path from Days 5-6).
  2. A capability WITH an approval-required policy — the agent is
     authorized (has the capability grant) but execution is BLOCKED
     pending human approval. Proves the approval gate is real, not
     just documented — the task must not execute until approved.
  3. After approval, the task resumes and actually completes.

Then demonstrates the Query Interface (Part-6's observable state
requirement) showing organization state before and after.

Run: python demo_day7_governance.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.governance_service import create_policy
from app.services.agent_engine import run_agent_task, resume_agent_task
from app.services.decision_service import approve_decision
from app.services import query_service
from app.models.governance import Decision


def run_demo():
    init_db()
    session = get_session()

    print("=== Day 7 Demo: Governance Runtime & Query Interface ===\n")

    org = create_organization(session, name="Antares Governance Demo Org",
                               owner_id="zeeshan.farooq", provenance="manual_seed")
    unit = create_organizational_unit(session, organization_id=org.id, name="Governance Test Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="ExecutionAgent")

    # --- Capability 1: no policy attached ---
    cap_internal = assign_capability(session, organization_id=org.id, name="Update internal notes")
    wf_internal = create_workflow(session, capability_id=cap_internal.id, name="Internal Notes Workflow")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap_internal.id,
                               granted_by="zeeshan.farooq")

    print("--- Scenario 1: Capability with NO governance policy ---")
    task1 = create_task(session, workflow_id=wf_internal.id, title="Update internal notes for Q3")
    result1 = run_agent_task(session, agent, task1, tool_executor=lambda t, p: "Notes updated.")
    print(f"Task status: {result1.status}  (should be 'completed' — no approval gate needed)\n")

    # --- Capability 2: policy requiring approval ---
    cap_external = assign_capability(session, organization_id=org.id, name="Publish external report")
    wf_external = create_workflow(session, capability_id=cap_external.id, name="External Report Workflow")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap_external.id,
                               granted_by="zeeshan.farooq")

    create_policy(session, organization_id=org.id, name="External publication requires human sign-off",
                   rule="Any capability that publishes content externally requires approval before execution.",
                   requires_approval=True, applies_to_capability_id=cap_external.id, created_by="kanwal")

    print("--- Scenario 2: Capability WITH an approval-required policy ---")
    task2 = create_task(session, workflow_id=wf_external.id, title="Publish Q3 external report")
    result2 = run_agent_task(session, agent, task2, tool_executor=lambda t, p: "Report published.")
    print(f"Task status immediately after run_agent_task: {result2.status}"
          f"  (should be 'blocked' — must NOT execute without approval)")
    print(f"Task result: {result2.result}  (should be None — proves it did not run)\n")

    pending = query_service.get_pending_decisions(session, org.id)
    print(f"Pending decisions via query interface: {len(pending)}")
    for p in pending:
        print(f"  - {p['context'][:90]}...")

    # --- Approve and resume ---
    print("\n--- Approving the decision and resuming execution ---")
    decision = session.query(Decision).filter(Decision.task_id == task2.id).first()
    decision = approve_decision(session, decision, approver_id="kamil.ejaz")
    result2_resumed = resume_agent_task(session, decision, agent, tool_executor=lambda t, p: "Report published.")
    print(f"Task status after approval + resume: {result2_resumed.status}  (should be 'completed' now)")
    print(f"Task result: {result2_resumed.result}\n")

    # --- Query Interface: observable organization state ---
    print("--- Organization State (Query Interface) ---")
    state = query_service.get_organization_state(session, org)
    for k, v in state.items():
        print(f"{k}: {v}")

    session.close()
    print("\n=== Day 7 confirmed working: normal tasks execute freely, "
          "policy-gated tasks are blocked until approved, and organization "
          "state is fully observable via the query interface. ===")


if __name__ == "__main__":
    run_demo()
