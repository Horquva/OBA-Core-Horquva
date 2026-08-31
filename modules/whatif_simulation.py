import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from modules.risk_intelligence import RiskResult, run_risk_intelligence
from modules.dependency_intelligence import run_dependency_intelligence, build_graph

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class SimulationScenario:
    scenario_type: str          # "person_leaves" | "agent_fails"
    subject: str                # person name or agent name
    affected_agents: list[str]
    health_before: int
    health_after: int
    health_delta: int
    risk_changes: list[dict]    # [{agent, before, after}]
    summary: str


def _recalculate_health(results: list[RiskResult], overrides: dict) -> int:
    """
    Recalculate health score after applying overrides.
    overrides: {agent_id: new_combined_risk_score}
    """
    total_score = 0
    for r in results:
        score = overrides.get(r.agent_id, r.combined_risk_score)
        total_score += score
    max_possible = len(results) * 170
    risk_ratio = total_score / max_possible
    health = int((1 - risk_ratio) * 100)
    return max(0, min(100, health))


def _risk_label(score: int) -> str:
    if score >= 90:
        return "CRITICAL"
    elif score >= 60:
        return "HIGH"
    elif score >= 30:
        return "MEDIUM"
    else:
        return "LOW"


def simulate_person_leaves(
    person_name: str,
    results: list[RiskResult],
    health_before: int,
) -> SimulationScenario:
    """
    Simulate: What if <person_name> leaves the organization?
    - All agents owned by this person become orphaned (+20 score, +15 if no backup already)
    - Agents where they are backup owner lose their backup (+15 score) [not in current data but logic included]
    """
    overrides = {}
    affected_agents = []
    risk_changes = []

    for r in results:
        if r.owner == person_name:
            # Agent becomes orphaned — add orphan penalty + no-backup penalty
            new_score = r.combined_risk_score + 20 + 15  # orphan + no-backup
            new_score = min(new_score, 170)
            overrides[r.agent_id] = new_score
            affected_agents.append(r.agent_name)
            risk_changes.append({
                "agent": r.agent_name,
                "before_score": r.combined_risk_score,
                "after_score": new_score,
                "before_level": r.final_risk_level,
                "after_level": _risk_label(new_score),
            })

    health_after = _recalculate_health(results, overrides)
    health_delta = health_after - health_before

    owned_count = len(affected_agents)
    summary = (
        f"If {person_name} leaves: {owned_count} agent(s) become immediately unmanaged. "
        f"Health Score drops from {health_before} → {health_after} "
        f"({abs(health_delta)} point{'s' if abs(health_delta) != 1 else ''} {'drop' if health_delta < 0 else 'gain'})."
    )

    return SimulationScenario(
        scenario_type="person_leaves",
        subject=person_name,
        affected_agents=affected_agents,
        health_before=health_before,
        health_after=health_after,
        health_delta=health_delta,
        risk_changes=risk_changes,
        summary=summary,
    )


def simulate_agent_fails(
    agent_name: str,
    results: list[RiskResult],
    data: dict,
    health_before: int,
) -> SimulationScenario:
    """
    Simulate: What if <agent_name> fails?
    - The agent itself gets max score (170)
    - All cascade victims get +30 score (high downstream disruption)
    """
    from modules.dependency_intelligence import get_cascade_victims

    _, downstream, _ = build_graph(data)

    agents_by_name = {a["name"]: a["id"] for a in data["agents"]}
    agents_by_id = {a["id"]: a["name"] for a in data["agents"]}

    target_id = agents_by_name.get(agent_name)
    if not target_id:
        return None

    cascade_ids = get_cascade_victims(target_id, downstream)
    cascade_names = [agents_by_id[aid] for aid in cascade_ids if aid in agents_by_id]

    overrides = {}
    risk_changes = []
    affected_agents = [agent_name] + cascade_names

    for r in results:
        if r.agent_name == agent_name:
            new_score = 170  # total failure
            overrides[r.agent_id] = new_score
            risk_changes.append({
                "agent": r.agent_name,
                "before_score": r.combined_risk_score,
                "after_score": new_score,
                "before_level": r.final_risk_level,
                "after_level": "CRITICAL",
            })
        elif r.agent_name in cascade_names:
            new_score = min(r.combined_risk_score + 30, 170)
            overrides[r.agent_id] = new_score
            risk_changes.append({
                "agent": r.agent_name,
                "before_score": r.combined_risk_score,
                "after_score": new_score,
                "before_level": r.final_risk_level,
                "after_level": _risk_label(new_score),
            })

    health_after = _recalculate_health(results, overrides)
    health_delta = health_after - health_before

    summary = (
        f"If {agent_name} fails: {len(cascade_names)} downstream agent(s) are disrupted. "
        f"Health Score drops from {health_before} → {health_after} "
        f"({abs(health_delta)} point{'s' if abs(health_delta) != 1 else ''} {'drop' if health_delta < 0 else 'gain'})."
    )

    return SimulationScenario(
        scenario_type="agent_fails",
        subject=agent_name,
        affected_agents=affected_agents,
        health_before=health_before,
        health_after=health_after,
        health_delta=health_delta,
        risk_changes=risk_changes,
        summary=summary,
    )


def run_whatif_simulation(data_path: str) -> tuple[list[SimulationScenario], int]:
    """
    Run all pre-defined What-If scenarios relevant to the loaded data.
    Returns list of SimulationScenario objects and the baseline health score.
    """
    with open(data_path) as f:
        data = json.load(f)

    results, health_score = run_risk_intelligence(data_path)

    # Collect all unique owners to simulate person-leaves scenarios
    owners = list({r.owner for r in results if r.owner is not None})
    owners.sort()

    # Collect all agents for agent-fails scenarios (pick high/critical only)
    critical_agents = [
        r.agent_name for r in results
        if r.final_risk_level in ("CRITICAL", "HIGH") or r.is_spof
    ]

    scenarios = []

    for person in owners:
        scenario = simulate_person_leaves(person, results, health_score)
        scenarios.append(scenario)

    for agent_name in critical_agents:
        scenario = simulate_agent_fails(agent_name, results, data, health_score)
        if scenario:
            scenarios.append(scenario)

    # Sort by most negative health delta first (worst scenarios first)
    scenarios.sort(key=lambda s: s.health_delta)

    return scenarios, health_score


def display_whatif_report(scenarios: list[SimulationScenario], health_before: int, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 05 — WHAT-IF SIMULATION ENGINE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    console.print(f"\n[bold]Baseline Health Score:[/bold] [green]{health_before}/100[/green]\n")
    console.print("[dim]Simulating scenarios — each shows how Health Score changes if the event occurs.[/dim]\n")

    # ── Person Leaves Scenarios ──
    person_scenarios = [s for s in scenarios if s.scenario_type == "person_leaves"]
    if person_scenarios:
        console.print(Panel("[bold yellow]SCENARIO TYPE A — Person Leaves[/bold yellow]", box=box.SIMPLE))

        table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
        table.add_column("Person", style="white", min_width=12)
        table.add_column("Agents Orphaned", justify="center", min_width=16)
        table.add_column("Health Before", justify="center", min_width=14)
        table.add_column("Health After", justify="center", min_width=13)
        table.add_column("Δ Impact", justify="center", min_width=10)
        table.add_column("Status", justify="center", min_width=14)

        for s in person_scenarios:
            delta = s.health_delta
            delta_color = "red" if delta < -10 else "yellow" if delta < 0 else "green"
            after_color = "red" if s.health_after < 45 else "yellow" if s.health_after < 70 else "green"
            status = "CRITICAL DROP" if delta < -15 else "HIGH RISK" if delta < -5 else "MODERATE"
            status_color = "bold red" if "CRITICAL" in status else "bold yellow" if "HIGH" in status else "yellow"

            table.add_row(
                f"[bold]{s.subject}[/bold]",
                str(len(s.affected_agents)),
                f"[green]{s.health_before}/100[/green]",
                f"[{after_color}]{s.health_after}/100[/{after_color}]",
                f"[{delta_color}]{delta:+d}[/{delta_color}]",
                f"[{status_color}]{status}[/{status_color}]",
            )

        console.print(table)

        # Detailed breakdown for worst person scenario
        worst = person_scenarios[0]
        console.print(f"\n[bold red]⚠  Worst Case — If {worst.subject} Leaves:[/bold red]")
        for change in worst.risk_changes:
            before_color = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}.get(change["before_level"], "white")
            after_color = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}.get(change["after_level"], "white")
            arrow = " → "
            console.print(
                f"  [white]{change['agent']}[/white]: "
                f"[{before_color}]{change['before_level']}[/{before_color}] (score {change['before_score']})"
                f"{arrow}"
                f"[{after_color}]{change['after_level']}[/{after_color}] (score {change['after_score']})"
            )

    # ── Agent Fails Scenarios ──
    agent_scenarios = [s for s in scenarios if s.scenario_type == "agent_fails"]
    if agent_scenarios:
        console.print(f"\n")
        console.print(Panel("[bold yellow]SCENARIO TYPE B — Agent Fails[/bold yellow]", box=box.SIMPLE))

        table2 = Table(box=box.SIMPLE_HEAVY, show_lines=True)
        table2.add_column("Agent Fails", style="white", min_width=28)
        table2.add_column("Cascade Victims", justify="center", min_width=15)
        table2.add_column("Health Before", justify="center", min_width=14)
        table2.add_column("Health After", justify="center", min_width=13)
        table2.add_column("Δ Impact", justify="center", min_width=10)

        for s in agent_scenarios:
            delta = s.health_delta
            delta_color = "red" if delta < -10 else "yellow" if delta < 0 else "green"
            after_color = "red" if s.health_after < 45 else "yellow" if s.health_after < 70 else "green"
            cascade_count = len(s.affected_agents) - 1  # exclude the agent itself

            table2.add_row(
                s.subject,
                str(cascade_count),
                f"[green]{s.health_before}/100[/green]",
                f"[{after_color}]{s.health_after}/100[/{after_color}]",
                f"[{delta_color}]{delta:+d}[/{delta_color}]",
            )

        console.print(table2)

    # ── Summary Panel ──
    worst_overall = scenarios[0] if scenarios else None
    if worst_overall:
        w_after_color = "red" if worst_overall.health_after < 45 else "yellow" if worst_overall.health_after < 70 else "green"

        console.print(Panel(
            f"[bold]Baseline Health Score:[/bold] [green]{health_before}/100[/green]\n"
            f"[bold red]Worst Scenario:[/bold red] {worst_overall.subject} "
            f"({'leaves' if worst_overall.scenario_type == 'person_leaves' else 'fails'})\n"
            f"[bold]Health Would Drop To:[/bold] [{w_after_color}]{worst_overall.health_after}/100[/{w_after_color}] "
            f"[red]({worst_overall.health_delta:+d} points)[/red]\n"
            f"[bold]Agents Affected:[/bold] {len(worst_overall.affected_agents)}\n\n"
            f"[dim]{worst_overall.summary}[/dim]",
            title="[bold]Simulation Summary[/bold]",
            box=box.ROUNDED
        ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    scenarios, health_score = run_whatif_simulation("data/sunrise_care.json")
    display_whatif_report(scenarios, health_score, data["company"])