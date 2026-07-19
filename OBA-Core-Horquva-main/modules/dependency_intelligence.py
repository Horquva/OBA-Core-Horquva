import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich import box

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class DependencyResult:
    agent_id: str
    agent_name: str
    depends_on: list[str]           # agents this one needs
    depended_by: list[str]          # agents that need this one
    cascade_victims: list[str]      # what breaks if this agent fails
    is_single_point_of_failure: bool
    upstream_depth: int             # how deep in the chain


def build_graph(data: dict) -> tuple[dict, dict, dict]:
    agents = {a["id"]: a for a in data["agents"]}

    # adjacency: who does each agent feed into
    downstream: dict[str, list[str]] = {a["id"]: [] for a in data["agents"]}
    upstream: dict[str, list[str]] = {a["id"]: [] for a in data["agents"]}

    for dep in data["dependencies"]:
        downstream[dep["from"]].append(dep["to"])
        upstream[dep["to"]].append(dep["from"])

    return agents, downstream, upstream


def get_cascade_victims(agent_id: str, downstream: dict, visited: set = None) -> list[str]:
    if visited is None:
        visited = set()
    victims = []
    for child in downstream.get(agent_id, []):
        if child not in visited:
            visited.add(child)
            victims.append(child)
            victims.extend(get_cascade_victims(child, downstream, visited))
    return victims


def upstream_depth(agent_id: str, upstream: dict, visited: set = None) -> int:
    if visited is None:
        visited = set()
    if not upstream.get(agent_id):
        return 0
    max_depth = 0
    for parent in upstream[agent_id]:
        if parent not in visited:
            visited.add(parent)
            depth = 1 + upstream_depth(parent, upstream, visited)
            max_depth = max(max_depth, depth)
    return max_depth


def run_dependency_intelligence(data_path: str) -> list[DependencyResult]:
    with open(data_path) as f:
        data = json.load(f)

    agents, downstream, upstream = build_graph(data)
    results = []

    for agent_id, agent in agents.items():
        cascade = get_cascade_victims(agent_id, downstream)
        spof = len(downstream[agent_id]) > 0 and len(upstream[agent_id]) == 0 and len(cascade) >= 2

        results.append(DependencyResult(
            agent_id=agent_id,
            agent_name=agent["name"],
            depends_on=[agents[a]["name"] for a in upstream[agent_id]],
            depended_by=[agents[a]["name"] for a in downstream[agent_id]],
            cascade_victims=[agents[a]["name"] for a in cascade],
            is_single_point_of_failure=spof,
            upstream_depth=upstream_depth(agent_id, upstream),
        ))

    return results


def display_dependency_report(results: list[DependencyResult], data: dict):
    company = data["company"]
    agents_by_id = {a["id"]: a for a in data["agents"]}
    agents_by_name = {a["name"]: a for a in data["agents"]}

    console.print(Panel(
        f"[bold cyan]MODULE 02 — DEPENDENCY INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    # Dependency table
    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Agent", style="white", min_width=28)
    table.add_column("Depends On", style="cyan", min_width=22)
    table.add_column("Feeds Into", style="blue", min_width=22)
    table.add_column("Cascade Impact", justify="center", min_width=14)
    table.add_column("SPOF", justify="center", min_width=6)

    for r in results:
        spof_text = "[bold red]YES[/bold red]" if r.is_single_point_of_failure else "[green]NO[/green]"
        cascade_count = len(r.cascade_victims)
        cascade_color = "red" if cascade_count >= 3 else "yellow" if cascade_count >= 1 else "green"
        table.add_row(
            r.agent_name,
            "\n".join(r.depends_on) if r.depends_on else "[dim]none[/dim]",
            "\n".join(r.depended_by) if r.depended_by else "[dim]none[/dim]",
            f"[{cascade_color}]{cascade_count} agent(s)[/{cascade_color}]",
            spof_text,
        )

    console.print(table)

    # Cascade failure simulation
    console.print("\n[bold red]Cascade Failure Simulation:[/bold red]")
    console.print("[dim]If this agent fails, the following agents break downstream:[/dim]\n")

    sorted_by_impact = sorted(results, key=lambda r: -len(r.cascade_victims))
    for r in sorted_by_impact[:7]:  # top 7 highest impact
        if r.cascade_victims:
            color = "red" if len(r.cascade_victims) >= 3 else "yellow"
            console.print(
                f"  [{color}]FAIL: {r.agent_name}[/{color}] --> "
                f"[{color}]{len(r.cascade_victims)} broken:[/{color}] "
                + ", ".join(r.cascade_victims)
            )

    # Dependency chain tree for the main sales chain
    console.print("\n[bold cyan]Main Dependency Chain (Sales Flow):[/bold cyan]")
    tree = Tree("[bold]Lead Scoring Agent[/bold]")
    node1 = tree.add("[cyan]Lead Qualification Agent[/cyan]")
    node2 = node1.add("[cyan]CRM Sync Agent[/cyan]")
    node2.add("[yellow]Billing Agent[/yellow]")
    node2.add("[dim]<- Data Backup Agent monitors[/dim]")
    console.print(tree)

    # Summary
    total = len(results)
    spof_agents = [r for r in results if r.is_single_point_of_failure]
    isolated = [r for r in results if not r.depends_on and not r.depended_by]
    high_impact = [r for r in results if len(r.cascade_victims) >= 3]

    console.print(Panel(
        f"[bold]Total Agents:[/bold] {total}\n"
        f"[bold red]Single Points of Failure:[/bold red] {len(spof_agents)}\n"
        f"[bold red]High Cascade Impact (3+ downstream):[/bold red] {len(high_impact)}\n"
        f"[dim]Isolated (no deps):[/dim] {len(isolated)}",
        title="[bold]Dependency Summary[/bold]",
        box=box.ROUNDED
    ))

    if spof_agents:
        console.print("\n[bold red]Single Points of Failure:[/bold red]")
        for r in spof_agents:
            console.print(f"  - {r.agent_name} --> breaks {len(r.cascade_victims)} agents if it fails")


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    results = run_dependency_intelligence("data/sunrise_care.json")
    display_dependency_report(results, data)
