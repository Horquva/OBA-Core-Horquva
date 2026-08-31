import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich import box

from modules.risk_intelligence import RiskResult, run_risk_intelligence

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class HumanProfile:
    name: str
    owned_agents: list[dict]       # list of {id, name, criticality, documented, is_spof, risk_level}
    backup_for: list[str]          # agent names where this person is backup
    departments_covered: list[str]
    ownership_count: int
    is_human_spof: bool            # True if owns 3+ agents with no backups
    coverage_score: int            # 0-100: how well-covered their agents are
    risk_exposure: str             # CRITICAL / HIGH / MEDIUM / LOW


@dataclass
class CoverageGap:
    agent_name: str
    agent_id: str
    criticality: str
    owner: str | None
    backup_owner: str | None
    gap_type: str                  # "no_owner" | "no_backup" | "both_missing"
    severity: str                  # CRITICAL / HIGH / MEDIUM


def build_human_profiles(data: dict, results: list[RiskResult]) -> list[HumanProfile]:
    agents = data["agents"]
    risk_map = {r.agent_id: r for r in results}

    # Gather all people: owners + backup owners
    all_people = set()
    for a in agents:
        if a["owner"]:
            all_people.add(a["owner"])
        if a["backup_owner"]:
            all_people.add(a["backup_owner"])

    profiles = []

    for person in sorted(all_people):
        owned = []
        backup_for = []
        departments = set()

        for a in agents:
            if a["owner"] == person:
                r = risk_map.get(a["id"])
                owned.append({
                    "id": a["id"],
                    "name": a["name"],
                    "criticality": a["criticality"],
                    "documented": a["documented"],
                    "backup_owner": a["backup_owner"],
                    "is_spof": r.is_spof if r else False,
                    "risk_level": r.final_risk_level if r else "UNKNOWN",
                })
                departments.add(a["department"])

            if a["backup_owner"] == person:
                backup_for.append(a["name"])

        # Coverage score: % of owned agents that have a backup owner
        if owned:
            covered = sum(1 for a in owned if a["backup_owner"] is not None)
            coverage_score = int((covered / len(owned)) * 100)
        else:
            coverage_score = 100

        # Human SPOF: owns 3+ agents and more than half have no backup
        no_backup_count = sum(1 for a in owned if a["backup_owner"] is None)
        is_human_spof = len(owned) >= 3 and no_backup_count >= (len(owned) * 0.6)

        # Risk exposure: worst risk level among owned agents
        level_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
        if owned:
            worst = min(owned, key=lambda a: level_order.get(a["risk_level"], 4))
            risk_exposure = worst["risk_level"]
        else:
            risk_exposure = "LOW"

        profiles.append(HumanProfile(
            name=person,
            owned_agents=owned,
            backup_for=backup_for,
            departments_covered=sorted(departments),
            ownership_count=len(owned),
            is_human_spof=is_human_spof,
            coverage_score=coverage_score,
            risk_exposure=risk_exposure,
        ))

    # Sort: human SPOFs first, then by ownership count descending
    profiles.sort(key=lambda p: (not p.is_human_spof, -p.ownership_count))
    return profiles


def find_coverage_gaps(data: dict, results: list[RiskResult]) -> list[CoverageGap]:
    gaps = []
    for a in data["agents"]:
        owner = a["owner"]
        backup = a["backup_owner"]
        criticality = a["criticality"]

        if owner is None and backup is None:
            gap_type = "both_missing"
            severity = "CRITICAL" if criticality in ("critical", "high") else "HIGH"
        elif owner is None:
            gap_type = "no_owner"
            severity = "CRITICAL"
        elif backup is None:
            gap_type = "no_backup"
            severity = "CRITICAL" if criticality == "critical" else "HIGH" if criticality == "high" else "MEDIUM"
        else:
            continue  # fully covered

        gaps.append(CoverageGap(
            agent_name=a["name"],
            agent_id=a["id"],
            criticality=criticality,
            owner=owner,
            backup_owner=backup,
            gap_type=gap_type,
            severity=severity,
        ))

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
    gaps.sort(key=lambda g: severity_order.get(g.severity, 3))
    return gaps


def run_human_agent_map(data_path: str) -> tuple[list[HumanProfile], list[CoverageGap], list[RiskResult]]:
    with open(data_path) as f:
        data = json.load(f)

    results, _ = run_risk_intelligence(data_path)
    profiles = build_human_profiles(data, results)
    gaps = find_coverage_gaps(data, results)

    return profiles, gaps, results


def display_human_agent_map(
    profiles: list[HumanProfile],
    gaps: list[CoverageGap],
    results: list[RiskResult],
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 06 — HUMAN-AGENT DEPENDENCY MAP[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green", "UNKNOWN": "dim"}

    # ── Ownership Overview Table ──
    console.print(Panel("[bold]Ownership Overview — Who Owns What[/bold]", box=box.SIMPLE))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Person", style="white", min_width=10)
    table.add_column("Agents Owned", justify="center", min_width=13)
    table.add_column("Backup For", justify="center", min_width=11)
    table.add_column("Departments", style="cyan", min_width=24)
    table.add_column("Coverage", justify="center", min_width=10)
    table.add_column("Human SPOF", justify="center", min_width=12)
    table.add_column("Risk Exposure", justify="center", min_width=14)

    for p in profiles:
        spof_text = "[bold red]YES[/bold red]" if p.is_human_spof else "[green]NO[/green]"
        cov_color = "green" if p.coverage_score >= 70 else "yellow" if p.coverage_score >= 30 else "red"
        risk_color = risk_colors.get(p.risk_exposure, "white")
        depts = ", ".join(p.departments_covered) if p.departments_covered else "[dim]—[/dim]"

        table.add_row(
            f"[bold]{p.name}[/bold]",
            str(p.ownership_count),
            str(len(p.backup_for)),
            depts,
            f"[{cov_color}]{p.coverage_score}%[/{cov_color}]",
            spof_text,
            f"[{risk_color}]{p.risk_exposure}[/{risk_color}]",
        )

    console.print(table)

    # ── Per-Person Agent Tree ──
    console.print("\n[bold cyan]Agent Ownership Tree:[/bold cyan]\n")
    for p in profiles:
        if not p.owned_agents:
            continue
        spof_tag = " [bold red][HUMAN SPOF][/bold red]" if p.is_human_spof else ""
        cov_color = "green" if p.coverage_score >= 70 else "yellow" if p.coverage_score >= 30 else "red"
        tree = Tree(
            f"[bold white]{p.name}[/bold white]{spof_tag} "
            f"[dim]— owns {p.ownership_count} agent(s) | coverage [{cov_color}]{p.coverage_score}%[/{cov_color}][/dim]"
        )
        for a in p.owned_agents:
            color = risk_colors.get(a["risk_level"], "white")
            backup_tag = f" [dim](backup: {a['backup_owner']})[/dim]" if a["backup_owner"] else " [red](no backup)[/red]"
            spof_agent_tag = " [bold red][SPOF][/bold red]" if a["is_spof"] else ""
            doc_tag = " [dim][documented][/dim]" if a["documented"] else " [red][undocumented][/red]"
            tree.add(
                f"[{color}]{a['name']}[/{color}]"
                f" [{color}]({a['risk_level']})[/{color}]"
                f"{spof_agent_tag}{backup_tag}{doc_tag}"
            )
        console.print(tree)
        console.print()

    # ── Coverage Gaps Table ──
    console.print(Panel("[bold red]Coverage Gaps — Missing Owners & Backups[/bold red]", box=box.SIMPLE))

    gap_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    gap_table.add_column("Agent", style="white", min_width=28)
    gap_table.add_column("Criticality", justify="center", min_width=12)
    gap_table.add_column("Owner", justify="center", min_width=10)
    gap_table.add_column("Backup Owner", justify="center", min_width=14)
    gap_table.add_column("Gap Type", justify="center", min_width=14)
    gap_table.add_column("Severity", justify="center", min_width=10)

    for g in gaps:
        sev_color = risk_colors.get(g.severity, "white")
        crit_color = "bold red" if g.criticality == "critical" else "yellow" if g.criticality == "high" else "dim"
        gap_labels = {
            "no_owner": "[red]No Owner[/red]",
            "no_backup": "[yellow]No Backup[/yellow]",
            "both_missing": "[bold red]Both Missing[/bold red]",
        }
        gap_table.add_row(
            g.agent_name,
            f"[{crit_color}]{g.criticality.upper()}[/{crit_color}]",
            g.owner if g.owner else "[red]NONE[/red]",
            g.backup_owner if g.backup_owner else "[red]NONE[/red]",
            gap_labels.get(g.gap_type, g.gap_type),
            f"[{sev_color}]{g.severity}[/{sev_color}]",
        )

    console.print(gap_table)

    # ── Summary ──
    human_spofs = [p for p in profiles if p.is_human_spof]
    no_owner_agents = [g for g in gaps if g.gap_type in ("no_owner", "both_missing")]
    no_backup_agents = [g for g in gaps if g.gap_type == "no_backup"]
    total_agents = sum(p.ownership_count for p in profiles) + len(no_owner_agents)

    console.print(Panel(
        f"[bold]Total People Managing Agents:[/bold] {len(profiles)}\n"
        f"[bold]Total Agents Tracked:[/bold] {total_agents}\n"
        f"[bold red]Human Single Points of Failure:[/bold red] {len(human_spofs)} "
        + (f"({', '.join(p.name for p in human_spofs)})" if human_spofs else "") + "\n"
        f"[bold red]Agents With No Owner:[/bold red] {len(no_owner_agents)}\n"
        f"[bold yellow]Agents With No Backup Owner:[/bold yellow] {len(no_backup_agents)}\n"
        f"[bold]Total Coverage Gaps:[/bold] {len(gaps)}",
        title="[bold]Human-Agent Map Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    profiles, gaps, results = run_human_agent_map("data/sunrise_care.json")
    display_human_agent_map(profiles, gaps, results, data["company"])