import json
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


@dataclass
class ContinuityNode:
    asset_id: str
    asset_name: str
    asset_type: str        # 'Agent', 'Workflow', 'Tool'
    department: str
    criticality: str
    continuity_score: int   # 0-100, likelihood the asset survives a major disruption
    status: str             # SURVIVES / DEGRADED / FAILS / LOST
    weaknesses: list[str]


@dataclass
class ContinuityPlan:
    asset_name: str
    asset_type: str
    priority: str           # CRITICAL / HIGH
    actions: list[str]


def _status_from_score(score: int) -> str:
    if score >= 75:
        return "SURVIVES"
    if score >= 50:
        return "DEGRADED"
    if score >= 25:
        return "FAILS"
    return "LOST"


def _clamp(score: int) -> int:
    return max(0, min(100, score))


def score_owned_asset(name: str, asset_id: str, asset_type: str, department: str,
                      owner, backup, criticality: str, documented: bool) -> ContinuityNode:
    """Continuity scoring for assets that depend on a human owner (agents, workflows)."""
    score = 100
    weaknesses = []

    if owner is None:
        score -= 35
        weaknesses.append("No owner — nobody accountable to recover it")
    if backup is None:
        score -= 35
        weaknesses.append("No backup owner — single human dependency")
    if not documented:
        score -= 25
        weaknesses.append("Undocumented — no runbook to rebuild from")
    if criticality == "critical":
        score -= 5
    elif criticality == "high":
        score -= 3

    score = _clamp(score)
    return ContinuityNode(
        asset_id=asset_id,
        asset_name=name,
        asset_type=asset_type,
        department=department,
        criticality=criticality,
        continuity_score=score,
        status=_status_from_score(score),
        weaknesses=weaknesses,
    )


def score_tool_asset(tool: dict) -> ContinuityNode:
    score = 100
    weaknesses = []

    if tool.get("backup_tool") is None:
        score -= 35
        weaknesses.append("No fallback tool — hard dependency if it goes offline")
    if not tool.get("documented", False):
        score -= 25
        weaknesses.append("No usage policy / documentation")
    if tool.get("access_owner") is None:
        score -= 20
        weaknesses.append("No access owner — access cannot be re-provisioned")
    crit = tool.get("criticality", "medium")
    if crit == "critical":
        score -= 5
    elif crit == "high":
        score -= 3

    depts = tool.get("departments", [])
    department = ", ".join(depts[:2]) + ("…" if len(depts) > 2 else "") if depts else "-"

    score = _clamp(score)
    return ContinuityNode(
        asset_id=tool["id"],
        asset_name=tool["name"],
        asset_type="Tool",
        department=department,
        criticality=crit,
        continuity_score=score,
        status=_status_from_score(score),
        weaknesses=weaknesses,
    )


def build_continuity_plan(node: ContinuityNode) -> ContinuityPlan:
    actions = []
    for w in node.weaknesses:
        if "No owner" in w:
            actions.append(f"Assign an accountable owner to {node.asset_name}")
        elif "No backup" in w or "single human" in w:
            actions.append(f"Name a backup owner for {node.asset_name}")
        elif "Undocumented" in w or "documentation" in w or "runbook" in w:
            actions.append(f"Document {node.asset_name} and store a recovery runbook")
        elif "fallback tool" in w:
            actions.append(f"Select a fallback alternative for {node.asset_name}")
        elif "access owner" in w:
            actions.append(f"Assign an access owner for {node.asset_name}")
    if not actions:
        actions.append(f"Maintain current continuity controls for {node.asset_name}")
    priority = "CRITICAL" if node.criticality == "critical" else "HIGH"
    return ContinuityPlan(
        asset_name=node.asset_name,
        asset_type=node.asset_type,
        priority=priority,
        actions=actions,
    )


def run_continuity_intelligence(data_path: str):
    """Scores every asset for its ability to survive a major disruption,
    identifies what must be protected, and produces continuity plans.

    Returns (nodes, plans, org_continuity_score, dept_map).
    """
    with open(data_path) as f:
        data = json.load(f)

    nodes: list[ContinuityNode] = []

    for a in data.get("agents", []):
        nodes.append(score_owned_asset(
            name=a["name"], asset_id=a["id"], asset_type="Agent",
            department=a.get("department", "-"),
            owner=a.get("owner"), backup=a.get("backup_owner"),
            criticality=a.get("criticality", "medium"),
            documented=a.get("documented", False),
        ))

    for wf in data.get("workflows", []):
        nodes.append(score_owned_asset(
            name=wf["name"], asset_id=wf["id"], asset_type="Workflow",
            department=wf.get("department", "-"),
            owner=wf.get("owner"), backup=wf.get("backup_owner"),
            criticality=wf.get("criticality", "medium"),
            documented=wf.get("documented", False),
        ))

    for t in data.get("ai_tools", []):
        nodes.append(score_tool_asset(t))

    status_order = {"LOST": 0, "FAILS": 1, "DEGRADED": 2, "SURVIVES": 3}
    nodes.sort(key=lambda n: (status_order[n.status], n.continuity_score))

    # What must be protected: critical/high assets that do not survive
    must_protect = [
        n for n in nodes
        if n.criticality in ("critical", "high") and n.status in ("FAILS", "LOST")
    ]
    plans = [build_continuity_plan(n) for n in must_protect]

    org_score = round(sum(n.continuity_score for n in nodes) / len(nodes)) if nodes else 100

    # Continuity risk map by department
    dept_map: dict[str, list[ContinuityNode]] = {}
    for n in nodes:
        dept_map.setdefault(n.department, []).append(n)

    return nodes, plans, org_score, dept_map


def display_continuity_report(nodes, plans, org_score, dept_map, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 18 — ORGANIZATIONAL CONTINUITY INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    status_colors = {
        "SURVIVES": "green",
        "DEGRADED": "yellow",
        "FAILS": "bold red",
        "LOST": "red",
    }

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Asset", min_width=28)
    table.add_column("Type", justify="center", min_width=9)
    table.add_column("Dept", min_width=12)
    table.add_column("Criticality", justify="center", min_width=11)
    table.add_column("Score", justify="center", min_width=7)
    table.add_column("Continuity", justify="center", min_width=11)

    crit_colors = {"critical": "bold red", "high": "yellow", "medium": "cyan", "low": "green"}

    for n in nodes:
        s_color = status_colors[n.status]
        c_color = crit_colors.get(n.criticality, "white")
        table.add_row(
            n.asset_name,
            n.asset_type,
            n.department,
            f"[{c_color}]{n.criticality.upper()}[/{c_color}]",
            str(n.continuity_score),
            f"[{s_color}]{n.status}[/{s_color}]",
        )

    console.print(table)

    # Continuity Risk Map (by department)
    console.print(Panel("[bold]Continuity Risk Map — by Department[/bold]", box=box.SIMPLE))
    dept_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    dept_table.add_column("Department", min_width=14)
    dept_table.add_column("Assets", justify="center", min_width=7)
    dept_table.add_column("Avg Continuity", justify="center", min_width=14)
    dept_table.add_column("At Risk (Fails/Lost)", justify="center", min_width=20)

    for dept, dnodes in sorted(dept_map.items(), key=lambda kv: sum(n.continuity_score for n in kv[1]) / len(kv[1])):
        avg = round(sum(n.continuity_score for n in dnodes) / len(dnodes))
        at_risk = len([n for n in dnodes if n.status in ("FAILS", "LOST")])
        a_color = "green" if avg >= 75 else "yellow" if avg >= 50 else "red"
        dept_table.add_row(
            dept,
            str(len(dnodes)),
            f"[{a_color}]{avg}/100[/{a_color}]",
            f"[red]{at_risk}[/red]" if at_risk else "[green]0[/green]",
        )
    console.print(dept_table)

    # Continuity Plans for must-protect assets
    if plans:
        console.print("\n[bold red]Continuity Plans — Assets That Must Be Protected:[/bold red]")
        for p in plans:
            p_color = "bold red" if p.priority == "CRITICAL" else "yellow"
            console.print(f"\n  [{p_color}]► {p.asset_name}[/{p_color}] [dim]({p.asset_type} · {p.priority})[/dim]")
            for act in p.actions:
                console.print(f"    [dim]•[/dim] {act}")

    survives = [n for n in nodes if n.status == "SURVIVES"]
    degraded = [n for n in nodes if n.status == "DEGRADED"]
    fails = [n for n in nodes if n.status == "FAILS"]
    lost = [n for n in nodes if n.status == "LOST"]

    if org_score >= 70:
        h_color, h_label = "green", "RESILIENT"
    elif org_score >= 45:
        h_color, h_label = "yellow", "AT RISK"
    else:
        h_color, h_label = "red", "FRAGILE"

    console.print(Panel(
        f"[bold]Total Assets Assessed:[/bold] {len(nodes)}\n"
        f"[bold green]Survives:[/bold green] {len(survives)}   "
        f"[bold yellow]Degraded:[/bold yellow] {len(degraded)}   "
        f"[bold red]Fails:[/bold red] {len(fails)}   "
        f"[bold red]Lost:[/bold red] {len(lost)}\n"
        f"[bold]Assets That Must Be Protected:[/bold] {len(plans)}\n"
        f"\n[bold]Organizational Continuity Score:[/bold] "
        f"[{h_color}]{org_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Continuity Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/company.json") as f:
        company = json.load(f)["company"]
    nodes, plans, org_score, dept_map = run_continuity_intelligence("data/company.json")
    display_continuity_report(nodes, plans, org_score, dept_map, company)
