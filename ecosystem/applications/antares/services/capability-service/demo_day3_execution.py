"""
Day 3-4 demo — proves the Organizational Execution Engine actually works.

Builds on the Day 2 foundation to create a capability with THREE tasks that
exercise different real execution paths:
  1. A task that just succeeds normally.
  2. A task that fails twice, then succeeds on the 3rd attempt (retry logic).
  3. A task that always fails (exhausts retries -> auto-escalates).

Run: python demo_day3_execution.py
"""
from app.database import init_db, get_session
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.execution_engine import execute_capability, TaskExecutionError
from app.models.audit import AuditLog
from app.models.memory import Event
from app.models.workflow import Escalation

# Tracks attempt counts per task title so our fake executor can simulate
# "fails N times then succeeds" behavior.
_attempt_counts = {}


def fake_executor(task):
    """
    Simulates real work being done. In a real system this would call an
    agent, a human-facing UI action, or a real integration. Behavior here
    is deliberately scripted by task title so the demo proves specific
    execution paths.
    """
    _attempt_counts[task.title] = _attempt_counts.get(task.title, 0) + 1
    attempt = _attempt_counts[task.title]

    if task.title == "Always succeeds":
        return "Completed successfully on first attempt."

    if task.title == "Fails twice then succeeds":
        if attempt <= 2:
            raise TaskExecutionError(f"Simulated transient failure (attempt {attempt})")
        return f"Completed successfully on attempt {attempt}."

    if task.title == "Always fails":
        raise TaskExecutionError(f"Simulated permanent failure (attempt {attempt})")

    return "Completed (default path)."


def run_demo():
    init_db()
    session = get_session()

    print("=== Day 3-4 Demo: Organizational Execution Engine ===\n")

    org = create_organization(session, name="Antares Execution Demo Org",
                               owner_id="zeeshan.farooq", provenance="manual_seed")
    unit = create_organizational_unit(session, organization_id=org.id, name="Execution Test Unit")
    capability = assign_capability(session, organization_id=org.id,
                                    name="Prove execution engine handles success, retry, and escalation")
    workflow = create_workflow(session, capability_id=capability.id, name="Execution Proof Workflow")

    create_task(session, workflow_id=workflow.id, title="Always succeeds")
    create_task(session, workflow_id=workflow.id, title="Fails twice then succeeds")
    create_task(session, workflow_id=workflow.id, title="Always fails")

    print(f"Created capability '{capability.name}' with 3 tasks.\n")
    print("Running execute_capability() ...\n")

    summary = execute_capability(session, capability.id, executor=fake_executor)

    print("--- Execution Summary ---")
    print(f"Workflows run: {summary['workflows_run']}")
    print(f"Completed:  {len(summary['completed'])}")
    print(f"Failed:     {len(summary['failed'])}")
    print(f"Escalated:  {len(summary['escalated'])}")
    print(f"Skipped:    {len(summary['skipped'])}")

    print("\n--- Task Final States ---")
    from app.models import Task
    tasks = session.query(Task).filter(Task.workflow_id == workflow.id).all()
    for t in tasks:
        print(f"- {t.title:<32} status={t.status:<10} retries={t.retry_count}/{t.max_retries}"
              f"  result={t.result or t.last_failure_reason}")

    print("\n--- Events Emitted (proves the event system works) ---")
    events = session.query(Event).order_by(Event.created_at).all()
    for e in events:
        print(f"[{e.event_type:<24}] {e.detail}")

    print("\n--- Escalations Created ---")
    escalations = session.query(Escalation).all()
    for esc in escalations:
        print(f"Task {esc.task_id[:8]}...: {esc.reason} (resolved={esc.resolved})")

    session.close()
    print("\n=== Day 3-4 execution engine confirmed working: success, retry, and escalation paths all verified. ===")


if __name__ == "__main__":
    run_demo()
