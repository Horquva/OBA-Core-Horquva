import io
import json
import sys
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from modules.ownership_intelligence import OwnershipResult, run_ownership_intelligence
from modules.dependency_intelligence import DependencyResult, run_dependency_intelligence

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class RiskResult:
    agent_id: str
    agent_name: str
    owner: str | None
    ownership_risk: str
    is_spof: bool
    cascade_count: int
    combined_risk_score: int
    final_risk_level: str
    risk_factors: list[str]


def calculate_combined_risk(
    ownership: OwnershipResult,
    dependency: DependencyResult,
) -> tuple[int, str, list[str]]:
    score = 0
    factors = []

    ownership_weight = {"CRITICAL": 60, "HIGH": 40, "MEDIUM": 20, "LOW": 5}
    score += ownership_weight[ownership.risk_level]
    factors.append(f"Ownership risk: {ownership.risk_level}")

    if ownership.owner is None:
        score += 20
        factors.append("Orphaned agent — no owner assigned")

    if ownership.backup_owner is None and ownership.owner is not None:
        score += 15
        factors.append("No backup owner")

    if not ownership.documented:
        score += 10
        factors.append("Not documented")

    if dependency.is_single_point_of_failure:
        score += 30
        factors.append("Single Point of Failure (SPOF)")

    cascade = len(dependency.cascade_victims)
    if cascade >= 3:
        score += 20
        factors.append(f"High cascade impact: {cascade} agents at risk")
    elif cascade >= 1:
        score += 10
        factors.append(f"Cascade impact: {cascade} agent(s) at risk")

    criticality_bonus = {"critical": 15, "high": 10, "medium": 5, "low": 0}
    score += criticality_bonus.get(ownership.criticality, 0)

    if score >= 90:
        level = "CRITICAL"
    elif score >= 60:
        level = "HIGH"
    elif score >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    return score, level, factors


def calculate_health_score(results: list[RiskResult]) -> int:
    if not results:
        return 100
    total_score = sum(r.combined_risk_score for r in results)
    max_possible = len(results) * 170
    risk_ratio = total_score / max_possible
    health = int((1 - risk_ratio) * 100)
    return max(0, min(100, health))


def run_risk_intelligence(data_path: str) -> tuple[list[RiskResult], int]:
    ownership_results = run_ownership_intelligence(data_path)
    dependency_results = run_dependency_intelligence(data_path)

    ownership_map = {r.agent_id: r for r in ownership_results}
    dependency_map = {r.agent_id: r for r in dependency_results}

    results = []
    for agent_id in ownership_map:
        own = ownership_map[agent_id]
        dep = dependency_map[agent_id]
        score, level, factors = calculate_combined_risk(own, dep)

        results.append(RiskResult(
            agent_id=agent_id,
            agent_name=own.agent_name,
            owner=own.owner,
            ownership_risk=own.risk_level,
            is_spof=dep.is_single_point_of_failure,
            cascade_count=len(dep.cascade_victims),
            combined_risk_score=score,
            final_risk_level=level,
            risk_factors=factors,
        ))

    tier_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    results.sort(key=lambda r: (tier_order[r.final_risk_level], -r.combined_risk_score))

    health_score = calculate_health_score(results)
    return results, health_score


def display_risk_report(results: list[RiskResult], health_score: int, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 03 — RISK INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Agent", style="white", min_width=28)
    table.add_column("Owner", style="cyan", min_width=10)
    table.add_column("Ownership Risk", justify="center", min_width=14)
    table.add_column("SPOF", justify="center", min_width=6)
    table.add_column("Cascade", justify="center", min_width=8)
    table.add_column("Score", justify="center", min_width=7)
    table.add_column("FINAL RISK", justify="center", min_width=12)

    risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}

    for r in results:
        color = risk_colors[r.final_risk_level]
        spof_text = "[bold red]YES[/bold red]" if r.is_spof else "[green]NO[/green]"
        c_color = "red" if r.cascade_count >= 3 else "yellow" if r.cascade_count >= 1 else "green"
        table.add_row(
            r.agent_name,
            r.owner or "[red]NONE[/red]",
            f"[{risk_colors[r.ownership_risk]}]{r.ownership_risk}[/{risk_colors[r.ownership_risk]}]",
            spof_text,
            f"[{c_color}]{r.cascade_count}[/{c_color}]",
            str(r.combined_risk_score),
            f"[{color}]{r.final_risk_level}[/{color}]",
        )

    console.print(table)

    critical = [r for r in results if r.final_risk_level == "CRITICAL"]
    if critical:
        console.print("\n[bold red]CRITICAL Risk Breakdown:[/bold red]")
        for r in critical:
            console.print(f"\n  [bold red]► {r.agent_name}[/bold red] (Score: {r.combined_risk_score})")
            for factor in r.risk_factors:
                console.print(f"    [dim]•[/dim] {factor}")

    if health_score >= 70:
        h_color, h_label = "green", "HEALTHY"
    elif health_score >= 45:
        h_color, h_label = "yellow", "AT RISK"
    else:
        h_color, h_label = "red", "CRITICAL"

    total = len(results)
    critical_count = len([r for r in results if r.final_risk_level == "CRITICAL"])
    high_count = len([r for r in results if r.final_risk_level == "HIGH"])
    spof_count = len([r for r in results if r.is_spof])

    console.print(Panel(
        f"[bold]Total Agents Analyzed:[/bold] {total}\n"
        f"[bold red]CRITICAL Risk:[/bold red] {critical_count}\n"
        f"[bold yellow]HIGH Risk:[/bold yellow] {high_count}\n"
        f"[bold red]Single Points of Failure:[/bold red] {spof_count}\n"
        f"\n[bold]Organizational Health Score:[/bold] "
        f"[{h_color}]{health_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Risk Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        company = json.load(f)["company"]
    results, health_score = run_risk_intelligence("data/sunrise_care.json")
    display_risk_report(results, health_score, company)