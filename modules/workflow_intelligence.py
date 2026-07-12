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
class WorkflowRisk:
    workflow_id: str
    workflow_name: str
    owner: str | None
    backup_owner: str | None
    department: str
    criticality: str
    documented: bool
    step_count: int
    human_steps: int
    tool_steps: int
    agent_steps: int
    tools_used: list[str]
    agents_used: list[str]
    humans_involved: list[str]
    single_human_dependency: bool
    has_undocumented_nodes: bool
    risk_score: int
    risk_level: str
    risk_factors: list[str]


@dataclass
class WorkflowChain:
    workflow_id: str
    workflow_name: str
    steps: list[dict]


@dataclass
class SingleNodeFailure:
    workflow_id: str
    workflow_name: str
    node_type: str
    node_name: str
    failure_impact: str
    severity: str


def _score_workflow(wf: dict, data: dict) -> WorkflowRisk:
    score = 0
    factors = []

    criticality = wf.get("criticality", "low")
    crit_map = {"critical": 30, "high": 20, "medium": 10, "low": 5}
    score += crit_map.get(criticality, 5)
    if criticality in ("critical", "high"):
        factors.append(f"High-criticality workflow ({criticality.upper()})")

    if not wf.get("documented", False):
        score += 20
        factors.append("Workflow is undocumented — no runbook exists")

    if not wf.get("owner"):
        score += 35
        factors.append("No workflow owner assigned")
    elif not wf.get("backup_owner"):
        score += 20
        factors.append("No backup owner — single point of human failure")

    steps = wf.get("steps", [])
    humans = [s["name"] for s in steps if s["actor"] == "human"]
    tools = [s["name"] for s in steps if s["actor"] == "tool"]
    agents = [s["name"] for s in steps if s["actor"] == "agent"]

    unique_humans = list(dict.fromkeys(humans))
    single_human_dep = len(unique_humans) == 1 and len(steps) >= 3
    if single_human_dep:
        score += 20
        factors.append(f"Single human dependency — only {unique_humans[0]} involved")

    # Check for undocumented nodes (tools or agents that are undocumented)
    tool_map = {t["name"]: t for t in data.get("ai_tools", [])}
    agent_name_map = {a["name"]: a for a in data.get("agents", [])}
    has_undoc_nodes = False
    for s in steps:
        if s["actor"] == "tool" and s["name"] in tool_map:
            if not tool_map[s["name"]].get("documented", True):
                has_undoc_nodes = True
        if s["actor"] == "agent" and s["name"] in agent_name_map:
            if not agent_name_map[s["name"]].get("documented", True):
                has_undoc_nodes = True
    if has_undoc_nodes:
        score += 15
        factors.append("Contains undocumented tools or agents")

    step_count = len(steps)
    if step_count >= 5:
        score += 10
        factors.append(f"Long workflow — {step_count} steps increases failure surface")

    risk_level = (
        "CRITICAL" if score >= 90
        else "HIGH" if score >= 60
        else "MEDIUM" if score >= 30
        else "LOW"
    )

    unique_tools = list(dict.fromkeys(tools))
    unique_agents = list(dict.fromkeys(agents))

    return WorkflowRisk(
        workflow_id=wf["id"],
        workflow_name=wf["name"],
        owner=wf.get("owner"),
        backup_owner=wf.get("backup_owner"),
        department=wf.get("department", "Unknown"),
        criticality=criticality,
        documented=wf.get("documented", False),
        step_count=step_count,
        human_steps=len(humans),
        tool_steps=len(tools),
        agent_steps=len(agents),
        tools_used=unique_tools,
        agents_used=unique_agents,
        humans_involved=unique_humans,
        single_human_dependency=single_human_dep,
        has_undocumented_nodes=has_undoc_nodes,
        risk_score=min(score, 170),
        risk_level=risk_level,
        risk_factors=factors,
    )


def build_single_node_failures(wf_risks: list[WorkflowRisk], data: dict) -> list[SingleNodeFailure]:
    failures = []
    agent_map = {a["id"]: a for a in data.get("agents", [])}
    tool_map = {t["name"]: t for t in data.get("ai_tools", [])}

    for wf in wf_risks:
        # Human single point of failure
        if wf.single_human_dependency and wf.humans_involved:
            person = wf.humans_involved[0]
            severity = "CRITICAL" if wf.criticality == "critical" else "HIGH"
            failures.append(SingleNodeFailure(
                workflow_id=wf.workflow_id,
                workflow_name=wf.workflow_name,
                node_type="Human",
                node_name=person,
                failure_impact=f"If {person} leaves, {wf.workflow_name} has no human executor",
                severity=severity,
            ))

        # Critical tool dependency with no backup
        for tool_name in wf.tools_used:
            t = tool_map.get(tool_name)
            if t and not t.get("backup_tool") and t.get("criticality") in ("critical", "high"):
                severity = "CRITICAL" if wf.criticality == "critical" else "HIGH"
                failures.append(SingleNodeFailure(
                    workflow_id=wf.workflow_id,
                    workflow_name=wf.workflow_name,
                    node_type="AI Tool",
                    node_name=tool_name,
                    failure_impact=f"If {tool_name} loses access, step in {wf.workflow_name} fails with no fallback",
                    severity=severity,
                ))

    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    failures.sort(key=lambda f: severity_order.get(f.severity, 3))
    return failures


def run_workflow_intelligence(data_path: str) -> tuple[list[WorkflowRisk], list[SingleNodeFailure]]:
    with open(data_path) as f:
        data = json.load(f)

    wf_risks = [_score_workflow(wf, data) for wf in data.get("workflows", [])]
    wf_risks.sort(key=lambda w: -w.risk_score)

    node_failures = build_single_node_failures(wf_risks, data)

    return wf_risks, node_failures


def display_workflow_report(
    wf_risks: list[WorkflowRisk],
    node_failures: list[SingleNodeFailure],
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 08 — WORKFLOW INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    risk_colors = {
        "CRITICAL": "bold red",
        "HIGH": "bold yellow",
        "MEDIUM": "yellow",
        "LOW": "green",
    }

    # ── Workflow Risk Overview ──
    console.print(Panel("[bold]Workflow Risk Overview — All Workflows[/bold]", box=box.SIMPLE))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Workflow", style="white", min_width=28)
    table.add_column("Owner", min_width=10)
    table.add_column("Dept", min_width=12)
    table.add_column("Steps", justify="center", min_width=7)
    table.add_column("Humans", justify="center", min_width=8)
    table.add_column("Tools", justify="center", min_width=7)
    table.add_column("Agents", justify="center", min_width=8)
    table.add_column("Documented", justify="center", min_width=12)
    table.add_column("Human SPOF", justify="center", min_width=12)
    table.add_column("Risk", justify="center", min_width=10)

    for wf in wf_risks:
        risk_color = risk_colors.get(wf.risk_level, "white")
        doc_text = "[green]YES[/green]" if wf.documented else "[red]NO[/red]"
        spof_text = "[bold red]YES[/bold red]" if wf.single_human_dependency else "[green]NO[/green]"
        owner_text = wf.owner if wf.owner else "[red]NONE[/red]"

        table.add_row(
            f"[bold]{wf.workflow_name}[/bold]",
            owner_text,
            wf.department,
            str(wf.step_count),
            str(wf.human_steps),
            str(wf.tool_steps),
            str(wf.agent_steps),
            doc_text,
            spof_text,
            f"[{risk_color}]{wf.risk_level}[/{risk_color}]",
        )

    console.print(table)

    # ── Workflow Chain Visualizer ──
    console.print("\n[bold cyan]Workflow Chain: Human > Tool > Agent > Outcome[/bold cyan]\n")

    with open("data/sunrise_care.json") as f:
        data = json.load(f)

    wf_map = {wf["id"]: wf for wf in data.get("workflows", [])}

    actor_colors = {"human": "bold white", "tool": "cyan", "agent": "yellow"}
    actor_icons = {"human": "H", "tool": "T", "agent": "A"}

    for wf_risk in wf_risks:
        wf = wf_map.get(wf_risk.workflow_id)
        if not wf:
            continue

        risk_color = risk_colors.get(wf_risk.risk_level, "white")
        backup_tag = (
            f" [dim](backup: {wf_risk.backup_owner})[/dim]"
            if wf_risk.backup_owner
            else " [red](no backup)[/red]"
        )
        doc_tag = "[dim][documented][/dim]" if wf_risk.documented else "[red][undocumented][/red]"

        tree = Tree(
            f"[bold white]{wf_risk.workflow_name}[/bold white]"
            f" [{risk_color}][{wf_risk.risk_level}][/{risk_color}]"
            f" | owner: [bold]{wf_risk.owner or 'NONE'}[/bold]{backup_tag} {doc_tag}"
        )

        for step in wf.get("steps", []):
            actor = step["actor"]
            icon = actor_icons.get(actor, "?")
            color = actor_colors.get(actor, "white")
            tree.add(
                f"[{color}][{icon}] Step {step['step']}: {step['name']}[/{color}]"
                f" [dim]— {step['action']}[/dim]"
            )

        console.print(tree)
        console.print()

    # ── Risk Factor Breakdown ──
    flagged = [wf for wf in wf_risks if wf.risk_level in ("CRITICAL", "HIGH")]
    if flagged:
        console.print(Panel("[bold red]Risk Factor Breakdown — CRITICAL & HIGH Workflows[/bold red]", box=box.SIMPLE))
        for wf in flagged:
            color = risk_colors.get(wf.risk_level, "white")
            console.print(f"  [{color}]{wf.workflow_name}[/{color}] [dim](score: {wf.risk_score})[/dim]")
            for factor in wf.risk_factors:
                console.print(f"    [dim]•[/dim] {factor}")
            console.print()

    # ── Single Node Failure Analysis ──
    if node_failures:
        console.print(Panel("[bold red]Single-Node Failure Analysis — What Breaks If One Node Goes Down[/bold red]", box=box.SIMPLE))

        snf_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
        snf_table.add_column("Workflow", style="white", min_width=28)
        snf_table.add_column("Node Type", justify="center", min_width=10)
        snf_table.add_column("Node Name", min_width=18)
        snf_table.add_column("Impact", min_width=46)
        snf_table.add_column("Severity", justify="center", min_width=10)

        for f in node_failures:
            sev_color = risk_colors.get(f.severity, "white")
            type_color = "bold white" if f.node_type == "Human" else "cyan"
            snf_table.add_row(
                f.workflow_name,
                f"[{type_color}]{f.node_type}[/{type_color}]",
                f.node_name,
                f.failure_impact,
                f"[{sev_color}]{f.severity}[/{sev_color}]",
            )

        console.print(snf_table)

    # ── Owner Coverage ──
    console.print(Panel("[bold]Workflow Ownership Coverage[/bold]", box=box.SIMPLE))

    owner_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    owner_table.add_column("Owner", style="white", min_width=12)
    owner_table.add_column("Workflows Owned", min_width=40)
    owner_table.add_column("Count", justify="center", min_width=7)
    owner_table.add_column("Has Backup", justify="center", min_width=12)

    owner_map: dict[str, list[WorkflowRisk]] = {}
    for wf in wf_risks:
        key = wf.owner or "UNOWNED"
        owner_map.setdefault(key, []).append(wf)

    for owner, workflows in sorted(owner_map.items()):
        all_backed = all(wf.backup_owner is not None for wf in workflows)
        backup_text = "[green]YES[/green]" if all_backed else "[red]NO[/red]"
        owner_table.add_row(
            f"[bold]{owner}[/bold]" if owner != "UNOWNED" else "[red]UNOWNED[/red]",
            ", ".join(wf.workflow_name for wf in workflows),
            str(len(workflows)),
            backup_text,
        )

    console.print(owner_table)

    # ── Summary Panel ──
    critical = [wf for wf in wf_risks if wf.risk_level == "CRITICAL"]
    high = [wf for wf in wf_risks if wf.risk_level == "HIGH"]
    undoc = [wf for wf in wf_risks if not wf.documented]
    spofs = [wf for wf in wf_risks if wf.single_human_dependency]
    no_owner = [wf for wf in wf_risks if not wf.owner]

    all_tools = set()
    all_agents = set()
    for wf in wf_risks:
        all_tools.update(wf.tools_used)
        all_agents.update(wf.agents_used)

    console.print(Panel(
        f"[bold]Total Workflows Analyzed:[/bold] {len(wf_risks)}\n"
        f"[bold red]CRITICAL Risk Workflows:[/bold red] {len(critical)}"
        + (f" ({', '.join(wf.workflow_name for wf in critical)})" if critical else "") + "\n"
        f"[bold yellow]HIGH Risk Workflows:[/bold yellow] {len(high)}\n"
        f"[bold red]Undocumented Workflows:[/bold red] {len(undoc)}\n"
        f"[bold red]Single Human Dependency (SPOF):[/bold red] {len(spofs)}\n"
        f"[bold red]Workflows With No Owner:[/bold red] {len(no_owner)}\n"
        f"[bold]Unique AI Tools Across Workflows:[/bold] {len(all_tools)}\n"
        f"[bold]Unique Agents Across Workflows:[/bold] {len(all_agents)}\n"
        f"[bold red]Single-Node Failure Points:[/bold red] {len(node_failures)}",
        title="[bold]Workflow Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    wf_risks, node_failures = run_workflow_intelligence("data/sunrise_care.json")
    display_workflow_report(wf_risks, node_failures, data["company"])
