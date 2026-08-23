import sqlite3
import json
from typing import Any, Dict
from datetime import datetime

from ecosystem.applications.arcturus.contracts.experiment.base_models import (
    ExperimentRecord,
    SimulationRunRecord,
)

def row_to_experiment_record(row: sqlite3.Row) -> ExperimentRecord:
    # Basic mapping, logic to be expanded when integrating services
    pass

def experiment_record_to_row(record: ExperimentRecord) -> tuple:
    pass

def row_to_simulation_run_record(row: sqlite3.Row) -> SimulationRunRecord:
    pass

def simulation_run_record_to_row(record: SimulationRunRecord) -> tuple:
    pass
