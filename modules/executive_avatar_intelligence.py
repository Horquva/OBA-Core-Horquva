import io
import json
import sys
from collections import Counter
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_executive_avatar(path):
    with open(path) as f:
        data = json.load(f)
    assets = data.get("agents", []) + data.get("workflows", [])
    load = Counter(a["owner"] for a in assets if a.get("owner"))
    spofs = [a for a in assets if (a.get("criticality") or "").lower() == "critical" and not a.get("backup_owner")]
    undoc = [a for a in assets if not a.get("documented", False)]
    top_owner, top_n = (load.most_common(1)[0] if load else ("—", 0))
    biggest = spofs[0]["name"] if spofs else (assets[0]["name"] if assets else "—")
    qa = [
        ("What is my single biggest risk right now?",
         f"{biggest} — critical with no backup owner. {len(spofs)} such single points of failure exist."),
        ("Who is overloaded?",
         f"{top_owner} owns {top_n} assets — the heaviest concentration in the company."),
        ("What should I fix first?",
         f"Assign backup owners to the {len(spofs)} critical no-backup assets, starting with {biggest}."),
        ("How exposed are we on documentation?",
         f"{len(undoc)} of {len(assets)} assets are undocumented — the knowledge lives only in people's heads."),
    ]
    return qa, {"answered": len(qa), "spofs": len(spofs), "top_owner": top_owner}


def display_executive_avatar(qa, summary, company):
    console.print(f"\nM21 · EXECUTIVE AVATAR INTELLIGENCE — {company}\n")
    console.print("A single executive-facing persona that answers leadership questions from the Brain.\n")
    t = Table(title="Executive Avatar — Q&A")
    t.add_column("Executive asks"); t.add_column("Avatar answers")
    for q, a in qa:
        t.add_row(q, a)
    console.print(t)
    console.print(f"\nQuestions answered from live data: {summary['answered']}")
    console.print("")
