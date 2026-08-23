from app.models import Workflow, Task, LifecycleState
from app.models.audit import AuditLog


def create_workflow(session, capability_id: str, name: str) -> Workflow:
    wf = Workflow(name=name, capability_id=capability_id, lifecycle_state=LifecycleState.ACTIVE)
    session.add(wf)
    session.flush()
    session.add(AuditLog(entity_type="Workflow", entity_id=wf.id, action="created",
                          detail=f"Workflow '{name}' created"))
    session.commit()
    return wf


def create_task(session, workflow_id: str, title: str, assignee_id: str = None,
                 assignee_type: str = None, depends_on_task_id: str = None) -> Task:
    task = Task(
        title=title, workflow_id=workflow_id,
        assignee_id=assignee_id, assignee_type=assignee_type,
        depends_on_task_id=depends_on_task_id,
        status="pending", lifecycle_state=LifecycleState.DRAFT,
    )
    session.add(task)
    session.flush()
    session.add(AuditLog(entity_type="Task", entity_id=task.id, action="created",
                          actor_id=assignee_id, actor_type=assignee_type,
                          detail=f"Task '{title}' created"))
    session.commit()
    return task
