import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich import box

from modules.data_models import GovernanceGap
from modules.intelligence_pipeline import IntelligencePipeline
from modules.governance_data_framework import (
    build_governance_heatmap,
    find_governance_gaps,
    calculate_overall_governance_score,
)
from modules.storage_layer import IntelligenceStorage

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class GovernanceResult:
    entity_id: str
    entity_name: str
    entity_type: str
    department: str
    owner: str | None
    criticality: str
    documented: bool
    governance_score: int
    governance_level: str
    policy_count: int
    issues: list[str]


@dataclass
class GovernanceRisk:
    entity_id: str
    entity_name: str
    risk_type: str
    severity: str
    description: str
    remediation: str


def run_governance_intelligence(data_path: str) -> tuple[list[GovernanceResult], int, list[GovernanceRisk], dict]:
    with open(data_path) as f:
        data = json.load(f)

    pipeline = IntelligencePipeline(data)
    heatmap = build_governance_heatmap(pipeline)
    gaps = find_governance_gaps(pipeline)
    score = calculate_overall_governance_score(pipeline)

    results = []
    for name, info in heatmap.items():
        results.append(GovernanceResult(
            entity_id=info["id"],
            entity_name=name,
            entity_type=info["type"],
            department=info["department"],
            owner=info["owner"],
            criticality=info["criticality"],
            documented=info["documented"],
            governance_score=info["governance_score"],
            governance_level=info["governance_level"],
            policy_count=info["policy_count"],
            issues=info["issues"],
        ))

    governance_risks = []
    for gap in gaps:
        severity = gap.severity
        if "no_owner" in gap.gap_type or "no owner" in gap.details.lower():
            risk_type = "Ownership Gap"
            remediation = f"Assign an owner to {gap.entity_name} immediately"
        elif "not documented" in gap.details.lower():
            risk_type = "Documentation Gap"
            remediation = f"Document {gap.entity_name} with usage policies and runbooks"
        elif "no governance policy" in gap.details.lower():
            risk_type = "No Policy Coverage"
            remediation = f"Create governance policy covering {gap.entity_name}"
        elif "expired" in gap.details.lower():
            risk_type = "Expired Policy"
            remediation = f"Review and renew expired governance policies for {gap.entity_name}"
        else:
            risk_type = "Governance Weakness"
            remediation = f"Address governance gaps for {gap.entity_name}"

        governance_risks.append(GovernanceRisk(
            entity_id=gap.entity_id,
            entity_name=gap.entity_name,
            risk_type=risk_type,
            severity=severity,
            description=gap.details,
            remediation=remediation,
        ))

    governance_risks.sort(key=lambda r: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}.get(r.severity, 3))

    storage = IntelligenceStorage()
    storage.save_analysis("governance", {
        "company": data["company"],
        "governance_score": score,
        "total_entities": len(results),
        "critical_gaps": len([r for r in governance_risks if r.severity == "CRITICAL"]),
        "results": [
            {
                "entity": r.entity_name,
                "type": r.entity_type,
                "score": r.governance_score,
                "level": r.governance_level,
            }
            for r in results
        ],
    })

    dept_heatmap = {}
    for r in results:
        dept = r.department
        if dept not in dept_heatmap:
            dept_heatmap[dept] = {"scores": [], "critical": 0, "total": 0}
        dept_heatmap[dept]["scores"].append(r.governance_score)
        dept_heatmap[dept]["total"] += 1
        if r.governance_level == "CRITICAL":
            dept_heatmap[dept]["critical"] += 1

    return results, score, governance_risks, dept_heatmap


def display_governance_report(
    results: list[GovernanceResult],
    health_score: int,
    risks: list[GovernanceRisk],
    dept_heatmap: dict,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 19 — GOVERNANCE INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
        box=box.DOUBLE
    ))

    if health_score >= 80:
        h_color, h_label = "green", "HEALTHY"
    elif health_score >= 60:
        h_color, h_label = "yellow", "WARNING"
    elif health_score >= 40:
        h_color, h_label = "red", "AT RISK"
    else:
        h_color, h_label = "bold red", "CRITICAL"

    console.print(Panel(
        f"[bold]Governance Score:[/bold] [{h_color}]{health_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Governance Health[/bold]",
        box=box.ROUNDED,
    ))

    level_colors = {
        "HEALTHY": "green",
        "WARNING": "yellow",
        "AT RISK": "red",
        "CRITICAL": "bold red",
    }
    crit_colors = {
        "critical": "bold red",
        "high": "yellow",
        "medium": "blue",
        "low": "green",
    }

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Entity", style="white", min_width=28)
    table.add_column("Type", min_width=10)
    table.add_column("Dept", min_width=12)
    table.add_column("Owner", min_width=10)
    table.add_column("Criticality", justify="center", min_width=12)
    table.add_column("Documented", justify="center", min_width=12)
    table.add_column("Policies", justify="center", min_width=9)
    table.add_column("Gov. Score", justify="center", min_width=11)
    table.add_column("Level", justify="center", min_width=12)

    for r in sorted(results, key=lambda x: x.governance_score):
        level_color = level_colors.get(r.governance_level, "white")
        crit_color = crit_colors.get(r.criticality, "white")
        doc_text = "[green]YES[/green]" if r.documented else "[red]NO[/red]"
        table.add_row(
            f"[bold]{r.entity_name}[/bold]",
            r.entity_type,
            r.department,
            r.owner or "[red]NONE[/red]",
            f"[{crit_color}]{r.criticality.upper()}[/{crit_color}]",
            doc_text,
            str(r.policy_count),
            f"[{level_color}]{r.governance_score}[/{level_color}]",
            f"[{level_color}]{r.governance_level}[/{level_color}]",
        )

    console.print(table)

    console.print("\n[bold cyan]Governance Heatmap by Department:[/bold cyan]\n")
    dept_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    dept_table.add_column("Department", style="white", min_width=18)
    dept_table.add_column("Avg Score", justify="center", min_width=12)
    dept_table.add_column("Entities", justify="center", min_width=10)
    dept_table.add_column("Critical Gaps", justify="center", min_width=15)
    dept_table.add_column("Health", justify="center", min_width=12)

    for dept, info in sorted(dept_heatmap.items()):
        avg = int(sum(info["scores"]) / len(info["scores"])) if info["scores"] else 0
        if avg >= 80:
            dept_health = "[green]HEALTHY[/green]"
        elif avg >= 60:
            dept_health = "[yellow]WARNING[/yellow]"
        elif avg >= 40:
            dept_health = "[red]AT RISK[/red]"
        else:
            dept_health = "[bold red]CRITICAL[/bold red]"

        dept_table.add_row(
            dept,
            str(avg),
            str(info["total"]),
            str(info["critical"]),
            dept_health,
        )

    console.print(dept_table)

    if risks:
        console.print(Panel("[bold red]Governance Risk Detection — Top Issues[/bold red]", box=box.SIMPLE))

        risk_colors = {"CRITICAL": "bold red", "HIGH": "bold yellow", "MEDIUM": "yellow"}
        risk_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
        risk_table.add_column("Entity", style="white", min_width=28)
        risk_table.add_column("Risk Type", min_width=20)
        risk_table.add_column("Severity", justify="center", min_width=12)
        risk_table.add_column("Description", min_width=40)
        risk_table.add_column("Remediation", min_width=36)

        for r in risks:
            sev_color = risk_colors.get(r.severity, "white")
            risk_table.add_row(
                r.entity_name,
                r.risk_type,
                f"[{sev_color}]{r.severity}[/{sev_color}]",
                r.description[:60] + ("..." if len(r.description) > 60 else ""),
                r.remediation,
            )

        console.print(risk_table)

    critical = [r for r in results if r.governance_level == "CRITICAL"]
    at_risk = [r for r in results if r.governance_level == "AT RISK"]
    no_owner = [r for r in results if r.owner is None]
    undocumented = [r for r in results if not r.documented]
    no_policies = [r for r in results if r.policy_count == 0]

    console.print(Panel(
        f"[bold]Total Entities Analyzed:[/bold] {len(results)}\n"
        f"[bold red]CRITICAL Governance:[/bold red] {len(critical)}\n"
        f"[bold yellow]AT RISK Governance:[/bold yellow] {len(at_risk)}\n"
        f"[bold red]No Owner:[/bold red] {len(no_owner)}\n"
        f"[bold red]Undocumented:[/bold red] {len(undocumented)}\n"
        f"[bold red]No Policy Coverage:[/bold red] {len(no_policies)}\n\n"
        f"[bold]Overall Governance Score:[/bold] [{h_color}]{health_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Governance Intelligence Summary[/bold]",
        box=box.ROUNDED,
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    results, score, risks, dept_heatmap = run_governance_intelligence("data/sunrise_care.json")
    display_governance_report(results, score, risks, dept_heatmap, data["company"])
