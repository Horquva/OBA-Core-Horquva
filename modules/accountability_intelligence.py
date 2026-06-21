import io
import json
import sys
from dataclasses import dataclass, field
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
from rich import box

from modules.data_models import AccountabilityLink
from modules.intelligence_pipeline import IntelligencePipeline
from modules.storage_layer import IntelligenceStorage

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

console = Console(file=sys.stdout, force_terminal=True, highlight=False)


@dataclass
class AccountabilityResult:
    entity_id: str
    entity_name: str
    entity_type: str
    responsible: str
    accountable: str
    consulted: list[str]
    informed: list[str]
    decision_authority: str
    approval_chain: list[str]
    has_raci: bool
    accountability_score: int
    issues: list[str]


@dataclass
class ResponsibilityChain:
    person: str
    owned_entities: list[str]
    accountable_for: list[str]
    consulted_in: list[str]
    informed_of: list[str]
    total_responsibilities: int
    chain_depth: int


def assess_accountability(
    link: AccountabilityLink,
    entity_type: str,
) -> tuple[int, bool, list[str]]:
    score = 100
    issues = []
    has_raci = bool(link.responsible and link.accountable)

    if not link.responsible:
        score -= 30
        issues.append("No responsible person assigned")

    if not link.accountable:
        score -= 25
        issues.append("No accountable person designated")

    if link.responsible and link.accountable and link.responsible == link.accountable:
        score -= 10
        issues.append("Responsible and accountable are the same person — no separation of duties")

    if not link.consulted and entity_type in ("agent", "workflow"):
        score -= 10
        issues.append("No consultation defined — decisions made in isolation")

    if not link.informed:
        score -= 5
        issues.append("No informed parties — stakeholders left out of loop")

    if not link.decision_authority:
        score -= 15
        issues.append("No clear decision authority — ambiguous ownership")

    if len(link.approval_chain) <= 1:
        score -= 10
        issues.append("Single-person approval chain — no oversight")

    score = max(0, min(100, score))
    return score, has_raci, issues


def build_accountability_map(
    pipeline: IntelligencePipeline,
) -> list[AccountabilityResult]:
    entities = pipeline.get_entities()
    links = pipeline.get_links()

    results = []
    for link in links:
        entity = entities.get(link.entity_id)
        if not entity:
            continue

        score, has_raci, issues = assess_accountability(link, entity.type)
        results.append(AccountabilityResult(
            entity_id=link.entity_id,
            entity_name=link.entity_name,
            entity_type=entity.type,
            responsible=link.responsible,
            accountable=link.accountable,
            consulted=link.consulted,
            informed=link.informed,
            decision_authority=link.decision_authority,
            approval_chain=link.approval_chain,
            has_raci=has_raci,
            accountability_score=score,
            issues=issues,
        ))

    results.sort(key=lambda r: r.accountability_score)
    return results


def build_responsibility_chains(
    results: list[AccountabilityResult],
) -> list[ResponsibilityChain]:
    person_map: dict[str, dict] = {}

    for r in results:
        for person in [r.responsible, r.accountable] + r.consulted + r.informed:
            if not person:
                continue
            if person not in person_map:
                person_map[person] = {
                    "owned": [],
                    "accountable_for": [],
                    "consulted_in": [],
                    "informed_of": [],
                }

        if r.responsible:
            person_map[r.responsible]["owned"].append(r.entity_name)
        if r.accountable:
            person_map[r.accountable]["accountable_for"].append(r.entity_name)
        for c in r.consulted:
            person_map[c]["consulted_in"].append(r.entity_name)
        for i in r.informed:
            person_map[i]["informed_of"].append(r.entity_name)

    chains = []
    for person, data in sorted(person_map.items()):
        owned = list(dict.fromkeys(data["owned"]))
        accountable_for = list(dict.fromkeys(data["accountable_for"]))
        consulted_in = list(dict.fromkeys(data["consulted_in"]))
        informed_of = list(dict.fromkeys(data["informed_of"]))
        total = len(owned) + len(accountable_for) + len(consulted_in) + len(informed_of)
        depth = 0
        if owned:
            depth = max(depth, 3)
        if accountable_for:
            depth = max(depth, 2)
        if consulted_in:
            depth = max(depth, 1)

        chains.append(ResponsibilityChain(
            person=person,
            owned_entities=owned,
            accountable_for=accountable_for,
            consulted_in=consulted_in,
            informed_of=informed_of,
            total_responsibilities=total,
            chain_depth=depth,
        ))

    chains.sort(key=lambda c: -c.total_responsibilities)
    return chains


def calculate_overall_accountability_score(results: list[AccountabilityResult]) -> int:
    if not results:
        return 100
    total = sum(r.accountability_score for r in results)
    return int(total / len(results))


def run_accountability_intelligence(data_path: str) -> tuple[list[AccountabilityResult], int, list[ResponsibilityChain], dict]:
    with open(data_path) as f:
        data = json.load(f)

    pipeline = IntelligencePipeline(data)
    results = build_accountability_map(pipeline)
    chains = build_responsibility_chains(results)
    score = calculate_overall_accountability_score(results)

    storage = IntelligenceStorage()
    storage.save_analysis("accountability", {
        "company": data["company"],
        "accountability_score": score,
        "total_entities": len(results),
        "results": [
            {
                "entity": r.entity_name,
                "responsible": r.responsible,
                "accountable": r.accountable,
                "score": r.accountability_score,
            }
            for r in results
        ],
    })

    person_coverage = {}
    for r in results:
        for person in [r.responsible, r.accountable]:
            if person:
                if person not in person_coverage:
                    person_coverage[person] = {"responsible": 0, "accountable": 0}
                if person == r.responsible:
                    person_coverage[person]["responsible"] += 1
                if person == r.accountable:
                    person_coverage[person]["accountable"] += 1

    return results, score, chains, person_coverage


def display_accountability_report(
    results: list[AccountabilityResult],
    health_score: int,
    chains: list[ResponsibilityChain],
    person_coverage: dict,
    company: str,
):
    console.print(Panel(
        f"[bold cyan]MODULE 20 — ACCOUNTABILITY INTELLIGENCE[/bold cyan]\n[dim]Company: {company}[/dim]",
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
        f"[bold]Accountability Score:[/bold] [{h_color}]{health_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Accountability Health[/bold]",
        box=box.ROUNDED,
    ))

    score_colors = {
        range(80, 101): "green",
        range(60, 80): "yellow",
        range(40, 60): "red",
        range(0, 40): "bold red",
    }

    def _score_color(score: int) -> str:
        for r, c in score_colors.items():
            if score in r:
                return c
        return "white"

    table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    table.add_column("Entity", style="white", min_width=28)
    table.add_column("Type", min_width=10)
    table.add_column("Responsible", min_width=12)
    table.add_column("Accountable", min_width=12)
    table.add_column("Consulted", min_width=14)
    table.add_column("Informed", min_width=14)
    table.add_column("Decision Auth", min_width=14)
    table.add_column("RACI", justify="center", min_width=6)
    table.add_column("Score", justify="center", min_width=7)

    for r in results:
        sc = _score_color(r.accountability_score)
        raci_text = "[green]YES[/green]" if r.has_raci else "[red]NO[/red]"
        consulted = ", ".join(r.consulted) if r.consulted else "[dim]none[/dim]"
        informed = ", ".join(r.informed) if r.informed else "[dim]none[/dim]"

        table.add_row(
            f"[bold]{r.entity_name}[/bold]",
            r.entity_type,
            r.responsible or "[red]NONE[/red]",
            r.accountable or "[red]NONE[/red]",
            consulted,
            informed,
            r.decision_authority or "[red]NONE[/red]",
            raci_text,
            f"[{sc}]{r.accountability_score}[/{sc}]",
        )

    console.print(table)

    console.print("\n[bold cyan]Accountability Map — Who Is Responsible & Accountable:[/bold cyan]\n")
    for r in sorted(results, key=lambda x: x.accountability_score):
        if r.accountability_score < 80:
            color = "red" if r.accountability_score < 60 else "yellow"
            console.print(
                f"  [{color}]{r.entity_name}[/{color}] — "
                f"Responsible: [bold]{r.responsible or 'NONE'}[/bold] | "
                f"Accountable: [bold]{r.accountable or 'NONE'}[/bold]"
            )
            for issue in r.issues:
                console.print(f"    [dim]•[/dim] {issue}")

    console.print(Panel("[bold]Responsibility Chains — Who Carries What Burden[/bold]", box=box.SIMPLE))

    chain_table = Table(box=box.SIMPLE_HEAVY, show_lines=True)
    chain_table.add_column("Person", style="white", min_width=14)
    chain_table.add_column("Responsible For", min_width=30)
    chain_table.add_column("Accountable For", min_width=30)
    chain_table.add_column("Consulted In", min_width=26)
    chain_table.add_column("Total", justify="center", min_width=7)

    for c in chains:
        chain_table.add_row(
            f"[bold]{c.person}[/bold]",
            ", ".join(c.owned_entities) if c.owned_entities else "[dim]—[/dim]",
            ", ".join(c.accountable_for) if c.accountable_for else "[dim]—[/dim]",
            ", ".join(c.consulted_in) if c.consulted_in else "[dim]—[/dim]",
            str(c.total_responsibilities),
        )

    console.print(chain_table)

    console.print("\n[bold cyan]Decision Ownership Map:[/bold cyan]\n")
    for r in results:
        if r.decision_authority:
            color = "green" if r.accountability_score >= 80 else "yellow" if r.accountability_score >= 60 else "red"
            console.print(
                f"  [{color}]{r.entity_name}[/{color}] — "
                f"Decision Authority: [bold]{r.decision_authority}[/bold]"
            )

    critical_count = len([r for r in results if r.accountability_score < 40])
    at_risk_count = len([r for r in results if 40 <= r.accountability_score < 60])
    no_raci = len([r for r in results if not r.has_raci])
    single_person = len([r for r in results if r.responsible == r.accountable and r.responsible])

    console.print(Panel(
        f"[bold]Total Entities With Accountability Links:[/bold] {len(results)}\n"
        f"[bold red]CRITICAL Accountability (< 40):[/bold red] {critical_count}\n"
        f"[bold yellow]AT RISK Accountability (40-59):[/bold yellow] {at_risk_count}\n"
        f"[bold red]No RACI Structure:[/bold red] {no_raci}\n"
        f"[bold yellow]Same Person Responsible & Accountable:[/bold yellow] {single_person}\n"
        f"[bold]Unique People in Chains:[/bold] {len(chains)}\n\n"
        f"[bold]Overall Accountability Score:[/bold] [{h_color}]{health_score}/100 — {h_label}[/{h_color}]",
        title="[bold]Accountability Intelligence Summary[/bold]",
        box=box.ROUNDED,
    ))


if __name__ == "__main__":
    with open("data/sunrise_care.json") as f:
        data = json.load(f)
    results, score, chains, person_coverage = run_accountability_intelligence("data/sunrise_care.json")
    display_accountability_report(results, score, chains, person_coverage, data["company"])
