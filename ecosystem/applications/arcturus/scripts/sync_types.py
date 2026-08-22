#!/usr/bin/env python3
"""
Arcturus Contract Type Synchronizer
Exports Python Pydantic models in `contracts/` into TypeScript definitions for the Next.js frontend (`web/lib/generated-types.ts`).

Usage:
    python scripts/sync_types.py          # Generate types
    python scripts/sync_types.py --check  # Verify up-to-date (CI mode)
"""
from __future__ import annotations

import argparse
import inspect
import os
import sys
from pathlib import Path
from typing import Any, get_args, get_origin

# Arcturus project root (ecosystem/applications/arcturus/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
# Repository root (OBA-Core-Horquva/) — needed for ecosystem.* imports
REPO_ROOT = PROJECT_ROOT.parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

from pydantic import BaseModel  # noqa: E402

from ecosystem.applications.arcturus.contracts.experiment.base_models import (  # noqa: E402
    ExperimentStatus,
    ExperimentConfig,
    ExperimentRecord,
    SimulationRunRecord,
)
from ecosystem.applications.arcturus.contracts.provenance.base_models import ProvenanceRecord  # noqa: E402
from ecosystem.applications.arcturus.contracts.shared.base_models import (  # noqa: E402
    APIErrorResponse,
    SimulationContext,
    SimulationEventPayload,
)

OUTPUT_FILE = PROJECT_ROOT / "web" / "lib" / "generated-types.ts"


def pydantic_type_to_ts(field_type: Any) -> str:
    """Translates a Python type annotation to a TypeScript type string."""
    origin = get_origin(field_type)
    args = get_args(field_type)

    if origin is None:
        if field_type in (str,):
            return "string"
        if field_type in (int, float):
            return "number"
        if field_type in (bool,):
            return "boolean"
        if field_type in (dict,):
            return "Record<string, any>"
        if hasattr(field_type, "__name__") and issubclass(field_type, BaseModel):
            return field_type.__name__
        if hasattr(field_type, "__name__") and issubclass(field_type, str) and hasattr(field_type, "__members__"):
            return field_type.__name__
        if field_type.__name__ == "UUID":
            return "string"
        if field_type.__name__ == "datetime":
            return "string"
        return "any"

    # Optional / Union
    if origin is getattr(type(int | str), "__origin__", None) or str(origin) == "typing.Union":
        non_none_args = [a for a in args if a is not type(None)]
        ts_types = [pydantic_type_to_ts(a) for a in non_none_args]
        ts_str = " | ".join(ts_types) if ts_types else "any"
        if type(None) in args:
            return f"{ts_str} | null"
        return ts_str

    # List / Sequence
    if origin in (list, list):
        item_type = pydantic_type_to_ts(args[0]) if args else "any"
        return f"{item_type}[]"

    # Dict
    if origin in (dict, dict):
        val_type = pydantic_type_to_ts(args[1]) if len(args) > 1 else "any"
        return f"Record<string, {val_type}>"

    return "any"


def generate_ts_interfaces() -> str:
    """Generates clean, typed TypeScript interfaces for contracts."""
    models_to_export = [
        SimulationContext,
        SimulationEventPayload,
        APIErrorResponse,
        ExperimentConfig,
        ExperimentRecord,
        SimulationRunRecord,
        ProvenanceRecord,
    ]

    enums_to_export = [
        ExperimentStatus,
    ]

    header = """/**
 * Arcturus Generated TypeScript Contract Types
 * AUTO-GENERATED FILE by scripts/sync_types.py — DO NOT EDIT MANUALLY
 * Source: ecosystem/applications/arcturus/contracts/
 */

"""

    sections: list[str] = [header]

    # Enums
    for enum_cls in enums_to_export:
        enum_name = enum_cls.__name__
        members = [f"  {k} = '{v.value}'" for k, v in enum_cls.__members__.items()]
        enum_str = f"export enum {enum_name} {{\n" + ",\n".join(members) + "\n}\n"
        sections.append(enum_str)

    # Interfaces
    for model in models_to_export:
        model_name = model.__name__
        doc = inspect.getdoc(model) or f"Contract model: {model_name}"
        lines = [f"/** {doc.strip()} */", f"export interface {model_name} {{"]

        for field_name, field_info in model.model_fields.items():
            ts_type = pydantic_type_to_ts(field_info.annotation)
            is_optional = not field_info.is_required()
            opt_marker = "?" if is_optional else ""
            desc = f" // {field_info.description}" if field_info.description else ""
            lines.append(f"  {field_name}{opt_marker}: {ts_type};{desc}")

        lines.append("}\n")
        sections.append("\n".join(lines))

    # SSE Event contract
    sse_types = """/** SSE Event Protocol shapes received over GET /api/events/{experiment_id} */
export type SSEEvent =
  | { type: 'STAGE_CHANGE'; experiment_id: string; stage: string }
  | { type: 'TICK'; experiment_id: string; payload: { tick: number; state_snapshot: Record<string, any> } }
  | { type: 'EVENT'; experiment_id: string; payload: SimulationEventPayload }
  | { type: 'STATUS_UPDATE'; experiment_id: string; status: ExecutionStatus }
  | { type: 'ERROR'; experiment_id: string; error_code: string; message: string };
"""
    sections.append(sse_types)

    return "\n".join(sections)


def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronize Python Pydantic contracts to TypeScript")
    parser.add_argument("--check", action="store_true", help="Check if generated types are up to date")
    args = parser.parse_args()

    content = generate_ts_interfaces()

    if args.check:
        if not OUTPUT_FILE.exists():
            print(f"[ERROR] Check failed: {OUTPUT_FILE} does not exist. Run sync_types.py to generate it.")
            sys.exit(1)
        existing = OUTPUT_FILE.read_text(encoding="utf-8")
        if existing.strip() != content.strip():
            print("[ERROR] Check failed: TypeScript types are out of sync with Python contracts.")
            sys.exit(1)
        print("[OK] TypeScript contract types are fully in sync with Python models.")
        sys.exit(0)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(content, encoding="utf-8")
    print(f"[OK] Successfully exported TypeScript contracts to {OUTPUT_FILE}")



if __name__ == "__main__":
    main()
