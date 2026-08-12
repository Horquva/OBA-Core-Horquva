"""
Arcturus Governance — path_enforcer.py
=======================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 2 Deliverable: Enforces the Plural Path Law defined in §2.2 of the
Week 3 Master Execution Guide.

Rule: every Python module, schema, and test file must live under
  ecosystem/applications/arcturus/   (plural "applications")
and must NEVER use the singular variant:
  ecosystem/application/arcturus/

This module is imported by ArcturusComplianceScanner and can also be run
standalone for quick ad-hoc checks.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Result Type
# ---------------------------------------------------------------------------

@dataclass
class PathViolation:
    """A single path boundary violation."""
    offending_path: str
    reason: str


@dataclass
class PathEnforcerResult:
    """Aggregate result from a single validate_path_boundaries() call."""
    scanned_root: str
    total_files_checked: int
    violations: list[PathViolation] = field(default_factory=list)

    @property
    def is_compliant(self) -> bool:
        return len(self.violations) == 0

    def summary(self) -> str:
        if self.is_compliant:
            return (
                f"✅ Path Enforcer: {self.total_files_checked} files checked — "
                f"0 violations under {self.scanned_root}"
            )
        lines = [
            f"❌ Path Enforcer: {len(self.violations)} violation(s) found "
            f"in {self.total_files_checked} files:"
        ]
        for v in self.violations:
            lines.append(f"  • {v.offending_path}: {v.reason}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Singular-Path Pattern
# ---------------------------------------------------------------------------

# Matches any path containing the singular form of the Arcturus root.
# The check is case-insensitive to catch OS-level path casing differences.
_SINGULAR_PATH_RE = re.compile(
    r"[\\/]ecosystem[\\/]application[\\/]arcturus[\\/]",
    re.IGNORECASE,
)

# The authoritative plural canonical prefix (forward-slash normalised)
_CANONICAL_PREFIX = "ecosystem/applications/arcturus/"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def validate_path_boundaries(
    scan_root: Path | str,
    extensions: tuple[str, ...] = (".py", ".yml", ".yaml", ".json"),
) -> PathEnforcerResult:
    """
    Walk *scan_root* and report any file whose absolute path contains the
    forbidden singular ``ecosystem/application/arcturus/`` prefix.

    Parameters
    ----------
    scan_root:
        Directory to walk recursively. Typically the repository root or the
        ``ecosystem/`` directory.
    extensions:
        File extensions to check. Defaults to Python, YAML, and JSON files.

    Returns
    -------
    PathEnforcerResult
        Detailed result including every offending path and a human-readable
        summary.
    """
    scan_root = Path(scan_root).resolve()
    violations: list[PathViolation] = []
    total = 0

    for path in _iter_files(scan_root, extensions):
        total += 1
        # Normalise to forward slashes for reliable cross-platform matching
        normalised = path.as_posix()

        if _SINGULAR_PATH_RE.search(normalised):
            violations.append(
                PathViolation(
                    offending_path=normalised,
                    reason=(
                        "Path uses singular 'application' — must be "
                        "'applications' (plural) per §2.2 of the execution guide"
                    ),
                )
            )

    return PathEnforcerResult(
        scanned_root=str(scan_root),
        total_files_checked=total,
        violations=violations,
    )


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


def _iter_files(
    root: Path,
    extensions: tuple[str, ...],
):
    """Yield all files under *root* matching *extensions*, skipping caches."""
    skip_dirs = {"__pycache__", ".git", ".venv", "venv", "node_modules", ".mypy_cache"}
    for item in root.rglob("*"):
        if item.is_file() and item.suffix in extensions:
            # Skip files inside ignored directories
            if not any(part in skip_dirs for part in item.parts):
                yield item
