import sqlite3
from ecosystem.applications.arcturus.contracts.shared.base_models import (
    SimulationEventPayload
)

def row_to_event_payload(row: sqlite3.Row) -> SimulationEventPayload:
    pass
