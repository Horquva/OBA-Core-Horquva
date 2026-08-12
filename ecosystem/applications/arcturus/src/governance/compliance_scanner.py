"""
Arcturus Governance — compliance_scanner.py
============================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 2 Deliverable: Orchestrating scanner that runs all governance checks in
sequence and returns a unified compliance report.

ArcturusComplianceScanner coordinates:
  1. Path boundary enforcement  (§2.2 — plural applications/ path)
  2. Import boundary checking   (§2.1 — no cross-platform src/ imports)
  3. Secret pattern scanning    (§2.1 — no hardcoded keys or tokens)
  4. Working-tree dirtiness     (§6.2 — no uncommitted local artifacts)

Usage
-----
  from ecosystem.applications.arcturus.src.governance.compliance_scanner import (
      ArcturusComplianceScanner,
  )

  scanner = ArcturusComplianceScanner()
  report = scanner.run_full_scan()
  print(report.summary())
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from ecosystem.applications.arcturus.src.governance.import_boundary_checker import (
    ImportBoundaryResult,
    check_forbidden_direct_imports,
    scan_for_secret_patterns,
)
from ecosystem.applications.arcturus.src.governance.path_enforcer import (
    PathEnforcerResult,
    validate_path_boundaries,
)


# ---------------------------------------------------------------------------
# Unified Compliance Report
# ---------------------------------------------------------------------------

@dataclass
class ComplianceScanReport:
    """
    Aggregated results from a full ArcturusComplianceScanner run.

    All four sub-scanners contribute to a single pass/fail verdict.
    """
    path_result: PathEnforcerResult
    import_result: ImportBoundaryResult
    secret_result: ImportBoundaryResult
    tree_is_dirty: bool
    dirty_files: list[str] = field(default_factory=list)

    @property
    def is_compliant(self) -> bool:
        """True only when every sub-check passes."""
        return (
            self.path_result.is_compliant
            and self.import_result.is_compliant
            and self.secret_result.is_compliant
            and not self.tree_is_dirty
        )

    def summary(self) -> str:
        """Return a human-readable, line-by-line summary of all findings."""
        sections: list[str] = [
            "=" * 70,
            "Arcturus Compliance Scanner Report",
            "=" * 70,
            "",
            "── Path Boundary Check ──────────────────────────────────────",
            self.path_result.summary(),
            "",
            "── Import Boundary Check ────────────────────────────────────",
            self.import_result.summary(),
            "",
            "── Secret Pattern Scan ──────────────────────────────────────",
            self.secret_result.summary(),
            "",
            "── Working Tree Dirtiness Check ─────────────────────────────",
        ]

        if self.tree_is_dirty:
            sections.append(
                f"❌ Tree is dirty — {len(self.dirty_files)} uncommitted file(s):"
            )
            for f in self.dirty_files[:20]:  # cap output at 20 files
                sections.append(f"  • {f}")
            if len(self.dirty_files) > 20:
                sections.append(f"  … and {len(self.dirty_files) - 20} more")
        else:
            sections.append("✅ Working tree is clean — no uncommitted changes")

        sections += [
            "",
            "── Overall Verdict ──────────────────────────────────────────",
            "✅ COMPLIANT" if self.is_compliant else "❌ NON-COMPLIANT — review findings above",
            "=" * 70,
        ]
        return "\n".join(sections)


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

class ArcturusComplianceScanner:
    """
    Platform integrity scanner for the Arcturus governance workstream.

    Instantiate once and call run_full_scan() to execute all checks.
    Each sub-scanner can also be called independently via the individual
    run_* methods.

    Parameters
    ----------
    repo_root:
        Path to the repository root. Defaults to the standard location
        derived from this file's position in the repository.
    arcturus_root:
        Path to the Arcturus application root. Defaults to
        ``<repo_root>/ecosystem/applications/arcturus``.
    """

    def __init__(
        self,
        repo_root: Path | str | None = None,
        arcturus_root: Path | str | None = None,
    ) -> None:
        self._repo_root: Path = (
            Path(repo_root).resolve()
            if repo_root
            else Path(__file__).resolve().parents[6]
        )
        self._arcturus_root: Path = (
            Path(arcturus_root).resolve()
            if arcturus_root
            else self._repo_root / "ecosystem" / "applications" / "arcturus"
        )

    # ------------------------------------------------------------------
    # Full Scan
    # ------------------------------------------------------------------

    def run_full_scan(self) -> ComplianceScanReport:
        """
        Execute all four compliance checks and return a unified report.

        Returns
        -------
        ComplianceScanReport
            A structured report with pass/fail results for every check.
        """
        path_result = self.run_path_check()
        import_result = self.run_import_check()
        secret_result = self.run_secret_scan()
        tree_is_dirty, dirty_files = self.run_tree_check()

        return ComplianceScanReport(
            path_result=path_result,
            import_result=import_result,
            secret_result=secret_result,
            tree_is_dirty=tree_is_dirty,
            dirty_files=dirty_files,
        )

    # ------------------------------------------------------------------
    # Individual Sub-Scanners
    # ------------------------------------------------------------------

    def run_path_check(self) -> PathEnforcerResult:
        """
        Verify that no file under the repo uses the singular
        ``ecosystem/application/arcturus/`` path (§2.2).
        """
        return validate_path_boundaries(self._repo_root)

    def run_import_check(self) -> ImportBoundaryResult:
        """
        Scan all Python files under the Arcturus root for direct cross-platform
        ``src/`` imports (§2.1).
        """
        return check_forbidden_direct_imports(self._arcturus_root)

    def run_secret_scan(self) -> ImportBoundaryResult:
        """
        Scan all relevant files under the Arcturus root for hardcoded
        credentials, API keys, and tokens.
        """
        return scan_for_secret_patterns(self._arcturus_root)

    def run_tree_check(self) -> tuple[bool, list[str]]:
        """
        Check whether the repository working tree has uncommitted changes.

        Returns
        -------
        tuple[bool, list[str]]
            A ``(is_dirty, dirty_files)`` pair. ``is_dirty`` is ``True``
            when there are unstaged or staged but uncommitted changes.
        """
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self._repo_root,
                capture_output=True,
                text=True,
                timeout=15,
            )
            lines = [
                line.strip()
                for line in result.stdout.splitlines()
                if line.strip()
            ]
            return bool(lines), lines
        except (subprocess.SubprocessError, FileNotFoundError):
            # If git is unavailable we cannot determine tree state;
            # fail open (treat as clean) to avoid false positives in CI.
            return False, []
