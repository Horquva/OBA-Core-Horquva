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
class KnowledgeNode:
    node_id: str
    node_name: str
    node_type: str          # "person" | "agent" | "workflow" | "tool"
    owner: str | None
    documented: bool
    critical: bool
    knowledge_items: list[str]   # what knowledge this node holds
    dependents: list[str]        # who depends on this node's knowledge
    undocumented_count: int
    concentration_score: int     # 0-100: how concentrated knowledge is
    risk_level: str
    risk_factors: list[str]


@dataclass
class KnowledgeGap:
    area: str
    responsible_person: str | None
    gap_type: str           # "undocumented" | "single_holder" | "no_owner"
    affected_assets: list[str]
    severity: str


def _build_person_knowledge_map(data: dict) -> dict[str, dict]:
    """
    Build a map of person → what they know (agents owned, workflows owned, tools used)
    """
    people = {}

    for a in data.get("agents", []):
        owner = a.get("owner")
        if owner:
            people.setdefault(owner, {"agents": [], "workflows": [], "tools": [], "documented": []})
            people[owner]["agents"].append(a["name"])
            if not a.get("documented", False):
                people[owner]["documented"].append(a["name"])

    for wf in data.get("workflows", []):
        owner = wf.get("owner")
        if owner:
            people.setdefault(owner, {"agents": [], "workflows": [], "tools": [], "documented": []})
            people[owner]["workflows"].append(wf["name"])
            if not wf.get("documented", False):
                people[owner]["documented"].append(wf["name"])

    for tool in data.get("ai_tools", []):
        for user in tool.get("users", []):
            people.setdefault(user, {"agents": [], "workflows": [], "tools": [], "documented": []})
            people[user]["tools"].append(tool["name"])

    return people


def _score_knowledge_node(person: str, knowledge: dict, data: dict) -> KnowledgeNode:
    score = 0
    factors = []
    knowledge_items = []

    total_assets = len(knowledge["agents"]) + len(knowledge["workflows"])
    undoc_count = len(knowledge["documented"])

    if knowledge["agents"]:
        knowledge_items.append(f"Owns {len(knowledge['agents'])} AI agent(s): {', '.join(knowledge['agents'])}")
    if knowledge["workflows"]:
        knowledge_items.append(f"Owns {len(knowledge['workflows'])} workflow(s): {', '.join(knowledge['workflows'])}")
    if knowledge["tools"]:
        knowledge_items.append(f"Uses {len(knowledge['tools'])} AI tool(s): {', '.join(knowledge['tools'])}")

    # Undocumented assets score
    if undoc_count > 0:
        score += undoc_count * 15
        factors.append(f"{undoc_count} undocumented asset(s) — knowledge lives only in their head")

    # Concentration: owns many critical assets
    if total_assets >= 5:
        score += 40
        factors.append(f"Extreme knowledge concentration — owns {total_assets} assets")
    elif total_assets >= 3:
        score += 25
        factors.append(f"High knowledge concentration — owns {total_assets} assets")

    # Check if any owned agents are SPOF
    agent_map = {a["name"]: a for a in data.get("agents", [])}
    spof_agents = []
    for agent_name in knowledge["agents"]:
        a = agent_map.get(agent_name)
        if a and not a.get("backup_owner"):
            spof_agents.append(agent_name)
    if spof_agents:
        score += len(spof_agents) * 10
        factors.append(f"{len(spof_agents)} agent(s) have no backup — knowledge not transferred")

    # Check workflow backup coverage
    wf_map = {wf["name"]: wf for wf in data.get("workflows", [])}
    no_backup_wf = []
    for wf_name in knowledge["workflows"]:
        wf = wf_map.get(wf_name)
        if wf and not wf.get("backup_owner"):
            no_backup_wf.append(wf_name)
    if no_backup_wf:
        score += len(no_backup_wf) * 12
        factors.append(f"{len(no_backup_wf)} workflow(s) have no backup owner")

    risk_level = (
        "CRITICAL" if score >= 80
        else "HIGH" if score >= 50
        else "MEDIUM" if score >= 25
        else "LOW"
    )

    concentration_score = min(int((score / 120) * 100), 100)

    dependents = knowledge["agents"] + knowledge["workflows"]

    return KnowledgeNode(
        node_id=person.lower().replace(" ", "_"),
        node_name=person,
        node_type="person",
        owner=person,
        documented=(undoc_count == 0),
        critical=(total_assets >= 3),
        knowledge_items=knowledge_items,
        dependents=dependents,
        undocumented_count=undoc_count,
        concentration_score=concentration_score,
        risk_level=risk_level,
        risk_factors=factors,
    )


def find_knowledge_gaps(data: dict, nodes: list[KnowledgeNode]) -> list[KnowledgeGap]:
    gaps = []

    # Undocumented agents
    for a in data.get("agents", []):
        if not a.get("documented", False):
            gaps.append(KnowledgeGap(
                area=a["name"],
                responsible_person=a.get("owner"),
                gap_type="undocumented",
                affected_assets=[a["name"]],
                severity="CRITICAL" if a.get("criticality") in ("critical", "high") else "HIGH",
            ))

    # Undocumented workflows
    for wf in data.get("workflows", []):
        if not wf.get("documented", False):
            gaps.append(KnowledgeGap(
                area=wf["name"],
                responsible_person=wf.get("owner"),
                gap_type="undocumented",
                affected_assets=[wf["name"]],
                severity="CRITICAL" if wf.get("criticality") in ("critical", "high") else "HIGH",
            ))

    # Single knowledge holders (person owns 3+ assets)
    for node in nodes:
        if node.critical and node.node_type == "person":
            gaps.append(KnowledgeGap(
                area=f"{node.node_name}'s knowledge domain",
                responsible_person=node.node_name,
                gap_type="single_holder",
                affected_assets=node.dependents,
                severity="CRITICAL" if node.risk_level == "CRITICAL" else "HIGH",
            ))

    # Sort by severity
    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    gaps.sort(key=lambda g: order.get(g.severity, 3))
    return gaps


def run_knowledge_risk_intelligence(data_path: str) -> tuple[list[KnowledgeNode], list[KnowledgeGap], dict]:
    with open(data_path) as f:
        data = json.load(f)

    person_map = _build_person_knowledge_map(data)
    nodes = [_score_knowledge_node(person, knowledge, data) for person, knowledge in person_map.items()]
    nodes.sort(key=lambda n: -n.concentration_score)

    gaps = find_knowledge_gaps(data, nodes)

    # Undocumented summary
    undoc_agents = [a["name"] for a in data.get("agents", []) if not a.get("documented", False)]
    undoc_workflows = [wf["name"] for wf in data.get("workflows", []) if not wf.get("documented", False)]
    undoc_tools = [t["name"] for t in data.get("ai_tools", []) if not t.get("documented", False)]

    summary = {
        "undocumented_agents": undoc_agents,
        "undocumented_workflows": undoc_workflows,
        "undocumented_tools": undoc_tools,
        "total_undocumented": len(undoc_agents) + len(undoc_workflows) + len(undoc_tools),
    }

    return nodes, gaps, summary


def display_knowledge_risk_report(
    nodes: list[KnowledgeNode],
    gaps: list[KnowledgeGap],
    summary: dict,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 09 — KNOWLEDGE RISK INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow", "LOW": "green"}

    # ── Knowledge Concentration Table ──
    console.print(Panel("[bold]Knowledge Concentration — Who Holds What[/bold]", box=box.SIMPLE))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Person", style="white", min_width=12)
    table.add_column("Agents Owned", justify="center", min_width=13)
    table.add_column("Workflows Owned", justify="center", min_width=16)
    table.add_column("Tools Used", justify="center", min_width=11)
    table.add_column("Undocumented", justify="center", min_width=14)
    table.add_column("Concentration", justify="center", min_width=14)
    table.add_column("Risk", justify="center", min_width=10)

    for node in nodes:
        risk_color = risk_colors.get(node.risk_level, "white")
        conc_color = "red" if node.concentration_score >= 70 else "yellow" if node.concentration_score >= 40 else "green"
        undoc_color = "red" if node.undocumented_count > 0 else "green"

        table.add_row(
            f"[bold]{node.node_name}[/bold]",
            str(len([k for k in node.knowledge_items if "agent" in k.lower()])),
            str(len([k for k in node.knowledge_items if "workflow" in k.lower()])),
            str(len([k for k in node.knowledge_items if "tool" in k.lower()])),
            f"[{undoc_color}]{node.undocumented_count}[/{undoc_color}]",
            f"[{conc_color}]{node.concentration_score}%[/{conc_color}]",
            f"[{risk_color}]{node.risk_level}[/{risk_color}]",
        )

    console.print(table)

    # ── Knowledge Tree per Person ──
    console.print("\n[bold cyan]Knowledge Map — What Disappears If Each Person Leaves:[/bold cyan]\n")

    critical_nodes = [n for n in nodes if n.risk_level in ("CRITICAL", "HIGH")]
    for node in critical_nodes:
        risk_color = risk_colors.get(node.risk_level, "white")
        tree = Tree(
            f"[bold white]{node.node_name}[/bold white] "
            f"[{risk_color}][{node.risk_level} RISK][/{risk_color}] "
            f"[dim]— concentration: {node.concentration_score}%[/dim]"
        )
        for item in node.knowledge_items:
            tree.add(f"[dim]{item}[/dim]")
        if node.risk_factors:
            rf_branch = tree.add("[bold red]Risk Factors:[/bold red]")
            for rf in node.risk_factors:
                rf_branch.add(f"[red]• {rf}[/red]")
        console.print(tree)
        console.print()

    # ── Undocumented Assets ──
    console.print(Panel("[bold red]Undocumented Assets — Knowledge Living Only In People's Heads[/bold red]", box=box.SIMPLE))

    undoc_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    undoc_table.add_column("Asset", style="white", min_width=32)
    undoc_table.add_column("Type", justify="center", min_width=12)
    undoc_table.add_column("Responsible Person", min_width=18)
    undoc_table.add_column("Risk If Undocumented", min_width=36)

    for a_name in summary["undocumented_agents"]:
        agent = next((a for a in []), None)
        undoc_table.add_row(
            a_name, "[yellow]AI Agent[/yellow]",
            "See ownership map",
            "Agent behavior undocumented — replacement impossible without owner"
        )
    for wf_name in summary["undocumented_workflows"]:
        undoc_table.add_row(
            wf_name, "[cyan]Workflow[/cyan]",
            "See ownership map",
            "Workflow steps undocumented — process lost if owner leaves"
        )
    for t_name in summary["undocumented_tools"]:
        undoc_table.add_row(
            t_name, "[white]AI Tool[/white]",
            "Multiple users",
            "Tool usage undocumented — no governance or usage policy"
        )

    console.print(undoc_table)

    # ── Knowledge Gaps ──
    console.print(Panel("[bold red]Knowledge Gaps — Critical Blind Spots[/bold red]", box=box.SIMPLE))

    gap_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    gap_table.add_column("Area", style="white", min_width=32)
    gap_table.add_column("Gap Type", justify="center", min_width=18)
    gap_table.add_column("Responsible", min_width=14)
    gap_table.add_column("Assets At Risk", min_width=28)
    gap_table.add_column("Severity", justify="center", min_width=10)

    gap_labels = {
        "undocumented": "[yellow]Undocumented[/yellow]",
        "single_holder": "[bold red]Single Holder[/bold red]",
        "no_owner": "[red]No Owner[/red]",
    }

    for g in gaps[:12]:  # top 12
        sev_color = risk_colors.get(g.severity, "white")
        gap_table.add_row(
            g.area,
            gap_labels.get(g.gap_type, g.gap_type),
            g.responsible_person or "[red]NONE[/red]",
            ", ".join(g.affected_assets[:3]) + ("..." if len(g.affected_assets) > 3 else ""),
            f"[{sev_color}]{g.severity}[/{sev_color}]",
        )

    console.print(gap_table)

    # ── Summary ──
    critical_nodes_count = len([n for n in nodes if n.risk_level == "CRITICAL"])
    high_nodes_count = len([n for n in nodes if n.risk_level == "HIGH"])

    console.print(Panel(
        f"[bold]Total People Analyzed:[/bold] {len(nodes)}\n"
        f"[bold red]CRITICAL Knowledge Concentration:[/bold red] {critical_nodes_count} person(s)\n"
        f"[bold yellow]HIGH Knowledge Concentration:[/bold yellow] {high_nodes_count} person(s)\n"
        f"[bold red]Undocumented Agents:[/bold red] {len(summary['undocumented_agents'])}\n"
        f"[bold red]Undocumented Workflows:[/bold red] {len(summary['undocumented_workflows'])}\n"
        f"[bold yellow]Undocumented AI Tools:[/bold yellow] {len(summary['undocumented_tools'])}\n"
        f"[bold]Total Undocumented Assets:[/bold] {summary['total_undocumented']}\n"
        f"[bold]Total Knowledge Gaps Identified:[/bold] {len(gaps)}",
        title="[bold]Knowledge Risk Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    nodes, gaps, summary = run_knowledge_risk_intelligence("data/sunrise_care.json")
    display_knowledge_risk_report(nodes, gaps, summary, data["company"])