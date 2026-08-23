from app.models.memory import Event


def emit_event(session, organization_id: str, event_type: str,
                related_entity_type: str = None, related_entity_id: str = None,
                detail: str = None) -> Event:
    """
    Records an organizational event. Per Part-3, events must exist for:
    task created/assigned/completed, decision proposed/approved/rejected,
    escalation triggered, capability executed, outcome recorded.

    Does NOT commit — caller controls the transaction boundary, since events
    are usually emitted alongside other state changes in the same commit.
    """
    event = Event(
        event_type=event_type,
        organization_id=organization_id,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id,
        detail=detail,
    )
    session.add(event)
    session.flush()
    return event
