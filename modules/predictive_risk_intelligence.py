"""
M11 - Predictive Risk Intelligence
Horquva | AI/ML Prediction Layer (Tahir)

Purpose:
    Predict which agents are LIKELY to become high/critical risk in the near
    future and surface EMERGING threats before they escalate.

    Each agent is scored with a weighted, explainable risk model based on:
        - Current criticality
        - Dependency exposure (how many agents rely on it)
        - Owner / backup coverage (single point of human failure)
        - Tool (platform) health it runs on
        - Whether it sits inside a critical workflow
"""

import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)

# --- Weight tables ---------------------------------------------------------

CRITICALITY_WEIGHT = {"critical": 40, "high": 25, "medium": 10, "low": 3}
DEP_TYPE_WEIGHT = {"sequential": 12, "triggers": 10, "feeds": 8, "monitors": 6, "backs_up": 5}
NO_BACKUP_PENALTY = 15
ORPHAN_PENALTY = 20
UNDOCUMENTED_TOOL_PENALTY = 10
CRITICAL_TOOL_NO_BACKUP_PENALTY = 10
WORKFLOW_CRITICAL_PENALTY = 10

THREAT_THRESHOLDS = {"critical": 75, "high": 50, "medium": 25}


@dataclass
class RiskPrediction:
    agent_id: str
    agent_name: str
    department: str
    current_criticality: str
    predicted_score: int
    predicted_threat: str
    is_emerging: bool
    reasons: list[str] = field(default_factory=list)


def _classify_threat(score: int) -> str:
    if score >= THREAT_THRESHOLDS["critical"]:
        return "CRITICAL"
    if score >= THREAT_THRESHOLDS["high"]:
        return "HIGH"
    if score >= THREAT_THRESHOLDS["medium"]:
        return "MEDIUM"
    return "LOW"


def run_predictive_risk_intelligence(data_path: str) -> tuple[list[RiskPrediction], dict]:
    with open(data_path) as f:
        data = json.load(f)

    agents = data.get("agents", [])
    dependencies = data.get("dependencies", [])
    tools = data.get("ai_tools", [])
    workflows = data.get("workflows", [])

    # incoming dependency exposure: how many things rely on each agent
    exposure = {}
    for dep in dependencies:
        target = dep.get("to")
        w = DEP_TYPE_WEIGHT.get(dep.get("type"), 6)
        exposure[target] = exposure.get(target, 0) + w

    # tool health per agent
    agent_tool_penalty = {}
    for tool in tools:
        penalty = 0
        if not tool.get("documented"):
            penalty += UNDOCUMENTED_TOOL_PENALTY
        if tool.get("criticality") in ("critical", "high") and not tool.get("backup_tool"):
            penalty += CRITICAL_TOOL_NO_BACKUP_PENALTY
        for aid in tool.get("agents_using", []):
            agent_tool_penalty[aid] = max(agent_tool_penalty.get(aid, 0), penalty)

    # agents inside critical workflows
    critical_wf_agents = set()
    for wf in workflows:
        if wf.get("criticality") in ("critical", "high"):
            for step in wf.get("steps", []):
                if step.get("actor") == "agent":
                    critical_wf_agents.add(step.get("name"))

    predictions = []
    for agent in agents:
        aid = agent["id"]
        score = 0
        reasons = []

        crit = agent.get("criticality", "medium")
        score += CRITICALITY_WEIGHT.get(crit, 0)
        if crit == "critical":
            reasons.append("Already a critical asset")
        elif crit == "high":
            reasons.append("Already a high-criticality asset")

        dep_score = min(exposure.get(aid, 0), 40)
        if dep_score >= 20:
            reasons.append(f"Heavy dependency exposure ({dep_score} pts) — many agents rely on it")
        elif dep_score > 0:
            reasons.append("Other agents depend on it")
        score += dep_score

        if not agent.get("owner"):
            score += ORPHAN_PENALTY
            reasons.append("No owner assigned — orphaned agent")
        elif not agent.get("backup_owner"):
            score += NO_BACKUP_PENALTY
            reasons.append("Owner has no backup — single point of human failure")

        tp = agent_tool_penalty.get(aid, 0)
        if tp:
            score += min(tp, 20)
            reasons.append("Runs on an undocumented / unbacked AI tool")

        if aid in critical_wf_agents:
            score += WORKFLOW_CRITICAL_PENALTY
            reasons.append("Part of a critical workflow")

        if not agent.get("documented"):
            reasons.append("Not documented — recovery would be slow")

        score = min(score, 100)
        threat = _classify_threat(score)
        predictions.append(RiskPrediction(
            agent_id=aid,
            agent_name=agent.get("name", aid),
            department=agent.get("department", "N/A"),
            current_criticality=crit,
            predicted_score=score,
            predicted_threat=threat,
            is_emerging=(crit not in ("critical",) and threat == "CRITICAL"),
            reasons=reasons,
        ))

    predictions.sort(key=lambda p: p.predicted_score, reverse=True)

    summary = {
        "total_agents": len(predictions),
        "critical_threats": len([p for p in predictions if p.predicted_threat == "CRITICAL"]),
        "high_threats": len([p for p in predictions if p.predicted_threat == "HIGH"]),
        "medium_threats": len([p for p in predictions if p.predicted_threat == "MEDIUM"]),
        "emerging_threats": len([p for p in predictions if p.is_emerging]),
    }
    return predictions, summary


def display_predictive_risk_report(predictions: list[RiskPrediction], summary: dict, company: str):
    console.print(Panel(
        f"[bold cyan]MODULE 11 - PREDICTIVE RISK INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE,
    ))

    console.print(Panel(
        f"[bold]Critical threats:[/bold] [red]{summary['critical_threats']}[/red]   "
        f"[bold]High:[/bold] [yellow]{summary['high_threats']}[/yellow]   "
        f"[bold]Medium:[/bold] {summary['medium_threats']}   "
        f"[bold]Emerging:[/bold] [magenta]{summary['emerging_threats']}[/magenta]",
        title="[bold]Predicted Threat Landscape[/bold]",
        box=box.ROUNDED,
    ))

    threat_colors = {"CRITICAL": "bold red", "HIGH": "red", "MEDIUM": "yellow", "LOW": "green"}
    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Agent", style="white", min_width=24)
    table.add_column("Dept", min_width=11)
    table.add_column("Now", justify="center", min_width=9)
    table.add_column("Predicted", justify="center", min_width=10)
    table.add_column("Threat", justify="center", min_width=10)
    table.add_column("Why", min_width=40)

    for p in predictions:
        color = threat_colors.get(p.predicted_threat, "white")
        emerging = " [magenta](EMERGING)[/magenta]" if p.is_emerging else ""
        table.add_row(
            f"[bold]{p.agent_name}[/bold]",
            p.department,
            p.current_criticality.upper(),
            f"[{color}]{p.predicted_score}/100[/{color}]",
            f"[{color}]{p.predicted_threat}[/{color}]{emerging}",
            "; ".join(p.reasons[:3]) if p.reasons else "-",
        )
    console.print(table)

    emerging = [p for p in predictions if p.is_emerging]
    if emerging:
        console.print("\n[bold magenta]Emerging threats (not critical today, predicted critical):[/bold magenta]")
        for p in emerging:
            console.print(f"  - [bold]{p.agent_name}[/bold] ({p.department}) -> predicted {p.predicted_score}/100")


if __name__ == "__main__":
    preds, summ = run_predictive_risk_intelligence("data/company.json")
    with open("data/company.json") as f:
        company_name = json.load(f)["company"]
    display_predictive_risk_report(preds, summ, company_name)
