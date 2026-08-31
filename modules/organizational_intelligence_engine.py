"""
Phase 2 — Organizational Intelligence Engine (Five Pillars Integration)

The platform foundation that connects every individual intelligence module into
one unified system. It applies shared **Intelligence Logic**, maps the
**Intelligence Relationships** between organizational dimensions, and produces
**Intelligence Scoring** across the Five Pillars:

    DI  - Domain Intelligence
    MI  - Memory Intelligence
    OI  - Operational Intelligence
    OCI - Organizational Continuity Intelligence
    GI  - Governance Intelligence

Output: a score and signals per pillar, the relationships that show how a weak
pillar drags others down, and a single Organizational Intelligence Score that
leadership can track over time.
"""

import json
from dataclasses import dataclass, field

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.tree import Tree


@dataclass
class PillarScore:
    code: str
    name: str
    score: int
    rating: str
    signals: list[str] = field(default_factory=list)


@dataclass
class Relationship:
    source: str
    target: str
    note: str
    dragging: bool


# Criticality weights so important assets count more in continuity scoring
CRIT_WEIGHT = {"critical": 3, "high": 2, "medium": 1, "low": 1}


def _rating(score: int) -> str:
    if score >= 80:
        return "STRONG"
    if score >= 60:
        return "MODERATE"
    if score >= 40:
        return "WEAK"
    return "CRITICAL"


def _pct(part: float, whole: float) -> float:
    return (part / whole * 100) if whole else 0.0


def _normalize_assets(data: dict) -> list[dict]:
    """Flatten agents, workflows and AI tools into one comparable asset shape so
    every pillar reasons over the same organizational surface."""
    assets: list[dict] = []
    for a in data.get("agents", []):
        assets.append({
            "kind": "agent", "name": a["name"],
            "owner": a.get("owner"), "backup": a.get("backup_owner"),
            "documented": bool(a.get("documented")),
            "criticality": a.get("criticality", "medium"),
        })
    for w in data.get("workflows", []):
        assets.append({
            "kind": "workflow", "name": w["name"],
            "owner": w.get("owner"), "backup": w.get("backup_owner"),
            "documented": bool(w.get("documented")),
            "criticality": w.get("criticality", "medium"),
        })
    for t in data.get("ai_tools", []):
        assets.append({
            "kind": "tool", "name": t["name"],
            "owner": t.get("access_owner"), "backup": t.get("backup_tool"),
            "documented": bool(t.get("documented")),
            "criticality": t.get("criticality", "medium"),
        })
    return assets


def run_intelligence_engine(data_path: str):
    """Intelligence Logic + Scoring: compute each of the Five Pillars from the
    shared asset surface, then derive the unified Organizational Intelligence
    Score and the cross-pillar relationships."""
    with open(data_path) as f:
        data = json.load(f)

    assets = _normalize_assets(data)
    total = len(assets)
    agents = data.get("agents", [])
    deps = data.get("dependencies", [])

    owned = [a for a in assets if a["owner"]]
    documented = [a for a in assets if a["documented"]]
    backed = [a for a in assets if a["backup"]]
    fully_governed = [a for a in assets if a["owner"] and a["backup"] and a["documented"]]
    orphaned = [a for a in assets if not a["owner"]]
    crit = [a for a in assets if a["criticality"] in ("critical", "high")]
    crit_documented = [a for a in crit if a["documented"]]
    crit_ready = [a for a in crit if a["backup"] and a["documented"]]

    ownership_cov = _pct(len(owned), total)
    doc_cov = _pct(len(documented), total)
    backup_cov = _pct(len(backed), total)

    # ---- DI - Domain Intelligence: is the organization mapped and understood? ----
    dep_cov = min(100.0, _pct(len(deps), len(agents))) if agents else 0.0
    di = round(0.4 * ownership_cov + 0.3 * doc_cov + 0.3 * dep_cov)
    di_signals = [
        f"Ownership mapped on {len(owned)}/{total} assets ({ownership_cov:.0f}%)",
        f"Domain documented on {len(documented)}/{total} assets ({doc_cov:.0f}%)",
        f"{len(deps)} dependencies mapped across {len(agents)} agents",
    ]

    # ---- MI - Memory Intelligence: what organizational knowledge survives? ----
    spok = [a for a in assets if not a["documented"] and not a["backup"]]
    mi = round(0.7 * doc_cov + 0.3 * (100 - _pct(len(spok), total)))
    mi_signals = [
        f"{len(documented)}/{total} assets carry retained (documented) knowledge",
        f"{len(spok)} single points of knowledge (undocumented and no backup)",
    ]

    # ---- OI - Operational Intelligence: can operations absorb shocks? ----
    crit_ready_pct = _pct(len(crit_ready), len(crit)) if crit else 100.0
    oi = round(0.5 * backup_cov + 0.5 * crit_ready_pct)
    oi_signals = [
        f"Backup coverage on {len(backed)}/{total} assets ({backup_cov:.0f}%)",
        f"{len(crit_ready)}/{len(crit)} critical/high assets fully operation-ready",
    ]

    # ---- OCI - Organizational Continuity Intelligence: weighted survival ----
    num = den = 0.0
    for a in assets:
        w = CRIT_WEIGHT.get(a["criticality"], 1)
        coverage = (bool(a["owner"]) + bool(a["backup"]) + bool(a["documented"])) / 3
        num += w * coverage
        den += w
    oci = round(_pct(num, den))
    survives = [a for a in assets if a["owner"] and a["backup"] and a["documented"]]
    oci_signals = [
        f"{len(survives)}/{total} assets fully survive disruption (owner+backup+documented)",
        f"Continuity weighted by criticality across {total} assets",
    ]

    # ---- GI - Governance Intelligence: accountability and compliance ----
    gov_cov = _pct(len(fully_governed), total)
    crit_compliance = _pct(len(crit_documented), len(crit)) if crit else 100.0
    gi = round(0.5 * gov_cov + 0.25 * (100 - _pct(len(orphaned), total)) + 0.25 * crit_compliance)
    gi_signals = [
        f"{len(fully_governed)}/{total} assets fully governed (owner+backup+documented)",
        f"{len(orphaned)} orphaned assets with no accountable owner",
        f"{len(crit_documented)}/{len(crit)} critical/high assets meet documentation compliance",
    ]

    pillars = [
        PillarScore("DI", "Domain Intelligence", di, _rating(di), di_signals),
        PillarScore("MI", "Memory Intelligence", mi, _rating(mi), mi_signals),
        PillarScore("OI", "Operational Intelligence", oi, _rating(oi), oi_signals),
        PillarScore("OCI", "Organizational Continuity Intelligence", oci, _rating(oci), oci_signals),
        PillarScore("GI", "Governance Intelligence", gi, _rating(gi), gi_signals),
    ]

    org_score = round(sum(p.score for p in pillars) / len(pillars))

    # ---- Intelligence Relationships: how a weak pillar drags the system ----
    by_code = {p.code: p for p in pillars}
    rel_defs = [
        ("DI", "MI", "The org can only retain knowledge it has first mapped"),
        ("MI", "OCI", "Undocumented knowledge fails the moment a person leaves"),
        ("OI", "OCI", "Weak operational backup directly lowers continuity"),
        ("GI", "DI", "Poor governance leaves ownership and domain gaps"),
        ("GI", "OCI", "Accountability gaps turn into continuity failures"),
    ]
    relationships = [
        Relationship(s, t, note, by_code[s].score < 60) for s, t, note in rel_defs
    ]

    return pillars, relationships, org_score


def display_intelligence_report(pillars, relationships, org_score, company):
    console = Console()
    color = {"STRONG": "green", "MODERATE": "yellow", "WEAK": "red", "CRITICAL": "bold red"}

    console.print(Panel(
        f"[bold]ORGANIZATIONAL INTELLIGENCE ENGINE[/bold]\n"
        f"Five Pillars Integration  -  {company}",
        box=box.DOUBLE,
    ))

    table = Table(box=box.SIMPLE_HEAVY)
    table.add_column("Pillar", style="bold", min_width=34)
    table.add_column("Code", justify="center")
    table.add_column("Score", justify="center")
    table.add_column("Rating", justify="center")
    for p in pillars:
        c = color[p.rating]
        table.add_row(p.name, p.code, f"{p.score}/100", f"[{c}]{p.rating}[/{c}]")
    console.print(table)

    tree = Tree("[bold]Intelligence Logic - Signals per Pillar[/bold]")
    for p in pillars:
        branch = tree.add(f"[bold]{p.code}[/bold] - {p.name} ({p.score}/100)")
        for s in p.signals:
            branch.add(s)
    console.print(tree)

    console.print("\n[bold]Intelligence Relationships:[/bold]")
    for r in relationships:
        flag = "[red]drags the system[/red]" if r.dragging else "[green]stable[/green]"
        console.print(f"  {r.source} -> {r.target}: {r.note}  ({flag})")

    band = _rating(org_score)
    console.print(Panel(
        f"[bold]Organizational Intelligence Score: {org_score}/100 - {band}[/bold]\n"
        f"Unified across DI . MI . OI . OCI . GI",
        box=box.DOUBLE,
    ))
