import sqlite3
from ecosystem.applications.arcturus.contracts.synthetic_data.base_models import (
    SyntheticArtifactContract
)

def row_to_artifact(row: sqlite3.Row) -> SyntheticArtifactContract:
    pass
