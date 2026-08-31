import io
import json
import sys
from dataclasses import dataclass
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class OwnershipResult:
    agent_id: str
    agent_name: str
    owner: Optional[str]
    backup_owner: Optional[str]
    criticality: str
    documented: bool
    risk_level: str
    risk_reasons: list[str]


def calculate_ownership_risk(agent: dict) -> tuple[str, list[str]]:
    reasons = []
    score = 0

    if agent["owner"] is None:
        score += 40
        reasons.append("No owner assigned (orphaned agent)")

    if agent["backup_owner"] is None:
        score += 30
        reasons.append("No backup owner")

    if not agent["documented"]:
        score += 15
        reasons.append("Ownership not documented")

    criticality_scores = {"critical": 15, "high": 10, "medium": 5, "low": 0}
    score += criticality_scores.get(agent["criticality"], 0)

    if score >= 70:
        level = "CRITICAL"
    elif score >= 45:
        level = "HIGH"
    elif score >= 20:
        level = "MEDIUM"
    else:
        level = "LOW"

    return level, reasons


def run_ownership_intelligence(data_path: str) -> list[OwnershipResult]:
    with open(data_path) as f:
        data = json.load(f)

    results = []
    for agent in data["agents"]:
        risk_level, risk_reasons = calculate_ownership_risk(agent)
        results.append(OwnershipResult(
            agent_id=agent["id"],
            agent_name=agent["name"],
            owner=agent["owner"],
            backup_owner=agent["backup_owner"],
            criticality=agent["criticality"],
            documented=agent["documented"],
            risk_level=risk_level,
            risk_reasons=risk_reasons,
        ))

    return results


def display_ownership_report(results: list[OwnershipResult], company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 01 — OWNERSHIP INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Agent", style="white", min_width=28)
    table.add_column("Owner", style="cyan", min_width=10)
    table.add_column("Backup", style="cyan", min_width=10)
    table.add_column("Criticality", justify="center", min_width=10)
    table.add_column("Documented", justify="center", min_width=10)
    table.add_column("Risk", justify="center", min_width=10)

    risk_colors = {
        "CRITICAL": "bold red",
        "HIGH": "bold yellow",
        "MEDIUM": "yellow",
        "LOW": "green",
    }
    criticality_colors = {
        "critical": "bold red",
        "high": "yellow",
        "medium": "blue",
        "low": "green",
    }

    for r in results:
        risk_color = risk_colors[r.risk_level]
        crit_color = criticality_colors[r.criticality]
        table.add_row(
            r.agent_name,
            r.owner or "[red]NONE[/red]",
            r.backup_owner or "[red]NONE[/red]",
            f"[{crit_color}]{r.criticality.upper()}[/{crit_color}]",
            "[green]YES[/green]" if r.documented else "[red]NO[/red]",
            f"[{risk_color}]{r.risk_level}[/{risk_color}]",
        )

    console.print(table)

    # Summary stats
    total = len(results)
    orphaned = [r for r in results if r.owner is None]
    no_backup = [r for r in results if r.backup_owner is None]
    critical_risk = [r for r in results if r.risk_level == "CRITICAL"]
    high_risk = [r for r in results if r.risk_level == "HIGH"]

    console.print(Panel(
        f"[bold]Total Agents:[/bold] {total}\n"
        f"[bold red]Orphaned (no owner):[/bold red] {len(orphaned)}\n"
        f"[bold yellow]No Backup Owner:[/bold yellow] {len(no_backup)}\n"
        f"[bold red]CRITICAL Risk:[/bold red] {len(critical_risk)}\n"
        f"[bold yellow]HIGH Risk:[/bold yellow] {len(high_risk)}",
        title="[bold]Ownership Summary[/bold]",
        box=box.ROUNDED
    ))

    # Owner concentration
    owner_map: dict[str, list[str]] = {}
    for r in results:
        key = r.owner or "UNOWNED"
        owner_map.setdefault(key, []).append(r.agent_name)

    console.print("\n[bold cyan]Owner Concentration:[/bold cyan]")
    for owner, agents in sorted(owner_map.items(), key=lambda x: -len(x[1])):
        color = "red" if len(agents) >= 4 else "yellow" if len(agents) >= 2 else "green"
        console.print(f"  [{color}]{owner}[/{color}] owns {len(agents)} agent(s): {', '.join(agents)}")

    # Orphaned agents detail
    if orphaned:
        console.print("\n[bold red]Orphaned Agents (No Owner):[/bold red]")
        for r in orphaned:
            console.print(f"  - {r.agent_name} [{r.criticality.upper()}] — {', '.join(r.risk_reasons)}")

    return results


if __name__ == "__main__":
    results = run_ownership_intelligence("data/sunrise_care.json")
    with open("data/sunrise_care.json") as f:
        company = json.load(f)["company"]
    display_ownership_report(results, company)
