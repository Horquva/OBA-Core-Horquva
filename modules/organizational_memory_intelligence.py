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
class MemoryNode:
    node_id: str
    node_name: str
    node_type: str              # "agent" | "workflow" | "tool"
    owner: str | None
    documented: bool
    has_backup: bool
    criticality: str
    department: str
    memory_score: int           # 0-100: how well this knowledge is preserved
    memory_status: str          # "PRESERVED" | "AT RISK" | "VULNERABLE" | "LOST"
    continuity_threats: list[str]


@dataclass
class MemoryCarrier:
    person: str
    carries_count: int          # total assets they're sole carrier of
    assets: list[str]
    departments: list[str]
    continuity_risk: str        # CRITICAL / HIGH / MEDIUM / LOW
    knowledge_transfer_needed: list[str]


def _calculate_memory_score(asset: dict, asset_type: str, data: dict) -> tuple[int, str, list[str]]:
    """
    Memory score: how well is this knowledge preserved?
    100 = fully preserved, 0 = completely at risk
    """
    score = 100
    threats = []

    # Undocumented — biggest threat
    if not asset.get("documented", False):
        score -= 40
        threats.append("Undocumented — knowledge not captured anywhere")

    # No backup owner
    backup = asset.get("backup_owner") or asset.get("backup_tool")
    if not backup:
        score -= 25
        threats.append("No backup — single point of knowledge failure")

    # No owner at all
    if not asset.get("owner") and not asset.get("access_owner"):
        score -= 30
        threats.append("No owner — completely unmanaged knowledge")

    # Criticality factor
    criticality = asset.get("criticality", "low")
    if criticality == "critical" and score < 60:
        score -= 10
        threats.append("Critical asset with poor memory preservation")

    score = max(0, score)
    if score >= 75:
        status = "PRESERVED"
    elif score >= 50:
        status = "AT RISK"
    elif score >= 25:
        status = "VULNERABLE"
    else:
        status = "LOST"

    return score, status, threats


def build_memory_nodes(data: dict) -> list[MemoryNode]:
    nodes = []

    for a in data.get("agents", []):
        score, status, threats = _calculate_memory_score(a, "agent", data)
        nodes.append(MemoryNode(
            node_id=a["id"],
            node_name=a["name"],
            node_type="agent",
            owner=a.get("owner"),
            documented=a.get("documented", False),
            has_backup=bool(a.get("backup_owner")),
            criticality=a.get("criticality", "low"),
            department=a.get("department", "Unknown"),
            memory_score=score,
            memory_status=status,
            continuity_threats=threats,
        ))

    for wf in data.get("workflows", []):
        score, status, threats = _calculate_memory_score(wf, "workflow", data)
        nodes.append(MemoryNode(
            node_id=wf["id"],
            node_name=wf["name"],
            node_type="workflow",
            owner=wf.get("owner"),
            documented=wf.get("documented", False),
            has_backup=bool(wf.get("backup_owner")),
            criticality=wf.get("criticality", "medium"),
            department=wf.get("department", "Unknown"),
            memory_score=score,
            memory_status=status,
            continuity_threats=threats,
        ))

    for t in data.get("ai_tools", []):
        score, status, threats = _calculate_memory_score(
            {**t, "owner": t.get("access_owner"), "backup_owner": t.get("backup_tool")},
            "tool", data
        )
        nodes.append(MemoryNode(
            node_id=t["id"],
            node_name=t["name"],
            node_type="tool",
            owner=t.get("access_owner"),
            documented=t.get("documented", False),
            has_backup=bool(t.get("backup_tool")),
            criticality=t.get("criticality", "medium"),
            department="Cross-Department",
            memory_score=score,
            memory_status=status,
            continuity_threats=threats,
        ))

    nodes.sort(key=lambda n: n.memory_score)
    return nodes


def identify_memory_carriers(data: dict, nodes: list[MemoryNode]) -> list[MemoryCarrier]:
    carriers: dict[str, dict] = {}

    for node in nodes:
        if node.owner and not node.has_backup:
            person = node.owner
            carriers.setdefault(person, {
                "assets": [],
                "departments": set(),
                "transfer_needed": [],
            })
            carriers[person]["assets"].append(f"{node.node_name} ({node.node_type})")
            carriers[person]["departments"].add(node.department)
            if not node.documented:
                carriers[person]["transfer_needed"].append(node.node_name)

    result = []
    for person, info in carriers.items():
        count = len(info["assets"])
        risk = "CRITICAL" if count >= 4 else "HIGH" if count >= 2 else "MEDIUM"
        result.append(MemoryCarrier(
            person=person,
            carries_count=count,
            assets=info["assets"],
            departments=sorted(info["departments"]),
            continuity_risk=risk,
            knowledge_transfer_needed=info["transfer_needed"],
        ))

    result.sort(key=lambda c: -c.carries_count)
    return result


def calculate_institutional_memory_health_score(nodes: list[MemoryNode]) -> int:
    """
    Institutional Memory Health Score™ — 0 to 100
    100 = all knowledge preserved, 0 = everything at risk
    """
    if not nodes:
        return 0

    # Weight by criticality
    weights = {"critical": 3, "high": 2, "medium": 1, "low": 0.5}
    total_weight = 0
    weighted_score = 0

    for node in nodes:
        w = weights.get(node.criticality, 1)
        total_weight += w
        weighted_score += node.memory_score * w

    if total_weight == 0:
        return 0

    return int(weighted_score / total_weight)


def run_organizational_memory_intelligence(data_path: str) -> tuple[list[MemoryNode], list[MemoryCarrier], int]:
    with open(data_path) as f:
        data = json.load(f)

    nodes = build_memory_nodes(data)
    carriers = identify_memory_carriers(data, nodes)
    health_score = calculate_institutional_memory_health_score(nodes)

    return nodes, carriers, health_score


def display_organizational_memory_report(
    nodes: list[MemoryNode],
    carriers: list[MemoryCarrier],
    health_score: int,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 10 — ORGANIZATIONAL MEMORY INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    status_colors = {
        "PRESERVED": "green",
        "AT RISK": "yellow",
        "VULNERABLE": "bold yellow",
        "LOST": "bold red",
    }
    risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}

    # ── Institutional Memory Health Score ──
    score_color = "bold green" if health_score >= 70 else "bold yellow" if health_score >= 45 else "bold red"
    score_label = "HEALTHY" if health_score >= 70 else "AT RISK" if health_score >= 45 else "CRITICAL"

    console.print(Panel(
        f"[{score_color}]{health_score}/100 — {score_label}[/{score_color}]\n\n"
        f"[dim]This score measures how well your organization's AI knowledge, workflows,\n"
        f"and processes are preserved — and how much would survive if key people left.[/dim]",
        title="[bold]Institutional Memory Health Score™[/bold]",
        box=box.HEAVY
    ))

    # ── Memory Status Overview ──
    console.print(Panel("[bold]Memory Status — All Assets[/bold]", box=box.SIMPLE))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Asset", style="white", min_width=30)
    table.add_column("Type", justify="center", min_width=10)
    table.add_column("Owner", min_width=10)
    table.add_column("Documented", justify="center", min_width=12)
    table.add_column("Has Backup", justify="center", min_width=11)
    table.add_column("Criticality", justify="center", min_width=12)
    table.add_column("Memory Score", justify="center", min_width=13)
    table.add_column("Status", justify="center", min_width=12)

    for node in nodes:
        status_color = status_colors.get(node.memory_status, "white")
        score_c = "green" if node.memory_score >= 75 else "yellow" if node.memory_score >= 50 else "red"
        crit_color = "bold red" if node.criticality == "critical" else "yellow" if node.criticality == "high" else "dim"
        type_colors = {"agent": "yellow", "workflow": "cyan", "tool": "white"}
        type_color = type_colors.get(node.node_type, "white")

        table.add_row(
            node.node_name,
            f"[{type_color}]{node.node_type.upper()}[/{type_color}]",
            node.owner if node.owner else "[red]NONE[/red]",
            "[green]YES[/green]" if node.documented else "[red]NO[/red]",
            "[green]YES[/green]" if node.has_backup else "[red]NO[/red]",
            f"[{crit_color}]{node.criticality.upper()}[/{crit_color}]",
            f"[{score_c}]{node.memory_score}/100[/{score_c}]",
            f"[{status_color}]{node.memory_status}[/{status_color}]",
        )

    console.print(table)

    # ── Memory Carriers ──
    console.print(Panel("[bold red]Critical Memory Carriers — What Leaves With Each Person[/bold red]", box=box.SIMPLE))

    for carrier in carriers:
        risk_color = risk_colors.get(carrier.continuity_risk, "white")
        tree = Tree(
            f"[bold white]{carrier.person}[/bold white] "
            f"[{risk_color}][{carrier.continuity_risk} RISK][/{risk_color}] "
            f"[dim]— sole carrier of {carrier.carries_count} asset(s)[/dim]"
        )

        asset_branch = tree.add("[yellow]Assets they solely own (no backup):[/yellow]")
        for asset in carrier.assets:
            asset_branch.add(f"[dim]{asset}[/dim]")

        if carrier.knowledge_transfer_needed:
            kt_branch = tree.add("[bold red]Urgent knowledge transfer needed:[/bold red]")
            for item in carrier.knowledge_transfer_needed:
                kt_branch.add(f"[red]• {item} — undocumented[/red]")

        dept_branch = tree.add("[cyan]Departments affected:[/cyan]")
        for dept in carrier.departments:
            dept_branch.add(f"[dim]{dept}[/dim]")

        console.print(tree)
        console.print()

    # ── Status Breakdown ──
    preserved = [n for n in nodes if n.memory_status == "PRESERVED"]
    at_risk = [n for n in nodes if n.memory_status == "AT RISK"]
    vulnerable = [n for n in nodes if n.memory_status == "VULNERABLE"]
    lost = [n for n in nodes if n.memory_status == "LOST"]

    console.print(Panel("[bold]Memory Status Breakdown[/bold]", box=box.SIMPLE))

    status_table = Table(box=box.SIMPLE_HEAVY)
    status_table.add_column("Status", min_width=14)
    status_table.add_column("Count", justify="center", min_width=8)
    status_table.add_column("Assets", min_width=50)

    if preserved:
        status_table.add_row(
            "[green]PRESERVED[/green]", str(len(preserved)),
            ", ".join(n.node_name for n in preserved[:5]) + ("..." if len(preserved) > 5 else "")
        )
    if at_risk:
        status_table.add_row(
            "[yellow]AT RISK[/yellow]", str(len(at_risk)),
            ", ".join(n.node_name for n in at_risk[:5]) + ("..." if len(at_risk) > 5 else "")
        )
    if vulnerable:
        status_table.add_row(
            "[bold yellow]VULNERABLE[/bold yellow]", str(len(vulnerable)),
            ", ".join(n.node_name for n in vulnerable[:5]) + ("..." if len(vulnerable) > 5 else "")
        )
    if lost:
        status_table.add_row(
            "[bold red]LOST[/bold red]", str(len(lost)),
            ", ".join(n.node_name for n in lost[:5]) + ("..." if len(lost) > 5 else "")
        )

    console.print(status_table)

    # ── Final Summary ──
    console.print(Panel(
        f"[bold]Institutional Memory Health Score™:[/bold] [{score_color}]{health_score}/100 — {score_label}[/{score_color}]\n"
        f"[bold]Total Assets Tracked:[/bold] {len(nodes)}\n"
        f"[bold green]Preserved:[/bold green] {len(preserved)}\n"
        f"[bold yellow]At Risk:[/bold yellow] {len(at_risk)}\n"
        f"[bold yellow]Vulnerable:[/bold yellow] {len(vulnerable)}\n"
        f"[bold red]Lost (score 0-24):[/bold red] {len(lost)}\n"
        f"[bold red]Critical Memory Carriers:[/bold red] {len([c for c in carriers if c.continuity_risk == 'CRITICAL'])}\n"
        f"[bold]Total Memory Carriers:[/bold] {len(carriers)}\n\n"
        f"[dim]Memory carriers are people who solely own undocumented assets.\n"
        f"When they leave, that knowledge leaves with them.[/dim]",
        title="[bold]Organizational Memory Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    nodes, carriers, health_score = run_organizational_memory_intelligence("data/sunrise_care.json")
    display_organizational_memory_report(nodes, carriers, health_score, data["company"])