import json
import uuid
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


@dataclass
class DecisionRecord:
    decision_id: str
    category: str            # 'Ownership', 'Tooling', 'Workflow'
    decision: str            # human-readable description of the decision made
    asset_name: str
    influenced_by: list[str]  # the data signals that drove / should have driven the decision
    trail: list[str]          # the decision trail (sequence of reasoning steps)
    quality_score: int        # 0-100, how good the decision was for the org
    quality_level: str        # GOOD / ACCEPTABLE / POOR / HARMFUL
    recommendation: str


def _level_from_score(score: int) -> str:
    if score >= 80:
        return "GOOD"
    if score >= 55:
        return "ACCEPTABLE"
    if score >= 30:
        return "POOR"
    return "HARMFUL"


def _clamp(score: int) -> int:
    return max(0, min(100, score))


def evaluate_ownership_decision(agent: dict, owner_load: dict) -> DecisionRecord:
    """Treats every agent's ownership configuration as a past decision and
    scores how sound that decision was for organizational continuity."""
    name = agent["name"]
    owner = agent.get("owner")
    backup = agent.get("backup_owner")
    crit = agent.get("criticality", "medium")
    documented = agent.get("documented", False)

    score = 100
    influences = [f"Criticality assessed as '{crit}'"]
    trail = [f"Agent registered: {name}", f"Criticality evaluated: {crit.upper()}"]

    if owner is None:
        score -= 65
        influences.append("No accountable owner was assigned (orphaned)")
        trail.append("Ownership decision: LEFT UNASSIGNED")
        recommendation = f"Assign an accountable owner to {name} immediately"
    else:
        trail.append(f"Ownership decision: assigned to {owner}")
        load = owner_load.get(owner, 0)
        if backup is None:
            score -= 25
            influences.append("No backup owner was chosen")
        if not documented:
            score -= 15
            influences.append("Deployed without documentation")
        if load >= 5:
            score -= 20
            influences.append(f"{owner} already concentrates {load} agents (over-concentration)")
            trail.append(f"Concentration check: {owner} holds {load} agents")
        if crit == "critical" and backup is None:
            score -= 15
            influences.append("Critical asset left with zero backup coverage")
        if backup is None:
            recommendation = f"Assign a backup owner for {name} to protect continuity"
        elif not documented:
            recommendation = f"Document {name} so the decision is reversible by others"
        else:
            recommendation = f"No change required — {name} ownership decision is sound"

    score = _clamp(score)
    return DecisionRecord(
        decision_id=str(uuid.uuid4())[:8],
        category="Ownership",
        decision=f"Assign '{name}' to {owner if owner else 'NO OWNER'}",
        asset_name=name,
        influenced_by=influences,
        trail=trail,
        quality_score=score,
        quality_level=_level_from_score(score),
        recommendation=recommendation,
    )


def evaluate_tooling_decision(tool: dict) -> DecisionRecord:
    name = tool["name"]
    crit = tool.get("criticality", "medium")
    documented = tool.get("documented", False)
    backup_tool = tool.get("backup_tool")
    vendor = tool.get("vendor", "Unknown")

    score = 100
    influences = [f"Adopted as a '{crit}' criticality tool"]
    trail = [f"Tool adopted: {name} ({vendor})", f"Criticality evaluated: {crit.upper()}"]

    if backup_tool is None:
        score -= 30
        influences.append("No fallback / alternative tool was selected")
        trail.append("Fallback decision: NONE selected")
    if not documented:
        score -= 20
        influences.append("Adopted without a usage policy or documentation")
    if crit == "critical" and backup_tool is None:
        score -= 20
        influences.append("Critical tool with no continuity fallback")

    if backup_tool is None:
        recommendation = f"Define a fallback tool for {name} before it becomes a hard dependency"
    elif not documented:
        recommendation = f"Publish a usage policy for {name}"
    else:
        recommendation = f"No change required — {name} adoption decision is sound"

    score = _clamp(score)
    return DecisionRecord(
        decision_id=str(uuid.uuid4())[:8],
        category="Tooling",
        decision=f"Adopt '{name}' as {crit} tool",
        asset_name=name,
        influenced_by=influences,
        trail=trail,
        quality_score=score,
        quality_level=_level_from_score(score),
        recommendation=recommendation,
    )


def evaluate_workflow_decision(wf: dict) -> DecisionRecord:
    name = wf["name"]
    owner = wf.get("owner")
    backup = wf.get("backup_owner")
    crit = wf.get("criticality", "medium")
    documented = wf.get("documented", False)

    score = 100
    influences = [f"Operates at '{crit}' criticality"]
    trail = [f"Workflow defined: {name}", f"Criticality evaluated: {crit.upper()}"]

    if owner is None:
        score -= 50
        influences.append("No workflow owner assigned")
        trail.append("Owner decision: LEFT UNASSIGNED")
    else:
        trail.append(f"Owner decision: assigned to {owner}")
    if backup is None:
        score -= 25
        influences.append("No backup owner for the workflow")
    if not documented:
        score -= 20
        influences.append("Operated without a runbook / documentation")
    if crit == "critical" and backup is None:
        score -= 15
        influences.append("Critical workflow with no continuity backup")

    if backup is None:
        recommendation = f"Assign a backup owner for {name}"
    elif not documented:
        recommendation = f"Create a runbook for {name}"
    else:
        recommendation = f"No change required — {name} is well governed"

    score = _clamp(score)
    return DecisionRecord(
        decision_id=str(uuid.uuid4())[:8],
        category="Workflow",
        decision=f"Operate '{name}' under {owner if owner else 'NO OWNER'}",
        asset_name=name,
        influenced_by=influences,
        trail=trail,
        quality_score=score,
        quality_level=_level_from_score(score),
        recommendation=recommendation,
    )


def run_decision_intelligence(data_path: str):
    """Reconstructs the key organizational decisions encoded in the data,
    builds a decision trail for each, and scores decision quality.

    Returns (decisions, decision_quality_index).
    """
    with open(data_path) as f:
        data = json.load(f)

    agents = data.get("agents", [])
    owner_load: dict[str, int] = {}
    for a in agents:
        if a.get("owner"):
            owner_load[a["owner"]] = owner_load.get(a["owner"], 0) + 1

    decisions: list[DecisionRecord] = []
    for a in agents:
        decisions.append(evaluate_ownership_decision(a, owner_load))
    for t in data.get("ai_tools", []):
        decisions.append(evaluate_tooling_decision(t))
    for wf in data.get("workflows", []):
        decisions.append(evaluate_workflow_decision(wf))

    level_order = {"HARMFUL": 0, "POOR": 1, "ACCEPTABLE": 2, "GOOD": 3}
    decisions.sort(key=lambda d: (level_order[d.quality_level], d.quality_score))

    if decisions:
        index = round(sum(d.quality_score for d in decisions) / len(decisions))
    else:
        index = 100

    return decisions, index


def display_decision_report(decisions: list[DecisionRecord], decision_index: int, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 14 — DECISION INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Category", justify="center", min_width=10)
    table.add_column("Decision", min_width=38)
    table.add_column("Score", justify="center", min_width=7)
    table.add_column("Quality", justify="center", min_width=11)
    table.add_column("Primary Influence", min_width=40)

    quality_colors = {
        "GOOD": "green",
        "ACCEPTABLE": "cyan",
        "POOR": "yellow",
        "HARMFUL": "bold red",
    }

    for d in decisions:
        color = quality_colors.get(d.quality_level, "white")
        primary = d.influenced_by[-1] if d.influenced_by else "-"
        table.add_row(
            d.category,
            d.decision,
            str(d.quality_score),
            f"[{color}]{d.quality_level}[/{color}]",
            primary,
        )

    console.print(table)

    # Decision trails for the worst decisions
    worst = [d for d in decisions if d.quality_level in ("HARMFUL", "POOR")]
    if worst:
        console.print("\n[bold red]Decision Trails — Highest Concern:[/bold red]")
        for d in worst[:5]:
            console.print(f"\n  [bold]► {d.decision}[/bold] ([{quality_colors[d.quality_level]}]{d.quality_level}[/{quality_colors[d.quality_level]}], score {d.quality_score})")
            console.print("    [dim]Trail:[/dim] " + "  →  ".join(d.trail))
            console.print(f"    [dim]Fix:[/dim] {d.recommendation}")

    good = [d for d in decisions if d.quality_level == "GOOD"]
    acceptable = [d for d in decisions if d.quality_level == "ACCEPTABLE"]
    poor = [d for d in decisions if d.quality_level == "POOR"]
    harmful = [d for d in decisions if d.quality_level == "HARMFUL"]

    if decision_index >= 75:
        i_color, i_label = "green", "SOUND"
    elif decision_index >= 50:
        i_color, i_label = "yellow", "MIXED"
    else:
        i_color, i_label = "red", "WEAK"

    console.print(Panel(
        f"[bold]Total Decisions Audited:[/bold] {len(decisions)}\n"
        f"[bold green]Good:[/bold green] {len(good)}   "
        f"[bold cyan]Acceptable:[/bold cyan] {len(acceptable)}   "
        f"[bold yellow]Poor:[/bold yellow] {len(poor)}   "
        f"[bold red]Harmful:[/bold red] {len(harmful)}\n"
        f"\n[bold]Decision Quality Index:[/bold] "
        f"[{i_color}]{decision_index}/100 — {i_label}[/{i_color}]",
        title="[bold]Decision Intelligence Summary[/bold]",
        box=box.ROUNDED
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        company = json.load(f)["company"]
    decisions, index = run_decision_intelligence("data/sunrise_care.json")
    display_decision_report(decisions, index, company)
