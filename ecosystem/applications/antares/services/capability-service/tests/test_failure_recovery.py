"""Failure Recovery Tests — Part-7."""
from app.services.organization_service import create_organization, create_organizational_unit
from app.services.role_service import define_agent_role, grant_capability_to_agent
from app.services.capability_service import assign_capability
from app.services.workflow_service import create_workflow, create_task
from app.services.agent_engine import run_agent_task, TaskExecutionError
from app.services.execution_engine import execute_capability


def _setup(session):
    org = create_organization(session, name="Org")
    unit = create_organizational_unit(session, organization_id=org.id, name="Unit")
    agent = define_agent_role(session, unit_id=unit.id, title="Agent")
    cap = assign_capability(session, organization_id=org.id, name="Cap")
    wf = create_workflow(session, capability_id=cap.id, name="WF")
    grant_capability_to_agent(session, agent_role_id=agent.id, capability_id=cap.id)
    return org, agent, cap, wf


def test_transient_failure_recovers_via_retry(session):
    """Simulates a flaky tool/network failure that succeeds on a later attempt."""
    org, agent, cap, wf = _setup(session)
    task = create_task(session, workflow_id=wf.id, title="Flaky task")
    attempts = {"count": 0}

    def flaky(t, p):
        attempts["count"] += 1
        if attempts["count"] < 2:
            raise TaskExecutionError("simulated network timeout")
        return "recovered"

    result = run_agent_task(session, agent, task, tool_executor=flaky)
    assert result.status == "completed"
    assert result.result == "recovered"
    assert result.retry_count == 1


def test_permanent_failure_exhausts_retries_and_escalates_cleanly(session):
    """Simulates a tool that never succeeds — must fail cleanly, not hang or crash."""
    org, agent, cap, wf = _setup(session)
    task = create_task(session, workflow_id=wf.id, title="Always broken task")

    def always_broken(t, p):
        raise TaskExecutionError("simulated permanent tool failure")

    result = run_agent_task(session, agent, task, tool_executor=always_broken)
    assert result.status == "escalated"
    assert result.retry_count == result.max_retries
    assert "permanent tool failure" in result.last_failure_reason


def test_invalid_output_type_does_not_crash_the_engine(session):
    """Simulates a tool returning something unexpected (None instead of a
    string) — the engine must handle it without raising an unhandled
    exception up to the caller."""
    org, agent, cap, wf = _setup(session)
    task = create_task(session, workflow_id=wf.id, title="Weird output task")

    result = run_agent_task(session, agent, task, tool_executor=lambda t, p: None)
    # Should still reach a terminal state rather than crash.
    assert result.status == "completed"
    assert result.result is None  # stored as-is; a stricter system could validate this


def test_dependent_task_is_blocked_when_upstream_task_fails(session):
    """Workflow-level failure recovery: if task 1 fails permanently, task 2
    (which depends on it) must be marked blocked, not silently executed."""
    org, agent, cap, wf = _setup(session)
    task1 = create_task(session, workflow_id=wf.id, title="Upstream task")
    task2 = create_task(session, workflow_id=wf.id, title="Downstream task",
                         depends_on_task_id=task1.id)

    def executor(task):
        if task.title == "Upstream task":
            raise TaskExecutionError("simulated permanent failure")
        return "should not run"

    summary = execute_capability(session, cap.id, executor=executor)
    assert task1.id in summary["failed"] or task1.id in summary["escalated"]
    assert task2.id in summary["skipped"]

    from app.models import Task
    task2_fresh = session.get(Task, task2.id)
    assert task2_fresh.status == "blocked"


def test_stale_organizational_memory_does_not_break_planning(session):
    """If memory retrieval returns nothing relevant (e.g. no lessons yet
    recorded — analogous to 'stale'/empty memory), planning must still
    proceed normally rather than failing."""
    org, agent, cap, wf = _setup(session)
    task = create_task(session, workflow_id=wf.id, title="Brand new task type never seen before")

    result = run_agent_task(session, agent, task, tool_executor=lambda t, p: "fine")
    assert result.status == "completed"
