import io
import json
import sys
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_relationship_intelligence(path):
    with open(path) as f:
        data = json.load(f)
    assets = data.get("agents", []) + data.get("workflows", [])
    rels = []
    backup_pairs = set()
    for a in assets:
        owner, backup = a.get("owner"), a.get("backup_owner")
        documented = a.get("documented", False)
        if owner:
            strength = 40 + (30 if backup else 0) + (30 if documented else 0)
            note = "healthy" if strength >= 70 else ("fragile" if strength < 50 else "at risk")
            rels.append(("ownership", owner, a["name"], strength, note))
        if owner and backup:
            backup_pairs.add(tuple(sorted([owner, backup])))
    fragile = [r for r in rels if r[3] < 50]
    avg = round(sum(r[3] for r in rels) / len(rels)) if rels else 0
    return {"total": len(rels), "fragile": len(fragile), "avg_strength": avg,
            "backup_links": len(backup_pairs), "fragile_items": fragile}


def display_relationship_intelligence(summary, company):
    console.print(f"\nM29 · ORGANIZATIONAL RELATIONSHIP INTELLIGENCE — {company}\n")
    console.print("Scores the health of every ownership/backup relationship, not just its existence.\n")
    console.print(f"Relationships scored: {summary['total']} · average strength: {summary['avg_strength']}/100")
    console.print(f"Fragile relationships (single-link, no backup/docs): {summary['fragile']}")
    console.print(f"Backup (reciprocal) links: {summary['backup_links']}")
    t = Table(title="Most fragile relationships")
    t.add_column("Owner"); t.add_column("Asset"); t.add_column("Strength"); t.add_column("State")
    for kind, a, b, strength, note in sorted(summary["fragile_items"], key=lambda r: r[3])[:10]:
        t.add_row(a, b, f"{strength}/100", note)
    console.print(t)
    console.print("")
