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
class ToolRisk:
    tool_id: str
    tool_name: str
    vendor: str
    category: str
    access_owner: str | None
    user_count: int
    department_count: int
    departments: list[str]
    agent_count: int
    workflow_count: int
    monthly_cost_usd: int
    criticality: str
    documented: bool
    has_backup: bool
    backup_tool: str | None
    risk_score: int
    risk_level: str
    risk_factors: list[str]


@dataclass
class ToolDependencyMap:
    tool_id: str
    tool_name: str
    dependent_agents: list[str]
    dependent_workflows: list[str]
    dependent_users: list[str]
    impact_if_lost: str


def _score_tool(tool: dict, data: dict) -> ToolRisk:
    score = 0
    factors = []

    criticality = tool.get("criticality", "low")
    crit_map = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    score += crit_map.get(criticality, 5)
    if criticality in ("critical", "high"):
        factors.append(f"High-criticality tool ({criticality.upper()})")

    if not tool.get("documented", False):
        score += 20
        factors.append("Undocumented — no usage policy or runbook")

    if not tool.get("backup_tool"):
        score += 25
        factors.append("No backup/alternative tool assigned")

    if not tool.get("access_owner"):
        score += 30
        factors.append("No access owner — unmanaged tool")

    user_count = len(tool.get("users", []))
    if user_count >= 6:
        score += 20
        factors.append(f"Org-wide dependency — {user_count} users")
    elif user_count >= 3:
        score += 10
        factors.append(f"Multi-user dependency — {user_count} users")

    dept_count = len(tool.get("departments", []))
    if dept_count >= 4:
        score += 15
        factors.append(f"Cross-departmental dependency — {dept_count} departments")

    agent_count = len(tool.get("agents_using", []))
    if agent_count >= 3:
        score += 15
        factors.append(f"Powers {agent_count} AI agents")
    elif agent_count >= 1:
        score += 8
        factors.append(f"Powers {agent_count} AI agent(s)")

    risk_level = (
        "CRITICAL" if score >= 90
        else "HIGH" if score >= 60
        else "MEDIUM" if score >= 30
        else "LOW"
    )

    agent_names = {a["id"]: a["name"] for a in data.get("agents", [])}
    agents_using_names = [agent_names.get(aid, aid) for aid in tool.get("agents_using", [])]
    dept_list = tool.get("departments", [])

    backup_name = None
    if tool.get("backup_tool"):
        tool_map = {t["id"]: t["name"] for t in data.get("ai_tools", [])}
        backup_name = tool_map.get(tool["backup_tool"], tool["backup_tool"])

    return ToolRisk(
        tool_id=tool["id"],
        tool_name=tool["name"],
        vendor=tool["vendor"],
        category=tool["category"],
        access_owner=tool.get("access_owner"),
        user_count=user_count,
        department_count=dept_count,
        departments=dept_list,
        agent_count=agent_count,
        workflow_count=len(tool.get("workflows", [])),
        monthly_cost_usd=tool.get("monthly_cost_usd", 0),
        criticality=criticality,
        documented=tool.get("documented", False),
        has_backup=bool(tool.get("backup_tool")),
        backup_tool=backup_name,
        risk_score=min(score, 170),
        risk_level=risk_level,
        risk_factors=factors,
    )


def build_dependency_maps(data: dict) -> list[ToolDependencyMap]:
    maps = []
    agent_names = {a["id"]: a["name"] for a in data.get("agents", [])}
    wf_names = {w["id"]: w["name"] for w in data.get("workflows", [])}

    for tool in data.get("ai_tools", []):
        dependent_agents = [agent_names.get(aid, aid) for aid in tool.get("agents_using", [])]
        dependent_workflows = [wf_names.get(wid, wid) for wid in tool.get("workflows", [])]
        dependent_users = tool.get("users", [])

        total_dependents = len(dependent_agents) + len(dependent_workflows) + len(dependent_users)
        if total_dependents >= 12:
            impact = "SEVERE — org-wide disruption"
        elif total_dependents >= 7:
            impact = "HIGH — multiple workflows break"
        elif total_dependents >= 3:
            impact = "MODERATE — partial disruption"
        else:
            impact = "LOW — contained impact"

        maps.append(ToolDependencyMap(
            tool_id=tool["id"],
            tool_name=tool["name"],
            dependent_agents=dependent_agents,
            dependent_workflows=dependent_workflows,
            dependent_users=dependent_users,
            impact_if_lost=impact,
        ))

    return maps


def run_ai_tool_intelligence(data_path: str) -> tuple[list[ToolRisk], list[ToolDependencyMap], dict]:
    with open(data_path) as f:
        data = json.load(f)

    tool_risks = [_score_tool(t, data) for t in data.get("ai_tools", [])]
    tool_risks.sort(key=lambda t: -t.risk_score)

    dep_maps = build_dependency_maps(data)

    # Department → tools mapping
    dept_tool_map: dict[str, list[str]] = {}
    for t in data.get("ai_tools", []):
        for dept in t.get("departments", []):
            dept_tool_map.setdefault(dept, []).append(t["name"])

    return tool_risks, dep_maps, dept_tool_map


def display_ai_tool_report(
    tool_risks: list[ToolRisk],
    dep_maps: list[ToolDependencyMap],
    dept_tool_map: dict,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 07 — AI TOOL INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    risk_colors = {
        "CRITICAL": "bold red",
        "HIGH": "bold yellow",
        "MEDIUM": "yellow",
        "LOW": "green",
    }

    # ── Tool Risk Overview Table ──
    console.print(Panel("[bold]AI Tool Risk Overview — All Tools[/bold]", box=box.SIMPLE))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Tool", style="white", min_width=18)
    table.add_column("Vendor", style="dim", min_width=12)
    table.add_column("Category", min_width=16)
    table.add_column("Owner", min_width=10)
    table.add_column("Users", justify="center", min_width=7)
    table.add_column("Depts", justify="center", min_width=7)
    table.add_column("Agents", justify="center", min_width=8)
    table.add_column("Documented", justify="center", min_width=12)
    table.add_column("Backup", justify="center", min_width=8)
    table.add_column("Cost/mo", justify="right", min_width=9)
    table.add_column("Risk", justify="center", min_width=10)

    for t in tool_risks:
        risk_color = risk_colors.get(t.risk_level, "white")
        doc_text = "[green]YES[/green]" if t.documented else "[red]NO[/red]"
        backup_text = "[green]YES[/green]" if t.has_backup else "[red]NO[/red]"
        owner_text = t.access_owner if t.access_owner else "[red]NONE[/red]"

        table.add_row(
            f"[bold]{t.tool_name}[/bold]",
            t.vendor,
            t.category,
            owner_text,
            str(t.user_count),
            str(t.department_count),
            str(t.agent_count),
            doc_text,
            backup_text,
            f"${t.monthly_cost_usd}",
            f"[{risk_color}]{t.risk_level}[/{risk_color}]",
        )

    console.print(table)

    # ── Risk Factor Breakdown ──
    console.print("\n[bold cyan]Risk Factor Breakdown — Why Each Tool Is Flagged:[/bold cyan]\n")
    for t in tool_risks:
        if not t.risk_factors:
            continue
        color = risk_colors.get(t.risk_level, "white")
        console.print(
            f"  [{color}]{t.tool_name}[/{color}] "
            f"[dim](score: {t.risk_score})[/dim]"
        )
        for factor in t.risk_factors:
            console.print(f"    [dim]•[/dim] {factor}")
        console.print()

    # ── Dependency Map ──
    console.print(Panel("[bold]Tool Dependency Map — What Breaks If a Tool Is Lost[/bold]", box=box.SIMPLE))

    dep_map_sorted = sorted(
        dep_maps,
        key=lambda d: -(len(d.dependent_agents) + len(d.dependent_workflows) + len(d.dependent_users))
    )

    for dm in dep_map_sorted:
        impact_color = (
            "bold red" if "SEVERE" in dm.impact_if_lost
            else "bold yellow" if "HIGH" in dm.impact_if_lost
            else "yellow" if "MODERATE" in dm.impact_if_lost
            else "green"
        )
        tree = Tree(
            f"[bold white]{dm.tool_name}[/bold white] "
            f"[dim]— Impact if lost: [{impact_color}]{dm.impact_if_lost}[/{impact_color}][/dim]"
        )
        if dm.dependent_agents:
            branch = tree.add("[yellow]AI Agents Powered[/yellow]")
            for a in dm.dependent_agents:
                branch.add(f"[dim]{a}[/dim]")
        if dm.dependent_workflows:
            branch = tree.add("[cyan]Workflows Dependent[/cyan]")
            for w in dm.dependent_workflows:
                branch.add(f"[dim]{w}[/dim]")
        if dm.dependent_users:
            branch = tree.add("[white]Users[/white]")
            for u in dm.dependent_users:
                branch.add(f"[dim]{u}[/dim]")
        console.print(tree)
        console.print()

    # ── Department Coverage ──
    console.print(Panel("[bold]Department to AI Tool Coverage[/bold]", box=box.SIMPLE))

    dept_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    dept_table.add_column("Department", style="white", min_width=16)
    dept_table.add_column("AI Tools In Use", min_width=46)
    dept_table.add_column("Tool Count", justify="center", min_width=12)

    for dept, tools in sorted(dept_tool_map.items()):
        count = len(tools)
        count_color = "green" if count >= 2 else "yellow"
        dept_table.add_row(
            dept,
            ", ".join(tools),
            f"[{count_color}]{count}[/{count_color}]",
        )

    console.print(dept_table)

    # ── Summary Panel ──
    critical = [t for t in tool_risks if t.risk_level == "CRITICAL"]
    high = [t for t in tool_risks if t.risk_level == "HIGH"]
    no_backup = [t for t in tool_risks if not t.has_backup]
    undocumented = [t for t in tool_risks if not t.documented]
    total_cost = sum(t.monthly_cost_usd for t in tool_risks)

    console.print(Panel(
        f"[bold]Total AI Tools Analyzed:[/bold] {len(tool_risks)}\n"
        f"[bold red]CRITICAL Risk Tools:[/bold red] {len(critical)}"
        + (f" ({', '.join(t.tool_name for t in critical)})" if critical else "") + "\n"
        f"[bold yellow]HIGH Risk Tools:[/bold yellow] {len(high)}"
        + (f" ({', '.join(t.tool_name for t in high)})" if high else "") + "\n"
        f"[bold red]Tools With No Backup:[/bold red] {len(no_backup)}\n"
        f"[bold yellow]Undocumented Tools:[/bold yellow] {len(undocumented)}\n"
        f"[bold]Total Monthly AI Tool Spend:[/bold] ${total_cost:,}\n"
        f"[bold]Departments Covered:[/bold] {len(dept_tool_map)}",
        title="[bold]AI Tool Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    tool_risks, dep_maps, dept_tool_map = run_ai_tool_intelligence("data/sunrise_care.json")
    display_ai_tool_report(tool_risks, dep_maps, dept_tool_map, data["company"])
