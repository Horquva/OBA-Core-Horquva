from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID

from ecosystem.applications.arcturus.contracts.shared.errors import IntegrationFailure


class CheckpointStore:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, run_id: UUID, step: int, state: dict) -> Path:
        path = self.root / f"{run_id}__{step:06d}.json"
        path.write_text(json.dumps(state, default=str, indent=2))
        return path

    def load_latest(self, run_id: UUID) -> dict:
        checkpoints = sorted(self.root.glob(f"{run_id}__*.json"))
        if not checkpoints:
            raise IntegrationFailure(f"No checkpoints found for run {run_id}")
        return json.loads(checkpoints[-1].read_text())

    def rollback_to(self, run_id: UUID, step: int) -> dict:
        path = self.root / f"{run_id}__{step:06d}.json"
        if not path.exists():
            raise IntegrationFailure(f"No checkpoint at step {step} for run {run_id}")
        return json.loads(path.read_text())