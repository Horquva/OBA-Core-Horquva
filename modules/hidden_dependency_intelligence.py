import io
import json
import sys
from collections import defaultdict
from rich.console import Console
from rich.table import Table

if sys.platform == "win32" and not isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
console = Console(file=sys.stdout, force_terminal=True, highlight=False)


def run_hidden_dependency(path):
    with open(path) as f:
        data = json.load(f)
    name_by_id = {a["id"]: a["name"] for a in data.get("agents", [])}
    depends = defaultdict(set)
    for d in data.get("dependencies", []):
        s, t = name_by_id.get(d.get("from")), name_by_id.get(d.get("to"))
        if s and t:
            depends[s].add(t)

    hidden = []
    for a, bs in depends.items():
        for b in bs:
            for c in depends.get(b, ()):
                if c != a and c not in depends.get(a, set()):
                    hidden.append(("transitive", f"{a} → {b} → {c}",
                                   f"{a} silently depends on {c} through {b}"))
    for t in data.get("ai_tools", []):
        users = [name_by_id.get(x, x) for x in t.get("agents_using", [])] + t.get("workflows", [])
        if len(users) >= 2:
            hidden.append(("shared-resource", f"{', '.join(users[:3])} ↔ {t['name']}",
                           f"{len(users)} assets share {t['name']} — it fails, they all stall"))
    owner_assets = defaultdict(list)
    for a in data.get("agents", []) + data.get("workflows", []):
        if a.get("owner"):
            owner_assets[a["owner"]].append(a["name"])
    for owner, assets in owner_assets.items():
        if len(assets) >= 2:
            hidden.append(("shared-owner", f"{', '.join(assets[:3])} via {owner}",
                           f"{len(assets)} assets are coupled only through {owner}"))

    by_type = defaultdict(int)
    for h in hidden:
        by_type[h[0]] += 1
    return {"total": len(hidden), "by_type": dict(by_type), "items": hidden}


def display_hidden_dependency(summary, company):
    console.print(f"\nM34 · HIDDEN DEPENDENCY INTELLIGENCE — {company}\n")
    console.print("Surfaces indirect couplings no single module can see on its own.\n")
    console.print(f"Hidden dependencies discovered: {summary['total']}")
    for k, v in summary["by_type"].items():
        console.print(f"   · {k}: {v}")
    t = Table(title="Sample hidden dependencies")
    t.add_column("Type"); t.add_column("Path"); t.add_column("Why it matters")
    for typ, path_s, why in summary["items"][:10]:
        t.add_row(typ, path_s, why)
    console.print(t)
    console.print("")
