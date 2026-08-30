"""
Organizational Memory — Part-5.

Stores and retrieves "lessons": short, traceable records of what the
organization learned from a specific outcome. Retrieval here is simple
keyword matching — this is intentional. Real semantic/AI-driven memory
retrieval is Hasnain's AI/ML responsibility (per the roadmap's "YE NAHI
KARNA" boundary); this engine provides the traceable, versioned STORAGE
and a basic retrieval interface that a smarter retrieval layer can sit
on top of later without changing the schema.
"""
from app.models.memory import OrganizationalMemory, Outcome
from app.models.base import LifecycleState
from app.services.event_service import emit_event
from app.models.audit import AuditLog


def record_lesson(session, organization_id: str, lesson: str, source_outcome_id: str = None) -> OrganizationalMemory:
    memory = OrganizationalMemory(
        organization_id=organization_id, lesson=lesson, source_outcome_id=source_outcome_id,
        provenance="learning_engine", lifecycle_state=LifecycleState.ACTIVE,
    )
    session.add(memory)
    session.flush()

    emit_event(session, organization_id, "lesson_recorded", "OrganizationalMemory", memory.id, lesson)
    session.add(AuditLog(entity_type="OrganizationalMemory", entity_id=memory.id, action="recorded",
                          detail=lesson))
    session.commit()
    return memory


def get_relevant_memory(session, organization_id: str, keyword: str) -> list[OrganizationalMemory]:
    """
    Keyword search over recorded lessons for this organization. `keyword`
    may be a single word or a full task title — any significant word
    (4+ characters, to skip filler like "the"/"and") found in the keyword
    string that also appears in a lesson counts as a match. Case-insensitive.

    Deliberately basic; a smarter retrieval mechanism can replace this
    function's internals later without touching callers, since the
    interface (org_id, keyword) is already what a smarter version would
    need too.
    """
    all_memory = session.query(OrganizationalMemory).filter(
        OrganizationalMemory.organization_id == organization_id
    ).all()

    significant_words = [w.lower() for w in keyword.split() if len(w) >= 4]
    if not significant_words:
        significant_words = [keyword.lower()]

    def matches(lesson: str) -> bool:
        lesson_lower = lesson.lower()
        return any(w in lesson_lower for w in significant_words)

    return [m for m in all_memory if matches(m.lesson)]
