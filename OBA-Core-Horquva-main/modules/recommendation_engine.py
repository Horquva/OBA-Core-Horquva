import io
import json
import sys
from dataclasses import dataclass
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from modules.risk_intelligence import RiskResult, run_risk_intelligence

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class Recommendation:
    priority: int
    risk_level: str
    agent_name: str
    action: str
    reason: str
    impact: str


def generate_recommendations(results: list[RiskResult], data: dict) -> list[Recommendation]:
    recommendations = []
    priority = 1

    owner_agents: dict[str, list[str]] = {}
    for r in results:
        key = r.owner or "UNOWNED"
        owner_agents.setdefault(key, []).append(r.agent_name)

    all_owners = set(a["owner"] for a in data["agents"] if a["owner"])
    processed_owners_concentration = set()
    processed_agents_backup = set()

    for r in results:
        if r.final_risk_level == "CRITICAL":

            # Orphaned agent
            if r.owner is None:
                recommendations.append(Recommendation(
                    priority=priority,
                    risk_level="CRITICAL",
                    agent_name=r.agent_name,
                    action=f"Assign an owner to '{r.agent_name}' immediately",
                    reason="This agent has no owner — completely unmanaged (orphaned)",
                    impact="Prevents total loss of control over a critical system"
                ))
                priority += 1

            # Owner concentration
            elif r.owner and r.owner not in processed_owners_concentration:
                owned_count = len(owner_agents.get(r.owner, []))
                if owned_count >= 4:
                    others = [o for o in all_owners if o != r.owner]
                    redistribute_to = ", ".join(others[:2]) if others else "another team member"
                    recommendations.append(Recommendation(
                        priority=priority,
                        risk_level="CRITICAL",
                        agent_name=f"All of {r.owner}'s agents",
                        action=f"Redistribute {r.owner}'s {owned_count} agents among {redistribute_to}",
                        reason=f"{r.owner} is a single point of human failure — owns {owned_count} agents with no backups",
                        impact="Eliminates critical single-owner dependency across the organization"
                    ))
                    priority += 1
                    processed_owners_concentration.add(r.owner)

            # SPOF
            if r.is_spof:
                recommendations.append(Recommendation(
                    priority=priority,
                    risk_level="CRITICAL",
                    agent_name=r.agent_name,
                    action=f"Create a redundant backup system for '{r.agent_name}'",
                    reason=f"This is a Single Point of Failure — {r.cascade_count} agents break if it goes down",
                    impact=f"Protects {r.cascade_count} downstream agents from cascading failure"
                ))
                priority += 1

            # No backup owner
            if r.owner and r.agent_id not in processed_agents_backup:
                recommendations.append(Recommendation(
                    priority=priority,
                    risk_level="CRITICAL",
                    agent_name=r.agent_name,
                    action=f"Assign a backup owner for '{r.agent_name}'",
                    reason="No backup owner — zero continuity if primary owner is unavailable",
                    impact="Ensures agent stays managed during owner absence or departure"
                ))
                priority += 1
                processed_agents_backup.add(r.agent_id)

        elif r.final_risk_level == "HIGH":

            if r.owner is None:
                recommendations.append(Recommendation(
                    priority=priority,
                    risk_level="HIGH",
                    agent_name=r.agent_name,
                    action=f"Assign an owner to '{r.agent_name}' within 48 hours",
                    reason="High-criticality agent with no owner is a governance gap",
                    impact="Brings the agent under proper management and accountability"
                ))
                priority += 1

            if r.cascade_count >= 2:
                recommendations.append(Recommendation(
                    priority=priority,
                    risk_level="HIGH",
                    agent_name=r.agent_name,
                    action=f"Document all workflows connected to '{r.agent_name}'",
                    reason=f"Undocumented high-impact agent with {r.cascade_count} downstream dependencies",
                    impact="Enables faster recovery and knowledge transfer during incidents"
                ))
                priority += 1

    # Universal recommendations
    recommendations.append(Recommendation(
        priority=priority,
        risk_level="MEDIUM",
        agent_name="All Agents",
        action="Set up monthly knowledge-sharing sessions between all owners",
        reason="Owner knowledge is siloed — no cross-training exists across teams",
        impact="Builds organizational resilience and reduces single-person dependency"
    ))
    priority += 1

    recommendations.append(Recommendation(
        priority=priority,
        risk_level="MEDIUM",
        agent_name="All Agents",
        action="Create a centralized agent registry with owners, backups, and dependencies",
        reason="9 of 15 agents currently lack backup owners and proper documentation",
        impact="Gives leadership full visibility into AI workforce health at all times"
    ))

    return recommendations


def display_recommendation_report(
    recommendations: list[Recommendation],
    results: list[RiskResult],
    health_score: int,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 04 — RECOMMENDATION ENGINE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("#", style="dim", min_width=3)
    table.add_column("Priority", justify="center", min_width=10)
    table.add_column("Agent / Scope", style="white", min_width=24)
    table.add_column("Action Required", style="cyan", min_width=42)
    table.add_column("Expected Impact", style="green", min_width=36)

    for rec in recommendations:
        color = risk_colors.get(rec.risk_level, "white")
        table.add_row(
            str(rec.priority),
            f"[{color}]{rec.risk_level}[/{color}]",
            rec.agent_name,
            rec.action,
            rec.impact,
        )

    console.print(table)

    console.print("\n[bold red]⚡ TOP 5 MOST URGENT ACTIONS:[/bold red]\n")
    for i, rec in enumerate(recommendations[:5], 1):
        color = risk_colors.get(rec.risk_level, "white")
        console.print(f"  [bold]{i}.[/bold] [{color}][{rec.risk_level}][/{color}] {rec.action}")
        console.print(f"     [dim]Why: {rec.reason}[/dim]\n")

    critical_count = len([r for r in results if r.final_risk_level == "CRITICAL"])
    high_count = len([r for r in results if r.final_risk_level == "HIGH"])
    spof_count = len([r for r in results if r.is_spof])

    if health_score >= 70:
        h_color, h_label = "green", "HEALTHY"
    elif health_score >= 45:
        h_color, h_label = "yellow", "AT RISK"
    else:
        h_color, h_label = "red", "CRITICAL"

    console.print(Panel(
        f"[bold]15 agents analyzed[/bold] across {company}\n"
        f"[bold red]Robert owns 5 agents — ZERO backups → CRITICAL[/bold red]\n"
        f"[bold red]{spof_count} Single Points of Failure identified[/bold red]\n"
        f"[bold red]{critical_count} agents at CRITICAL risk[/bold red]\n"
        f"[bold yellow]{high_count} agents at HIGH risk[/bold yellow]\n"
        f"[bold]If Robert leaves → 5 agents immediately unmanaged[/bold]\n\n"
        f"[bold]Organizational Health Score:[/bold] [{h_color}]{health_score}/100 — {h_label}[/{h_color}]\n\n"
        f"[bold cyan]{len(recommendations)} actionable recommendations generated[/bold cyan]",
        title="[bold]DEMO SUMMARY — What Taha Sees[/bold]",
        box=box.HEAVY,
        border_style="cyan",
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    results, health_score = run_risk_intelligence("data/sunrise_care.json")
    recommendations = generate_recommendations(results, data)
    display_recommendation_report(recommendations, results, health_score, data["company"])