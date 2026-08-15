"""
Arcturus Governance — src/integration/governance_evidence.py
=============================================================
Governance Owner: Hashim Ali Khan (@Hashimali-khan)
Day 5 Deliverable: Evidence aggregation and Release Candidate report for the
Week 3 sprint review.

This module collects compliance, test-coverage, and contract-stability
evidence from all Arcturus platforms and assembles them into a final,
review-ready evidence bundle.

Day 5 E2E chain:
  Ontology → Enterprise → Workforce → Behavior → Scenario → Runtime → Validation

aggregate_evidence()              — run all evidence collection steps
build_release_candidate_report()  — render the final review bundle as markdown
"""
from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Evidence Types
# ---------------------------------------------------------------------------


@dataclass
class PlatformEvidence:
    """Evidence collected for a single platform."""
    platform_name: str
    owner: str
    github_handle: str
    contracts_present: list[str] = field(default_factory=list)
    contracts_missing: list[str] = field(default_factory=list)
    src_files_present: list[str] = field(default_factory=list)
    src_files_missing: list[str] = field(default_factory=list)
    test_files_present: list[str] = field(default_factory=list)
    test_files_missing: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    @property
    def is_complete(self) -> bool:
        return (
            not self.contracts_missing
            and not self.src_files_missing
            and not self.test_files_missing
        )

    @property
    def completion_pct(self) -> float:
        total = (
            len(self.contracts_present) + len(self.contracts_missing)
            + len(self.src_files_present) + len(self.src_files_missing)
            + len(self.test_files_present) + len(self.test_files_missing)
        )
        if total == 0:
            return 0.0
        done = (
            len(self.contracts_present)
            + len(self.src_files_present)
            + len(self.test_files_present)
        )
        return round(done / total * 100, 1)


@dataclass
class GovernanceEvidence:
    """Evidence from the Hashim's compliance scanner run."""
    path_compliant: bool
    import_compliant: bool
    secret_compliant: bool
    tree_clean: bool
    violation_summary: str

    @property
    def is_compliant(self) -> bool:
        return (
            self.path_compliant
            and self.import_compliant
            and self.secret_compliant
        )


@dataclass
class EvidenceBundle:
    """Complete evidence package for the Day 5 release candidate review."""
    generated_at: str
    sprint: str
    platform_evidence: list[PlatformEvidence]
    governance: GovernanceEvidence
    pytest_exit_code: int | None
    pytest_summary: str

    @property
    def all_platforms_complete(self) -> bool:
        return all(p.is_complete for p in self.platform_evidence)


# ---------------------------------------------------------------------------
# Platform Manifests
# ---------------------------------------------------------------------------

# Each manifest describes the files each platform must deliver.
# Used to produce a per-platform completion scorecard.
_PLATFORM_MANIFESTS: list[dict[str, Any]] = [
    {
        "platform": "Ontology (Hamza)",
        "owner": "Muhammad Hamza",
        "handle": "@MuhammadHamza-7035",
        "contracts": [
            # Blueprint path + actual candidate paths
            ["contracts/control/ontology/base_models.py",
             "contracts/ontology/ontology_snapshot_contract.py"],
            ["contracts/ontology/entity_reference_contract.py"],
        ],
        "schemas": [
            ["schemas/control/ontology/base_schemas.py",
             "schemas/ontology/ontology_schemas.py"],
        ],
        "src": [
            ["src/control_plane/ontology/ontology_service.py",
             "src/ontology/ontology_runtime.py",
             "src/ontology/ontology_controller.py"],
            ["src/control_plane/ontology/ontology_adapters.py",
             "src/ontology/ontology_adapters.py"],
            ["src/ontology/constraint_engine.py",
             "src/ontology/relationship_engine.py"],
        ],
        "tests": [
            ["tests/control/ontology/test_ontology_contracts.py",
             "tests/ontology/test_ontology_contracts.py"],
        ],
        "integration": [
            ["src/integration/ontology_chain.py"],
        ],
    },
    {
        "platform": "Enterprise (Ajwa)",
        "owner": "Ajwa Zainab",
        "handle": "@AjwaZainab",
        "contracts": [
            ["contracts/control/enterprise/base_models.py",
             "contracts/enterprise/base_models.py"],
        ],
        "schemas": [
            ["schemas/control/enterprise/base_schemas.py"],
        ],
        "src": [
            ["src/control_plane/enterprise/enterprise_generator.py",
             "src/enterprise/enterprise_generator.py"],
            ["src/control_plane/enterprise/enterprise_adapters.py",
             "src/enterprise/enterprise_adapters.py"],
        ],
        "tests": [
            ["tests/control/enterprise/test_enterprise_generation.py"],
        ],
        "integration": [
            ["src/integration/enterprise_chain.py"],
        ],
    },
    {
        "platform": "Scenarios (Maryam)",
        "owner": "Maryam Yaqoob",
        "handle": "@Maryam-Yaqoob",
        "contracts": [
            ["contracts/control/scenarios/base_models.py"],
        ],
        "schemas": [
            ["schemas/control/scenarios/base_schemas.py"],
        ],
        "src": [
            ["src/control_plane/scenarios/scenario_engine.py",
             "src/scenario_engineering/scenario_engine.py"],
            ["src/control_plane/scenarios/scenario_adapters.py",
             "src/scenario_engineering/scenario_adapters.py"],
        ],
        "tests": [
            ["tests/control/scenarios/test_scenario_payloads.py",
             "tests/scenarios/test_scenario_payloads.py",
             "tests/scenario_engineering/test_scenario_engine.py"],
        ],
        "integration": [
            ["src/integration/scenario_chain.py"],
        ],
    },
    {
        "platform": "Workforce (Syeda)",
        "owner": "Syeda Dua e Farwa Gulzar",
        "handle": "@Syeda-Dua-Farwa",
        "contracts": [
            ["contracts/execution/workforce/base_models.py"],
        ],
        "schemas": [
            ["schemas/execution/workforce/base_schemas.py"],
        ],
        "src": [
            ["src/execution_plane/workforce/workforce_service.py"],
            ["src/execution_plane/workforce/workforce_adapters.py"],
        ],
        "tests": [
            ["tests/execution/workforce/test_workforce_payloads.py"],
        ],
        "integration": [
            ["src/integration/workforce_chain.py"],
        ],
    },
    {
        "platform": "Workflows (Javeria)",
        "owner": "Javeria Rafhan",
        "handle": "@javeria1234-aaly",
        "contracts": [
            ["contracts/execution/workflows/base_models.py"],
        ],
        "schemas": [
            ["schemas/execution/workflows/base_schemas.py"],
        ],
        "src": [
            ["src/execution_plane/workflows/workflow_service.py"],
            ["src/execution_plane/workflows/workflow_adapters.py"],
        ],
        "tests": [
            ["tests/execution/workflows/test_workflow_contracts.py"],
        ],
        "integration": [
            ["src/integration/workflow_chain.py"],
        ],
    },
    {
        "platform": "Runtime (Maaz)",
        "owner": "Muhammad Maaz Khan",
        "handle": "@Khan5002",
        "contracts": [
            ["contracts/simulation/base_models.py"],
        ],
        "schemas": [
            ["schemas/simulation/base_schemas.py"],
        ],
        "src": [
            ["src/simulation/runtime_engine.py"],
            ["src/simulation/runtime_adapters.py"],
            ["src/simulation/checkpoint_store.py"],
        ],
        "tests": [
            ["tests/simulation/test_runtime_contracts.py"],
        ],
        "integration": [
            ["src/integration/runtime_chain.py"],
        ],
    },
    {
        "platform": "Validation (Amina)",
        "owner": "Amina Khan",
        "handle": "@Amina-Khan380",
        "contracts": [
            ["contracts/evaluation/base_models.py"],
        ],
        "schemas": [
            ["schemas/evaluation/base_schemas.py"],
        ],
        "src": [
            ["src/evaluation_plane/validation_engine.py"],
            ["src/evaluation_plane/validation_adapters.py"],
        ],
        "tests": [
            ["tests/evaluation/test_validation_engine.py"],
        ],
        "integration": [
            ["src/integration/validation_chain.py"],
        ],
    },
    {
        "platform": "Synthetic Data (Ahmed)",
        "owner": "Ahmed Raza",
        "handle": "@4hmad69",
        "contracts": [
            ["contracts/synthetic_data/base_models.py"],
        ],
        "schemas": [
            ["schemas/synthetic_data/base_schemas.py"],
        ],
        "src": [
            ["src/synthetic_data/generation_service.py"],
            ["src/synthetic_data/generation_adapters.py"],
        ],
        "tests": [
            ["tests/synthetic_data/test_generation_contracts.py"],
        ],
        "integration": [
            ["src/integration/synthetic_data_chain.py"],
        ],
    },
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def aggregate_evidence(
    arcturus_root: Path | str | None = None,
    repo_root: Path | str | None = None,
) -> EvidenceBundle:
    """
    Collect compliance, file-presence, and test-coverage evidence from all
    Arcturus platforms and return a complete EvidenceBundle.

    Parameters
    ----------
    arcturus_root:
        Path to ``ecosystem/applications/arcturus/``. Defaults to the
        canonical location derived from this file's position.
    repo_root:
        Path to the repository root. Defaults to 5 levels above this file.

    Returns
    -------
    EvidenceBundle
        A structured evidence object ready for report generation.
    """
    # Resolve paths
    _this_file = Path(__file__).resolve()
    _arc_root = (
        Path(arcturus_root).resolve()
        if arcturus_root
        else _this_file.parents[2]  # src/integration/../../ = arcturus root
    )
    _repo_root = (
        Path(repo_root).resolve()
        if repo_root
        else _this_file.parents[5]  # repo root
    )

    # ── 1. Governance scan ──────────────────────────────────────────────────
    governance = _collect_governance_evidence(_arc_root, _repo_root)

    # ── 2. Per-platform file presence ───────────────────────────────────────
    platform_evidence = [
        _collect_platform_evidence(manifest, _arc_root)
        for manifest in _PLATFORM_MANIFESTS
    ]

    # ── 3. Run pytest ────────────────────────────────────────────────────────
    exit_code, pytest_summary = _run_pytest(_arc_root)

    return EvidenceBundle(
        generated_at=datetime.now(timezone.utc).isoformat(),
        sprint="Week 3 — Days 1–5",
        platform_evidence=platform_evidence,
        governance=governance,
        pytest_exit_code=exit_code,
        pytest_summary=pytest_summary,
    )


def build_release_candidate_report(
    bundle: EvidenceBundle,
    *,
    output_path: Path | str | None = None,
) -> str:
    """
    Render an EvidenceBundle as a Markdown release-candidate review document.

    Parameters
    ----------
    bundle:
        The EvidenceBundle produced by aggregate_evidence().
    output_path:
        If provided, the rendered markdown is also written to this file path.

    Returns
    -------
    str
        The complete markdown string.
    """
    md = _render_rc_report(bundle)

    if output_path is not None:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(md, encoding="utf-8")

    return md


# ---------------------------------------------------------------------------
# Evidence Collectors
# ---------------------------------------------------------------------------


def _collect_governance_evidence(arc_root: Path, repo_root: Path) -> GovernanceEvidence:
    """Run the compliance scanner and return a GovernanceEvidence object."""
    try:
        from ecosystem.applications.arcturus.src.governance.compliance_scanner import (
            ArcturusComplianceScanner,
        )
        scanner = ArcturusComplianceScanner(repo_root=repo_root, arcturus_root=arc_root)
        report = scanner.run_full_scan()
        return GovernanceEvidence(
            path_compliant=report.path_result.is_compliant,
            import_compliant=report.import_result.is_compliant,
            secret_compliant=not bool(report.secret_result.secret_hits),
            tree_clean=not report.tree_is_dirty,
            violation_summary=report.summary(),
        )
    except Exception as exc:
        return GovernanceEvidence(
            path_compliant=False,
            import_compliant=False,
            secret_compliant=False,
            tree_clean=False,
            violation_summary=f"Scanner failed to run: {exc}",
        )


def _collect_platform_evidence(
    manifest: dict[str, Any],
    arc_root: Path,
) -> PlatformEvidence:
    """Check file presence for a single platform manifest.

    Each manifest entry is now a list of candidate paths.  A slot is
    counted as *present* when at least one candidate exists on disk.
    """
    ev = PlatformEvidence(
        platform_name=manifest["platform"],
        owner=manifest["owner"],
        github_handle=manifest["handle"],
    )

    all_slots: list[tuple[str, list[str]]] = []  # (category, candidates)
    for category_key in ("contracts", "schemas", "src", "tests", "integration"):
        for candidates in manifest.get(category_key, []):
            # Determine the display category from the first candidate path
            first = candidates[0] if isinstance(candidates, list) else candidates
            cat = first.split("/")[0]
            # Normalise to list when still a bare string (defensive)
            cands = candidates if isinstance(candidates, list) else [candidates]
            all_slots.append((cat, cands))

    for cat, candidates in all_slots:
        # Find the first candidate that exists
        found_path: str | None = None
        for c in candidates:
            if (arc_root / c).exists():
                found_path = c
                break

        if found_path:
            if cat in ("contracts", "schemas"):
                ev.contracts_present.append(found_path)
            elif cat == "src":
                ev.src_files_present.append(found_path)
            elif cat == "tests":
                ev.test_files_present.append(found_path)
        else:
            label = " | ".join(candidates)
            if cat in ("contracts", "schemas"):
                ev.contracts_missing.append(label)
            elif cat == "src":
                ev.src_files_missing.append(label)
            elif cat == "tests":
                ev.test_files_missing.append(label)

    return ev


def _run_pytest(arc_root: Path) -> tuple[int | None, str]:
    """Run the Arcturus pytest suite and return (exit_code, summary_text)."""
    test_dir = arc_root / "tests"
    if not test_dir.exists():
        return None, "tests/ directory not found — skipped"
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pytest", str(test_dir), "-q", "--tb=short"],
            cwd=arc_root.parents[2],  # repo root
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = result.stdout + result.stderr
        return result.returncode, output[-3000:] if len(output) > 3000 else output
    except Exception as exc:
        return None, f"pytest failed to run: {exc}"


# ---------------------------------------------------------------------------
# Markdown Renderer
# ---------------------------------------------------------------------------


def _render_rc_report(bundle: EvidenceBundle) -> str:
    """Render the EvidenceBundle as a markdown release-candidate document."""
    overall_verdict = (
        "✅ RELEASE CANDIDATE — APPROVED"
        if (bundle.all_platforms_complete and bundle.governance.is_compliant and bundle.pytest_exit_code == 0)
        else "⚠️ RELEASE CANDIDATE — REVIEW REQUIRED"
    )

    sections: list[str] = [
        f"# Arcturus Week 3 — Release Candidate Evidence Package",
        f"",
        f"**Sprint:** {bundle.sprint}  ",
        f"**Generated:** {bundle.generated_at}  ",
        f"**Overall Verdict:** {overall_verdict}",
        f"",
        "---",
        "",
        "## 1. Governance Compliance",
        "",
        _render_governance_section(bundle.governance),
        "",
        "---",
        "",
        "## 2. Platform Completion Scorecard",
        "",
        _render_scorecard(bundle.platform_evidence),
        "",
        "---",
        "",
        "## 3. Per-Platform File Evidence",
        "",
        _render_platform_details(bundle.platform_evidence),
        "",
        "---",
        "",
        "## 4. Test Suite Results",
        "",
        _render_pytest_section(bundle),
        "",
        "---",
        "",
        "## 5. Day 5 E2E Chain Status",
        "",
        _render_e2e_chain(bundle.platform_evidence),
        "",
        "---",
        "",
        "_Evidence package generated by Arcturus Governance Workstream — "
        "Hashim Ali Khan (@Hashimali-khan)_",
    ]
    return "\n".join(sections)


def _render_governance_section(gov: GovernanceEvidence) -> str:
    icon = "✅" if gov.is_compliant else "❌"
    return "\n".join([
        f"**Status:** {icon} {'Compliant' if gov.is_compliant else 'Non-Compliant'}",
        "",
        "| Check | Result |",
        "| --- | --- |",
        f"| Path Boundaries (§2.2) | {'✅' if gov.path_compliant else '❌'} |",
        f"| Import Boundaries (§2.1) | {'✅' if gov.import_compliant else '❌'} |",
        f"| Secret Pattern Scan | {'✅' if gov.secret_compliant else '❌'} |",
        f"| Working Tree Clean | {'✅' if gov.tree_clean else '⚠️ Dirty (expected during dev)'} |",
    ])


def _render_scorecard(platforms: list[PlatformEvidence]) -> str:
    rows = [
        "| Platform | Owner | Completion | Contracts | Src Files | Tests |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for p in platforms:
        icon = "✅" if p.is_complete else "🔴"
        rows.append(
            f"| {icon} {p.platform_name} | {p.owner} | {p.completion_pct}% "
            f"| {len(p.contracts_present)}/{len(p.contracts_present)+len(p.contracts_missing)} "
            f"| {len(p.src_files_present)}/{len(p.src_files_present)+len(p.src_files_missing)} "
            f"| {len(p.test_files_present)}/{len(p.test_files_present)+len(p.test_files_missing)} |"
        )
    return "\n".join(rows)


def _render_platform_details(platforms: list[PlatformEvidence]) -> str:
    parts: list[str] = []
    for p in platforms:
        icon = "✅" if p.is_complete else "🔴"
        parts.append(f"### {icon} {p.platform_name} ({p.github_handle})")
        if p.contracts_missing or p.src_files_missing or p.test_files_missing:
            parts.append("")
            parts.append("**Missing files:**")
            for f in p.contracts_missing + p.src_files_missing + p.test_files_missing:
                parts.append(f"  - ❌ `{f}`")
        parts.append("")
    return "\n".join(parts)


def _render_pytest_section(bundle: EvidenceBundle) -> str:
    if bundle.pytest_exit_code is None:
        return "⚠️ pytest was not run or could not be executed."
    icon = "✅" if bundle.pytest_exit_code == 0 else "❌"
    lines = [
        f"**Exit Code:** {bundle.pytest_exit_code} {icon}",
        "",
        "```",
        bundle.pytest_summary or "(no output captured)",
        "```",
    ]
    return "\n".join(lines)


def _render_e2e_chain(platforms: list[PlatformEvidence]) -> str:
    chain = [
        "Ontology (Hamza)",
        "Enterprise (Ajwa)",
        "Workforce (Syeda)",
        "Workflows (Javeria)",
        "Scenarios (Maryam)",
        "Runtime (Maaz)",
        "Validation (Amina)",
    ]
    platform_map = {p.platform_name: p for p in platforms}
    parts: list[str] = []
    for name in chain:
        p = platform_map.get(name)
        icon = "✅" if (p and p.is_complete) else "🔴"
        parts.append(f"{icon} **{name}**")
    return " → ".join(parts)
