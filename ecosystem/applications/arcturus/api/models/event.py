import sqlite3
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationEventPayload,
    SimulationContext,
)

import json

def row_to_event_payload(row: sqlite3.Row) -> SimulationEventPayload:
    """Map a raw SQLite Row to the SimulationEventPayload contract."""
    return SimulationEventPayload(
        metadata=SimulationContext(**json.loads(row["metadata"])) if "metadata" in row.keys() else ...,
        event_id=row["event_id"],
        event_type=row["event_type"],
        affected_entities=json.loads(row["affected_entities"]),
        observed_state_changes=row["observed_state_changes"],
    )
