"""
Arcturus Governance — import_boundary_checker.py
=================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 2 Deliverable: AST-based import scanner that enforces §2.1 of the
Week 3 Master Execution Guide.

Rule §2.1 — No Coupling Without Contract:
  Interns are forbidden from importing another platform's internal
  implementation modules directly. All cross-platform communication must
  be mediated through Pydantic payloads housed in shared contracts or schemas.

This module also provides scan_for_secret_patterns() to detect hardcoded
keys, tokens, or credentials that must never be committed.
"""
from __future__ import annotations

import ast
import re
import tokenize
import io
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Result Types
# ---------------------------------------------------------------------------

@dataclass
class ImportViolation:
    """A single forbidden direct import found in a source file."""
    file_path: str
    line_number: int
    import_statement: str
    reason: str


@dataclass
class SecretHit:
    """A potential hardcoded secret found in a source file."""
    file_path: str
    line_number: int
    matched_pattern: str
    line_snippet: str


@dataclass
class ImportBoundaryResult:
    """Aggregate result from check_forbidden_direct_imports()."""
    scanned_files: int
    import_violations: list[ImportViolation] = field(default_factory=list)
    secret_hits: list[SecretHit] = field(default_factory=list)

    @property
    def is_compliant(self) -> bool:
        return not self.import_violations and not self.secret_hits

    def summary(self) -> str:
        lines = []
        if self.import_violations:
            lines.append(
                f"❌ Import Boundary: {len(self.import_violations)} forbidden import(s):"
            )
            for v in self.import_violations:
                lines.append(
                    f"  • {v.file_path}:{v.line_number} → {v.import_statement}"
                )
        if self.secret_hits:
            lines.append(
                f"❌ Secret Scan: {len(self.secret_hits)} potential secret(s):"
            )
            for s in self.secret_hits:
                lines.append(
                    f"  • {s.file_path}:{s.line_number} [{s.matched_pattern}]"
                )
        if not lines:
            lines.append(
                f"✅ Import Boundary: {self.scanned_files} file(s) checked — "
                "0 forbidden imports, 0 secret patterns"
            )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Forbidden Import Patterns
# ---------------------------------------------------------------------------

# Platform src/ namespaces that must never be imported across boundaries.
# Each entry is a tuple of (platform_name, forbidden_module_prefix).
_FORBIDDEN_CROSS_PLATFORM_PREFIXES: list[str] = [
    # Forbid any platform importing another platform's src internals
    "ecosystem.applications.arcturus.src.control_plane.ontology",
    "ecosystem.applications.arcturus.src.control_plane.enterprise",
    "ecosystem.applications.arcturus.src.control_plane.scenarios",
    "ecosystem.applications.arcturus.src.execution_plane.workforce",
    "ecosystem.applications.arcturus.src.execution_plane.workflows",
    "ecosystem.applications.arcturus.src.simulation",
    "ecosystem.applications.arcturus.src.synthetic_data",
    "ecosystem.applications.arcturus.src.evaluation_plane",
    "ecosystem.applications.arcturus.api",
]

# Each platform's own src path is allowed; we only flag cross-platform imports.
# The scanner resolves the owning platform from the file's own path and
# excludes that platform's own prefix from the forbidden list.
_PLATFORM_SRC_PATHS: dict[str, str] = {
    "ontology": "ecosystem.applications.arcturus.src.control_plane.ontology",
    "control/enterprise": "ecosystem.applications.arcturus.src.control_plane.enterprise",
    "scenarios": "ecosystem.applications.arcturus.src.control_plane.scenarios",
    "scenario_engineering": "ecosystem.applications.arcturus.src.control_plane.scenarios",
    "workforce": "ecosystem.applications.arcturus.src.execution_plane.workforce",
    "workflows": "ecosystem.applications.arcturus.src.execution_plane.workflows",
    "simulation": "ecosystem.applications.arcturus.src.simulation",
    "synthetic_data": "ecosystem.applications.arcturus.src.synthetic_data",
    "evaluation_plane": "ecosystem.applications.arcturus.src.evaluation_plane",
    "api": "ecosystem.applications.arcturus.api",
    "web": "ecosystem.applications.arcturus.web",
}

# API routers map to specific platform src paths to allow them to import core logic
_ROUTER_TO_PLATFORM_PREFIX: dict[str, str] = {
    "ontology": "ecosystem.applications.arcturus.src.control_plane.ontology",
    "enterprise": "ecosystem.applications.arcturus.src.control_plane.enterprise",
    "scenarios": "ecosystem.applications.arcturus.src.control_plane.scenarios",
    "workforce": "ecosystem.applications.arcturus.src.execution_plane.workforce",
    "workflows": "ecosystem.applications.arcturus.src.execution_plane.workflows",
    "runtime": "ecosystem.applications.arcturus.src.simulation",
    "synthetic_data": "ecosystem.applications.arcturus.src.synthetic_data",
    "validation": "ecosystem.applications.arcturus.src.evaluation_plane",
    "intelligence": "ecosystem.applications.arcturus.src.evaluation_plane",
}


# ---------------------------------------------------------------------------
# Secret Pattern Detection
# ---------------------------------------------------------------------------

_SECRET_PATTERNS: dict[str, re.Pattern[str]] = {
    "aws_access_key": re.compile(r"AKIA[0-9A-Z]{16}", re.IGNORECASE),
    "generic_api_key": re.compile(
        r"(?:api[_\-]?key|apikey)\s*[=:]\s*[\"'][A-Za-z0-9\-_]{16,}[\"']",
        re.IGNORECASE,
    ),
    "generic_secret": re.compile(
        r"(?:secret|password|passwd|token)\s*[=:]\s*[\"'][A-Za-z0-9\-_!@#$%]{8,}[\"']",
        re.IGNORECASE,
    ),
    "private_key_header": re.compile(
        r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----",
        re.IGNORECASE,
    ),
    "bearer_token": re.compile(
        r"bearer\s+[A-Za-z0-9\-_\.]{20,}",
        re.IGNORECASE,
    ),
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def check_forbidden_direct_imports(
    scan_root: Path | str,
) -> ImportBoundaryResult:
    """
    Walk *scan_root* and report any Python file that directly imports from
    a sibling platform's ``src/`` internals (§2.1 violation).

    The scanner uses Python's ``ast`` module to parse each file so it only
    flags real import statements, not string literals or comments.

    Parameters
    ----------
    scan_root:
        Directory to walk recursively. Typically the
        ``ecosystem/applications/arcturus/`` directory.

    Returns
    -------
    ImportBoundaryResult
        Detailed result including every violation and a human-readable summary.
    """
    scan_root = Path(scan_root).resolve()
    violations: list[ImportViolation] = []
    scanned = 0

    for py_file in _iter_python_files(scan_root):
        scanned += 1
        file_violations = _check_file_imports(py_file)
        violations.extend(file_violations)

    return ImportBoundaryResult(scanned_files=scanned, import_violations=violations)


def scan_for_secret_patterns(
    scan_root: Path | str,
    extensions: tuple[str, ...] = (".py", ".yml", ".yaml", ".env", ".json", ".cfg", ".ini"),
) -> ImportBoundaryResult:
    """
    Walk *scan_root* and report any file containing patterns that match
    common hardcoded secret signatures.

    Parameters
    ----------
    scan_root:
        Directory to walk recursively.
    extensions:
        File extensions to check.

    Returns
    -------
    ImportBoundaryResult
        Result object with secret_hits populated (import_violations will be empty).
    """
    scan_root = Path(scan_root).resolve()
    hits: list[SecretHit] = []
    scanned = 0

    for path in _iter_files_by_extension(scan_root, extensions):
        scanned += 1
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        for lineno, line in enumerate(content.splitlines(), start=1):
            for pattern_name, pattern in _SECRET_PATTERNS.items():
                if pattern.search(line):
                    hits.append(
                        SecretHit(
                            file_path=path.as_posix(),
                            line_number=lineno,
                            matched_pattern=pattern_name,
                            line_snippet=line.strip()[:120],
                        )
                    )

    return ImportBoundaryResult(scanned_files=scanned, secret_hits=hits)


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------


def _check_file_imports(py_file: Path) -> list[ImportViolation]:
    """Parse *py_file* with ast and return any forbidden import violations."""
    try:
        source = py_file.read_text(encoding="utf-8", errors="ignore")
        tree = ast.parse(source, filename=str(py_file))
    except SyntaxError:
        # Unparseable files are skipped — they will be caught by linting
        return []

    # Determine which platform this file belongs to (to exclude self-imports)
    file_posix = py_file.as_posix()
    own_prefixes = _resolve_own_prefixes(file_posix)

    violations: list[ImportViolation] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            module_name = _extract_module_name(node)
            if module_name and _is_forbidden(module_name, own_prefixes):
                violations.append(
                    ImportViolation(
                        file_path=file_posix,
                        line_number=node.lineno,
                        import_statement=module_name,
                        reason=(
                            "Direct import of sibling platform src/ internals "
                            "violates §2.1 — use contracts/ or schemas/ instead"
                        ),
                    )
                )

    return violations


def _extract_module_name(node: ast.Import | ast.ImportFrom) -> str | None:
    """Return the top-level dotted module name from an import AST node."""
    if isinstance(node, ast.Import):
        # e.g. ``import ecosystem.applications.arcturus.src.control_plane.ontology.foo``
        return node.names[0].name if node.names else None
    if isinstance(node, ast.ImportFrom):
        # e.g. ``from ecosystem.applications.arcturus.src.control_plane.ontology import foo``
        return node.module or ""
    return None


def _resolve_own_prefixes(file_posix: str) -> set[str]:
    """
    Return the set of platform src prefixes that belong to the file's own
    platform so they are excluded from the forbidden-import check.
    Integration and governance orchestrators are permitted to import src services.
    """
    if "src/integration" in file_posix or "src/governance" in file_posix:
        return set(_FORBIDDEN_CROSS_PLATFORM_PREFIXES)

    own: set[str] = set()
    for key, prefix in _PLATFORM_SRC_PATHS.items():
        path_fragment_src = prefix.replace(".", "/")
        path_fragment_test = f"tests/{key}"
        if path_fragment_src in file_posix or path_fragment_test in file_posix:
            own.add(prefix)
            
    for router, prefix in _ROUTER_TO_PLATFORM_PREFIX.items():
        if f"api/routers/{router}.py" in file_posix:
            own.add(prefix)
            
    return own



def _is_forbidden(module_name: str, own_prefixes: set[str]) -> bool:
    """Return True if *module_name* is a cross-platform src/ import."""
    for forbidden_prefix in _FORBIDDEN_CROSS_PLATFORM_PREFIXES:
        if module_name.startswith(forbidden_prefix):
            # Allow if it's the file's own platform prefix
            if any(module_name.startswith(own) for own in own_prefixes):
                return False
            return True
    return False


def _iter_python_files(root: Path):
    """Yield all .py files under *root*, skipping standard ignore dirs and test directories."""
    skip = {"__pycache__", ".git", ".venv", "venv", "node_modules", "tests"}
    for item in root.rglob("*.py"):
        if not any(part in skip for part in item.parts):
            yield item



def _iter_files_by_extension(root: Path, extensions: tuple[str, ...]):
    """Yield all files under *root* matching *extensions*, skipping caches and test directories."""
    skip = {"__pycache__", ".git", ".venv", "venv", "node_modules", "tests"}
    for item in root.rglob("*"):
        if item.is_file() and item.suffix in extensions:
            if not any(part in skip for part in item.parts):
                yield item

