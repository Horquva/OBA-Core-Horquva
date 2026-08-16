"""
Arcturus Governance — tests/governance/test_compliance_engine.py
=================================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 4 Deliverable: Failure-injection tests that prove the compliance
scanner correctly blocks unsafe changes.

Test coverage:
  - test_forbidden_import_is_blocked      → §2.1 import boundary
  - test_path_violation_is_reported       → §2.2 plural path law
  - test_dirty_tree_is_rejected           → §6.2 tree cleanliness
"""
from __future__ import annotations

import textwrap
from pathlib import Path

import pytest

from ecosystem.applications.arcturus.src.governance.import_boundary_checker import (
    check_forbidden_direct_imports,
    scan_for_secret_patterns,
)
from ecosystem.applications.arcturus.src.governance.path_enforcer import (
    validate_path_boundaries,
)
from ecosystem.applications.arcturus.src.governance.compliance_scanner import (
    ArcturusComplianceScanner,
)


# ============================================================================
# Fixtures — temporary file trees for injection tests
# ============================================================================


@pytest.fixture
def tmp_clean_tree(tmp_path: Path) -> Path:
    """
    A minimal, law-abiding file tree:
      ecosystem/applications/arcturus/src/good_module.py
    No violations.
    """
    src = tmp_path / "ecosystem" / "applications" / "arcturus" / "src"
    src.mkdir(parents=True)
    (src / "good_module.py").write_text(
        textwrap.dedent("""\
            from ecosystem.applications.arcturus.contracts.shared.base_models import SimulationContext

            def hello() -> str:
                return "compliant"
        """),
        encoding="utf-8",
    )
    return tmp_path


@pytest.fixture
def tmp_forbidden_import_tree(tmp_path: Path) -> Path:
    """
    A file tree containing a §2.1 violation:
    One file imports directly from another platform's src/ internals.
    """
    src = tmp_path / "ecosystem" / "applications" / "arcturus" / "src" / "enterprise"
    src.mkdir(parents=True)
    (src / "violating_module.py").write_text(
        textwrap.dedent("""\
            # This import is forbidden: crosses platform boundary via src/
            from ecosystem.applications.arcturus.src.control_plane.ontology.ontology_controller import OntologyController

            def bad_function():
                return OntologyController()
        """),
        encoding="utf-8",
    )
    return tmp_path


@pytest.fixture
def tmp_singular_path_tree(tmp_path: Path) -> Path:
    """
    A file tree where a Python file is placed under the forbidden singular
    'ecosystem/application/arcturus/' path (§2.2 violation).
    """
    # Create the singular (bad) path
    bad_src = tmp_path / "ecosystem" / "application" / "arcturus" / "src"
    bad_src.mkdir(parents=True)
    (bad_src / "misplaced_module.py").write_text(
        "# This file is in the wrong path\npass\n",
        encoding="utf-8",
    )
    return tmp_path


@pytest.fixture
def tmp_secret_tree(tmp_path: Path) -> Path:
    """
    A file tree containing a hardcoded API key (secret pattern violation).
    """
    src = tmp_path / "ecosystem" / "applications" / "arcturus" / "src"
    src.mkdir(parents=True)
    key_val = "sk-" + "abcdefghijklmnopqrstuvwx"
    secret_val = "my_super_" + "secret_password123"
    (src / "config.py").write_text(
        textwrap.dedent(f"""\
            # BAD: hardcoded secret
            api_key = "{key_val}"
            secret = "{secret_val}"
        """),
        encoding="utf-8",
    )
    return tmp_path



# ============================================================================
# Test: Forbidden Import Is Blocked
# ============================================================================


def test_forbidden_import_is_blocked(tmp_forbidden_import_tree: Path):
    """
    §2.1 — A file importing sibling platform src/ internals must produce
    at least one ImportViolation.

    The import boundary checker must catch this and mark the result
    as non-compliant.
    """
    result = check_forbidden_direct_imports(tmp_forbidden_import_tree)

    assert not result.is_compliant, (
        "Expected a non-compliant result because a cross-platform src/ import "
        "was present, but the checker reported compliant."
    )
    assert len(result.import_violations) >= 1, (
        "Expected at least one ImportViolation to be recorded."
    )
    # Verify the offending module is identified correctly
    offending = result.import_violations[0]
    assert "ontology_controller" in offending.import_statement or \
           "ontology" in offending.import_statement, (
        f"Unexpected import flagged: {offending.import_statement}"
    )


def test_clean_tree_has_no_import_violations(tmp_clean_tree: Path):
    """
    A file that only imports from contracts/ must produce zero violations.
    """
    result = check_forbidden_direct_imports(tmp_clean_tree)

    assert result.is_compliant, (
        f"Expected compliant result for a clean tree, got violations: "
        f"{result.import_violations}"
    )
    assert result.import_violations == []


# ============================================================================
# Test: Path Violation Is Reported
# ============================================================================


def test_path_violation_is_reported(tmp_singular_path_tree: Path):
    """
    §2.2 — A file placed under the singular 'ecosystem/application/arcturus/'
    path must be flagged as a PathViolation.
    """
    result = validate_path_boundaries(tmp_singular_path_tree)

    assert not result.is_compliant, (
        "Expected a non-compliant result for a singular-path file, "
        "but the enforcer reported compliant."
    )
    assert len(result.violations) >= 1, (
        "Expected at least one PathViolation to be recorded."
    )
    # The violation must reference the singular path
    v = result.violations[0]
    assert "application/arcturus" in v.offending_path.replace("\\", "/"), (
        f"Violation path did not contain the expected singular fragment: {v.offending_path}"
    )


def test_compliant_path_passes_enforcer(tmp_clean_tree: Path):
    """
    A file placed under the correct plural 'ecosystem/applications/arcturus/'
    path must produce zero PathViolations.
    """
    result = validate_path_boundaries(tmp_clean_tree)

    # The clean tree has no singular path — should be compliant
    assert result.is_compliant, (
        f"Expected compliant result for a correct plural path, got: "
        f"{result.violations}"
    )


# ============================================================================
# Test: Dirty Tree Is Rejected
# ============================================================================


def test_dirty_tree_is_rejected(tmp_path: Path, monkeypatch):
    """
    §6.2 — When git reports uncommitted changes, run_tree_check() must
    return (is_dirty=True, dirty_files=[...]).

    We monkeypatch subprocess.run to simulate a dirty git output without
    requiring an actual git repository.
    """
    import subprocess

    dirty_output = " M ecosystem/applications/arcturus/src/some_module.py\n"

    class FakeCompletedProcess:
        stdout = dirty_output
        returncode = 0

    def fake_run(*args, **kwargs):
        return FakeCompletedProcess()

    monkeypatch.setattr(subprocess, "run", fake_run)

    scanner = ArcturusComplianceScanner(repo_root=tmp_path)
    is_dirty, dirty_files = scanner.run_tree_check()

    assert is_dirty is True, (
        "Expected is_dirty=True when git status reports modified files."
    )
    assert len(dirty_files) >= 1, (
        "Expected at least one dirty file to be listed."
    )


def test_clean_tree_is_accepted(tmp_path: Path, monkeypatch):
    """
    When git reports a clean working tree, run_tree_check() must return
    (is_dirty=False, dirty_files=[]).
    """
    import subprocess

    class FakeCompletedProcess:
        stdout = ""
        returncode = 0

    monkeypatch.setattr(subprocess, "run", lambda *a, **k: FakeCompletedProcess())

    scanner = ArcturusComplianceScanner(repo_root=tmp_path)
    is_dirty, dirty_files = scanner.run_tree_check()

    assert is_dirty is False
    assert dirty_files == []


# ============================================================================
# Test: Secret Patterns Are Detected
# ============================================================================


def test_hardcoded_secret_is_flagged(tmp_secret_tree: Path):
    """
    A file containing a hardcoded API key or password pattern must produce
    at least one SecretHit.
    """
    result = scan_for_secret_patterns(tmp_secret_tree)

    assert result.secret_hits, (
        "Expected at least one SecretHit for a file containing a hardcoded secret."
    )


def test_clean_file_has_no_secret_hits(tmp_clean_tree: Path):
    """
    A file with no secret patterns must produce zero SecretHits.
    """
    result = scan_for_secret_patterns(tmp_clean_tree)

    assert not result.secret_hits, (
        f"Expected zero SecretHits for a clean file, got: {result.secret_hits}"
    )
