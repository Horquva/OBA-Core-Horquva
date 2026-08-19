"""
Organizational Learning — Part-5.

Implements: Execution -> Outcome -> Evaluation -> Lesson -> Organizational
Memory -> Future Planning.

evaluate_outcome() looks at a recorded Outcome and, if it's meaningful
(a failure, or a success that took retries), turns it into a lesson and
stores it via memory_service. This is deliberately rule-based, not
AI-driven analysis — matches the platform boundary that the AI/ML
evaluation intelligence itself belongs to Hasnain, not this platform.
"""
from app.models import Task
from app.models.memory import Outcome
from app.services.memory_service import record_lesson
from app.services.execution_engine import _get_organization_id_for_task


def evaluate_outcome(session, outcome: Outcome) -> str | None:
    """
    Returns the lesson text if one was recorded, or None if this outcome
    didn't warrant a lesson (e.g. a clean first-try success).
    """
    if outcome.task_id is None:
        return None  # only task outcomes are evaluated for now

    task = session.get(Task, outcome.task_id)
    if task is None:
        return None

    org_id = _get_organization_id_for_task(session, task)

    if not outcome.success:
        lesson = (f"Task '{task.title}' failed after {task.retry_count} retries "
                  f"(reason: {task.last_failure_reason}). Consider reviewing whether this "
                  f"task type needs a different agent, higher max_retries, or human review "
                  f"before automated execution.")
        record_lesson(session, org_id, lesson, source_outcome_id=outcome.id)
        return lesson

    if outcome.success and task.retry_count > 0:
        lesson = (f"Task '{task.title}' succeeded but required {task.retry_count} retr"
                  f"{'y' if task.retry_count == 1 else 'ies'} before completing. "
                  f"This task type may benefit from a revised initial approach.")
        record_lesson(session, org_id, lesson, source_outcome_id=outcome.id)
        return lesson

    return None  # clean first-try success — nothing noteworthy to learn
